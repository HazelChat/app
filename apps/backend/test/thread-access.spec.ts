import type { TestConvex } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "../convex/_generated/api"
import type schema from "../convex/schema"
import {
	convexTest,
	createAccount,
	createChannel,
	createMessage,
	createOrganization,
	randomIdentity,
} from "./utils/data-generator"

async function setupTestEnvironment(ct: TestConvex<typeof schema>) {
	// Create organization
	const org = await createOrganization(ct)
	const orgDoc = await ct.run(async (ctx) => {
		const doc = await ctx.db.get(org)
		if (!doc || !("workosId" in doc)) throw new Error("Invalid organization")
		return doc
	})

	// Create user 1 (thread creator)
	const t1 = randomIdentity(ct, orgDoc.workosId)
	const user1Id = await createAccount(t1)
	await t1.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId: org,
			userId: user1Id,
			role: "member",
			joinedAt: Date.now(),
		})
	})

	// Create user 2 (another member)
	const t2 = randomIdentity(ct, orgDoc.workosId)
	const user2Id = await createAccount(t2)
	await t2.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId: org,
			userId: user2Id,
			role: "member",
			joinedAt: Date.now(),
		})
	})

	// Create user 3 (non-member)
	const t3 = randomIdentity(ct, orgDoc.workosId)
	const user3Id = await createAccount(t3)
	await t3.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId: org,
			userId: user3Id,
			role: "member",
			joinedAt: Date.now(),
		})
	})

	return { organization: org, user1Id, user2Id, user3Id, t1, t2, t3 }
}

describe("thread channel access", () => {
	test("users who can access parent channel can access thread channels", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupTestEnvironment(ct)

		// User 1 creates a public channel
		const channelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Public Channel",
			type: "public",
		})

		// User 2 joins the public channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// User 1 creates a message in the channel
		const messageId = await t1.mutation(api.messages.createMessage, {
			organizationId: organization,
			channelId,
			content: "Let's start a thread!",
			jsonContent: {},
			attachedFiles: [],
		})

		// User 1 creates a thread from that message
		const threadChannelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Thread",
			type: "thread",
			parentChannelId: channelId,
			threadMessageId: messageId,
		})

		// User 2 should be able to view the thread channel (via parent channel access)
		const threadChannel = await t2.query(api.channels.getChannel, {
			organizationId: organization,
			channelId: threadChannelId,
		})
		expect(threadChannel).toBeDefined()
		expect(threadChannel._id).toEqual(threadChannelId)

		// User 2 should be able to send messages to the thread
		const threadMessageId = await t2.mutation(api.messages.createMessage, {
			organizationId: organization,
			channelId: threadChannelId,
			content: "I can participate in the thread!",
			jsonContent: {},
			attachedFiles: [],
		})
		expect(threadMessageId).toBeDefined()

		// User 2 should be able to retrieve messages from the thread
		const messages = await t2.query(api.messages.getMessages, {
			organizationId: organization,
			channelId: threadChannelId,
			paginationOpts: { numItems: 10, cursor: null },
		})
		expect(messages.page).toHaveLength(1)
		expect(messages.page[0]?.content).toEqual("I can participate in the thread!")
	})

	test("users who cannot access parent channel cannot access thread channels", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, user3Id, t1, t2, t3 } = await setupTestEnvironment(ct)

		// User 1 creates a private channel
		const channelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Private Channel",
			type: "private",
		})

		// User 2 joins the private channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// User 1 creates a message in the channel
		const messageId = await t1.mutation(api.messages.createMessage, {
			organizationId: organization,
			channelId,
			content: "Private discussion",
			jsonContent: {},
			attachedFiles: [],
		})

		// User 1 creates a thread from that message
		const threadChannelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Private Thread",
			type: "thread",
			parentChannelId: channelId,
			threadMessageId: messageId,
		})

		// User 3 (not a member of the private channel) should NOT be able to view the thread
		await expect(
			t3.query(api.channels.getChannel, {
				organizationId: organization,
				channelId: threadChannelId,
			})
		).rejects.toThrow("You do not have access to this channel")

		// User 3 should NOT be able to send messages to the thread
		await expect(
			t3.mutation(api.messages.createMessage, {
				organizationId: organization,
				channelId: threadChannelId,
				content: "I shouldn't be able to send this",
				jsonContent: {},
				attachedFiles: [],
			})
		).rejects.toThrow("You are not a member of this channel")

		// User 3 should NOT be able to retrieve messages from the thread
		await expect(
			t3.query(api.messages.getMessages, {
				organizationId: organization,
				channelId: threadChannelId,
				paginationOpts: { numItems: 10, cursor: null },
			})
		).rejects.toThrow("You do not have access to this channel")
	})

	test("thread access updates when parent channel membership changes", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupTestEnvironment(ct)

		// User 1 creates a private channel
		const channelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Dynamic Channel",
			type: "private",
		})

		// User 1 creates a message in the channel
		const messageId = await t1.mutation(api.messages.createMessage, {
			organizationId: organization,
			channelId,
			content: "Let's test dynamic access",
			jsonContent: {},
			attachedFiles: [],
		})

		// User 1 creates a thread from that message
		const threadChannelId = await t1.mutation(api.channels.createChannel, {
			organizationId: organization,
			name: "Dynamic Thread",
			type: "thread",
			parentChannelId: channelId,
			threadMessageId: messageId,
		})

		// Initially, User 2 should NOT be able to access the thread (not in parent channel)
		await expect(
			t2.query(api.channels.getChannel, {
				organizationId: organization,
				channelId: threadChannelId,
			})
		).rejects.toThrow("You do not have access to this channel")

		// User 2 joins the parent channel
		await t2.mutation(api.channels.joinChannel, {
			organizationId: organization,
			channelId,
		})

		// Now User 2 SHOULD be able to access the thread
		const threadChannel = await t2.query(api.channels.getChannel, {
			organizationId: organization,
			channelId: threadChannelId,
		})
		expect(threadChannel).toBeDefined()
		expect(threadChannel._id).toEqual(threadChannelId)

		// User 2 leaves the parent channel
		await t2.mutation(api.channels.leaveChannel, {
			organizationId: organization,
			channelId,
		})

		// User 2 should NO LONGER be able to access the thread
		await expect(
			t2.query(api.channels.getChannel, {
				organizationId: organization,
				channelId: threadChannelId,
			})
		).rejects.toThrow("You do not have access to this channel")
	})
})