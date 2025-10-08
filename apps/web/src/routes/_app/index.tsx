import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { Loader } from "~/components/loader"
import { organizationCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"

export const Route = createFileRoute("/_app/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { user, isLoading: isAuthLoading } = useAuth()

	const {
		data: organizations,
		isLoading,
		isReady,
	} = useLiveQuery(
		(q) => {
			return q
				.from({
					organizatios: organizationCollection,
				})
				.where(({ organizatios }) => eq(organizatios.workosId, user?.workosOrganizationId))
				.orderBy(({ organizatios }) => organizatios.createdAt, "asc")
				.limit(1)
		},
		[user?.id, user?.workosOrganizationId],
	)

	if (isLoading || isAuthLoading || !isReady) {
		return <Loader />
	}

	// If user is not authenticated, let parent layout handle auth redirect
	if (!user) {
		return null
	}

	if (organizations && organizations.length > 0) {
		const org = organizations[0]!

		console.log("org", org)

		// If organization doesn't have a slug, redirect to setup
		if (!org.slug) {
			return <Navigate to="/onboarding/setup-organization" search={{ orgId: org.id }} />
		}

		return <Navigate to="/$orgSlug" params={{ orgSlug: org.slug }} />
	}

	// Redirect to onboarding if user has no organization
	return <Navigate to="/onboarding" />
}
