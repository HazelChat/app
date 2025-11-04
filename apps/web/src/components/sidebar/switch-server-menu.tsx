import type { OrganizationId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { toast } from "sonner"
import { openModal } from "~/atoms/modal-atoms"
import IconPlus from "~/components/icons/icon-plus"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { getOrganizationRoute } from "~/utils/organization-navigation"
import { Avatar } from "../ui/avatar"
import { MenuItem, MenuSection, MenuSeparator } from "../ui/menu"
import { SidebarLabel } from "../ui/sidebar"

export const SwitchServerMenu = () => {
	const { user } = useAuth()

	const { organizationId: currentOrgId } = useOrganization()

	const { data: userOrganizations } = useLiveQuery(
		(q) =>
			q
				.from({ member: organizationMemberCollection })
				.innerJoin({ org: organizationCollection }, ({ member, org }) =>
					eq(member.organizationId, org.id),
				)
				.where(({ member }) => eq(member.userId, user?.id || ""))
				.orderBy(({ member }) => member.createdAt, "asc"),
		[user?.id],
	)

	const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
		if (keys === "all" || keys.size === 0) return

		const selectedOrgId = Array.from(keys)[0] as OrganizationId
		if (selectedOrgId === currentOrgId) return // Already on this org

		const selectedOrg = userOrganizations?.find((row) => row.org.id === selectedOrgId)
		if (!selectedOrg) return

		// Show loading toast
		toast.loading(`Switching to ${selectedOrg.org.name}...`)

		// Build the return URL (full frontend URL)
		const route = getOrganizationRoute(selectedOrg.org)
		const frontendUrl = window.location.origin
		const returnUrl = `${frontendUrl}${route.to}`

		// Redirect to backend login endpoint with the organization ID
		// WorkOS will handle the organization switch and redirect back
		const backendUrl = import.meta.env.VITE_BACKEND_URL
		window.location.href = `${backendUrl}/auth/login?organizationId=${selectedOrgId}&returnTo=${encodeURIComponent(returnUrl)}`
	}

	return (
		<>
			<MenuSection
				items={userOrganizations}
				disallowEmptySelection
				selectionMode="single"
				selectedKeys={currentOrgId ? new Set([currentOrgId]) : undefined}
				onSelectionChange={handleSelectionChange}
			>
				{({ org }) => (
					<MenuItem id={org.id} textValue={org.name}>
						<Avatar
							size="xs"
							src={org.logoUrl || `https://avatar.vercel.sh/${org.id}`}
							alt={org.name}
						/>
						<SidebarLabel>{org.name}</SidebarLabel>
					</MenuItem>
				)}
			</MenuSection>

			<MenuSeparator />

			<MenuItem
				id="create-server"
				textValue="Create server"
				onAction={() => openModal("create-organization")}
			>
				<IconPlus data-slot="icon" />
				<SidebarLabel>Create server</SidebarLabel>
			</MenuItem>
		</>
	)
}
