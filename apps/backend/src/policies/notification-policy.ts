import { type NotificationId, type OrganizationMemberId, policy, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { NotificationRepo } from "../repositories/notification-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class NotificationPolicy extends Effect.Service<NotificationPolicy>()("NotificationPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Notification" as const

		const notificationRepo = yield* NotificationRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

		const canCreate = (_memberId: OrganizationMemberId) =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(
				policy(
					policyEntity,
					"create",
					Effect.fn(`${policyEntity}.create`)(function* (_actor) {
						// Notifications are typically created by the system
						// This could be restricted to system actors only
						return yield* Effect.succeed(true)
					}),
				),
			)

		const canView = (id: NotificationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"view",
			)(
				notificationRepo.with(id, (notification) =>
					policy(
						policyEntity,
						"view",
						Effect.fn(`${policyEntity}.view`)(function* (actor) {
							// Get the member for this notification
							const member = yield* organizationMemberRepo.findById(notification.memberId)

							if (Option.isSome(member) && member.value.userId === actor.id) {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canUpdate = (id: NotificationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				notificationRepo.with(id, (notification) =>
					policy(
						policyEntity,
						"update",
						Effect.fn(`${policyEntity}.update`)(function* (actor) {
							// Get the member for this notification
							const member = yield* organizationMemberRepo.findById(notification.memberId)

							if (Option.isSome(member) && member.value.userId === actor.id) {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canDelete = (id: NotificationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				notificationRepo.with(id, (notification) =>
					policy(
						policyEntity,
						"delete",
						Effect.fn(`${policyEntity}.delete`)(function* (actor) {
							// Get the member for this notification
							const member = yield* organizationMemberRepo.findById(notification.memberId)

							if (Option.isSome(member) && member.value.userId === actor.id) {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canMarkAsRead = (id: NotificationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"markAsRead",
			)(
				notificationRepo.with(id, (notification) =>
					policy(
						policyEntity,
						"markAsRead",
						Effect.fn(`${policyEntity}.markAsRead`)(function* (actor) {
							// Get the member for this notification
							const member = yield* organizationMemberRepo.findById(notification.memberId)

							if (Option.isSome(member) && member.value.userId === actor.id) {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canMarkAllAsRead = (memberId: OrganizationMemberId) =>
			UnauthorizedError.refail(
				policyEntity,
				"markAllAsRead",
			)(
				policy(
					policyEntity,
					"markAllAsRead",
					Effect.fn(`${policyEntity}.markAllAsRead`)(function* (actor) {
						// Get the member
						const member = yield* organizationMemberRepo.findById(memberId)

						if (Option.isSome(member) && member.value.userId === actor.id) {
							return yield* Effect.succeed(true)
						}

						return yield* Effect.succeed(false)
					}),
				),
			)

		return { canCreate, canView, canUpdate, canDelete, canMarkAsRead, canMarkAllAsRead } as const
	}),
	dependencies: [NotificationRepo.Default, OrganizationMemberRepo.Default],
	accessors: true,
}) {}
