import type { OrganizationId } from "@hazel/db/schema"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Container, HelpCircle, LayersTwo01, LogOut01, Settings01, User01 } from "@untitledui/icons"
import { Button as AriaButton } from "react-aria-components"
import { Avatar } from "~/components/base/avatar/avatar"
import { AvatarLabelGroup } from "~/components/base/avatar/avatar-label-group"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { useAuth } from "~/providers/auth-provider"
import { cx } from "~/utils/cx"

export const NavUser = () => {
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	const params = useParams({ from: "/_app/$orgId" })
	const organizationId = params?.orgId as OrganizationId

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
				<Avatar alt={`${user?.firstName} ${user?.lastName}`} src={user?.avatarUrl} size="sm" />
			</AriaButton>

			<Dropdown.Popover>
				<div className="flex gap-3 border-secondary border-b p-3">
					<AvatarLabelGroup
						size="md"
						src={user?.avatarUrl}
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
										to: "/$orgId/settings",
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
						<Dropdown.Item addon="⌥⇧Q" icon={LogOut01} onAction={logout}>
							Log out
						</Dropdown.Item>
					</Dropdown.Section>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown.Root>
	)
}
