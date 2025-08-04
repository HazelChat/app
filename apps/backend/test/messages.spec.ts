import type schema from "@hazel/backend/schema"
import type { TestConvex } from "convex-test"
import { describe, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api"
import {
	convexTest,
	createAccount,
	createChannel,
	createMessage,
	createServerAndAccount,
	createUser,
	randomIdentity,
} from "./utils/data-generator"

async function setupOrganizationAndUser(convexTest: TestConvex<typeof schema>) {
	const t = randomIdentity(convexTest)
	const { organization, userId } = await createServerAndAccount(t)

	const channelId = await createChannel(t, { organizationId: organization })

	return { organization, userId, channelId, t }
}

async function setupMultipleUsers(convexTest: TestConvex<typeof schema>) {
	const t1 = randomIdentity(convexTest)
	const { organization, userId: user1Id } = await createServerAndAccount(t1)

	const t2 = randomIdentity(convexTest)
	await createAccount(t2)
	const user2Id = await createUser(t2, { organizationId: organization, role: "member" })

	const channelId = await createChannel(t1, { organizationId: organization })

	return { organization, user1Id, user2Id, channelId, t1, t2 }
}

describe("messages", () => {
	test("creation and retrieval works", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		expect(messages.page).toHaveLength(1)
		expect(messages.page[0]?._id).toEqual(messageId)
		expect(messages.page[0]?.content).toEqual("Test message content")
		expect(messages.page[0]?.authorId).toEqual(userId)
		expect(messages.page[0]?.channelId).toEqual(channelId)
	})

	test("creates message with attached files", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const attachedFiles = ["file1.jpg", "file2.pdf", "file3.txt"]

		const _messageId = await createMessage(t, {
			organizationId: organization,
			channelId,

			attachedFiles,
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		expect(messages.page[0]?.attachedFiles).toEqual(attachedFiles)
	})

	test("creates reply message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Create original message
		const originalMessageId = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "Original message",
		})

		// Create reply
		const replyMessageId = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "This is a reply",
			replyToMessageId: originalMessageId,
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		// Messages should be ordered by creation time (newest first)
		expect(messages.page).toHaveLength(2)
		const replyMessage = messages.page.find((m: any) => m._id === replyMessageId)
		expect(replyMessage?.replyToMessageId).toEqual(originalMessageId)
		expect(replyMessage?.content).toEqual("This is a reply")
	})

	test("creates thread message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const threadChannelId = await createChannel(t, { organizationId: organization })

		const _messageId = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "Message in thread",
			threadChannelId,
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		expect(messages.page[0]?.threadChannelId).toEqual(threadChannelId)
	})

	test("user can update their own message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "Original content",
		})

		// Update the message
		await t.mutation(api.messages.updateMessage, {
			organizationId: organization,
			id: messageId,
			content: "Updated content",
			jsonContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Updated content" }] }] },
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		expect(messages.page[0]?.content).toEqual("Updated content")
	})

	test("user cannot update another user's message", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, channelId, t1, t2 } = await setupMultipleUsers(ct)

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// User 1 creates a message
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId,
			content: "User 1's message",
		})

		// User 2 tries to update User 1's message
		await expect(
			t2.mutation(api.messages.updateMessage, {
				organizationId: organization,
				id: messageId,
				content: "Hacked content",
			}),
		).rejects.toThrow()
	})

	test("user can delete their own message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Delete the message
		await t.mutation(api.messages.deleteMessage, {
			organizationId: organization,
			id: messageId,
		})

		await expect(
			t.query(api.messages.getMessage, {
				id: messageId,
				channelId,
				organizationId: organization,
			}),
		).rejects.toThrowError()
	})

	test("user cannot delete another user's message", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, channelId, t1, t2 } = await setupMultipleUsers(ct)

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// User 1 creates a message
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId,
		})

		// User 2 tries to delete User 1's message
		await expect(
			t2.mutation(api.messages.deleteMessage, {
				organizationId: organization,
				id: messageId,
			}),
		).rejects.toThrow()
	})

	test("pagination works correctly", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Create multiple messages
		const messageIds = []
		for (let i = 0; i < 5; i++) {
			const messageId = await createMessage(t, {
				organizationId: organization,
				channelId,

				content: `Message ${i + 1}`,
			})
			messageIds.push(messageId)
		}

		// Get first page with limit of 3
		const firstPage = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 3, cursor: null },
		})
		expect(firstPage.page).toHaveLength(3)
		expect(firstPage.isDone).toBe(false)

		// Get next page
		const secondPage = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 3, cursor: firstPage.continueCursor },
		})

		expect(secondPage.page).toHaveLength(2)
		expect(secondPage.isDone).toBe(true)

		// Verify no overlap between pages
		const firstPageIds = firstPage.page.map((m: any) => m._id)
		const secondPageIds = secondPage.page.map((m: any) => m._id)
		const overlap = firstPageIds.filter((id: any) => secondPageIds.includes(id))
		expect(overlap).toHaveLength(0)
	})

	test.skip("user cannot create message in channel they're not member of", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a separate channel
		const separateChannelId = await createChannel(t1, { organizationId: organization })

		// User 2 tries to create a message without being a member
		await expect(
			createMessage(t2, {
				organizationId: organization,
				channelId: separateChannelId,
			}),
		).rejects.toThrow()
	})

	// TODO: This is not implemented yet
	// test("user cannot view messages in channel they're not member of", async () => {
	// 	const ct = convexTest()
	// 	const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

	// 	// User 1 creates a separate channel and message
	// 	const separateChannelId = await createChannel(t1, { organizationId: organization })
	// 	await createMessage(t1, {
	// 		organizationId: organization,
	// 		channelId: separateChannelId,
	// 	})

	// 	// User 2 tries to view messages without being a member
	// 	await expect(
	// 		t2.query(api.messages.getMessages, {
	// 			organizationId: organization,
	// 			channelId: separateChannelId,
	// 			paginationOpts: { numItems: 10, cursor: null },
	// 		}),
	// 	).rejects.toThrow()
	// })

	test("messages are ordered by creation time (newest first)", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Create messages with slight delays to ensure different timestamps
		const _message1Id = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "First message",
		})

		// Add a small delay to ensure different timestamps
		await new Promise(resolve => setTimeout(resolve, 10))

		const _message2Id = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "Second message",
		})

		// Add a small delay to ensure different timestamps
		await new Promise(resolve => setTimeout(resolve, 10))

		const _message3Id = await createMessage(t, {
			organizationId: organization,
			channelId,

			content: "Third message",
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		// Should be ordered newest first
		expect(messages.page).toHaveLength(3)
		expect(messages.page[0]?.content).toEqual("Third message")
		expect(messages.page[1]?.content).toEqual("Second message")
		expect(messages.page[2]?.content).toEqual("First message")
	})

	test.skip("empty content message is rejected", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		await expect(
			createMessage(t, {
				organizationId: organization,
				channelId,
				content: "",
			}),
		).rejects.toThrow()
	})

	test.skip("message with only whitespace is rejected", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		await expect(
			createMessage(t, {
				organizationId: organization,
				channelId,
				content: "   \n\t   ",
			}),
		).rejects.toThrow()
	})

	test("multiple users can create messages in same channel", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, channelId, t1, t2 } = await setupMultipleUsers(ct)

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// Both users create messages
		const _message1Id = await createMessage(t1, {
			organizationId: organization,
			channelId,
			content: "Message from user 1",
		})

		const _message2Id = await createMessage(t2, {
			organizationId: organization,
			channelId,
			content: "Message from user 2",
		})

		// Both users should see both messages
		const messages1 = await t1.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		const messages2 = await t2.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		expect(messages1.page).toHaveLength(2)
		expect(messages2.page).toHaveLength(2)

		// Verify authors
		const user1Message = messages1.page.find((m: any) => m.authorId === user1Id)
		const user2Message = messages1.page.find((m: any) => m.authorId === user2Id)

		expect(user1Message?.content).toEqual("Message from user 1")
		expect(user2Message?.content).toEqual("Message from user 2")
	})
})

describe("reactions", () => {
	test("user can add reaction to message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Add reaction
		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		const message = messages.page[0]
		expect(message?.reactions).toHaveLength(1)
		expect(message?.reactions[0]?.userId).toEqual(userId)
		expect(message?.reactions[0]?.emoji).toEqual("👍")
	})

	test("user can remove their own reaction", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Add reaction
		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		// Remove reaction
		await t.mutation(api.messages.deleteReaction, {
			organizationId: organization,
			id: messageId,
			emoji: "👍",
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		const message = messages.page[0]
		expect(message?.reactions).toHaveLength(0)
	})

	test("user cannot add duplicate reaction", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Add reaction
		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		// Try to add same reaction again
		await expect(
			t.mutation(api.messages.createReaction, {
				organizationId: organization,
				messageId,
				emoji: "👍",
			}),
		).rejects.toThrow("You have already reacted to this message")
	})

	test("user can add different emoji reactions to same message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Add multiple different reactions
		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "❤️",
		})

		await t.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "😂",
		})

		const messages = await t.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		const message = messages.page[0]
		expect(message?.reactions).toHaveLength(3)

		const emojis = message?.reactions.map((r: any) => r.emoji).sort()
		expect(emojis).toEqual(["👍", "❤️", "😂"].sort())
	})

	test("multiple users can react to same message", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, channelId, t1, t2 } = await setupMultipleUsers(ct)

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId,
		})

		// Both users add reactions
		await t1.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		await t2.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		const messages = await t1.query(api.messages.getMessages, {
			organizationId: organization,
			channelId,
			paginationOpts: { numItems: 10, cursor: null },
		})

		const message = messages.page[0]
		expect(message?.reactions).toHaveLength(2)

		const userIds = message?.reactions.map((r: any) => r.userId).sort()
		expect(userIds).toEqual([user1Id, user2Id].sort())
	})

	test("user cannot remove another user's reaction", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, channelId, t1, t2 } = await setupMultipleUsers(ct)

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId,
		})

		// User 1 adds reaction
		await t1.mutation(api.messages.createReaction, {
			organizationId: organization,
			messageId,
			emoji: "👍",
		})

		// User 2 tries to remove User 1's reaction
		await expect(
			t2.mutation(api.messages.deleteReaction, {
				organizationId: organization,
				id: messageId,
				emoji: "👍",
			}),
		).rejects.toThrow("You do not have permission to delete this reaction")
	})

	test("user cannot react to message in channel they're not member of", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a separate channel and message
		const separateChannelId = await createChannel(t1, { organizationId: organization })
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId: separateChannelId,
		})

		// User 2 tries to react without being a member
		await expect(
			t2.mutation(api.messages.createReaction, {
				organizationId: organization,
				messageId,
				emoji: "👍",
			}),
		).rejects.toThrow()
	})

	test("user cannot react to deleted message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Try to react to deleted message

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})
		await t.mutation(api.messages.deleteMessage, {
			organizationId: organization,
			id: messageId,
		})

		await expect(
			t.mutation(api.messages.createReaction, {
				organizationId: organization,
				messageId,
				emoji: "👍",
			}),
		).rejects.toThrow("Message not found")
	})

	test("removing non-existent reaction fails gracefully", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Try to remove reaction that doesn't exist
		await expect(
			t.mutation(api.messages.deleteReaction, {
				organizationId: organization,
				id: messageId,
				emoji: "👍",
			}),
		).rejects.toThrow("You do not have permission to delete this reaction")
	})
})

describe("pinning", () => {
	test("user can pin message in channel", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Pin the message
		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId,
			channelId,
		})

		// Get pinned messages
		const pinnedMessages = await t.query(api.pinnedMessages.getPinnedMessages, {
			channelId,
			organizationId: organization,
		})

		expect(pinnedMessages).toHaveLength(1)
		expect(pinnedMessages[0]?.messageId).toEqual(messageId)
		expect(pinnedMessages[0]?.channelId).toEqual(channelId)
	})

	test("user can unpin message", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Pin the message
		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId,
			channelId,
		})

		// Unpin the message
		await t.mutation(api.pinnedMessages.deletePinnedMessage, {
			organizationId: organization,
			channelId,
			messageId,
		})

		// Get pinned messages
		const pinnedMessages = await t.query(api.pinnedMessages.getPinnedMessages, {
			channelId,
			organizationId: organization,
		})

		expect(pinnedMessages).toHaveLength(0)
	})

	test("multiple messages can be pinned in same channel", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Create multiple messages
		const message1Id = await createMessage(t, {
			organizationId: organization,
			channelId,
			content: "First message",
		})

		const message2Id = await createMessage(t, {
			organizationId: organization,
			channelId,
			content: "Second message",
		})

		const message3Id = await createMessage(t, {
			organizationId: organization,
			channelId,
			content: "Third message",
		})

		// Pin all messages
		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId: message1Id,
			channelId,
		})

		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId: message2Id,
			channelId,
		})

		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId: message3Id,
			channelId,
		})

		// Get pinned messages
		const pinnedMessages = await t.query(api.pinnedMessages.getPinnedMessages, {
			channelId,
			organizationId: organization,
		})

		expect(pinnedMessages).toHaveLength(3)

		const pinnedMessageIds = pinnedMessages.map((pm: any) => pm.messageId).sort()
		expect(pinnedMessageIds).toEqual([message1Id, message2Id, message3Id].sort())
	})

	test("user cannot pin message in channel they're not member of", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a separate channel and message
		const separateChannelId = await createChannel(t1, { organizationId: organization })
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId: separateChannelId,
		})

		// User 2 tries to pin message without being a member
		await expect(
			t2.mutation(api.pinnedMessages.createPinnedMessage, {
				organizationId: organization,
				messageId,
				channelId: separateChannelId,
			}),
		).rejects.toThrow()
	})

	test("user cannot view pinned messages in channel they're not member of", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a separate channel, message, and pins it
		const separateChannelId = await createChannel(t1, { organizationId: organization, type: "private" })
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId: separateChannelId,
		})

		await t1.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId,
			channelId: separateChannelId,
		})

		// User 2 tries to view pinned messages without being a member
		await expect(
			t2.query(api.pinnedMessages.getPinnedMessages, {
				channelId: separateChannelId,
				organizationId: organization,
			}),
		).rejects.toThrow()
	})

	test("user cannot unpin message they don't have access to", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a separate channel, message, and pins it
		const separateChannelId = await createChannel(t1, { organizationId: organization })
		const messageId = await createMessage(t1, {
			organizationId: organization,
			channelId: separateChannelId,
		})

		const _pinnedMessageId = await t1.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId,
			channelId: separateChannelId,
		})

		// User 2 tries to unpin message without access
		await expect(
			t2.mutation(api.pinnedMessages.deletePinnedMessage, {
				organizationId: organization,
				messageId: messageId,
				channelId: separateChannelId,
			}),
		).rejects.toThrow()
	})

	test("pinned messages are isolated per channel", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		// Create second channel
		const channel2Id = await createChannel(t, { organizationId: organization })

		// Create messages in both channels
		const message1Id = await createMessage(t, {
			organizationId: organization,
			channelId,
			content: "Message in channel 1",
		})

		const message2Id = await createMessage(t, {
			organizationId: organization,
			channelId: channel2Id,
			content: "Message in channel 2",
		})

		// Pin messages in both channels
		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId: message1Id,
			channelId,
		})

		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId: message2Id,
			channelId: channel2Id,
		})

		// Get pinned messages for each channel
		const pinnedMessages1 = await t.query(api.pinnedMessages.getPinnedMessages, {
			channelId,
			organizationId: organization,
		})

		const pinnedMessages2 = await t.query(api.pinnedMessages.getPinnedMessages, {
			channelId: channel2Id,
			organizationId: organization,
		})

		// Each channel should only see its own pinned messages
		expect(pinnedMessages1).toHaveLength(1)
		expect(pinnedMessages1[0]?.messageId).toEqual(message1Id)

		expect(pinnedMessages2).toHaveLength(1)
		expect(pinnedMessages2[0]?.messageId).toEqual(message2Id)
	})

	test("same message cannot be pinned twice in same channel", async () => {
		const ct = convexTest()
		const { organization, userId, channelId, t } = await setupOrganizationAndUser(ct)

		const messageId = await createMessage(t, {
			organizationId: organization,
			channelId,
		})

		// Pin the message
		await t.mutation(api.pinnedMessages.createPinnedMessage, {
			organizationId: organization,
			messageId,
			channelId,
		})

		// Try to pin the same message again
		await expect(
			t.mutation(api.pinnedMessages.createPinnedMessage, {
				organizationId: organization,
				messageId,
				channelId,
			}),
		).rejects.toThrow()
	})
})
