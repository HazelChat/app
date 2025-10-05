import { Avatar } from "~/components/base/avatar/avatar"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { useOrganization } from "~/hooks/use-organization"

export function SidebarMobile() {
	const { organization: currentOrg } = useOrganization()
	return (
		<nav className="flex items-center border-tertiary border-b bg-secondary p-2 sm:hidden">
			<SidebarTrigger
				iconLeading={
					<svg width={24} height={24} viewBox="0 0 24 24" fill="none">
						<path
							d="M16 10H3M20 6H3M20 14H3M16 18H3"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				}
			/>
			<Separator className="mr-3.5 ml-2 h-5" orientation="vertical" />
			<div className="flex items-center gap-x-2">
				<Avatar
					size="xxs"
					src={currentOrg?.logoUrl || `https://avatar.vercel.sh/${currentOrg?.workosId}`}
					initials={currentOrg?.name?.slice(0, 2).toUpperCase() || "??"}
					alt={currentOrg?.name || "Organization"}
				/>
				<span className="truncate font-medium text-sm">{currentOrg?.name || "Loading..."}</span>
			</div>
		</nav>
	)
}
