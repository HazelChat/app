import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, ChannelWebhookId } from "@hazel/schema"
import { createFileRoute } from "@tanstack/react-router"
import { Exit } from "effect"
import { useCallback, useEffect, useMemo, useState } from "react"
import { listChannelWebhooksMutation, type WebhookData } from "~/atoms/channel-webhook-atoms"
import { CreateWebhookForm } from "~/components/channel-settings/create-webhook-form"
import { DeleteWebhookDialog } from "~/components/channel-settings/delete-webhook-dialog"
import { EditWebhookForm } from "~/components/channel-settings/edit-webhook-form"
import { OpenStatusSection } from "~/components/channel-settings/openstatus-section"
import { RegenerateTokenDialog } from "~/components/channel-settings/regenerate-token-dialog"
import { WebhookCard } from "~/components/channel-settings/webhook-card"
import { getProviderIconUrl } from "~/components/embeds/use-embed-theme"
import { SectionHeader } from "~/components/ui/section-header"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings/integrations")({
	component: IntegrationsPage,
})

interface IntegrationSectionProps {
	icon: React.ReactNode
	title: string
	description: string
	badge?: React.ReactNode
	isExpanded: boolean
	onToggle: () => void
	children: React.ReactNode
}

function IntegrationSection({
	icon,
	title,
	description,
	badge,
	isExpanded,
	onToggle,
	children,
}: IntegrationSectionProps) {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-bg">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
			>
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
					{icon}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="font-medium text-fg">{title}</span>
						{badge}
					</div>
					<span className="text-muted-fg text-sm">{description}</span>
				</div>
				<svg
					className={`size-5 shrink-0 text-muted-fg transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			<div
				className={`grid transition-all duration-200 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
			>
				<div className="overflow-hidden">
					<div className="border-border border-t p-4">{children}</div>
				</div>
			</div>
		</div>
	)
}

function IntegrationsPage() {
	const { channelId } = Route.useParams()

	const [webhooksExpanded, setWebhooksExpanded] = useState(true)
	const [openStatusExpanded, setOpenStatusExpanded] = useState(true)
	const [webhooks, setWebhooks] = useState<WebhookData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null)
	const [editModalOpen, setEditModalOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)

	// Separate OpenStatus webhook from regular webhooks
	const { openStatusWebhook, regularWebhooks } = useMemo(() => {
		const openStatus = webhooks.find((w) => w.name === "OpenStatus")
		const regular = webhooks.filter((w) => w.name !== "OpenStatus")
		return { openStatusWebhook: openStatus ?? null, regularWebhooks: regular }
	}, [webhooks])

	const listWebhooks = useAtomSet(listChannelWebhooksMutation, {
		mode: "promiseExit",
	})

	const fetchWebhooks = useCallback(async () => {
		setIsLoading(true)
		const exit = await listWebhooks({
			payload: { channelId: channelId as ChannelId },
		})

		Exit.match(exit, {
			onSuccess: (result) => {
				setWebhooks(result.data as unknown as WebhookData[])
			},
			onFailure: (cause) => {
				console.error("Failed to load webhooks:", cause)
			},
		})
		setIsLoading(false)
	}, [channelId, listWebhooks])

	useEffect(() => {
		fetchWebhooks()
	}, [fetchWebhooks])

	const handleEdit = (webhook: WebhookData) => {
		setSelectedWebhook(webhook)
		setEditModalOpen(true)
	}

	const handleRegenerateToken = (webhook: WebhookData) => {
		setSelectedWebhook(webhook)
		setRegenerateDialogOpen(true)
	}

	const handleDelete = (webhook: WebhookData) => {
		setSelectedWebhook(webhook)
		setDeleteDialogOpen(true)
	}

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<SectionHeader.Root className="border-none pb-0">
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-1">
						<SectionHeader.Heading>Integrations</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Connect external services to this channel.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<div className="flex flex-col gap-4">
				{/* OpenStatus Section */}
				<IntegrationSection
					icon={
						<img
							src={getProviderIconUrl("openstatus")}
							alt="OpenStatus"
							className="size-5 rounded"
						/>
					}
					title="OpenStatus"
					description="Receive monitor alerts in this channel"
					badge={
						openStatusWebhook ? (
							<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 text-xs dark:text-emerald-400">
								Connected
							</span>
						) : undefined
					}
					isExpanded={openStatusExpanded}
					onToggle={() => setOpenStatusExpanded(!openStatusExpanded)}
				>
					<OpenStatusSection
						channelId={channelId as ChannelId}
						webhook={openStatusWebhook}
						onWebhookChange={fetchWebhooks}
					/>
				</IntegrationSection>

				{/* Webhooks Section */}
				<IntegrationSection
					icon={
						<svg
							className="size-5 text-muted-fg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
							/>
						</svg>
					}
					title="Webhooks"
					description="Allow external services to post messages via HTTP"
					badge={
						regularWebhooks.length > 0 ? (
							<span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
								{regularWebhooks.length}
							</span>
						) : undefined
					}
					isExpanded={webhooksExpanded}
					onToggle={() => setWebhooksExpanded(!webhooksExpanded)}
				>
					<div className="flex flex-col gap-4">
						<CreateWebhookForm channelId={channelId as ChannelId} onSuccess={fetchWebhooks} />

						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<div className="size-6 animate-spin rounded-full border-2 border-muted-fg/30 border-t-primary" />
							</div>
						) : regularWebhooks.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-lg border border-border border-dashed py-8 text-center">
								<p className="text-muted-fg text-sm">
									No webhooks yet. Create one to get started.
								</p>
							</div>
						) : (
							<div className="flex flex-col gap-3">
								{regularWebhooks.map((webhook) => (
									<WebhookCard
										key={webhook.id}
										webhook={webhook}
										onEdit={() => handleEdit(webhook)}
										onRegenerateToken={() => handleRegenerateToken(webhook)}
										onDelete={() => handleDelete(webhook)}
									/>
								))}
							</div>
						)}
					</div>
				</IntegrationSection>

				{/* Coming Soon Section */}
				<div className="flex items-center gap-3 rounded-xl border border-border border-dashed bg-secondary/30 p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
						<svg
							className="size-5 text-muted-fg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 4.5v15m7.5-7.5h-15"
							/>
						</svg>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-muted-fg">More integrations coming soon</span>
						<span className="text-muted-fg/70 text-sm">
							Slack, GitHub, Linear, and more
						</span>
					</div>
				</div>
			</div>

			{selectedWebhook && (
				<>
					<EditWebhookForm
						webhook={selectedWebhook}
						isOpen={editModalOpen}
						onOpenChange={setEditModalOpen}
						onSuccess={fetchWebhooks}
					/>

					<DeleteWebhookDialog
						webhookId={selectedWebhook.id as ChannelWebhookId}
						webhookName={selectedWebhook.name}
						isOpen={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						onSuccess={fetchWebhooks}
					/>

					<RegenerateTokenDialog
						webhookId={selectedWebhook.id as ChannelWebhookId}
						webhookName={selectedWebhook.name}
						isOpen={regenerateDialogOpen}
						onOpenChange={setRegenerateDialogOpen}
						onSuccess={fetchWebhooks}
					/>
				</>
			)}
		</div>
	)
}
