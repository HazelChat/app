import { createFileRoute, Outlet, useLocation, useNavigate, useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { TabList, Tabs } from "~/components/application/tabs/tabs"
import { Input } from "~/components/base/input/input"
import { NativeSelect } from "~/components/base/select/select-native"
import IconMagnifier3 from "~/components/icons/icon-magnifier-3"

export const Route = createFileRoute("/_app/$orgSlug/settings")({
	component: RouteComponent,
})

const tabs = [
	{ id: "profile", label: "Profile" },
	{ id: "appearance", label: "Appearance" },
	{ id: "team", label: "Team" },
	{ id: "invitations", label: "Invitations" },
	{ id: "billing", label: "Billing" },
	{ id: "notifications", label: "Notifications", badge: 2 },
	{ id: "integrations", label: "Integrations" },
	{ id: "debug", label: "Debug" },
]

function RouteComponent() {
	const location = useLocation()
	const navigate = useNavigate()
	const { orgSlug } = useParams({ from: "/_app/$orgSlug" })

	// Extract the current tab from the pathname
	const pathSegments = location.pathname.split("/")
	const currentTab =
		pathSegments[pathSegments.length - 1] === "settings"
			? "appearance" // Default to appearance when at /_app/settings
			: pathSegments[pathSegments.length - 1]

	const [selectedTab, setSelectedTab] = useState<string>(currentTab!)

	// Update selected tab when location changes
	useEffect(() => {
		setSelectedTab(currentTab!)
	}, [currentTab])

	return (
		<main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-5 px-4 lg:px-8">
					{/* Page header simple with search */}
					<div className="relative flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
							<div className="flex flex-col gap-0.5 lg:gap-1">
								<h1 className="font-semibold text-primary text-xl lg:text-display-xs">
									Settings
								</h1>
							</div>
							<div className="flex flex-col gap-4 lg:flex-row">
								<Input
									className="lg:w-80"
									size="sm"
									shortcut
									aria-label="Search"
									placeholder="Search"
									icon={IconMagnifier3}
								/>
							</div>
						</div>
					</div>

					<div className="md:hidden">
						<NativeSelect
							value={selectedTab}
							onChange={(event) => {
								const tabId = event.target.value
								navigate({
									to:
										tabId === "appearance"
											? "/$orgSlug/settings"
											: `/$orgSlug/settings/${tabId}`,
									params: { orgSlug },
								})
							}}
							options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
						/>
					</div>

					<div className="-mx-4 -my-1 scrollbar-hide lg:-mx-8 flex overflow-auto px-4 py-1 lg:px-8">
						<Tabs
							className="flex w-max items-start max-md:hidden"
							selectedKey={selectedTab}
							onSelectionChange={(value) => {
								const tabId = value as string
								navigate({
									to:
										tabId === "appearance"
											? "/$orgSlug/settings"
											: `/$orgSlug/settings/${tabId}`,
									params: { orgSlug },
								})
							}}
						>
							<TabList type="button-border" className="w-full" items={tabs} />
						</Tabs>
					</div>
				</div>
				<Outlet />
			</div>
		</main>
	)
}
