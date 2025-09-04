import type { OrganizationId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useAuth } from "@workos-inc/authkit-react"
import { useState } from "react"
import { Button as AriaButton } from "react-aria-components"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useUser } from "~/lib/auth"
import { cx } from "~/utils/cx"
import { CreateOrganizationModal } from "../application/modals/create-organization-modal"
import { EmailInviteModal } from "../application/modals/email-invite-modal"
import { Avatar } from "../base/avatar/avatar"
import { Dropdown } from "../base/dropdown/dropdown"
import IconPlusStroke from "../icons/IconPlusStroke"
import IconUserPlus1 from "../icons/IconUserPlus1"

export const WorkspaceSwitcher = () => {
	const [inviteModalOpen, setInviteModalOpen] = useState(false)
	const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false)
	const { switchToOrganization } = useAuth()
	const navigate = useNavigate()
	const params = useParams({ strict: false })
	const { user } = useUser()

	const organizationId = params.orgId as OrganizationId

	const { data: currentOrgData } = useLiveQuery(
		(q) =>
			q
				.from({ org: organizationCollection })
				.where(({ org }) => eq(org.id, organizationId))
				.orderBy(({ org }) => org.createdAt, "desc")
				.limit(1),
		[organizationId],
	)

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

	const currentOrg = currentOrgData?.[0]
	const organizations = userOrganizations?.map((row) => row.org) || []

	const handleOrganizationSwitch = async (workosOrgId: string) => {
		try {
			const targetOrg = organizations.find((org) => org.workosId === workosOrgId)
			if (targetOrg) {
				const currentPath = window.location.pathname
				const pathSegments = currentPath.split("/")

				let targetRoute = `/${targetOrg.id}`

				if (pathSegments.length > 3 && pathSegments[1] === "app") {
					const subPath = pathSegments.slice(3).join("/")
					if (subPath) {
						targetRoute = `/${targetOrg.id}/${subPath}`
					}
				}

				await navigate({ to: targetRoute })

				await switchToOrganization({ organizationId: workosOrgId })
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
						src={currentOrg?.logoUrl || `https://avatar.vercel.sh/${currentOrg?.workosId}`}
						initials={currentOrg?.name?.slice(0, 2).toUpperCase() || "??"}
						alt={currentOrg?.name || "Organization"}
					/>
					<span className="truncate font-semibold">{currentOrg?.name || "Loading..."}</span>
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
										{currentOrg?.id === org.id && (
											<span className="ml-auto text-fg-quaternary text-xs">✓</span>
										)}
									</div>
								</Dropdown.Item>
							))}
						</Dropdown.Section>
						<Dropdown.Separator />
						<Dropdown.Section>
							<Dropdown.Item
								icon={IconPlusStroke}
								label="Add Organization"
								onAction={() => setCreateOrgModalOpen(true)}
							/>
							<Dropdown.Item
								icon={IconUserPlus1}
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
