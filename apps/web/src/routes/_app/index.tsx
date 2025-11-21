import { and, eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { Loader } from "~/components/loader"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"

export const Route = createFileRoute("/_app/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { user, isLoading: isAuthLoading } = useAuth()

	const {
		data: membership,
		isLoading,
		isReady,
	} = useLiveQuery(
		(q) => {
			if (!user?.organizationId) return null
			return q
				.from({ member: organizationMemberCollection })
				.innerJoin({ org: organizationCollection }, ({ member, org }) =>
					eq(member.organizationId, org.id),
				)
				.where(({ member }) =>
					and(eq(member.userId, user?.id), eq(member.organizationId, user?.organizationId)),
				)
				.findOne()
		},
		[user?.id, user?.organizationId],
	)

	console.log(isLoading, isAuthLoading, !isReady)

	if (isLoading || isAuthLoading || !isReady) {
		return <Loader />
	}

	if (!user) {
		return null
	}

	console.log("user", user)

	if (!user.isOnboarded) {
		const orgId = membership?.org.id
		return <Navigate to="/onboarding" search={orgId ? { orgId } : undefined} />
	}

	if (membership) {
		const org = membership.org

		if (!org.slug) {
			return <Navigate to="/onboarding" search={{ orgId: org.id }} />
		}

		return <Navigate to="/$orgSlug" params={{ orgSlug: org.slug }} />
	}

	if (user.organizationId && !membership) {
		return <Navigate to="/select-organization" />
	}

	// User is onboarded but has no organization - shouldn't happen, but redirect to onboarding
	return <Navigate to="/onboarding" />
}
