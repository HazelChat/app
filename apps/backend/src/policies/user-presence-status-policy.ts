import { policy, UnauthorizedError } from "@hazel/effect-lib"
import { Effect } from "effect"

export class UserPresenceStatusPolicy extends Effect.Service<UserPresenceStatusPolicy>()(
	"UserPresenceStatusPolicy/Policy",
	{
		effect: Effect.gen(function* () {
			const policyEntity = "UserPresenceStatus" as const

			const canRead = () =>
				UnauthorizedError.refail(
					policyEntity,
					"select",
				)(policy(policyEntity, "select", () => Effect.succeed(true)))

			const canUpdate = () =>
				UnauthorizedError.refail(
					policyEntity,
					"update",
				)(
					policy(
						policyEntity,
						"update",
						// User can only update their own status (ensured by using currentUser.id in route)
						() => Effect.succeed(true),
					),
				)

			const canDelete = () =>
				UnauthorizedError.refail(
					policyEntity,
					"delete",
				)(policy(policyEntity, "delete", () => Effect.succeed(true)))

			return { canUpdate, canDelete, canRead } as const
		}),
		dependencies: [],
		accessors: true,
	},
) {}
