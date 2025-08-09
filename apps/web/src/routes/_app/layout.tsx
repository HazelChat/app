import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { useAuth } from "@workos-inc/authkit-react"
import { Authenticated, Unauthenticated } from "convex/react"

export const Route = createFileRoute("/_app")({
	component: RouteComponent,
})

function RouteComponent() {
	const { isLoading } = useAuth()
	return (
		<>
			<Authenticated>
				<Outlet />
			</Authenticated>
			<Unauthenticated>
				{!isLoading && (
					<Navigate
						to="/auth/login"
						search={{
							returnTo: location.pathname,
						}}
					/>
				)}
			</Unauthenticated>
		</>
	)
}
