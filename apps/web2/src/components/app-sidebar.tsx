import { ChannelsSidebar } from "~/components/channels-sidebar"
import { ServerSidebar } from "~/components/server-sidebar"
import { Sidebar } from "~/components/ui/sidebar"

export function AppSidebar({ openCmd }: { openCmd: (isOpen: boolean) => void }) {
	return (
		<Sidebar
			closeButton={false}
			collapsible="dock"
			className="overflow-hidden *:data-[sidebar=default]:flex-row"
		>
			<ServerSidebar />

			<ChannelsSidebar openCmd={openCmd} />
		</Sidebar>
	)
}
