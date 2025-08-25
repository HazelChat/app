import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { Avatar } from "~/components/base/avatar/avatar"
import IconAlignLeft from "~/components/icons/IconAlignLeft"
import IconAlignLeft1 from "~/components/icons/IconAlignLeft1"
import IconAlignLeftStroke from "~/components/icons/IconAlignLeftStroke"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { cx } from "~/utils/cx"

export function SidebarMobile() {
	const params = useParams({ strict: false })
	const organizationId = params.orgId as Id<"organizations"> | undefined

	const organizationByIdQuery = useQuery(
		convexQuery(api.organizations.getOrganizationById, organizationId ? { organizationId } : "skip"),
	)

	const currentOrg = organizationId ? organizationByIdQuery.data : null
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
