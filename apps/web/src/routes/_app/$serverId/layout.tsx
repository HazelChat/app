import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { Sidebar } from "~/components/ui/sidebar"
import { AppSidebar } from "~/routes/_app/$serverId/-components/app-sidebar"
import { ServerSelectSidebar } from "./-components/server-select-sidebar"

export const Route = createFileRoute("/_app/$serverId")({
	component: RouteComponent,
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
