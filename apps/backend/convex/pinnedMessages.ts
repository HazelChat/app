import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { userMutation, userQuery } from "./middleware/withUserEffect"
import { confectSchema } from "./schema"

export const getPinnedMessages = userQuery({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Array(
		Schema.Struct({
			messageId: Id.Id("messages"),
			pinnedAt: Schema.Number,
			channelId: Id.Id("channels"),
			messageAuthor: confectSchema.tableSchemas.users.withSystemFields,
			message: confectSchema.tableSchemas.messages.withSystemFields,
		}),
	),
	handler: Effect.fn(function* ({ channelId, userData, userService }) {
		const ctx = yield* ConfectQueryCtx

		yield* userService.validateCanViewChannel(ctx, userData, channelId)

		const channelOption = yield* ctx.db.get(channelId)
		if (Option.isNone(channelOption)) {
			return yield* Effect.fail(new Error("Channel not found"))
		}

		const channel = channelOption.value

		const computedPinnedMessages = yield* Effect.forEach(
			channel.pinnedMessages,
			Effect.fn(function* (pinnedMessage) {
				const messageOption = yield* ctx.db.get(pinnedMessage.messageId)
				if (Option.isNone(messageOption)) return null

				const message = messageOption.value

				const messageAuthorOption = yield* ctx.db.get(message.authorId)
				if (Option.isNone(messageAuthorOption)) return null

				return {
					...pinnedMessage,
					channelId,
					messageAuthor: messageAuthorOption.value,
					message,
				}
			}),
		)

		return computedPinnedMessages.filter((pinnedMessage) => pinnedMessage !== null)
	}),
})

export const createPinnedMessage = userMutation({
	args: Schema.Struct({
		messageId: Id.Id("messages"),
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ messageId, channelId, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		yield* userService.validateIsMemberOfChannel(ctx, userData, channelId)

		const channelOption = yield* ctx.db.get(channelId)
		if (Option.isNone(channelOption)) {
			return yield* Effect.fail(new Error("Channel not found"))
		}

		const channel = channelOption.value

		const pinnedMessage = channel.pinnedMessages.find(
			(pinnedMessage) => pinnedMessage.messageId === messageId,
		)
		if (pinnedMessage) {
			return yield* Effect.fail(new Error("Message already pinned"))
		}

		yield* ctx.db.patch(channelId, {
			pinnedMessages: [...channel.pinnedMessages, { messageId, pinnedAt: Date.now() }],
		})

		return null
	}),
})

export const deletePinnedMessage = userMutation({
	args: Schema.Struct({
		messageId: Id.Id("messages"),
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ messageId, channelId, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		yield* userService.validateIsMemberOfChannel(ctx, userData, channelId)

		const channelOption = yield* ctx.db.get(channelId)
		if (Option.isNone(channelOption)) {
			return yield* Effect.fail(new Error("Channel not found"))
		}

		const channel = channelOption.value

		yield* ctx.db.patch(channelId, {
			pinnedMessages: channel.pinnedMessages.filter(
				(pinnedMessage) => pinnedMessage.messageId !== messageId,
			),
		})

		return null
	}),
})
