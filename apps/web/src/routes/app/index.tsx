import { convexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/app/")({
	component: RouteComponent,
})

function RouteComponent() {
	// Get current organization from session
	const organizationQuery = useQuery(convexQuery(api.me.getOrganization, {}))
	
	// Loading state
	if (organizationQuery.isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		)
	}
	
	// Handle redirect
	if (organizationQuery.data?.directive === "success") {
		const orgId = organizationQuery.data.data._id
		return <Navigate to="/app/$orgId" params={{ orgId }} />
	}
	
	// Handle redirect to onboarding or login
	if (organizationQuery.data?.directive === "redirect") {
		if (organizationQuery.data.to === "/auth/login") {
			return <Navigate to="/auth/login" search={{ returnTo: "/app" }} />
		}
		// For any other redirects, just navigate to the path
		return <Navigate to={organizationQuery.data.to as any} />
	}
	
	// No organization found
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<h2 className="mb-2 font-semibold text-xl">No Organization Found</h2>
				<p className="text-secondary">Please contact your administrator.</p>
			</div>
		</div>
	)
}
