import type { TestConvex } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "../convex/_generated/api"
import {
	convexTest,
	createChannel,
	createServerAndAccount,
	randomIdentity,
	createUser,
	createAccount,
} from "./utils/data-generator"
import type schema from "../convex/schema"

async function setupServerAndUser(convexTest: TestConvex<typeof schema>) {
	const t = randomIdentity(convexTest)
	const { server } = await createServerAndAccount(t)

	const users = await t.query(api.users.getUsers, { serverId: server })

	return { server, userId: users[0]._id, t }
}

async function setupMultipleUsers(convexTest: TestConvex<typeof schema>) {
	const t1 = randomIdentity(convexTest)
	const { server } = await createServerAndAccount(t1)

	const t2 = randomIdentity(convexTest)
	await createAccount(t2)
	const user2Id = await createUser(t2, { serverId: server, role: "member" })

	const users = await t1.query(api.users.getUsers, { serverId: server })
	const user1Id = users[0]._id

	return { server, user1Id, user2Id, t1, t2 }
}

describe("channel", () => {
	test("creation and retrieval works", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })
		const channels = await t.query(api.channels.getChannels, { serverId: server })
		expect(channels.dmChannels).toHaveLength(0)
		expect(channels.serverChannels).toHaveLength(1)
		expect(channels.serverChannels[0]?._id).toEqual(channelId)
	})

	test("creates different channel types correctly", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		// Create public channel
		const publicChannelId = await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Public Channel",
			type: "public",
			ownerId: userId,
		})

		// Create private channel
		const privateChannelId = await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Private Channel",
			type: "private",
			ownerId: userId,
		})

		// Create direct channel
		const directChannelId = await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Direct Channel",
			type: "direct",
			ownerId: userId,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })

		// Public and private channels should be in serverChannels
		expect(channels.serverChannels).toHaveLength(2)
		expect(channels.serverChannels.map((c: any) => c._id)).toContain(publicChannelId)
		expect(channels.serverChannels.map((c: any) => c._id)).toContain(privateChannelId)

		// Direct channel should be in dmChannels
		expect(channels.dmChannels).toHaveLength(1)
		expect(channels.dmChannels[0]?._id).toEqual(directChannelId)
	})

	test("creates thread channel with parent", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		// Create parent channel
		const parentChannelId = await createChannel(t, { serverId: server, userId })

		// Create thread channel
		const threadChannelId = await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Thread Channel",
			type: "thread",
			ownerId: userId,
			parentChannelId,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })

		// Should not return thread channel
		expect(channels.serverChannels).toHaveLength(1)
		expect(channels.dmChannels).toHaveLength(0)
		expect(channels.serverChannels[0]?._id).toEqual(parentChannelId)
	})

	test("channel owner is automatically added as member", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })
		const channels = await t.query(api.channels.getChannels, { serverId: server })

		const channel = channels.serverChannels[0]
		expect(channel?.members).toHaveLength(1)
		expect(channel?.members[0]?.userId).toEqual(userId)
		expect(channel?.currentUser?.userId).toEqual(userId)
		expect(channel?.isMuted).toBe(false)
		expect(channel?.isHidden).toBe(false)
	})

	test("user can join a channel", async () => {
		const ct = convexTest()
		const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			serverId: server,
			channelId,
		})

		// Check from user 1's perspective
		const channels1 = await t1.query(api.channels.getChannels, { serverId: server })
		const channel1 = channels1.serverChannels[0]
		expect(channel1?.members).toHaveLength(2)

		// Check from user 2's perspective
		const channels2 = await t2.query(api.channels.getChannels, { serverId: server })
		const channel2 = channels2.serverChannels[0]
		expect(channel2?.members).toHaveLength(2)
		expect(channel2?.currentUser?.userId).toEqual(user2Id)
	})

	test("user cannot join channel they're already in", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })

		// Try to join again
		await expect(
			t.mutation(api.channels.joinChannel, {
				serverId: server,
				channelId,
			}),
		).rejects.toThrow("You are already a member of this channel")
	})

	test("user can leave a channel", async () => {
		const ct = convexTest()
		const { server, user1Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			serverId: server,
			channelId,
		})

		// User 2 leaves the channel
		await t2.mutation(api.channels.leaveChannel, {
			serverId: server,
			channelId,
		})

		// Check from user 1's perspective - should still see the channel with 1 member
		const channels1 = await t1.query(api.channels.getChannels, { serverId: server })
		expect(channels1.serverChannels).toHaveLength(1)
		expect(channels1.serverChannels[0]?.members).toHaveLength(1)

		// Check from user 2's perspective - should not see the channel
		const channels2 = await t2.query(api.channels.getChannels, { serverId: server })
		expect(channels2.serverChannels).toHaveLength(0)
	})

	test("user cannot leave channel they're not in", async () => {
		const ct = convexTest()
		const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 2 tries to leave without joining
		await expect(
			t2.mutation(api.channels.leaveChannel, {
				serverId: server,
				channelId,
			}),
		).rejects.toThrow("You are not a member of this channel")
	})

	test("user can update channel preferences", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })

		// Update preferences
		await t.mutation(api.channels.updateChannelPreferences, {
			serverId: server,
			channelId,
			isMuted: true,
			isHidden: true,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })
		const channel = channels.serverChannels[0]

		expect(channel?.isMuted).toBe(true)
		expect(channel?.isHidden).toBe(true)
		expect(channel?.currentUser?.isMuted).toBe(true)
		expect(channel?.currentUser?.isHidden).toBe(true)
	})

	test("user can partially update channel preferences", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })

		// Update only muted status
		await t.mutation(api.channels.updateChannelPreferences, {
			serverId: server,
			channelId,
			isMuted: true,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })
		const channel = channels.serverChannels[0]

		expect(channel?.isMuted).toBe(true)
		expect(channel?.isHidden).toBe(false) // Should remain unchanged
	})

	test("user cannot update preferences for channel they're not in", async () => {
		const ct = convexTest()
		const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 2 tries to update preferences without being a member
		await expect(
			t2.mutation(api.channels.updateChannelPreferences, {
				serverId: server,
				channelId,
				isMuted: true,
			}),
		).rejects.toThrow("You are not a member of this channel")
	})

	test("getChannels filters out channels user is not member of", async () => {
		const ct = convexTest()
		const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 1 should see the channel
		const channels1 = await t1.query(api.channels.getChannels, { serverId: server })
		expect(channels1.serverChannels).toHaveLength(1)

		// User 2 should not see the channel
		const channels2 = await t2.query(api.channels.getChannels, { serverId: server })
		expect(channels2.serverChannels).toHaveLength(0)
	})

	test("getChannels correctly categorizes channels by type", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		// Create various channel types
		await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Public Channel",
			type: "public",
			ownerId: userId,
		})

		await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Private Channel",
			type: "private",
			ownerId: userId,
		})

		await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Direct Channel",
			type: "direct",
			ownerId: userId,
		})

		await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Single Channel",
			type: "single",
			ownerId: userId,
		})

		await t.mutation(api.channels.createChannel, {
			serverId: server,
			name: "Thread Channel",
			type: "thread",
			ownerId: userId,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })

		// Public, private, and thread should be in serverChannels
		expect(channels.serverChannels).toHaveLength(2)

		// Direct and single should be in dmChannels
		expect(channels.dmChannels).toHaveLength(2)
	})

	test("hidden channels are still returned but marked as hidden", async () => {
		const ct = convexTest()
		const { server, userId, t } = await setupServerAndUser(ct)

		const channelId = await createChannel(t, { serverId: server, userId })

		// Hide the channel
		await t.mutation(api.channels.updateChannelPreferences, {
			serverId: server,
			channelId,
			isHidden: true,
		})

		const channels = await t.query(api.channels.getChannels, { serverId: server })

		// Channel should still be returned
		expect(channels.serverChannels).toHaveLength(1)
		expect(channels.serverChannels[0]?.isHidden).toBe(true)
	})

	test("different users can have different preferences for the same channel", async () => {
		const ct = convexTest()
		const { server, user1Id, user2Id, t1, t2 } = await setupMultipleUsers(ct)

		// User 1 creates a channel
		const channelId = await createChannel(t1, { serverId: server, userId: user1Id })

		// User 2 joins the channel
		await t2.mutation(api.channels.joinChannel, {
			serverId: server,
			channelId,
		})

		// User 1 mutes the channel
		await t1.mutation(api.channels.updateChannelPreferences, {
			serverId: server,
			channelId,
			isMuted: true,
		})

		// User 2 hides the channel
		await t2.mutation(api.channels.updateChannelPreferences, {
			serverId: server,
			channelId,
			isHidden: true,
		})

		// Check user 1's perspective
		const channels1 = await t1.query(api.channels.getChannels, { serverId: server })
		const channel1 = channels1.serverChannels[0]
		expect(channel1?.isMuted).toBe(true)
		expect(channel1?.isHidden).toBe(false)
		expect(channel1?.currentUser?.isMuted).toBe(true)
		expect(channel1?.currentUser?.isHidden).toBe(false)

		// Check user 2's perspective
		const channels2 = await t2.query(api.channels.getChannels, { serverId: server })
		const channel2 = channels2.serverChannels[0]
		expect(channel2?.isMuted).toBe(false)
		expect(channel2?.isHidden).toBe(true)
		expect(channel2?.currentUser?.isMuted).toBe(false)
		expect(channel2?.currentUser?.isHidden).toBe(true)

		// Verify both users are still members
		expect(channel1?.members).toHaveLength(2)
		expect(channel2?.members).toHaveLength(2)
	})
})
