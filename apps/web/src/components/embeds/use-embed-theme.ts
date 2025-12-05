import { getBrandfetchIcon } from "~/routes/_app/$orgSlug/settings/integrations/_data"

export type EmbedProvider = "linear" | "github" | "figma" | "notion" | "openstatus"

export interface EmbedTheme {
	/** Provider display name */
	name: string
	/** Brand accent color (hex) */
	color: string
	/** Provider domain for Brandfetch */
	domain: string
	/** Logo type for Brandfetch (symbol or icon) */
	logoType?: "symbol" | "icon"
}

/**
 * Provider branding configuration for embeds.
 */
export const EMBED_THEMES: Record<EmbedProvider, EmbedTheme> = {
	linear: {
		name: "Linear",
		color: "#5E6AD2",
		domain: "linear.app",
		logoType: "icon",
	},
	github: {
		name: "GitHub",
		color: "#24292F",
		domain: "github.com",
	},
	figma: {
		name: "Figma",
		color: "#F24E1E",
		domain: "figma.com",
		logoType: "icon",
	},
	notion: {
		name: "Notion",
		color: "#000000",
		domain: "notion.so",
		logoType: "icon",
	},
	openstatus: {
		name: "OpenStatus",
		color: "#10B981",
		domain: "openstatus.dev",
		logoType: "icon",
	},
}

/**
 * Get the embed theme for a provider.
 */
export function getEmbedTheme(provider: EmbedProvider): EmbedTheme {
	return EMBED_THEMES[provider]
}

/**
 * Get the provider icon URL using Brandfetch CDN.
 */
export function getProviderIconUrl(
	provider: EmbedProvider,
	options: { size?: number; theme?: "light" | "dark" } = {},
): string {
	const { size = 64, theme = "dark" } = options
	const embedTheme = EMBED_THEMES[provider]
	return getBrandfetchIcon(embedTheme.domain, {
		size,
		theme,
		type: embedTheme.logoType,
	})
}

/**
 * Hook to get embed theming for a provider.
 */
export function useEmbedTheme(provider: EmbedProvider) {
	const theme = EMBED_THEMES[provider]
	const iconUrl = getProviderIconUrl(provider)

	return {
		...theme,
		iconUrl,
	}
}
