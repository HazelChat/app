import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@workos-inc/authkit-react"
import {
	OrganizationSwitcher,
	UserProfile,
	UserSecurity,
	UserSessions,
	UsersManagement,
	WorkOsWidgets,
} from "@workos-inc/widgets"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { Form } from "~/components/base/form/form"

export const Route = createFileRoute("/app/$orgId/settings/notifications")({
	component: NotificationsSettings,
})

function NotificationsSettings() {
	const { getAccessToken, switchToOrganization } = useAuth()

	return (
		<Form
			className="flex flex-col gap-6 px-4 lg:px-8"
			onSubmit={(e) => {
				e.preventDefault()
				const data = Object.fromEntries(new FormData(e.currentTarget))
				console.log("Form data:", data)
			}}
		>
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
						<SectionHeader.Heading>Notifications</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Configure how and when you receive notifications.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<div className="flex flex-col gap-5">
				<p className="text-secondary">Notification settings coming soon...</p>
			</div>
			<div className="flex flex-col gap-5">
				<WorkOsWidgets
					theme={{
						appearance: "dark",
						accentColor: "green",
						radius: "medium",
						fontFamily: "Inter",
					}}
				>
					<OrganizationSwitcher
						authToken={getAccessToken}
						switchToOrganization={switchToOrganization}
					>
						{/* <CreateOrganization /> */}
					</OrganizationSwitcher>
					<UserProfile authToken={getAccessToken} />

					<UsersManagement authToken={getAccessToken} />
					<UserSessions authToken={getAccessToken} />
					<UserSecurity authToken={getAccessToken} />
				</WorkOsWidgets>
			</div>
		</Form>
	)
}
