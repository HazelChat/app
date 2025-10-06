import { eq, useLiveQuery } from "@tanstack/react-db"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useState } from "react"
import { Button as AriaButton } from "react-aria-components"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/providers/auth-provider"
import { cx } from "~/utils/cx"
import { getOrganizationRoute } from "~/utils/organization-navigation"
import { CreateOrganizationModal } from "../application/modals/create-organization-modal"
import { EmailInviteModal } from "../application/modals/email-invite-modal"
import { Avatar } from "../base/avatar/avatar"
import { Dropdown } from "../base/dropdown/dropdown"
import IconPlus from "../icons/icon-plus"
import IconUsersPlus from "../icons/icon-users-plus"

export const WorkspaceSwitcher = () => {
	const [inviteModalOpen, setInviteModalOpen] = useState(false)
	const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false)

	const { user, login } = useAuth()
	const navigate = useNavigate()
	const { organization: currentOrg, organizationId } = useOrganization()

	const { data: currentOrgData } = useLiveQuery(
		(q) =>
			organizationId
				? q
						.from({ org: organizationCollection })
						.where(({ org }) => eq(org.id, organizationId))
						.orderBy(({ org }) => org.createdAt, "desc")
				: null,
		[organizationId],
	)

	const { data: userOrganizations } = useLiveQuery(
		(q) =>
			user?.id
				? q
						.from({ member: organizationMemberCollection })
						.innerJoin({ org: organizationCollection }, ({ member, org }) =>
							eq(member.organizationId, org.id),
						)
						.where(({ member }) => eq(member.userId, user.id))
						.orderBy(({ member }) => member.createdAt, "asc")
				: null,
		[user?.id],
	)

	// Use the org from hook or fallback to query data
	const displayOrg = currentOrg || currentOrgData?.[0]
	const organizations = userOrganizations?.map((row) => row.org) || []

	const handleOrganizationSwitch = async (workosOrgId: string) => {
		try {
			const targetOrg = organizations.find((org) => org.workosId === workosOrgId)
			if (targetOrg) {
				// Determine current subpath to maintain it after switching
				const currentPath = window.location.pathname
				const pathSegments = currentPath.split("/")
				let subPath: string | undefined

				// Extract subpath if we're in an org route (skip first 2 segments: "", "orgSlug")
				if (pathSegments.length > 2) {
					subPath = pathSegments.slice(2).join("/")
				}

				// Get the safe navigation route (handles missing slugs)
				const route = getOrganizationRoute(targetOrg, subPath)

				await navigate(route)

				await login({ workosOrganizationId: workosOrgId })
			}
		} catch (error) {
			console.error("Failed to switch organization:", error)
		}
	}

	return (
		<>
			<Dropdown.Root>
				<AriaButton
					className={({ isPressed, isFocusVisible }) =>
						cx(
							"flex h-8 w-full items-center justify-start gap-2 rounded-md p-1 font-medium text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
							isPressed && "bg-sidebar-accent text-sidebar-accent-foreground",
							isFocusVisible && "outline-2 outline-focus-ring outline-offset-2",
						)
					}
				>
					<Avatar
						size="xs"
						src={displayOrg?.logoUrl || `https://avatar.vercel.sh/${displayOrg?.workosId}`}
						initials={displayOrg?.name?.slice(0, 2).toUpperCase() || "??"}
						alt={displayOrg?.name || "Organization"}
					/>
					<span className="truncate font-semibold">{displayOrg?.name || "Loading..."}</span>
				</AriaButton>
				<Dropdown.Popover className="w-56">
					<Dropdown.Menu>
						<Dropdown.Section>
							<Dropdown.SectionHeader className="px-2 py-1.5 font-medium text-fg-quaternary text-xs">
								Organizations
							</Dropdown.SectionHeader>
							{organizations.map((org) => (
								<Dropdown.Item
									key={org.id}
									onAction={() => handleOrganizationSwitch(org.workosId)}
								>
									<div className="flex items-center gap-2">
										<Avatar
											size="xs"
											src={org.logoUrl || `https://avatar.vercel.sh/${org.workosId}`}
											initials={org.name.slice(0, 2).toUpperCase()}
											alt={org.name}
										/>
										<span className="truncate text-fg-secondary text-xs">{org.name}</span>
										{displayOrg?.id === org.id && (
											<span className="ml-auto text-fg-quaternary text-xs">✓</span>
										)}
									</div>
								</Dropdown.Item>
							))}
						</Dropdown.Section>
						<Dropdown.Separator />
						<Dropdown.Section>
							<Dropdown.Item
								icon={IconPlus}
								label="Add Organization"
								onAction={() => setCreateOrgModalOpen(true)}
							/>
							<Dropdown.Item
								icon={IconUsersPlus}
								label="Invite People"
								onAction={() => setInviteModalOpen(true)}
							/>
						</Dropdown.Section>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>

			<CreateOrganizationModal isOpen={createOrgModalOpen} onOpenChange={setCreateOrgModalOpen} />
			<EmailInviteModal isOpen={inviteModalOpen} onOpenChange={setInviteModalOpen} />
		</>
	)
}
