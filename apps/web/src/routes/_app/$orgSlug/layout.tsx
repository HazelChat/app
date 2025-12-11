import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import type { CommandPalettePage } from "~/atoms/command-palette-atoms"
import { CommandPalette } from "~/components/command-palette"
import { Loader } from "~/components/loader"
import { MobileNav } from "~/components/mobile-nav"
import { AppSidebar } from "~/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import {
	attachmentCollection,
	channelCollection,
	channelMemberCollection,
	organizationCollection,
	organizationMemberCollection,
	userCollection,
} from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { NotificationSoundProvider } from "~/providers/notification-sound-provider"
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
		await userCollection.preload()

		return null
	},
})

function RouteComponent() {
	const [openCmd, setOpenCmd] = useState(false)
	const [initialPage, setInitialPage] = useState<CommandPalettePage>("home")
	const { user, login } = useAuth()
	const { organizationId, isLoading: isOrgLoading } = useOrganization()
	const isRedirecting = useRef(false)

	const openChannelsBrowser = () => {
		setInitialPage("channels")
		setOpenCmd(true)
	}

	// Sync organization context to user session
	// If user's JWT doesn't have org context (or has different org), re-authenticate with correct org
	useEffect(() => {
		if (isOrgLoading || !organizationId || !user || isRedirecting.current) return

		// If user's session org doesn't match the route's org, re-login with correct org context
		if (user.organizationId !== organizationId) {
			isRedirecting.current = true
			login({ organizationId, returnTo: window.location.href })
		}
	}, [user, organizationId, isOrgLoading, login])

	// Show loader while org is loading or while redirecting for org context sync
	if (isOrgLoading || (user && organizationId && user.organizationId !== organizationId)) {
		return <Loader />
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
				<NotificationSoundProvider>
					<AppSidebar openChannelsBrowser={openChannelsBrowser} />
					<SidebarInset className="pb-16 md:pb-0">
						<Outlet />
						<MobileNav />
						<CommandPalette
							isOpen={openCmd}
							onOpenChange={setOpenCmd}
							initialPage={initialPage}
						/>
					</SidebarInset>
				</NotificationSoundProvider>
			</PresenceProvider>
		</SidebarProvider>
	)
}