import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { ChannelMember } from "@hazel/db/models"
import { ChannelMemberId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"
import { ChannelNotFoundError } from "../../../rpc/groups/channels"

export class ChannelMemberResponse extends Schema.Class<ChannelMemberResponse>("ChannelMemberResponse")({
	data: ChannelMember.Model.json,
	transactionId: TransactionId,
}) {}

export class ChannelMemberNotFoundError extends Schema.TaggedError<ChannelMemberNotFoundError>(
	"ChannelMemberNotFoundError",
)(
	"ChannelMemberNotFoundError",
	{
		channelMemberId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class ChannelMemberGroup extends HttpApiGroup.make("channelMembers")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(ChannelMember.Model.jsonCreate)
			.addSuccess(ChannelMemberResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Channel Member",
					description: "Add a user to a channel",
					summary: "Create a channel member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: ChannelMemberId }))
			.setPayload(ChannelMember.Model.jsonUpdate)
			.addSuccess(ChannelMemberResponse)
			.addError(ChannelMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Channel Member",
					description: "Update channel member preferences and settings",
					summary: "Update a channel member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: ChannelMemberId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(ChannelMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Channel Member",
					description: "Remove a user from a channel",
					summary: "Remove a channel member",
				}),
			),
	)
	.prefix("/channel-members")
	.middleware(CurrentUser.Authorization) {}
