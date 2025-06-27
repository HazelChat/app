import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"

import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { createFileRoute, Outlet } from "@tanstack/solid-router"
import { createEffect, Suspense } from "solid-js"
import { CommandBar } from "~/components/command-bar/command-bar"
import { Sidebar } from "~/components/ui/sidebar"
import { ConvexProvider } from "~/lib/convex"
import { PresenceProvider } from "~/lib/convex-presence"
import { convexQuery } from "~/lib/convex-query"
import { removeCurrentServerId, setCurrentServerId } from "~/lib/helpers/localstorage"
import { AppSidebar } from "./-components/sidebar/app-sidebar"

export const Route = createFileRoute("/_protected/_app/$serverId")({
	component: RouteComponent,
	loader: ({ context: { queryClient }, params }) =>
		queryClient
			.ensureQueryData(
				convexQuery(api.channels.getChannels, {
					serverId: params.serverId as Id<"servers">,
					favoriteFilter: {
						favorite: false,
					},
				}),
			)
			.catch(() => undefined),
})

function RouteComponent() {
	const queryClient = useQueryClient()
	const params = Route.useParams()
	const navigate = Route.useNavigate()
	const serverQuery = useQuery(() =>
		convexQuery(api.servers.getServerForUser, { serverId: params().serverId as Id<"servers"> }),
	)

	const meQuery = useQuery(() =>
		convexQuery(api.me.getUser, { serverId: params().serverId as Id<"servers"> }),
	)

	createEffect(async () => {
		await Promise.all([
			queryClient.prefetchQuery(
				convexQuery(api.servers.getServerForUser, { serverId: params().serverId as Id<"servers"> }),
			),
			queryClient.prefetchQuery(
				convexQuery(api.me.getUser, { serverId: params().serverId as Id<"servers"> }),
			),
			queryClient.prefetchQuery(convexQuery(api.me.get, {})),
			queryClient.prefetchQuery(
				convexQuery(api.channels.getChannels, {
					serverId: params().serverId as Id<"servers">,
					favoriteFilter: {
						favorite: false,
					},
				}),
			),
		])
	})

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
			<PresenceProvider
				roomId={() => params().serverId as Id<"servers">}
				userId={() => meQuery.data?._id!}
			>
				<CommandBar serverId={() => params().serverId as Id<"servers">} />
				<Sidebar.Provider>
					<AppSidebar />
					<Sidebar.Inset>
						<Outlet />
					</Sidebar.Inset>
				</Sidebar.Provider>
			</PresenceProvider>
		</Suspense>
	)
}
