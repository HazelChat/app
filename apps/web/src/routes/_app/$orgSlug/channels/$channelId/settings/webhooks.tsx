import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, ChannelWebhookId, OrganizationId, UserId } from "@hazel/schema"
import { createFileRoute } from "@tanstack/react-router"
import { Exit } from "effect"
import { useCallback, useEffect, useState } from "react"
import { listChannelWebhooksMutation } from "~/atoms/channel-webhook-atoms"

// Type for the webhook data returned from RPC (without sensitive tokenHash field)
interface WebhookData {
	id: ChannelWebhookId
	channelId: ChannelId
	organizationId: OrganizationId
	botUserId: UserId
	name: string
	description: string | null
	avatarUrl: string | null
	tokenSuffix: string
	isEnabled: boolean
	createdBy: UserId
	lastUsedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
	deletedAt: Date | null
}

import { CreateWebhookForm } from "~/components/channel-settings/create-webhook-form"
import { DeleteWebhookDialog } from "~/components/channel-settings/delete-webhook-dialog"
import { EditWebhookForm } from "~/components/channel-settings/edit-webhook-form"
import { RegenerateTokenDialog } from "~/components/channel-settings/regenerate-token-dialog"
import { WebhookCard } from "~/components/channel-settings/webhook-card"
import { SectionHeader } from "~/components/ui/section-header"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings/webhooks")({
	component: WebhooksPage,
})

function WebhooksPage() {
	const { channelId } = Route.useParams()

	const [webhooks, setWebhooks] = useState<WebhookData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null)
	const [editModalOpen, setEditModalOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)

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
						<SectionHeader.Heading>Webhooks</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Allow external services to post messages to this channel via HTTP.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<CreateWebhookForm channelId={channelId as ChannelId} onSuccess={fetchWebhooks} />

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<div className="size-6 animate-spin rounded-full border-2 border-muted-fg/30 border-t-primary" />
				</div>
			) : webhooks.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-border border-dashed py-12 text-center">
					<div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary">
						<svg
							className="size-6 text-muted-fg"
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
					</div>
					<h3 className="font-medium text-fg text-sm">No webhooks yet</h3>
					<p className="mt-1 text-muted-fg text-sm">
						Create a webhook to allow external services to post messages.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{webhooks.map((webhook) => (
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
