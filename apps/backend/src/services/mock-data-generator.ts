import type { Database } from "@hazel/db"
import type { ChannelId, OrganizationId, UserId } from "@hazel/db/schema"
import { Effect } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { MessageRepo } from "../repositories/message-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"
import { UserRepo } from "../repositories/user-repo"
import { DatabaseLive } from "./database"

interface MockDataConfig {
	userCount: number
	channelCount: number
	messageCount: number
}

export class MockDataGenerator extends Effect.Service<MockDataGenerator>()("MockDataGenerator", {
	effect: Effect.gen(function* () {
		const generateForOrganization = (organizationId: OrganizationId, config: MockDataConfig) =>
			Effect.gen(function* () {
				const userRepo = yield* UserRepo
				const channelRepo = yield* ChannelRepo
				const messageRepo = yield* MessageRepo
				const orgMemberRepo = yield* OrganizationMemberRepo
				const channelMemberRepo = yield* ChannelMemberRepo
				// Generate users
				const userDataArray = Array.from({ length: config.userCount }, (_, i) => ({
					externalId: `mock_user_${Date.now()}_${i}`,
					email: `user${i}@example.com`,
					firstName: ["Alice", "Bob", "Charlie", "Diana", "Eve"][i % 5] || "Test",
					lastName: `User${i}`,
					avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
					status: (["online", "offline", "away"] as const)[i % 3],
					lastSeen: new Date(),

					settings: null,
					deletedAt: null,
				}))

				const users = yield* Effect.forEach(userDataArray, (userData) => userRepo.insert(userData), {
					concurrency: 5,
				})

				// Create organization members
				const orgMembers = yield* Effect.forEach(
					users.map((user, i) => ({
						organizationId,
						nickname: undefined,
						userId: user[0]!.id,
						role: (i === 0 ? "owner" : i === 1 ? "admin" : "member") as
							| "owner"
							| "admin"
							| "member",
						joinedAt: new Date(),
						createdAt: new Date(),
						invitedBy: null,
						deletedAt: null,
					})),
					(memberData) => orgMemberRepo.insert(memberData),
					{ concurrency: 5 },
				)

				// Generate channels
				const channelNames = [
					"general",
					"random",
					"announcements",
					"engineering",
					"design",
					"marketing",
				]
				const channelDataArray = Array.from(
					{ length: Math.min(config.channelCount, channelNames.length) },
					(_, i) => ({
						organizationId,
						name: channelNames[i] || `channel-${i}`,
						type: (i > 2 ? "private" : "public") as
							| "public"
							| "private"
							| "thread"
							| "direct"
							| "single",
						parentChannelId: null,
						deletedAt: null,
					}),
				)

				const channels = yield* Effect.forEach(
					channelDataArray,
					(channelData) => channelRepo.insert(channelData),
					{ concurrency: 3 },
				)

				// Generate channel members
				const channelMembersData = channels.flatMap((channelResult, channelIndex) => {
					const channel = channelResult[0]
					if (!channel) return []

					// For public channels (first 3), add all users
					// For private channels, add only a subset of users
					const isPublic = channelIndex <= 2
					const usersToAdd = isPublic ? users : users.slice(0, Math.ceil(users.length / 2))

					return usersToAdd
						.map((userResult) => {
							const user = userResult[0]
							if (!user) return null

							return {
								channelId: channel.id as ChannelId,
								userId: user.id as UserId,
								isHidden: false,
								isMuted: false,
								isFavorite: channelIndex === 0, // Favorite the general channel
								lastSeenMessageId: null,
								notificationCount: 0,
								joinedAt: new Date(),
								deletedAt: null,
							}
						})
						.filter((member): member is NonNullable<typeof member> => member !== null)
				})

				const channelMembers = yield* Effect.forEach(
					channelMembersData,
					(memberData) => channelMemberRepo.insert(memberData),
					{ concurrency: 10 },
				)

				// Generate messages
				const messageDataArray = Array.from({ length: config.messageCount }, (_, i) => {
					const userIndex = i % users.length
					const channelIndex = i % channels.length
					const user = users[userIndex]?.[0]
					const channel = channels[channelIndex]?.[0]

					if (!user || !channel) {
						return null
					}

					return {
						channelId: channel.id as ChannelId,
						authorId: user.id,
						content:
							[
								"Hello everyone!",
								"How's it going?",
								"Great work on the project!",
								"Can someone help me with this?",
								"Thanks for the update!",
								"Looking forward to the meeting.",
								"Just pushed a new commit.",
								"The bug has been fixed.",
								"Let's discuss this in the next standup.",
								"I'll review the PR shortly.",
							][i % 10] || `Message ${i}`,
						replyToMessageId: null,
						threadChannelId: null,
						deletedAt: null,
					}
				}).filter((msg): msg is NonNullable<typeof msg> => msg !== null)

				const messages = yield* Effect.forEach(
					messageDataArray,
					(messageData) => messageRepo.insert(messageData),
					{ concurrency: 10 },
				)

				return {
					summary: {
						users: users.length,
						channels: channels.length,
						messages: messages.length,
						organizationMembers: orgMembers.length,
						channelMembers: channelMembers.length,
					},
				}
			})

		return {
			generateForOrganization,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
