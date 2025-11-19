import { Database } from "@hazel/db"
import {
	CannotShareWithOwnerOrgError,
	ChannelAlreadySharedError,
	ChannelNotFoundError,
	CurrentUser,
	DmChannelAlreadyExistsError,
	InternalServerError,
	policyUse,
	withRemapDbErrors,
	withSystemActor,
} from "@hazel/domain"
import { OrganizationId } from "@hazel/domain/ids"
import { ChannelRpcs } from "@hazel/domain/rpc"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { ChannelPolicy } from "../../policies/channel-policy"
import { UserPolicy } from "../../policies/user-policy"
import { ChannelMemberRepo } from "../../repositories/channel-member-repo"
import { ChannelRepo } from "../../repositories/channel-repo"
import { SharedChannelRepo } from "../../repositories/shared-channel-repo"
import { UserRepo } from "../../repositories/user-repo"

export const ChannelRpcLive = ChannelRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"channel.create": (payload) =>
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

			"channel.update": ({ id, ...payload }) =>
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

			"channel.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* ChannelRepo.deleteById(id)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(policyUse(ChannelPolicy.canDelete(id)), withRemapDbErrors("Channel", "delete")),

			"channel.createDm": (payload) =>
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

							const txid = yield* generateTransactionId()

							return {
								data: createdChannel,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Channel", "create")),

			/**
			 * Hazel Connect: Share a channel with another organization
			 */
			"channel.share": ({ channelId, organizationId }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context
							const sharedChannelRepo = yield* SharedChannelRepo
							const channelRepo = yield* ChannelRepo

							// Get the channel
							const channel = yield* channelRepo.findById(channelId).pipe(withSystemActor)

							if (Option.isNone(channel)) {
								return yield* Effect.fail(
									new ChannelNotFoundError({
										channelId,
									}),
								)
							}

							const channelData = channel.value

							// Check if trying to share with the owner organization
							if (channelData.organizationId === organizationId) {
								return yield* Effect.fail(
									new CannotShareWithOwnerOrgError({
										channelId,
										organizationId,
									}),
								)
							}

							// Check if already shared with this organization
							const isAlreadyShared = yield* sharedChannelRepo
								.isSharedWithOrg(channelId, organizationId)
								.pipe(withSystemActor)

							if (isAlreadyShared) {
								return yield* Effect.fail(
									new ChannelAlreadySharedError({
										channelId,
										organizationId,
									}),
								)
							}

							// Share the channel
							yield* sharedChannelRepo
								.shareChannel({
									channelId,
									organizationId,
									sharedBy: user.id,
								})
								.pipe(withSystemActor, policyUse(ChannelPolicy.canShare(channelId)))

							// TODO: Update channel to mark as shared when schema is updated
							// TODO: Trigger SharedChannelNotificationWorkflow to notify target org admins

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("Channel", "create")),

			/**
			 * Hazel Connect: Revoke an organization's access to a shared channel
			 */
			"channel.revokeShare": ({ channelId, organizationId }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context
							const sharedChannelRepo = yield* SharedChannelRepo
							const channelRepo = yield* ChannelRepo

							// Get the channel
							const channel = yield* channelRepo.findById(channelId).pipe(withSystemActor)

							if (Option.isNone(channel)) {
								return yield* Effect.fail(
									new ChannelNotFoundError({
										channelId,
									}),
								)
							}

							// Revoke the share
							yield* sharedChannelRepo
								.revokeShare({
									channelId,
									organizationId,
									revokedBy: user.id,
								})
								.pipe(withSystemActor, policyUse(ChannelPolicy.canShare(channelId)))

							// TODO: Check if there are any remaining shares
							// TODO: If no more shares, mark channel as not shared when schema is updated

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("Channel", "delete")),

			/**
			 * Hazel Connect: Get all organizations that have access to a channel
			 */
			"channel.getShares": ({ channelId }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context
							const channelRepo = yield* ChannelRepo

							// Get the channel
							const channel = yield* channelRepo.findById(channelId).pipe(withSystemActor)

							if (Option.isNone(channel)) {
								return yield* Effect.fail(
									new ChannelNotFoundError({
										channelId,
									}),
								)
							}

							// Check if user can view this channel
							yield* ChannelPolicy.canView(channelId, user.id)

							// Get all organizations with access
							const organizationIds = yield* channelRepo
								.getChannelOrganizations(channelId)
								.pipe(withSystemActor)

							return { organizationIds }
						}),
					)
					.pipe(withRemapDbErrors("Channel", "select")),
		}
	}),
)
