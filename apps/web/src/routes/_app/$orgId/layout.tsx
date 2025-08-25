import { createFileRoute, Outlet } from "@tanstack/react-router"
import { AppSidebar } from "~/components/app-sidebar/app-sidebar"
import { CommandPalette } from "~/components/command-palette"
import { NotificationManager } from "~/components/notification-manager"
import { PresenceProvider } from "~/components/presence/presence-provider"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { SidebarMobile } from "~/components/app-sidebar/sidebar-mobile";

export const Route = createFileRoute("/_app/$orgId")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<PresenceProvider>
			<SidebarProvider>
				<NotificationManager />
				<AppSidebar />
				<SidebarInset>
          <SidebarMobile/>
					<Outlet />
					<CommandPalette />
				</SidebarInset>
			</SidebarProvider>
		</PresenceProvider>
	)
}
