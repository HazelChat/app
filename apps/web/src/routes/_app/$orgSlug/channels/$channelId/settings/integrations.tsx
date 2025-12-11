import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, ChannelWebhookId } from "@hazel/schema"
import { createFileRoute } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
	deleteChannelWebhookMutation,
	listChannelWebhooksMutation,
	updateChannelWebhookMutation,
	type WebhookData,
} from "~/atoms/channel-webhook-atoms"
import { CreateWebhookForm } from "~/components/channel-settings/create-webhook-form"
import { IntegrationCard } from "~/components/channel-settings/integration-card"
import IconCheck from "~/components/icons/icon-check"
import IconCopy from "~/components/icons/icon-copy"
import IconDotsVertical from "~/components/icons/icon-dots-vertical"
import IconPlus from "~/components/icons/icon-plus"
import IconTrash from "~/components/icons/icon-trash"
import { IconWebhook } from "~/components/icons/icon-webhook"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "~/components/ui/menu"
import { SectionHeader } from "~/components/ui/section-header"
import { matchExitWithToast } from "~/lib/toast-exit"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings/integrations")({
	component: IntegrationsPage,
})

function IntegrationsPage() {
	const { channelId } = Route.useParams()

	const [webhooks, setWebhooks] = useState<WebhookData[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const { openStatusWebhook, railwayWebhook, regularWebhooks } = useMemo(() => {
		const openStatus = webhooks.find((w) => w.name === "OpenStatus")
		const railway = webhooks.find((w) => w.name === "Railway")
		const regular = webhooks.filter((w) => w.name !== "OpenStatus" && w.name !== "Railway")
		return {
			openStatusWebhook: openStatus ?? null,
			railwayWebhook: railway ?? null,
			regularWebhooks: regular,
		}
	}, [webhooks])

	const listWebhooks = useAtomSet(listChannelWebhooksMutation, {
		mode: "promiseExit",
	})

	const listWebhooksRef = useRef(listWebhooks)
	listWebhooksRef.current = listWebhooks

	const fetchWebhooks = useCallback(async () => {
		setIsLoading(true)
		const exit = await listWebhooksRef.current({
			payload: { channelId: channelId as ChannelId },
		})

		matchExitWithToast(exit, {
			onSuccess: (result) => setWebhooks(result.data as unknown as WebhookData[]),
			customErrors: {
				ChannelNotFoundError: () => ({
					title: "Channel not found",
					description: "This channel may have been deleted.",
					isRetryable: false,
				}),
			},
		})
		setIsLoading(false)
	}, [channelId])

	useEffect(() => {
		fetchWebhooks()
	}, [fetchWebhooks])

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
				<IntegrationCard
					provider="openstatus"
					channelId={channelId as ChannelId}
					webhook={openStatusWebhook}
					onWebhookChange={fetchWebhooks}
				/>

				<IntegrationCard
					provider="railway"
					channelId={channelId as ChannelId}
					webhook={railwayWebhook}
					onWebhookChange={fetchWebhooks}
				/>

				{/* Custom Webhooks Section */}
				<div className="rounded-xl border border-border bg-bg">
					<div className="flex items-center justify-between border-border border-b p-4">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
								<IconWebhook className="size-5 text-muted-fg" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<span className="font-medium text-fg">Custom Webhooks</span>
									{regularWebhooks.length > 0 && (
										<Badge intent="secondary">{regularWebhooks.length}</Badge>
									)}
								</div>
								<p className="text-muted-fg text-sm">
									Allow external services to post messages
								</p>
							</div>
						</div>
					</div>

					<div className="p-4">
						{isLoading ? (
							<div className="flex items-center justify-center py-6">
								<div className="size-5 animate-spin rounded-full border-2 border-muted-fg/30 border-t-primary" />
							</div>
						) : regularWebhooks.length === 0 ? (
							<div className="mb-4 rounded-lg border border-border border-dashed py-6 text-center">
								<p className="text-muted-fg text-sm">No webhooks yet</p>
							</div>
						) : (
							<div className="mb-4 flex flex-col gap-2">
								{regularWebhooks.map((webhook) => (
									<CompactWebhookItem
										key={webhook.id}
										webhook={webhook}
										onDelete={fetchWebhooks}
									/>
								))}
							</div>
						)}

						<CreateWebhookForm channelId={channelId as ChannelId} onSuccess={fetchWebhooks} />
					</div>
				</div>

				{/* Coming Soon */}
				<div className="flex items-center gap-3 rounded-xl border border-border border-dashed bg-secondary/30 p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
						<IconPlus className="size-5 text-muted-fg" />
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-muted-fg">More integrations coming soon</span>
						<span className="text-muted-fg/70 text-sm">Slack, GitHub, Linear, and more</span>
					</div>
				</div>
			</div>
		</div>
	)
}

function CompactWebhookItem({ webhook, onDelete }: { webhook: WebhookData; onDelete: () => void }) {
	const [copied, setCopied] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isToggling, setIsToggling] = useState(false)

	const deleteWebhook = useAtomSet(deleteChannelWebhookMutation, { mode: "promiseExit" })
	const updateWebhook = useAtomSet(updateChannelWebhookMutation, { mode: "promiseExit" })

	const webhookUrl = `${import.meta.env.VITE_BACKEND_URL}/webhooks/incoming/${webhook.id}/`

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(webhookUrl)
			setCopied(true)
			toast.success("URL copied")
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error("Failed to copy")
		}
	}

	const handleToggle = async () => {
		setIsToggling(true)
		const exit = await updateWebhook({
			payload: {
				id: webhook.id as ChannelWebhookId,
				isEnabled: !webhook.isEnabled,
			},
		})

		matchExitWithToast(exit, {
			onSuccess: () => onDelete(),
			successMessage: webhook.isEnabled ? "Webhook disabled" : "Webhook enabled",
			customErrors: {
				ChannelWebhookNotFoundError: () => ({
					title: "Webhook not found",
					description: "This webhook may have been deleted.",
					isRetryable: false,
				}),
			},
		})
		setIsToggling(false)
	}

	const handleDelete = async () => {
		if (!confirmDelete) {
			setConfirmDelete(true)
			setTimeout(() => setConfirmDelete(false), 3000)
			return
		}

		setIsDeleting(true)
		const exit = await deleteWebhook({
			payload: { id: webhook.id as ChannelWebhookId },
		})

		matchExitWithToast(exit, {
			onSuccess: () => onDelete(),
			successMessage: "Webhook deleted",
			customErrors: {
				ChannelWebhookNotFoundError: () => ({
					title: "Webhook not found",
					description: "This webhook may have already been deleted.",
					isRetryable: false,
				}),
			},
		})
		setIsDeleting(false)
	}

	return (
		<div className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3 transition-colors hover:border-border-hover">
			{webhook.avatarUrl ? (
				<img
					src={webhook.avatarUrl}
					alt={webhook.name}
					className="size-8 rounded-full object-cover"
				/>
			) : (
				<div className="flex size-8 items-center justify-center rounded-full bg-secondary">
					<IconWebhook className="size-4 text-muted-fg" />
				</div>
			)}

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-fg text-sm">{webhook.name}</span>
					<Badge intent={webhook.isEnabled ? "success" : "secondary"} className="shrink-0">
						{webhook.isEnabled ? "Active" : "Disabled"}
					</Badge>
				</div>
				<div className="flex items-center gap-2 text-muted-fg text-xs">
					<span className="font-mono">****{webhook.tokenSuffix}</span>
					{webhook.lastUsedAt && (
						<>
							<span className="text-muted-fg/50">·</span>
							<span>
								{formatDistanceToNow(new Date(webhook.lastUsedAt), { addSuffix: true })}
							</span>
						</>
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<Button intent="plain" size="sq-xs" onPress={handleCopy} className="text-muted-fg">
					{copied ? <IconCheck className="size-4 text-success" /> : <IconCopy className="size-4" />}
				</Button>

				<Menu>
					<Button intent="plain" size="sq-xs" className="text-muted-fg">
						<IconDotsVertical className="size-4" />
					</Button>
					<MenuContent placement="bottom end">
						<MenuItem onAction={handleToggle} isDisabled={isToggling}>
							<MenuLabel>{webhook.isEnabled ? "Disable" : "Enable"}</MenuLabel>
						</MenuItem>
						<MenuSeparator />
						<MenuItem intent="danger" onAction={handleDelete} isDisabled={isDeleting}>
							<IconTrash className="size-4" />
							<MenuLabel>{confirmDelete ? "Confirm delete?" : "Delete"}</MenuLabel>
						</MenuItem>
					</MenuContent>
				</Menu>
			</div>
		</div>
	)
}
