import { Outlet, createFileRoute, redirect } from "@tanstack/solid-router"
import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import { createEffect, createMemo } from "solid-js"
import { Sidebar } from "~/components/ui/sidebar"
import { removeCurrentServerId, setCurrentServerId } from "~/lib/helpers/localstorage"
import { AppSidebar } from "./-components/app-sidebar"

export const Route = createFileRoute("/_protected/_app/$serverId")({
	component: RouteComponent,
	beforeLoad: async ({ context, params }) => {
		setTimeout(async () => {
			const server = await context.convex.query(api.servers.getServer, {
				serverId: params.serverId as Id<"servers">,
			})

			if (!server) {
				removeCurrentServerId()
				throw redirect({
					to: "/",
				})
			}

			setCurrentServerId(server._id)
		}, 0)
	},
})

function RouteComponent() {
	return (
		<Sidebar.Provider>
			<AppSidebar />
			{/* <div class="fixed inset-y-0 border-r bg-sidebar/90 pb-4 lg:left-0 lg:z-50 lg:block lg:w-14 lg:overflow-y-auto">
				<ServerSelectSidebar />
			</div> */}
			<Sidebar.Inset>
				<Outlet />
			</Sidebar.Inset>
		</Sidebar.Provider>
	)
}
