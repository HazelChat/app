import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Channel } from "@hazel/db/models"
import { ChannelId, UserId } from "@hazel/db/schema"
import {
	CurrentUser,
	DmChannelAlreadyExistsError,
	InternalServerError,
	UnauthorizedError,
} from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"

export class CreateChannelResponse extends Schema.Class<CreateChannelResponse>("CreateChannelResponse")({
	data: Channel.Model.json,
	transactionId: TransactionId,
}) {}

export class CreateDmChannelRequest extends Schema.Class<CreateDmChannelRequest>("CreateDmChannelRequest")({
	participantIds: Schema.Array(UserId),
	type: Schema.Literal("direct", "single"),
	name: Schema.optional(Schema.String),
	organizationId: Schema.UUID,
}) {}

export class ChannelNotFoundError extends Schema.TaggedError<ChannelNotFoundError>("ChannelNotFoundError")(
	"ChannelNotFoundError",
	{
		channelId: Schema.UUID,
	},
	{
		status: 404,
	},
) {}

export class ChannelGroup extends HttpApiGroup.make("channels")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(Channel.Model.jsonCreate)
			.addSuccess(CreateChannelResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)

			.annotateContext(
				OpenApi.annotations({
					title: "Create Channel",
					description: "Create a new channel in an organization",
					summary: "Create a new channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("createDm", `/dm`)
			.setPayload(CreateDmChannelRequest)
			.addSuccess(CreateChannelResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.addError(DmChannelAlreadyExistsError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create DM or Group Channel",
					description: "Create a new direct message or group channel with specified participants",
					summary: "Create a DM or group channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: ChannelId }))
			.setPayload(Channel.Model.jsonUpdate)
			.addSuccess(CreateChannelResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Channel",
					description: "Update an existing channel",
					summary: "Update a channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: ChannelId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Channel",
					description: "Delete an existing channel",
					summary: "Delete a channel",
				}),
			),
	)
	.prefix("/channels")
	.middleware(CurrentUser.Authorization) {}
