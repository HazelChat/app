import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { UserId } from "@hazel/db/schema"
import { InternalServerError } from "@hazel/effect-lib"
import { Schema } from "effect"

// Payload for marking user offline
export class MarkOfflinePayload extends Schema.Class<MarkOfflinePayload>("MarkOfflinePayload")({
	userId: UserId,
}) {}

// Response for marking user offline
export class MarkOfflineResponse extends Schema.Class<MarkOfflineResponse>("MarkOfflineResponse")({
	success: Schema.Boolean,
}) {}

export class PresencePublicGroup extends HttpApiGroup.make("presencePublic")
	.add(
		HttpApiEndpoint.post("markOffline")`/offline`
			.setPayload(MarkOfflinePayload)
			.addSuccess(MarkOfflineResponse)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Mark User Offline",
					description: "Mark a user as offline when they close their tab (no auth required)",
					summary: "Mark offline",
				}),
			),
	)
	.prefix("/presence") {}
