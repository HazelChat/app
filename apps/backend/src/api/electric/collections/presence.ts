import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { UserPresenceStatus } from "@hazel/db/models"
import { ChannelId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"

export class UserPresenceStatusResponse extends Schema.Class<UserPresenceStatusResponse>(
	"UserPresenceStatusResponse",
)({
	data: UserPresenceStatus.Model.json,
	transactionId: TransactionId,
}) {}

// Payload for updating user status
export class UpdateUserStatusPayload extends Schema.Class<UpdateUserStatusPayload>("UpdateUserStatusPayload")({
	status: Schema.Literal("online", "away", "busy", "dnd"),
	customMessage: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

// Payload for updating active channel
export class UpdateActiveChannelPayload extends Schema.Class<UpdateActiveChannelPayload>(
	"UpdateActiveChannelPayload",
)({
	activeChannelId: Schema.NullOr(ChannelId),
}) {}

export class PresenceGroup extends HttpApiGroup.make("presence")
	.add(
		HttpApiEndpoint.put("updateStatus")`/status`
			.setPayload(UpdateUserStatusPayload)
			.addSuccess(UserPresenceStatusResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update User Status",
					description: "Manually set user status (away, busy, dnd, online)",
					summary: "Update status",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("updateActiveChannel")`/active-channel`
			.setPayload(UpdateActiveChannelPayload)
			.addSuccess(UserPresenceStatusResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Active Channel",
					description: "Set the channel the user is currently viewing",
					summary: "Update active channel",
				}),
			),
	)
	.prefix("/presence")
	.middleware(CurrentUser.Authorization) {}
