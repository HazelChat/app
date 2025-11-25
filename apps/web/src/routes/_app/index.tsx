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
			return q
				.from({ member: organizationMemberCollection })
				.innerJoin({ org: organizationCollection }, ({ member, org }) =>
					eq(member.organizationId, org.id),
				)
				.where(({ member }) =>
					// If user has organizationId from JWT, filter by it
					// Otherwise, find any membership (for returning users without org context)
					user?.organizationId
						? and(eq(member.userId, user?.id), eq(member.organizationId, user?.organizationId))
						: eq(member.userId, user?.id),
				)
				.findOne()
		},
		[user?.id, user?.organizationId],
	)

	if (isLoading || isAuthLoading || !isReady) {
		return <Loader />
	}

	if (!user) {
		throw new Error("Should never get here without user loaded")
	}

	if (!user.isOnboarded) {
		const orgId = membership?.org.id
		return <Navigate to="/onboarding" search={orgId ? { orgId } : undefined} />
	}

	if (membership) {
		const org = membership.org

		if (!org.slug) {
			return <Navigate to="/onboarding" search={{ orgId: org.id }} />
		}

		// If user has a specific org context from JWT, go directly to that org
		if (user.organizationId) {
			return <Navigate to="/$orgSlug" params={{ orgSlug: org.slug }} />
		}

		// User is onboarded with memberships but no org context in JWT
		// Send to select-organization (which will auto-redirect if they only have one org)
		return <Navigate to="/select-organization" />
	}

	// User is onboarded but has no memberships - send to select-organization
	// (which will redirect to onboarding if they have 0 orgs)
	return <Navigate to="/select-organization" />
}
