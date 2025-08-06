import { useNavigate, useParams } from "@tanstack/react-router"
import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { Container, HelpCircle, LayersTwo01, LogOut01, Settings01, User01 } from "@untitledui/icons"
import { useAuth } from "@workos-inc/authkit-react"
import { Button as AriaButton } from "react-aria-components"
import { Avatar } from "~/components/base/avatar/avatar"
import { AvatarLabelGroup } from "~/components/base/avatar/avatar-label-group"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { cx } from "~/utils/cx"

export const NavUser = () => {
	const { user, signOut } = useAuth()
	const navigate = useNavigate()
	
	// Try to get orgId from route params
	const params = useParams({ from: "/app/$orgId", strict: false })
	const orgIdFromRoute = params?.orgId as Id<"organizations"> | undefined
	
	// Fall back to getting organization from session if not in route
	const organizationQuery = useQuery(
		convexQuery(api.me.getOrganization, orgIdFromRoute ? "skip" : {})
	)
	const orgIdFromSession = organizationQuery.data?.directive === "success" 
		? organizationQuery.data.data._id 
		: undefined
	
	const organizationId = orgIdFromRoute || orgIdFromSession

	return (
		<Dropdown.Root>
			<AriaButton
				className={({ isPressed, isFocusVisible }) =>
					cx(
						"group relative inline-flex cursor-pointer rounded-full outline-focus-ring",
						(isPressed || isFocusVisible) && "outline-2 outline-offset-2",
					)
				}
			>
				<Avatar
					alt={`${user?.firstName} ${user?.lastName}`}
					src={user?.profilePictureUrl}
					size="sm"
				/>
			</AriaButton>

			<Dropdown.Popover>
				<div className="flex gap-3 border-secondary border-b p-3">
					<AvatarLabelGroup
						size="md"
						src={user?.profilePictureUrl}
						status="online"
						title={`${user?.firstName} ${user?.lastName}`}
						subtitle={user?.email}
					/>
				</div>
				<Dropdown.Menu>
					<Dropdown.Section>
						<Dropdown.Item addon="⌘K->P" icon={User01}>
							View profile
						</Dropdown.Item>
						<Dropdown.Item
							addon="⌘S"
							onAction={() => {
								if (organizationId) {
									navigate({
										to: "/app/$orgId/settings",
										params: { orgId: organizationId },
									})
								}
							}}
							icon={Settings01}
						>
							Settings
						</Dropdown.Item>
					</Dropdown.Section>
					<Dropdown.Separator />
					<Dropdown.Section>
						<Dropdown.Item icon={LayersTwo01}>Changelog</Dropdown.Item>
						<Dropdown.Item icon={HelpCircle}>Support</Dropdown.Item>
						<Dropdown.Item icon={Container}>API</Dropdown.Item>
					</Dropdown.Section>
					<Dropdown.Separator />
					<Dropdown.Section>
						<Dropdown.Item addon="⌥⇧Q" icon={LogOut01} onAction={signOut}>
							Log out
						</Dropdown.Item>
					</Dropdown.Section>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown.Root>
	)
}
