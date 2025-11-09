import { FetchHttpClient, HttpApiBuilder, HttpClient } from "@effect/platform"
import { Effect } from "effect"
import metascraper from "metascraper"
import metascraperDescription from "metascraper-description"
import metascraperImage from "metascraper-image"
import metascraperLogo from "metascraper-logo"
import metascraperPublisher from "metascraper-publisher"
import metascraperTitle from "metascraper-title"
import metascraperUrl from "metascraper-url"
import { MyHttpApi } from "../api"
import { LinkPreviewError } from "../declare"

// Initialize metascraper with plugins
const scraper = metascraper([
	metascraperUrl(),
	metascraperTitle(),
	metascraperDescription(),
	metascraperImage(),
	metascraperLogo(),
	metascraperPublisher(),
])

// Validate if an image URL is accessible using HttpClient
function validateImageUrl(url: string): Effect.Effect<boolean> {
	return HttpClient.head(url).pipe(
		Effect.andThen((response) => {
			const contentType = response.headers["content-type"]
			return contentType ? contentType.startsWith("image/") : false
		}),
		Effect.timeout("1 seconds"),
		Effect.catchAll(() => Effect.succeed(false)),
		Effect.provide(FetchHttpClient.layer),
	)
}

// Extract meta tag content from HTML
function extractMetaTag(html: string, property: string): string | null {
	// Try property attribute first (og:image uses property)
	const propertyRegex = new RegExp(
		`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
		"i",
	)
	// Try name attribute (twitter:image uses name)
	const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i")
	// Also try reverse order (content before property/name)
	const reversePropertyRegex = new RegExp(
		`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["'][^>]*>`,
		"i",
	)
	const reverseNameRegex = new RegExp(
		`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["'][^>]*>`,
		"i",
	)

	const propertyMatch = html.match(propertyRegex)
	if (propertyMatch) return propertyMatch[1]

	const nameMatch = html.match(nameRegex)
	if (nameMatch) return nameMatch[1]

	const reversePropertyMatch = html.match(reversePropertyRegex)
	if (reversePropertyMatch) return reversePropertyMatch[1]

	const reverseNameMatch = html.match(reverseNameRegex)
	if (reverseNameMatch) return reverseNameMatch[1]

	return null
}

export const HttpLinkPreviewLive = HttpApiBuilder.group(MyHttpApi, "linkPreview", (handlers) =>
	handlers.handle(
		"get",
		Effect.fn(function* ({ urlParams }) {
			const targetUrl = urlParams.url

			yield* Effect.log(`Fetching link preview for: ${targetUrl}`)

			// Fetch the HTML content using native fetch
			const html = yield* Effect.tryPromise({
				try: async () => {
					const response = await fetch(targetUrl, {
						headers: {
							"User-Agent": "Mozilla/5.0 (compatible; HazelBot/1.0; +https://hazel.chat/bot)",
						},
						signal: AbortSignal.timeout(10000),
					})

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`)
					}

					return await response.text()
				},
				catch: (error) =>
					new LinkPreviewError({
						message: `Failed to fetch URL: ${error}`,
					}),
			})

			// Extract metadata using metascraper
			const metadata = yield* Effect.tryPromise({
				try: () => scraper({ html, url: targetUrl }),
				catch: (error) =>
					new LinkPreviewError({
						message: `Failed to extract metadata: ${error}`,
					}),
			})

			yield* Effect.log(`Successfully extracted metadata for: ${targetUrl}`)

			// Collect image candidates in priority order
			// Priority: twitter:image (Discord), og:image:secure_url, og:image:url, og:image, twitter:image:src
			const imageCandidates = [
				extractMetaTag(html, "twitter:image"), // Preferred by Discord
				extractMetaTag(html, "og:image:secure_url"),
				extractMetaTag(html, "og:image:url"),
				extractMetaTag(html, "og:image"),
				extractMetaTag(html, "twitter:image:src"),
				metadata.image, // Fallback to metascraper result
			].filter((url): url is string => Boolean(url))

			// Find the first working image
			let validImageUrl: string | undefined
			for (const imageUrl of imageCandidates) {
				yield* Effect.log(`Validating image: ${imageUrl}`)
				const isValid = yield* validateImageUrl(imageUrl)
				if (isValid) {
					validImageUrl = imageUrl
					yield* Effect.log(`Valid image found: ${imageUrl}`)
					break
				}
			}

			if (!validImageUrl && imageCandidates.length > 0) {
				yield* Effect.log(`No valid images found out of ${imageCandidates.length} candidates`)
			}

			// Transform to match the frontend schema, converting null to undefined
			return {
				url: metadata.url ?? undefined,
				title: metadata.title ?? undefined,
				description: metadata.description ?? undefined,
				image: validImageUrl ? { url: validImageUrl } : undefined,
				logo: metadata.logo ? { url: metadata.logo } : undefined,
				publisher: metadata.publisher ?? undefined,
			}
		}),
	),
)
