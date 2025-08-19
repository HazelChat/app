import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { asyncMap } from "convex-helpers"
import { internal } from "./_generated/api"
import { organizationServerMutation, organizationServerQuery } from "./middleware/withOrganization"
import { userMutation, userQuery } from "./middleware/withUser"
import { enrichAttachmentWithMetadata } from "./uploads"

export const getMessageForOrganization = organizationServerQuery({
	args: {
		channelId: v.id("channels"),
		id: v.id("messages"),
	},
	handler: async (ctx, args) => {
		// Validate user can view the channel
		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")
		if (channel.organizationId !== ctx.organizationId) throw new Error("Channel not in this organization")

		const message = await ctx.db.get(args.id)
		if (!message) throw new Error("Message not found")

		const messageAuthor = await ctx.db.get(message.authorId)
		if (!messageAuthor) throw new Error("Message author not found")

		return {
			...message,
			author: messageAuthor,
		}
	},
})

export const getMessage = userQuery({
	args: {
		channelId: v.id("channels"),
		id: v.id("messages"),
	},
	handler: async (ctx, args) => {
		await ctx.user.validateCanViewChannel({ ctx, channelId: args.channelId })

		const message = await ctx.db.get(args.id)
		if (!message) throw new Error("Message not found")

		const messageAuthor = await ctx.db.get(message.authorId)
		if (!messageAuthor) throw new Error("Message author not found")

		return {
			...message,
			author: messageAuthor,
		}
	},
})

export const getMessagesForOrganization = organizationServerQuery({
	args: {
		channelId: v.id("channels"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.query("users").first()

		if (!user) {
			throw new Error("User not found in this organization")
		}

		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")
		if (channel.organizationId !== ctx.organizationId) throw new Error("Channel not in this organization")

		// Validate user can view the channel
		// TODO: Add proper channel permission check here

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.order("desc")
			.paginate(args.paginationOpts)

		const messagesWithThreadMessages = await asyncMap(messages.page, async (message) => {
			if (message.threadChannelId) {
				const threadMessages = await ctx.db
					.query("messages")
					.withIndex("by_channelId", (q) => q.eq("channelId", message.threadChannelId!))
					.order("desc")
					.collect()

				return {
					...message,
					threadMessages,
				}
			}

			return message
		})

		const messagesWithAuthors = await asyncMap(messagesWithThreadMessages, async (message) => {
			const author = await ctx.db.get(message.authorId)
			if (!author) throw new Error("Message author not found")

			// Fetch attachments for the message with metadata from R2
			const attachments = await Promise.all(
				message.attachedFiles.map(async (attachmentId) => {
					const attachment = await ctx.db.get(attachmentId)
					if (!attachment) {
						return null
					}
					return enrichAttachmentWithMetadata(ctx, attachment)
				}),
			)

			return {
				...message,
				author,
				attachments: attachments.filter(Boolean),
			}
		})

		return {
			...messages,
			page: messagesWithAuthors,
		}
	},
})

export const getMessages = userQuery({
	args: {
		channelId: v.id("channels"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")

		await ctx.user.validateCanViewChannel({ ctx, channelId: args.channelId })

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.order("desc")
			.paginate(args.paginationOpts)

		const messagesWithThreadMessages = await asyncMap(messages.page, async (message) => {
			if (message.threadChannelId) {
				const threadMessages = await ctx.db
					.query("messages")
					.withIndex("by_channelId", (q) => q.eq("channelId", message.threadChannelId!))
					.collect()

				const threadMessagesWithAuthor = await asyncMap(threadMessages, async (message) => {
					const messageAuthor = await ctx.db.get(message.authorId)
					if (!messageAuthor) throw new Error("Message author not found")
					return {
						...message,
						author: messageAuthor,
					}
				})

				return {
					...message,
					threadMessages: threadMessagesWithAuthor,
				}
			}

			return {
				...message,
				threadMessages: [],
			}
		})

		const messagesWithAuthor = await asyncMap(messagesWithThreadMessages, async (message) => {
			const messageAuthor = await ctx.db.get(message.authorId)

			// TODO: This should not happen when user is deleted we should give all messages to a default user
			if (!messageAuthor) throw new Error("Message author not found")

			// Fetch attachments for the message with metadata from R2
			const attachments = await Promise.all(
				message.attachedFiles.map(async (attachmentId) => {
					const attachment = await ctx.db.get(attachmentId)
					if (!attachment) {
						return null
					}
					return enrichAttachmentWithMetadata(ctx, attachment)
				}),
			)

			return {
				...message,
				author: messageAuthor,
				attachments: attachments.filter(Boolean),
			}
		})

		return {
			...messages,
			page: messagesWithAuthor,
		}
	},
})

export const createMessage = userMutation({
	args: {
		content: v.string(),
		channelId: v.id("channels"),
		threadChannelId: v.optional(v.id("channels")),
		replyToMessageId: v.optional(v.id("messages")),
		attachedFiles: v.array(v.id("attachments")),
	},
	handler: async (ctx, args) => {
		// Allow empty content if there are attachments
		if (args.content.trim() === "" && args.attachedFiles.length === 0) {
			throw new Error("Message must have content or attachments")
		}

		await ctx.user.validateIsMemberOfChannel({ ctx, channelId: args.channelId })

		// Validate all attachments exist and belong to the user
		for (const attachmentId of args.attachedFiles) {
			const attachment = await ctx.db.get(attachmentId)
			if (!attachment) {
				throw new Error(`Attachment ${attachmentId} not found`)
			}
			if (attachment.uploadedBy !== ctx.user.id) {
				throw new Error(`You don't have permission to use attachment ${attachmentId}`)
			}
		}

		const messageId = await ctx.db.insert("messages", {
			channelId: args.channelId,
			content: args.content,
			threadChannelId: args.threadChannelId,
			authorId: ctx.user.id,
			replyToMessageId: args.replyToMessageId,
			attachedFiles: args.attachedFiles,
			reactions: [],
		})

		// Update attachments with messageId and channelId
		for (const attachmentId of args.attachedFiles) {
			await ctx.db.patch(attachmentId, {
				messageId,
				channelId: args.channelId,
			})
		}

		// TODO: This should be a database trigger
		await ctx.scheduler.runAfter(0, internal.background.index.sendNotification, {
			channelId: args.channelId,
			messageId: messageId,
			userId: ctx.user.id,
		})

		return messageId
	},
})

export const updateMessage = userMutation({
	args: {
		id: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.user.validateOwnsMessage({ ctx, messageId: args.id })

		await ctx.db.patch(args.id, {
			content: args.content,
			updatedAt: Date.now(),
		})

		return args.id
	},
})

export const deleteMessage = userMutation({
	args: {
		id: v.id("messages"),
	},
	handler: async (ctx, args) => {
		await ctx.user.validateOwnsMessage({ ctx, messageId: args.id })

		await ctx.db.delete(args.id)
	},
})

export const createReaction = userMutation({
	args: {
		messageId: v.id("messages"),
		emoji: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId)
		if (!message || message.deletedAt) throw new Error("Message not found")

		await ctx.user.validateIsMemberOfChannel({ ctx, channelId: message.channelId })

		if (
			message.reactions.some(
				(reaction) => reaction.userId === ctx.user.id && reaction.emoji === args.emoji,
			)
		) {
			throw new Error("You have already reacted to this message")
		}

		return await ctx.db.patch(args.messageId, {
			reactions: [...message.reactions, { userId: ctx.user.id, emoji: args.emoji }],
		})
	},
})

export const deleteReaction = userMutation({
	args: {
		id: v.id("messages"),
		emoji: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.id)
		if (!message) throw new Error("Message not found")

		await ctx.user.validateIsMemberOfChannel({ ctx, channelId: message.channelId })

		const newReactions = message.reactions.filter(
			(reaction) => !(reaction.emoji === args.emoji && reaction.userId === ctx.user.id),
		)

		if (newReactions.length === message.reactions.length) {
			throw new Error("You do not have permission to delete this reaction")
		}

		return await ctx.db.patch(args.id, {
			reactions: newReactions,
		})
	},
})
