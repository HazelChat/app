import type { ChannelId } from "@hazel/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import IconHashtag from "~/components/icons/icon-hashtag"
import { Tab, TabList, Tabs } from "~/components/ui/tabs"
import { channelCollection } from "~/db/collections"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings")({
	component: RouteComponent,
})

const tabs = [
	{ id: "overview", label: "Overview" },
	{ id: "integrations", label: "Integrations" },
] as const

function RouteComponent() {
	const { orgSlug, channelId } = Route.useParams()
	const location = useLocation()
	const navigate = useNavigate()

	// Get channel info
	const { data: channelResult } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where(({ channel }) => eq(channel.id, channelId as ChannelId))
				.findOne()
				.select(({ channel }) => ({ channel })),
		[channelId],
	)
	const channel = channelResult?.channel

	// Extract the current tab from the pathname
	const pathSegments = location.pathname.split("/")
	const lastSegment = pathSegments[pathSegments.length - 1]
	const selectedTab = lastSegment === "settings" ? "overview" : lastSegment

	return (
		<main className="h-full w-full min-w-0 bg-bg">
			<div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto pt-6 pb-12">
				<div className="flex flex-col gap-5 px-4 lg:px-8">
					{/* Back button and header */}
					<div className="flex flex-col gap-4">
						<Link
							to="/$orgSlug/chat/$id"
							params={{ orgSlug, id: channelId }}
							className="flex items-center gap-2 text-muted-fg text-sm transition-colors hover:text-fg"
						>
							<svg
								className="size-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
								/>
							</svg>
							Back to channel
						</Link>

						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
								<IconHashtag className="size-5 text-muted-fg" />
							</div>
							<div className="flex flex-col">
								<h1 className="font-semibold text-fg text-xl">
									{channel?.name ?? "Channel"}
								</h1>
								<span className="text-muted-fg text-sm">Channel settings</span>
							</div>
						</div>
					</div>

					{/* Tabs */}
					<div className="-mx-4 -my-1 lg:-mx-8 flex w-full max-w-full overflow-scroll px-4 py-1 lg:px-8">
						<Tabs
							selectedKey={selectedTab}
							onSelectionChange={(value) => {
								const tabId = value as string
								navigate({
									to: `/$orgSlug/channels/$channelId/settings/${tabId}`,
									params: { orgSlug, channelId },
								})
							}}
						>
							<TabList>
								{tabs.map((tab) => (
									<Tab key={tab.id} id={tab.id}>
										{tab.label}
									</Tab>
								))}
							</TabList>
						</Tabs>
					</div>
				</div>

				<Outlet />
			</div>
		</main>
	)
}
