import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { internal } from "./_generated/api"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { userMutation, userQuery } from "./middleware/withUserEffect"
import { confectSchema } from "./schema"

export const getMessage = userQuery({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
		id: Id.Id("messages"),
	}),
	returns: Schema.extend(
		confectSchema.tableSchemas.messages.withSystemFields,
		Schema.Struct({
			author: confectSchema.tableSchemas.users.withSystemFields,
		}),
	),
	handler: Effect.fnUntraced(function* ({ channelId, id, userData, userService }) {
		const ctx = yield* ConfectQueryCtx

		yield* userService.validateCanViewChannel(ctx, userData, channelId)

		const messageOption = yield* ctx.db.get(id)
		if (Option.isNone(messageOption)) {
			return yield* Effect.fail(new Error("Message not found"))
		}

		const message = messageOption.value

		const messageAuthorOption = yield* ctx.db.get(message.authorId)
		if (Option.isNone(messageAuthorOption)) {
			return yield* Effect.fail(new Error("Message author not found"))
		}

		return {
			...message,
			author: messageAuthorOption.value,
		}
	}),
})

export const getMessages = userQuery({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
		paginationOpts: Schema.Struct({
			numItems: Schema.Number,
			cursor: Schema.Union(Schema.String, Schema.Null),
		}),
	}),
	returns: Schema.Struct({
		isDone: Schema.Boolean,
		continueCursor: Schema.String,
		page: Schema.Array(
			Schema.extend(
				confectSchema.tableSchemas.messages.withSystemFields,
				Schema.Struct({
					author: confectSchema.tableSchemas.users.withSystemFields,
					threadMessages: Schema.Array(
						Schema.extend(
							confectSchema.tableSchemas.messages.withSystemFields,
							Schema.Struct({
								author: confectSchema.tableSchemas.users.withSystemFields,
							}),
						),
					),
				}),
			),
		),
	}),
	handler: Effect.fnUntraced(function* ({ channelId, paginationOpts, userData, userService }) {
		const ctx = yield* ConfectQueryCtx

		const channelOption = yield* ctx.db.get(channelId)
		if (Option.isNone(channelOption)) {
			return yield* Effect.fail(new Error("Channel not found"))
		}

		yield* userService.validateCanViewChannel(ctx, userData, channelId)

		const messages = yield* ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", channelId))
			.order("desc")
			.paginate(paginationOpts)

		const messagesWithThreadMessages = yield* Effect.forEach(messages.page, (message) =>
			Effect.gen(function* () {
				if (message.threadChannelId) {
					const threadMessages = yield* ctx.db
						.query("messages")
						.withIndex("by_channelId", (q) => q.eq("channelId", message.threadChannelId!))
						.collect()

					const threadMessagesWithAuthor = yield* Effect.forEach(threadMessages, (threadMessage) =>
						Effect.gen(function* () {
							const messageAuthorOption = yield* ctx.db.get(threadMessage.authorId)
							if (Option.isNone(messageAuthorOption)) {
								return yield* Effect.fail(new Error("Message author not found"))
							}
							return {
								...threadMessage,
								author: messageAuthorOption.value,
							}
						}),
					)

					return {
						...message,
						threadMessages: threadMessagesWithAuthor,
					}
				}

				return {
					...message,
					threadMessages: [],
				}
			}),
		)

		const messagesWithAuthor = yield* Effect.forEach(messagesWithThreadMessages, (message) =>
			Effect.gen(function* () {
				const messageAuthorOption = yield* ctx.db.get(message.authorId)

				// TODO: This should not happen when user is deleted we should give all messages to a default user
				if (Option.isNone(messageAuthorOption)) {
					return yield* Effect.fail(new Error("Message author not found"))
				}

				return {
					...message,
					author: messageAuthorOption.value,
				}
			}),
		)

		return {
			...messages,
			page: messagesWithAuthor,
		}
	}),
})

export const createMessage = userMutation({
	args: Schema.Struct({
		content: Schema.String,
		channelId: Id.Id("channels"),
		threadChannelId: Schema.optional(Id.Id("channels")),
		replyToMessageId: Schema.optional(Id.Id("messages")),
		attachedFiles: Schema.Array(Schema.String),
	}),
	returns: Id.Id("messages"),
	handler: ({
		content,
		channelId,
		threadChannelId,
		replyToMessageId,
		attachedFiles,
		userData,
		userService,
	}) =>
		Effect.gen(function* () {
			const ctx = yield* ConfectMutationCtx

			if (content.trim() === "") {
				return yield* Effect.fail(new Error("Message content cannot be empty"))
			}

			yield* userService.validateIsMemberOfChannel(ctx, userData, channelId)

			const messageId = yield* ctx.db.insert("messages", {
				channelId,
				content,
				threadChannelId,
				authorId: userData.user._id,
				replyToMessageId,
				attachedFiles,
				updatedAt: Date.now(),
				reactions: [],
			})

			// TODO: This should be a database trigger
			yield* ctx.scheduler.runAfter(0, internal.background.index.sendNotification as any, {
				channelId,
				accountId: userData.account._id,
				messageId,
				userId: userData.user._id,
			})

			return messageId
		}),
})

export const updateMessage = userMutation({
	args: Schema.Struct({
		id: Id.Id("messages"),
		content: Schema.String,
	}),
	returns: Schema.Null,
	handler: Effect.fnUntraced(function* ({ id, content, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		yield* userService.validateOwnsMessage(ctx, userData, id)

		yield* ctx.db.patch(id, {
			content,
		})

		return null
	}),
})

export const deleteMessage = userMutation({
	args: Schema.Struct({
		id: Id.Id("messages"),
	}),
	returns: Schema.Null,
	handler: Effect.fnUntraced(function* ({ id, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		yield* userService.validateOwnsMessage(ctx, userData, id)

		yield* ctx.db.delete(id)

		return null
	}),
})

export const createReaction = userMutation({
	args: Schema.Struct({
		messageId: Id.Id("messages"),
		emoji: Schema.String,
	}),
	returns: Schema.Null,
	handler: Effect.fnUntraced(function* ({ messageId, emoji, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		const messageOption = yield* ctx.db.get(messageId)
		if (Option.isNone(messageOption)) {
			return yield* Effect.fail(new Error("Message not found"))
		}

		const message = messageOption.value

		if (message.deletedAt) {
			return yield* Effect.fail(new Error("Message not found"))
		}

		yield* userService.validateIsMemberOfChannel(ctx, userData, message.channelId)

		if (
			message.reactions.some(
				(reaction) => reaction.userId === userData.user._id && reaction.emoji === emoji,
			)
		) {
			return yield* Effect.fail(new Error("You have already reacted to this message"))
		}

		yield* ctx.db.patch(messageId, {
			reactions: [...message.reactions, { userId: userData.user._id, emoji }],
		})

		return null
	}),
})

export const deleteReaction = userMutation({
	args: Schema.Struct({
		id: Id.Id("messages"),
		emoji: Schema.String,
	}),
	returns: Schema.Null,
	handler: Effect.fnUntraced(function* ({ id, emoji, userData, userService }) {
		const ctx = yield* ConfectMutationCtx

		const messageOption = yield* ctx.db.get(id)
		if (Option.isNone(messageOption)) {
			return yield* Effect.fail(new Error("Message not found"))
		}

		const message = messageOption.value

		yield* userService.validateIsMemberOfChannel(ctx, userData, message.channelId)

		const newReactions = message.reactions.filter(
			(reaction) => !(reaction.emoji === emoji && reaction.userId === userData.user._id),
		)

		if (newReactions.length === message.reactions.length) {
			return yield* Effect.fail(new Error("You do not have permission to delete this reaction"))
		}

		yield* ctx.db.patch(id, {
			reactions: newReactions,
		})

		return null
	}),
})
