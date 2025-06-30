import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { internal } from "../_generated/api"
import { ConfectMutationCtx, internalMutation } from "../confect"

const markdownToPlainText = (markdown: string): string => {
	if (!markdown) return ""

	let text = markdown

	// Remove code blocks first (triple backticks)
	text = text.replace(/```[\s\S]*?```/g, "[code block]")

	// Remove inline code (single backticks)
	text = text.replace(/`([^`]+)`/g, "$1")

	// Convert bold (**text** or __text__)
	text = text.replace(/(\*\*|__)(.*?)\1/g, "$2")

	// Convert italic (*text* or _text_)
	text = text.replace(/(\*|_)(.*?)\1/g, "$2")

	// Convert strikethrough (~~text~~)
	text = text.replace(/~~(.*?)~~/g, "$1")

	// Convert links [text](url) to just the text
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

	// Remove headers (# ## ### etc)
	text = text.replace(/^#{1,6}\s+/gm, "")

	// Convert blockquotes (remove > )
	text = text.replace(/^>\s+/gm, "")

	// Convert unordered lists (remove - * +)
	text = text.replace(/^[\s]*[-*+]\s+/gm, "• ")

	// Convert ordered lists (remove numbers)
	text = text.replace(/^[\s]*\d+\.\s+/gm, "• ")

	// Remove horizontal rules
	text = text.replace(/^[-*_]{3,}$/gm, "")

	// Clean up extra whitespace and newlines
	text = text.replace(/\n{3,}/g, "\n\n")
	text = text.replace(/^\s+|\s+$/g, "")

	return text
}

export const sendNotification = internalMutation({
	args: Schema.Struct({
		userId: Id.Id("users"),
		messageId: Id.Id("messages"),
		accountId: Id.Id("accounts"),
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ userId, messageId, channelId }) {
		const ctx = yield* ConfectMutationCtx

		const messageOption = yield* ctx.db.get(messageId)
		if (Option.isNone(messageOption)) return null

		const message = messageOption.value

		const authorOption = yield* ctx.db.get(message.authorId)
		if (Option.isNone(authorOption)) return null
		const author = authorOption.value

		const channelOption = yield* ctx.db.get(channelId)
		if (Option.isNone(channelOption)) return null
		const channel = channelOption.value

		const serverOption = yield* ctx.db.get(channel.serverId)
		if (Option.isNone(serverOption)) return null
		const server = serverOption.value

		const channelMembers = yield* ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channelId))
			.collect()

		const filteredChannelMembers = channelMembers.filter(
			(member) => !member.isMuted && member.userId !== userId,
		)

		yield* Effect.forEach(
			filteredChannelMembers,
			Effect.fn(function* (member) {
				const userOption = yield* ctx.db.get(member.userId)
				if (Option.isNone(userOption)) return null

				const user = userOption.value
				const accountOption = yield* ctx.db.get(user.accountId)
				if (Option.isNone(accountOption)) return null

				const account = accountOption.value

				yield* ctx.db.insert("notifications", {
					accountId: account._id,
					targetedResourceId: channelId,
					resourceId: messageId,
				})
			}),
		)

		const onlineUsers = yield* ctx.runQuery(internal.presence.listRoom, {
			roomId: channelId,
			onlineOnly: true,
		})

		yield* Effect.forEach(
			filteredChannelMembers,
			Effect.fn(function* (member) {
				if (!onlineUsers.find((user: any) => user.userId === member.userId)) return

				yield* ctx.db.patch(member._id, {
					notificationCount: member.notificationCount + 1,
					lastSeenMessageId: member.lastSeenMessageId ?? message._id,
				})

				const userOption = yield* ctx.db.get(member.userId)
				if (Option.isNone(userOption)) return null

				const user = userOption.value
				const accountOption = yield* ctx.db.get(user.accountId)
				if (Option.isNone(accountOption)) return null

				const account = accountOption.value

				const title =
					channel.type === "single" || channel.type === "direct"
						? `${author.displayName}`
						: `${author.displayName} (#${channel.name}, ${server.name})`

				const plainTextContent = markdownToPlainText(message.content)

				yield* ctx.scheduler.runAfter(0, internal.expo.sendPushNotification, {
					title: title,
					to: account._id,
					body: plainTextContent,
				})
			}),
		)

		return null
	}),
})
