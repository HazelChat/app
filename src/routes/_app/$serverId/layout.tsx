import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { Sidebar } from "~/components/sidebar"
import { ServerSelectSidebar } from "./-components/server-select-sidebar"

export const Route = createFileRoute("/_app/$serverId")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div>
			<div class="fixed inset-y-0 border-r bg-background pb-4 lg:left-0 lg:z-50 lg:block lg:w-14 lg:overflow-y-auto">
				<ServerSelectSidebar />
			</div>
			<main class="pl-14">
				<div class="pl-62">
					<Outlet />
				</div>
			</main>
			<aside class="fixed inset-y-0 left-14 block w-62 overflow-y-auto border-border border-r">
				<Sidebar />
			</aside>
		</div>
	)
}
