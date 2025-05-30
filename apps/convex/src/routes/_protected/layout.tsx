import { Outlet, createFileRoute, redirect } from "@tanstack/solid-router"
import { useConvexAuth } from "~/lib/convex/convex-auth-state"

import { For, Match, Show, Switch, createEffect } from "solid-js"

export const Route = createFileRoute("/_protected")({
	component: RouteComponent,
})

function RouteComponent() {
	const navigate = Route.useNavigate()
	const { isLoading, isAuthenticated } = useConvexAuth()

	createEffect(() => {
		if (!isAuthenticated() && !isLoading()) {
			navigate({
				to: "/sign-in",
			})
		}
	})

	return (
		<Switch>
			<Match when={isLoading()}>
				<p>Loading auth...</p>
			</Match>
			<Match when={isAuthenticated()}>
				<Outlet />
			</Match>
		</Switch>
	)
}
