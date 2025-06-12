import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { useConvexAuth } from "~/lib/convex/convex-auth-state"

import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { RedirectToSignIn } from "clerk-solidjs"
import { Match, Switch, createEffect } from "solid-js"
import { IconLoader } from "~/components/icons/loader"
import { Logo } from "~/components/logo"
import { convexQuery } from "~/lib/convex-query"

export const Route = createFileRoute("/_protected")({
	component: RouteComponent,
})

function RouteComponent() {
	const { isLoading, isAuthenticated } = useConvexAuth()

	const navigate = Route.useNavigate()

	const accountsQuery = useQuery(() => convexQuery(api.me.get, isAuthenticated() ? {} : "skip"))

	createEffect(() => {
		if (accountsQuery.isPending) {
			return
		}

		if (accountsQuery.isError || !accountsQuery.data) {
			navigate({
				to: "/onboarding",
				search: {
					step: "user",
				},
				replace: true,
			})
		}
	})

	return (
		<Switch>
			<Match when={isLoading() || accountsQuery.isPending || !accountsQuery.data}>
				<div class="flex min-h-screen items-center justify-center">
					<div class="flex flex-col items-center justify-center gap-3">
						<Logo class="h-12" />
						<IconLoader class="animate-spin" />
						<p>Loading your account...</p>
					</div>
				</div>
			</Match>

			<Match when={!isAuthenticated() && !isLoading()}>
				<RedirectToSignIn />
			</Match>

			<Match when={isAuthenticated() && !isLoading()}>
				<Outlet />
			</Match>
		</Switch>
	)
}
