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
	createServerAndAccount,
	createUser,
	randomIdentity,
} from "./utils/data-generator"

async function setupOrganizationAndUser(convexTest: TestConvex<typeof schema>) {
	const ct = convexTest
	const org = await createOrganization(ct)
	const orgDoc = await ct.run(async (ctx) => {
		const doc = await ctx.db.get(org)
		if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
		return doc
	})
	
	const t = randomIdentity(ct, orgDoc.workosId)
	const userId = await createAccount(t)
	
	// Add user to organization
	await t.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId: org,
			userId,
			role: "owner",
			joinedAt: Date.now(),
		})
	})

	return { organization: org, userId, t }
}

async function setupMultipleUsers(convexTest: TestConvex<typeof schema>) {
	const ct = convexTest
	const org = await createOrganization(ct)
	const orgDoc = await ct.run(async (ctx) => {
		const doc = await ctx.db.get(org)
		if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
		return doc
	})
	
	const t1 = randomIdentity(ct, orgDoc.workosId)
	const user1Id = await createAccount(t1)
	await t1.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId: org,
			userId: user1Id,
			role: "owner",
			joinedAt: Date.now(),
		})
	})

	const t2 = randomIdentity(ct, orgDoc.workosId)
	const user2Id = await createAccount(t2)
	await createUser(t2, { organizationId: org, role: "member" })

	return { organization: org, user1Id, user2Id, t1, t2 }
}

describe("channel", () => {
	test("creation and retrieval works", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		const channelId = await createChannel(t, { organizationId: organization })
		const channels = await t.query(api.channels.getChannelsForOrganization, {})
		expect(channels.dmChannels).toHaveLength(0)
		expect(channels.organizationChannels).toHaveLength(1)
		expect(channels.organizationChannels[0]?._id).toEqual(channelId)
	})

	test("creates different channel types correctly", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		// Create public channel
		const publicChannelId = await t.mutation(api.channels.createChannelForOrganization, {
			name: "Public Channel",
			type: "public",
		})

		// Create private channel
		const privateChannelId = await t.mutation(api.channels.createChannelForOrganization, {
			name: "Private Channel",
			type: "private",
		})

		// Direct channels are not supported by createChannelForOrganization
		// Use the helper function instead
		const directChannelId = await createChannel(t, { 
			organizationId: organization,
			type: "direct" as any
		})

		const channels = await t.query(api.channels.getChannelsForOrganization, {})

		// Public and private channels should be in serverChannels
		expect(channels.organizationChannels).toHaveLength(2)
		expect(channels.organizationChannels.map((c: any) => c._id)).toContain(publicChannelId)
		expect(channels.organizationChannels.map((c: any) => c._id)).toContain(privateChannelId)

		// Direct channel should be in dmChannels
		expect(channels.dmChannels).toHaveLength(1)
		expect(channels.dmChannels[0]?._id).toEqual(directChannelId)
	})

	test.skip("creates thread channel with parent", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		// Create parent channel
		const parentChannelId = await createChannel(t, { organizationId: organization })

		const messageId = await createMessage(t, {
			channelId: parentChannelId,
			content: "Message in parent channel",
		})

		// Create thread channel
		const _threadChannelId = await t.mutation(api.channels.createChannelForOrganization, {
			name: "Thread Channel",
			type: "thread",
			parentChannelId,
			threadMessageId: messageId,
		})

		const channels = await t.query(api.channels.getChannelsForOrganization, {})

		// Should not return thread channel
		expect(channels.organizationChannels).toHaveLength(1)
		expect(channels.dmChannels).toHaveLength(0)
		expect(channels.organizationChannels[0]?._id).toEqual(parentChannelId)
	})

	test("channel owner is automatically added as member", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		const _channelId = await createChannel(t, { organizationId: organization })
		const channels = await t.query(api.channels.getChannelsForOrganization, {})

		const channel = channels?.organizationChannels?.[0]
		expect(channel?.members).toHaveLength(1)
		expect(channel?.members[0]?.userId).toEqual(userId)
		expect(channel?.currentUser?.userId).toEqual(userId)
		expect(channel?.isMuted).toBe(false)
		expect(channel?.isHidden).toBe(false)
	})

	test("user can join a channel", async () => {
		const ct = convexTest()
		const { organization, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { organizationId: organization })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannelForOrganization, {
			channelId,
		})

		// Check from user 1's perspective
		const channels1 = await t1.query(api.channels.getChannelsForOrganization, {})
		const channel1 = channels1.organizationChannels[0]
		expect(channel1?.members).toHaveLength(2)

		// Check from user 2's perspective
		const channels2 = await t2.query(api.channels.getChannelsForOrganization, {})
		const channel2 = channels2.organizationChannels[0]
		expect(channel2?.members).toHaveLength(2)
		expect(channel2?.currentUser?.userId).toEqual(user2Id)
	})

	test("user cannot join channel they're already in", async () => {
		const ct = convexTest()
		const { organization, t } = await setupOrganizationAndUser(ct)

		const channelId = await createChannel(t, { organizationId: organization })

		// Try to join again
		await expect(
			t.mutation(api.channels.joinChannelForOrganization, {
					channelId,
			}),
		).rejects.toThrow("Already a member of this channel")
	})

	test("user can leave a channel", async () => {
		const ct = convexTest()
		const { organization, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { organizationId: organization })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannelForOrganization, {
			channelId,
		})

		// User 2 leaves the channel
		await t2.mutation(api.channels.leaveChannelForOrganization, {
			channelId,
		})

		// Check from user 1's perspective - should still see the channel with 1 member
		const channels1 = await t1.query(api.channels.getChannelsForOrganization, {})
		expect(channels1.organizationChannels).toHaveLength(1)
		expect(channels1.organizationChannels[0]?.members).toHaveLength(1)

		// Check from user 2's perspective - should not see the channel
		const channels2 = await t2.query(api.channels.getChannelsForOrganization, {})
		expect(channels2.organizationChannels).toHaveLength(0)
	})

	test("user cannot leave channel they're not in", async () => {
		const ct = convexTest()
		const { organization, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { organizationId: organization })

		// User 2 tries to leave without joining
		await expect(
			t2.mutation(api.channels.leaveChannelForOrganization, {
					channelId,
			}),
		).rejects.toThrow("You are not a member of this channel")
	})

	test("user can update channel preferences", async () => {
		const ct = convexTest()
		const { organization, t } = await setupOrganizationAndUser(ct)

		const channelId = await createChannel(t, { organizationId: organization })

		// Update preferences
		await t.mutation(api.channels.updateChannelPreferencesForOrganization, {
			channelId,
			isMuted: true,
			isFavorite: true,
		})

		const channels = await t.query(api.channels.getChannelsForOrganization, {})
		const channel = channels?.organizationChannels?.[0]

		expect(channel?.isMuted).toBe(true)
		expect(channel?.isFavorite).toBe(true)
		expect(channel?.currentUser?.isMuted).toBe(true)
		expect(channel?.currentUser?.isFavorite).toBe(true)
	})

	test("user can partially update channel preferences", async () => {
		const ct = convexTest()
		const { organization, t } = await setupOrganizationAndUser(ct)

		const channelId = await createChannel(t, { organizationId: organization })

		// Update only muted status
		await t.mutation(api.channels.updateChannelPreferencesForOrganization, {
			channelId,
			isMuted: true,
		})

		const channels = await t.query(api.channels.getChannelsForOrganization, {})
		const channel = channels?.organizationChannels?.[0]

		expect(channel?.isMuted).toBe(true)
		expect(channel?.isHidden).toBe(false) // Should remain unchanged
	})

	test("user cannot update preferences for channel they're not in", async () => {
		const ct = convexTest()
		const { organization, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { organizationId: organization })

		// User 2 tries to update preferences without being a member
		await expect(
			t2.mutation(api.channels.updateChannelPreferencesForOrganization, {
					channelId,
				isMuted: true,
			}),
		).rejects.toThrow("You are not a member of this channel")
	})

	test("getChannels filters out channels user is not member of", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const _channelId = await createChannel(t1, { organizationId: organization })

		// User 1 should see the channel
		const channels1 = await t1.query(api.channels.getChannelsForOrganization, {})
		expect(channels1.organizationChannels).toHaveLength(1)

		// User 2 should not see the channel
		const channels2 = await t2.query(api.channels.getChannelsForOrganization, {})
		expect(channels2.organizationChannels).toHaveLength(0)
	})

	test("getChannels correctly categorizes channels by type", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		// Create various channel types
		await t.mutation(api.channels.createChannelForOrganization, {
			name: "Public Channel",
			type: "public",
		})

		await t.mutation(api.channels.createChannelForOrganization, {
			name: "Private Channel",
			type: "private",
		})

		// Direct channels are not supported by createChannelForOrganization
		await createChannel(t, { 
			organizationId: organization,
			type: "direct" as any
		})

		// await t.mutation(api.channels.createChannelForOrganization, {
		// 	organizationId: organization,
		// 	name: "Single Channel",
		// 	type: "single",
		// })

		const channels = await t.query(api.channels.getChannelsForOrganization, {})

		// Public, private, and thread should be in serverChannels
		expect(channels.organizationChannels).toHaveLength(2)

		// Direct and single should be in dmChannels
		expect(channels.dmChannels).toHaveLength(1)
	})

	test.skip("hidden channels are filtered out by getChannelsForOrganization", async () => {
		const ct = convexTest()
		const { organization, userId, t } = await setupOrganizationAndUser(ct)

		const channelId = await createChannel(t, { organizationId: organization })

		// Hide the channel
		await t.mutation(api.channels.updateChannelPreferencesForOrganization, {
			channelId,
			isHidden: true,
		})

		const channels = await t.query(api.channels.getChannelsForOrganization, {})

		// Channel should still be returned
		expect(channels.organizationChannels).toHaveLength(1)
		expect(channels.organizationChannels[0]?.isHidden).toBe(true)
	})

	test("different users can have different preferences for the same channel", async () => {
		const ct = convexTest()
		const { organization, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { organizationId: organization })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannelForOrganization, {
			channelId,
		})

		// User 1 mutes the channel
		await t1.mutation(api.channels.updateChannelPreferencesForOrganization, {
			channelId,
			isMuted: true,
		})

		// User 2 sets as favorite
		await t2.mutation(api.channels.updateChannelPreferencesForOrganization, {
			channelId,
			isFavorite: true,
		})

		// Check user 1's perspective
		const channels1 = await t1.query(api.channels.getChannelsForOrganization, {})
		const channel1 = channels1.organizationChannels[0]
		expect(channel1?.isMuted).toBe(true)
		expect(channel1?.isFavorite).toBe(false)
		expect(channel1?.currentUser?.isMuted).toBe(true)
		expect(channel1?.currentUser?.isFavorite).toBe(false)

		// Check user 2's perspective
		const channels2 = await t2.query(api.channels.getChannelsForOrganization, {})
		const channel2 = channels2.organizationChannels[0]
		expect(channel2?.isMuted).toBe(false)
		expect(channel2?.isFavorite).toBe(true)
		expect(channel2?.currentUser?.isMuted).toBe(false)
		expect(channel2?.currentUser?.isFavorite).toBe(true)

		// Verify both users are still members
		expect(channel1?.members).toHaveLength(2)
		expect(channel2?.members).toHaveLength(2)
	})
})
