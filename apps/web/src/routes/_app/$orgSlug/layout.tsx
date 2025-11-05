import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useState } from "react"
import type { CommandPalettePage } from "~/atoms/command-palette-atoms"
import { CommandPalette } from "~/components/command-palette"
import { AppSidebar } from "~/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import {
	attachmentCollection,
	channelCollection,
	channelMemberCollection,
	organizationCollection,
	organizationMemberCollection,
} from "~/db/collections"
import { PresenceProvider } from "~/providers/presence-provider"

export const Route = createFileRoute("/_app/$orgSlug")({
	component: RouteComponent,
	loader: async () => {
		// TODO: Should be scoped to the organization
		await channelCollection.preload()
		await channelMemberCollection.preload()
		await attachmentCollection.preload()

		await organizationCollection.preload()
		await organizationMemberCollection.preload()

		return null
	},
})

function RouteComponent() {
	const [openCmd, setOpenCmd] = useState(false)
	const [initialPage, setInitialPage] = useState<CommandPalettePage>("home")

	const openChannelsBrowser = () => {
		setInitialPage("channels")
		setOpenCmd(true)
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "350px",
				} as React.CSSProperties
			}
		>
			<PresenceProvider>
				<AppSidebar openChannelsBrowser={openChannelsBrowser} />
				<SidebarInset>
					<Outlet />
					<CommandPalette isOpen={openCmd} onOpenChange={setOpenCmd} initialPage={initialPage} />
				</SidebarInset>
			</PresenceProvider>
		</SidebarProvider>
	)
}
