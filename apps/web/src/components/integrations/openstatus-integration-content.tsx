import { useAtomSet } from "@effect-atom/atom-react"
import type { Channel } from "@hazel/domain/models"
import type { ChannelId, OrganizationId } from "@hazel/schema"
import { eq, or, useLiveQuery } from "@tanstack/react-db"
import { formatDistanceToNow } from "date-fns"
import { Exit } from "effect"
import { useCallback, useEffect, useMemo, useState } from "react"
import { listOrganizationWebhooksMutation, type WebhookData } from "~/atoms/channel-webhook-atoms"
import IconHashtag from "~/components/icons/icon-hashtag"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { channelCollection } from "~/db/collections"
import { ConfigureOpenStatusModal } from "./configure-openstatus-modal"

type ChannelData = typeof Channel.Model.Type

interface OpenStatusIntegrationContentProps {
	organizationId: OrganizationId
}

export function OpenStatusIntegrationContent({ organizationId }: OpenStatusIntegrationContentProps) {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedChannelId, setSelectedChannelId] = useState<ChannelId | null>(null)
	const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null)
	const [webhooks, setWebhooks] = useState<readonly WebhookData[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const listWebhooks = useAtomSet(listOrganizationWebhooksMutation, { mode: "promiseExit" })

	// Query all channels in organization (public and private only, not DMs/threads)
	const { data: channelsData } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where(({ channel }) => eq(channel.organizationId, organizationId))
				.where(({ channel }) => or(eq(channel.type, "public"), eq(channel.type, "private")))
				.select(({ channel }) => ({ ...channel })),
		[organizationId],
	)

	const channels = channelsData ?? []

	// Fetch webhooks (isInitial = false for refetches to avoid remount)
	const fetchWebhooks = useCallback(
		async (isInitial = false) => {
			if (isInitial) setIsLoading(true)
			const exit = await listWebhooks({ payload: {} })

			Exit.match(exit, {
				onSuccess: (result) => {
					setWebhooks(result.data)
				},
				onFailure: (cause) => {
					console.error("Failed to fetch webhooks:", cause)
				},
			})
			if (isInitial) setIsLoading(false)
		},
		[listWebhooks],
	)

	useEffect(() => {
		fetchWebhooks(true) // Show loading on initial fetch
	}, [fetchWebhooks])

	// Filter to OpenStatus webhooks only
	const openStatusWebhooks = useMemo(() => webhooks.filter((w) => w.name === "OpenStatus"), [webhooks])

	// Map webhooks to channels for display
	const configuredChannels = useMemo(() => {
		return openStatusWebhooks
			.map((webhook) => {
				const channel = channels.find((c) => c.id === webhook.channelId)
				return { webhook, channel }
			})
			.filter(
				(item): item is { webhook: WebhookData; channel: ChannelData } => item.channel !== undefined,
			)
	}, [openStatusWebhooks, channels])

	// Get channels without OpenStatus configured
	const unconfiguredChannels = useMemo(() => {
		const configuredIds = new Set(openStatusWebhooks.map((w) => w.channelId))
		return channels.filter((c) => !configuredIds.has(c.id))
	}, [channels, openStatusWebhooks])

	const handleAddChannel = () => {
		setSelectedChannelId(null)
		setSelectedWebhook(null)
		setIsModalOpen(true)
	}

	const handleManageChannel = (webhook: WebhookData, channel: ChannelData) => {
		setSelectedChannelId(channel.id)
		setSelectedWebhook(webhook)
		setIsModalOpen(true)
	}

	const handleSuccess = () => {
		fetchWebhooks()
	}

	// Show loading if webhooks are loading, or if we have webhooks but channels haven't loaded yet from Electric
	const isChannelsLoading = openStatusWebhooks.length > 0 && channels.length === 0
	if (isLoading || isChannelsLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="flex items-center gap-3 text-muted-fg">
					<svg className="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span className="text-sm">Loading channels...</span>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className="overflow-hidden rounded-xl border border-border bg-bg">
				<div className="flex items-center justify-between border-border border-b bg-bg-muted/30 px-5 py-3">
					<h3 className="font-medium text-fg text-sm">Configured Channels</h3>
					<Button
						intent="primary"
						size="sm"
						onPress={handleAddChannel}
						isDisabled={unconfiguredChannels.length === 0}
					>
						<svg
							className="size-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Add Channel
					</Button>
				</div>

				{configuredChannels.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-5 py-12 text-center">
						<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
							<img
								src="https://cdn.brandfetch.io/openstatus.dev/w/64/h/64/theme/dark/icon"
								alt="OpenStatus"
								className="size-8"
							/>
						</div>
						<h4 className="mb-1 font-medium text-fg">No channels configured</h4>
						<p className="mb-6 max-w-sm text-muted-fg text-sm">
							Add OpenStatus to a channel to start receiving monitor alerts and uptime
							notifications.
						</p>
						<Button intent="primary" onPress={handleAddChannel}>
							<svg
								className="size-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
							</svg>
							Add Your First Channel
						</Button>
					</div>
				) : (
					<div className="divide-y divide-border">
						{configuredChannels.map(({ webhook, channel }) => (
							<div
								key={webhook.id}
								className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-bg-muted/20"
							>
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-lg bg-bg-muted">
										<IconHashtag className="size-5 text-muted-fg" />
									</div>
									<div className="flex flex-col gap-0.5">
										<div className="flex items-center gap-2">
											<span className="font-medium text-fg">{channel.name}</span>
											<Badge intent={webhook.isEnabled ? "success" : "secondary"}>
												{webhook.isEnabled ? "Active" : "Disabled"}
											</Badge>
										</div>
										<p className="text-muted-fg text-xs">
											{webhook.lastUsedAt
												? `Last alert ${formatDistanceToNow(new Date(webhook.lastUsedAt), { addSuffix: true })}`
												: "No alerts received yet"}
										</p>
									</div>
								</div>
								<Button
									intent="outline"
									size="sm"
									onPress={() => handleManageChannel(webhook, channel)}
								>
									Manage
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			<ConfigureOpenStatusModal
				isOpen={isModalOpen}
				onOpenChange={setIsModalOpen}
				channels={selectedWebhook ? channels : unconfiguredChannels}
				selectedChannelId={selectedChannelId}
				existingWebhook={selectedWebhook}
				onSuccess={handleSuccess}
			/>
		</>
	)
}
