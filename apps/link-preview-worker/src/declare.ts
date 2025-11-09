import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// Health check API
export class AppApi extends HttpApiGroup.make("app")

	.add(HttpApiEndpoint.get("health", "/health").addSuccess(Schema.String))
	.annotateContext(
		OpenApi.annotations({
			title: "App Api",
			description: "App Api",
		}),
	) {}

// Link Preview Schemas
export class LinkPreviewData extends Schema.Class<LinkPreviewData>("LinkPreviewData")({
	url: Schema.optional(Schema.String),
	title: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	image: Schema.optional(Schema.Struct({ url: Schema.optional(Schema.String) })),
	logo: Schema.optional(Schema.Struct({ url: Schema.optional(Schema.String) })),
	publisher: Schema.optional(Schema.String),
}) {}

export class LinkPreviewError extends Schema.TaggedError<LinkPreviewError>("LinkPreviewError")(
	"LinkPreviewError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class LinkPreviewGroup extends HttpApiGroup.make("linkPreview")
	.add(
		HttpApiEndpoint.get("get")`/`
			.addSuccess(LinkPreviewData)
			.addError(LinkPreviewError)
			.setUrlParams(
				Schema.Struct({
					url: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Get Link Preview",
					description: "Fetch metadata for a given URL",
					summary: "Get link preview metadata",
				}),
			),
	)
	.prefix("/link-preview") {}

// Tweet Schemas
export class TweetError extends Schema.TaggedError<TweetError>("TweetError")(
	"TweetError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class TweetGroup extends HttpApiGroup.make("tweet")
	.add(
		HttpApiEndpoint.get("get")`/`
			.addSuccess(Schema.Any)
			.addError(TweetError)
			.setUrlParams(
				Schema.Struct({
					id: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Get Tweet",
					description: "Fetch tweet data by ID",
					summary: "Get tweet metadata",
				}),
			),
	)
	.prefix("/tweet") {}
