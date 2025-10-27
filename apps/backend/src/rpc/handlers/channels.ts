import { Database } from "@hazel/db"
import { OrganizationId } from "@hazel/db/schema"
import {
	CurrentUser,
	DmChannelAlreadyExistsError,
	InternalServerError,
	policyUse,
	withRemapDbErrors,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { ChannelPolicy } from "../../policies/channel-policy"
import { UserPolicy } from "../../policies/user-policy"
import { ChannelMemberRepo } from "../../repositories/channel-member-repo"
import { ChannelRepo } from "../../repositories/channel-repo"
import { DirectMessageParticipantRepo } from "../../repositories/direct-message-participant-repo"
import { UserRepo } from "../../repositories/user-repo"
import { ChannelRpcs } from "../groups/channels"

/**
 * Channel RPC Handlers
 *
 * Implements the business logic for all channel-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const ChannelRpcLive = ChannelRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * ChannelCreate Handler
			 *
			 * Creates a new channel in an organization. The current user is
			 * automatically added as a member of the newly created channel.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Create channel with deletedAt set to null
			 * 4. Check permissions via ChannelPolicy.canCreate
			 * 5. Add creator as channel member (system operation)
			 * 6. Generate transaction ID for optimistic updates
			 * 7. Return channel data and transaction ID
			 */
			ChannelCreate: (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdChannel = yield* ChannelRepo.insert({
								...payload,
								deletedAt: null,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(ChannelPolicy.canCreate(payload.organizationId)),
							)

							// Add creator as channel member
							yield* ChannelMemberRepo.insert({
								channelId: createdChannel.id,
								userId: user.id,
								isHidden: false,
								isMuted: false,
								isFavorite: false,
								lastSeenMessageId: null,
								notificationCount: 0,
								joinedAt: new Date(),
								deletedAt: null,
							}).pipe(withSystemActor)

							const txid = yield* generateTransactionId()

							return {
								data: createdChannel,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Channel", "create")),

			/**
			 * ChannelUpdate Handler
			 *
			 * Updates an existing channel. Only users with appropriate permissions
			 * can update a channel.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update channel
			 * 3. Check permissions via ChannelPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated channel data and transaction ID
			 */
			ChannelUpdate: ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedChannel = yield* ChannelRepo.update({
								id,
								...payload,
							}).pipe(policyUse(ChannelPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedChannel,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Channel", "update")),

			/**
			 * ChannelDelete Handler
			 *
			 * Deletes a channel (soft delete). Only users with appropriate
			 * permissions can delete a channel.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete channel (sets deletedAt timestamp)
			 * 3. Check permissions via ChannelPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			ChannelDelete: ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* ChannelRepo.deleteById(id)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(policyUse(ChannelPolicy.canDelete(id)), withRemapDbErrors("Channel", "delete")),

			/**
			 * ChannelCreateDm Handler
			 *
			 * Creates a direct message or group channel with specified participants.
			 * For single DMs, checks if a DM already exists between the users.
			 * Automatically generates channel name for DMs based on participant names.
			 * All participants are added as channel members.
			 *
			 * Process:
			 * 1. Get current user from context
			 * 2. Start database transaction
			 * 3. Validate participant count for single DMs
			 * 4. Check for existing DM (for single type)
			 * 5. Generate channel name from participant names
			 * 6. Create channel
			 * 7. Add creator as member
			 * 8. Add all participants as members
			 * 9. For DMs, add to direct_message_participants table
			 * 10. Generate transaction ID
			 * 11. Return channel data and transaction ID
			 */
			ChannelCreateDm: (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							// Validate participant count for single DMs
							if (payload.type === "single" && payload.participantIds.length !== 1) {
								return yield* Effect.fail(
									new InternalServerError({
										message: "DM channels must have exactly one other participant",
										cause: "Invalid participant count",
									}),
								)
							}

							// Check for existing DM channel
							if (payload.type === "single") {
								const existingChannel = yield* ChannelMemberRepo.findExistingSingleDmChannel(
									user.id,
									payload.participantIds[0],
									OrganizationId.make(payload.organizationId),
								).pipe(withSystemActor)

								if (Option.isSome(existingChannel)) {
									return yield* Effect.fail(
										new DmChannelAlreadyExistsError({
											message: "A direct message channel already exists with this user",
											detail: `Channel ID: ${existingChannel.value.id}`,
										}),
									)
								}
							}

							// Generate channel name for DMs
							let channelName = payload.name
							if (payload.type === "single") {
								const otherUser = yield* UserRepo.findById(payload.participantIds[0]).pipe(
									policyUse(UserPolicy.canRead(payload.participantIds[0]!)),
								)
								const currentUser = yield* UserRepo.findById(user.id).pipe(
									policyUse(UserPolicy.canRead(payload.participantIds[0]!)),
								)

								if (Option.isSome(otherUser) && Option.isSome(currentUser)) {
									// Create a consistent name for DMs using first and last name
									const currentUserName =
										`${currentUser.value.firstName} ${currentUser.value.lastName}`.trim()
									const otherUserName =
										`${otherUser.value.firstName} ${otherUser.value.lastName}`.trim()
									const names = [currentUserName, otherUserName].sort()
									channelName = names.join(", ")
								}
							}

							// Create channel
							const createdChannel = yield* ChannelRepo.insert({
								name: channelName || "Group Channel",
								type: payload.type,
								organizationId: OrganizationId.make(payload.organizationId),
								parentChannelId: null,
								deletedAt: null,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(
									ChannelPolicy.canCreate(OrganizationId.make(payload.organizationId)),
								),
							)

							// Add creator as member
							yield* ChannelMemberRepo.insert({
								channelId: createdChannel.id,
								userId: user.id,
								isHidden: false,
								isMuted: false,
								isFavorite: false,
								lastSeenMessageId: null,
								notificationCount: 0,
								joinedAt: new Date(),
								deletedAt: null,
							}).pipe(withSystemActor)

							// Add all participants as members
							for (const participantId of payload.participantIds) {
								yield* ChannelMemberRepo.insert({
									channelId: createdChannel.id,
									userId: participantId,
									isHidden: false,
									isMuted: false,
									isFavorite: false,
									lastSeenMessageId: null,
									notificationCount: 0,
									joinedAt: new Date(),
									deletedAt: null,
								}).pipe(withSystemActor)
							}

							// For DMs, add to direct_message_participants
							if (payload.type === "direct") {
								// Add creator
								yield* DirectMessageParticipantRepo.insert({
									channelId: createdChannel.id,
									userId: user.id,
									organizationId: OrganizationId.make(payload.organizationId),
								}).pipe(withSystemActor)

								// Add other participant
								yield* DirectMessageParticipantRepo.insert({
									channelId: createdChannel.id,
									userId: payload.participantIds[0],
									organizationId: OrganizationId.make(payload.organizationId),
								}).pipe(withSystemActor)
							}

							const txid = yield* generateTransactionId()

							return {
								data: createdChannel,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Channel", "create")),
		}
	}),
)
