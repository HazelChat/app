import type { Id } from "./_generated/dataModel"
import { userMutation } from "./middleware/withUser"

const mockUsers = [
	{ firstName: "Alice", lastName: "Johnson", email: "alice.johnson@example.com" },
	{ firstName: "Bob", lastName: "Smith", email: "bob.smith@example.com" },
	{ firstName: "Charlie", lastName: "Brown", email: "charlie.brown@example.com" },
	{ firstName: "Diana", lastName: "Prince", email: "diana.prince@example.com" },
	{ firstName: "Eve", lastName: "Wilson", email: "eve.wilson@example.com" },
	{ firstName: "Frank", lastName: "Miller", email: "frank.miller@example.com" },
	{ firstName: "Grace", lastName: "Lee", email: "grace.lee@example.com" },
	{ firstName: "Henry", lastName: "Davis", email: "henry.davis@example.com" },
]

const mockChannels = [
	{ name: "general", type: "public" as const },
	{ name: "random", type: "public" as const },
	{ name: "announcements", type: "public" as const },
	{ name: "engineering", type: "private" as const },
	{ name: "design", type: "private" as const },
]

const sampleMessages = [
	"Hey everyone! Welcome to the channel! 👋",
	"Has anyone seen the latest update? It looks great!",
	"I'm working on the new feature, should have it ready by tomorrow",
	"Quick question: what's the best way to handle this edge case?",
	"Just pushed the changes to the main branch",
	"Thanks for the help earlier, really appreciated it!",
	"Meeting in 5 minutes, don't forget!",
	"Love the new design, looks much cleaner now",
	"Can someone review my PR when they get a chance?",
	"Found a bug in production, working on a fix now",
	"Great work on the presentation today!",
	"Does anyone know where the documentation for this is?",
	"Just deployed the hotfix, everything should be working now",
	"Coffee break? ☕",
	"The new feature is live! Check it out and let me know what you think",
	"Having some issues with the build, anyone else experiencing this?",
	"Reminder: team standup at 10am tomorrow",
	"Congrats on shipping the feature! 🎉",
	"Quick sync after lunch?",
	"The tests are passing now, ready for review",
]

const reactions = ["👍", "❤️", "🎉", "🔥", "💯", "😄", "🚀", "✅"]

export const generateMockData = userMutation({
	args: {},
	handler: async (ctx, args) => {
		const organizationId = args.organizationId
		const currentUserId = ctx.user.id

		// Create mock users
		const userIds: Id<"users">[] = [currentUserId]
		const userMap = new Map<Id<"users">, (typeof mockUsers)[0]>()
		userMap.set(currentUserId, {
			firstName: ctx.user.doc.firstName,
			lastName: ctx.user.doc.lastName,
			email: ctx.user.doc.email,
		})

		for (const mockUser of mockUsers) {
			// Check if user already exists
			const existingUser = await ctx.db
				.query("users")
				.filter((q) => q.eq(q.field("email"), mockUser.email))
				.first()

			let userId: Id<"users">
			if (existingUser) {
				userId = existingUser._id
			} else {
				// Create new user
				userId = await ctx.db.insert("users", {
					externalId: `mock_${mockUser.email}`,
					firstName: mockUser.firstName,
					lastName: mockUser.lastName,
					email: mockUser.email,
					avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockUser.email}`,
					lastSeen: Date.now(),
					status: Math.random() > 0.5 ? "online" : "offline",
				})

				// Add user to organization
				await ctx.db.insert("organizationMembers", {
					organizationId,
					userId,
					role: "member",
					joinedAt: Date.now(),
					invitedBy: currentUserId,
				})
			}

			userIds.push(userId)
			userMap.set(userId, mockUser)
		}

		// Create channels and add members
		const channelIds: Id<"channels">[] = []

		for (const mockChannel of mockChannels) {
			// Check if channel already exists
			const existingChannel = await ctx.db
				.query("channels")
				.filter((q) =>
					q.and(
						q.eq(q.field("name"), mockChannel.name),
						q.eq(q.field("organizationId"), organizationId),
					),
				)
				.first()

			if (existingChannel) {
				channelIds.push(existingChannel._id)
				continue
			}

			// Create channel
			const channelId = await ctx.db.insert("channels", {
				name: mockChannel.name,
				type: mockChannel.type,
				organizationId,
				updatedAt: Date.now(),
				pinnedMessages: [],
			})

			channelIds.push(channelId)

			// Add members to channel
			// For public channels, add all users
			// For private channels, add random subset
			const membersToAdd =
				mockChannel.type === "public" ? userIds : userIds.slice(0, Math.floor(userIds.length * 0.6))

			for (const userId of membersToAdd) {
				// Check if member already exists
				const existingMember = await ctx.db
					.query("channelMembers")
					.withIndex("by_channelIdAndUserId", (q) =>
						q.eq("channelId", channelId).eq("userId", userId),
					)
					.first()

				if (!existingMember) {
					await ctx.db.insert("channelMembers", {
						channelId,
						userId,
						joinedAt: Date.now(),
						isHidden: false,
						isMuted: false,
						isFavorite: Math.random() > 0.8,
						notificationCount: 0,
					})
				}
			}
		}

		// Create DM channels between some users
		const dmPairs = [
			[userIds[0], userIds[1]],
			[userIds[0], userIds[2]],
			[userIds[1], userIds[3]],
			[userIds[2], userIds[4]],
		]

		for (const [user1, user2] of dmPairs) {
			if (!user1 || !user2) continue

			const participantHash = [user1, user2].sort().join(":")

			// Check if DM already exists
			const existingDm = await ctx.db
				.query("channels")
				.withIndex("by_organizationId_and_participantHash", (q) =>
					q.eq("organizationId", organizationId).eq("participantHash", participantHash),
				)
				.first()

			if (existingDm) {
				channelIds.push(existingDm._id)
				continue
			}

			const user1Data = userMap.get(user1)
			const user2Data = userMap.get(user2)
			const dmName = `${user1Data?.firstName} & ${user2Data?.firstName}`

			const dmChannelId = await ctx.db.insert("channels", {
				name: dmName,
				type: "direct",
				organizationId,
				participantHash,
				updatedAt: Date.now(),
				pinnedMessages: [],
			})

			channelIds.push(dmChannelId)

			// Add both users as members
			for (const userId of [user1, user2]) {
				await ctx.db.insert("channelMembers", {
					channelId: dmChannelId,
					userId,
					joinedAt: Date.now(),
					isHidden: false,
					isMuted: false,
					isFavorite: false,
					notificationCount: 0,
				})
			}
		}

		// Create messages in channels
		const messageIds: Id<"messages">[] = []

		for (const channelId of channelIds) {
			const channel = await ctx.db.get(channelId)
			if (!channel) continue

			// Get channel members
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channelId))
				.collect()

			const memberUserIds = channelMembers.map((m) => m.userId)
			if (memberUserIds.length === 0) continue

			// Create 10-20 messages per channel
			const messageCount = Math.floor(Math.random() * 10) + 10

			for (let i = 0; i < messageCount; i++) {
				const authorId = memberUserIds[Math.floor(Math.random() * memberUserIds.length)]
				const messageContent = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]

				const messageId = await ctx.db.insert("messages", {
					channelId,
					content: messageContent,
					authorId,
					attachedFiles: [],
					reactions: [],
				})

				messageIds.push(messageId)

				// Add reactions to some messages (30% chance)
				if (Math.random() < 0.3) {
					const reactionCount = Math.floor(Math.random() * 3) + 1
					const reactingUsers = memberUserIds
						.filter((id) => id !== authorId)
						.slice(0, reactionCount)

					const messageReactions = reactingUsers.map((userId) => ({
						userId,
						emoji: reactions[Math.floor(Math.random() * reactions.length)],
					}))

					if (messageReactions.length > 0) {
						await ctx.db.patch(messageId, {
							reactions: messageReactions,
						})
					}
				}
			}
		}

		// Create some thread replies (pick 3-5 messages to have threads)
		const messagesForThreads = messageIds.slice(0, 5)

		for (const parentMessageId of messagesForThreads) {
			const parentMessage = await ctx.db.get(parentMessageId)
			if (!parentMessage || parentMessage.threadChannelId) continue

			// Create thread channel
			const threadChannelId = await ctx.db.insert("channels", {
				name: "Thread",
				type: "thread",
				organizationId,
				parentChannelId: parentMessage.channelId,
				updatedAt: Date.now(),
				pinnedMessages: [],
			})

			// Update parent message with thread channel
			await ctx.db.patch(parentMessageId, {
				threadChannelId,
			})

			// Get channel members to add as thread participants
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", parentMessage.channelId))
				.collect()

			const threadParticipants = channelMembers.slice(0, Math.floor(channelMembers.length * 0.7))

			// Add thread participants
			for (const member of threadParticipants) {
				await ctx.db.insert("channelMembers", {
					channelId: threadChannelId,
					userId: member.userId,
					joinedAt: Date.now(),
					isHidden: false,
					isMuted: false,
					isFavorite: false,
					notificationCount: 0,
				})
			}

			// Create 2-5 thread replies
			const replyCount = Math.floor(Math.random() * 3) + 2
			// Use thread participants if available, otherwise fallback to parent message author
			const threadUserIds = threadParticipants.length > 0 
				? threadParticipants.map((m) => m.userId)
				: [parentMessage.authorId]

			for (let i = 0; i < replyCount; i++) {
				const authorId = threadUserIds[Math.floor(Math.random() * threadUserIds.length)]
				const replyContent = [
					"Good point!",
					"I agree with this",
					"Let me look into that",
					"Here's what I found...",
					"Thanks for clarifying!",
					"Makes sense to me",
					"I'll update the docs",
				][Math.floor(Math.random() * 7)]

				await ctx.db.insert("messages", {
					channelId: threadChannelId,
					content: replyContent,
					authorId,
					replyToMessageId: parentMessageId,
					attachedFiles: [],
					reactions: [],
				})
			}
		}

		return {
			success: true,
			stats: {
				usersCreated: userIds.length - 1, // Exclude current user
				channelsCreated: channelIds.length,
				messagesCreated: messageIds.length,
			},
		}
	},
})
