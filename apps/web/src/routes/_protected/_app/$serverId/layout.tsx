import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"

import { useQuery } from "@tanstack/solid-query"
import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { Suspense, createEffect } from "solid-js"
import { Sidebar } from "~/components/ui/sidebar"
import { convexQuery } from "~/lib/convex-query"
import { removeCurrentServerId, setCurrentServerId } from "~/lib/helpers/localstorage"
import { AppSidebar } from "./-components/app-sidebar"

export const Route = createFileRoute("/_protected/_app/$serverId")({
	component: RouteComponent,
	loader: ({ context: { queryClient }, params }) =>
		queryClient
			.ensureQueryData(
				convexQuery(api.channels.getChannels, { serverId: params.serverId as Id<"servers"> }),
			)
			.catch(() => undefined),
})

function RouteComponent() {
	const params = Route.useParams()
	const navigate = Route.useNavigate()
	const serverQuery = useQuery(() =>
		convexQuery(api.servers.getServerForUser, { serverId: params().serverId as Id<"servers"> }),
	)

	// createEffect(async () => {
	// 	await Promise.all([
	// 		convexQuery(api.servers.getServerForUser, { serverId: params().serverId as Id<"servers"> }),
	// 		convexQuery(api.me.getUser, { serverId: params().serverId as Id<"servers"> }),
	// 		convexQuery(api.me.get, {}),
	// 		convexQuery(api.channels.getChannels, { serverId: params().serverId as Id<"servers"> }),
	// 	])
	// })

	createEffect(() => {
		if (serverQuery.isPending) {
			return
		}

		if (!serverQuery.data || serverQuery.error) {
			removeCurrentServerId()
			throw navigate({
				to: "/",
			})
		}
		setCurrentServerId(serverQuery.data._id)
	})

	return (
		<Suspense>
			<Sidebar.Provider>
				<AppSidebar />
				<Sidebar.Inset>
					<Outlet />
				</Sidebar.Inset>
			</Sidebar.Provider>
		</Suspense>
	)
}
