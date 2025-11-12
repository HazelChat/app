import { Activity } from "@effect/workflow"
import { and, Database, eq, isNull, ne, schema, sql } from "@hazel/db"
import { Cluster } from "@hazel/domain"
import { Effect, Schema } from "effect"

export const MessageNotificationWorkflowLayer = Cluster.MessageNotificationWorkflow.toLayer(
	Effect.fn(function* (payload: Cluster.MessageNotificationWorkflowPayload) {
		yield* Effect.log(
			`Starting MessageNotificationWorkflow for message ${payload.messageId} in channel ${payload.channelId}`,
		)

		// Activity 1: Get channel members who should be notified
		const membersResult = yield* Activity.make({
			name: "GetChannelMembers",
			success: Cluster.GetChannelMembersResult,
			error: Cluster.GetChannelMembersError,
			execute: Effect.gen(function* () {
				const db = yield* Database.Database

				yield* Effect.log(`Querying channel members for channel ${payload.channelId}`)

				// Query channel members who:
				// 1. Are in the channel
				// 2. Have notifications enabled (isMuted = false)
				// 3. Are not the author
				// 4. Are not deleted
				const channelMembers = yield* db
					.execute((client) =>
						client
							.select({
								id: schema.channelMembersTable.id,
								channelId: schema.channelMembersTable.channelId,
								userId: schema.channelMembersTable.userId,
								isMuted: schema.channelMembersTable.isMuted,
								notificationCount: schema.channelMembersTable.notificationCount,
							})
							.from(schema.channelMembersTable)
							.where(
								and(
									eq(schema.channelMembersTable.channelId, payload.channelId),
									eq(schema.channelMembersTable.isMuted, false),
									ne(schema.channelMembersTable.userId, payload.authorId),
									isNull(schema.channelMembersTable.deletedAt),
								),
							),
					)
					.pipe(Effect.orDie)

				yield* Effect.log(`Found ${channelMembers.length} members to notify`)

				return {
					members: channelMembers,
					totalCount: channelMembers.length,
				}
			}),
		}).pipe(Effect.orDie)

		// If no members to notify, we're done
		if (membersResult.totalCount === 0) {
			yield* Effect.log("No members to notify, workflow complete")
			return
		}

		// Activity 2: Create notifications for all members
		const notificationsResult = yield* Activity.make({
			name: "CreateNotifications",
			success: Cluster.CreateNotificationsResult,
			error: Schema.Union(Cluster.CreateNotificationError),
			execute: Effect.gen(function* () {
				const db = yield* Database.Database
				const notificationIds: string[] = []

				yield* Effect.log(`Creating notifications for ${membersResult.members.length} members`)

				// Process each member
				for (const member of membersResult.members) {
					// First, get the organization member ID for this user
					// We need to join channel -> organization -> organization_members
					const orgMemberResult = yield* db
						.execute((client) =>
							client
								.select({
									orgMemberId: schema.organizationMembersTable.id,
									organizationId: schema.channelsTable.organizationId,
								})
								.from(schema.channelsTable)
								.innerJoin(
									schema.organizationMembersTable,
									eq(
										schema.organizationMembersTable.organizationId,
										schema.channelsTable.organizationId,
									),
								)
								.where(
									and(
										eq(schema.channelsTable.id, payload.channelId),
										eq(schema.organizationMembersTable.userId, member.userId),
										isNull(schema.organizationMembersTable.deletedAt),
									),
								)
								.limit(1),
						)
						.pipe(Effect.orDie)

					if (orgMemberResult.length === 0) {
						yield* Effect.log(`Skipping user ${member.userId} - not found in organization`)
						continue
					}

					const orgMemberId = orgMemberResult[0]!.orgMemberId

					// Insert notification
					const notificationResult = yield* db
						.execute((client) =>
							client
								.insert(schema.notificationsTable)
								.values({
									memberId: orgMemberId,
									targetedResourceId: payload.channelId,
									targetedResourceType: "channel",
									resourceId: payload.messageId,
									resourceType: "message",
									createdAt: new Date(),
								})
								.returning({ id: schema.notificationsTable.id }),
						)
						.pipe(Effect.orDie)

					const notificationId = notificationResult[0]!.id
					notificationIds.push(notificationId)

					// Increment notification count for the channel member
					yield* db
						.execute((client) =>
							client
								.update(schema.channelMembersTable)
								.set({
									notificationCount: sql`${schema.channelMembersTable.notificationCount} + 1`,
								})
								.where(eq(schema.channelMembersTable.id, member.id)),
						)
						.pipe(Effect.orDie)

					yield* Effect.log(`Created notification ${notificationId} for member ${member.userId}`)
				}

				return {
					notificationIds,
					notifiedCount: notificationIds.length,
				}
			}),
		}).pipe(Effect.orDie)

		yield* Effect.log(
			`MessageNotificationWorkflow completed: ${notificationsResult.notifiedCount} notifications created`,
		)
	}),
)
