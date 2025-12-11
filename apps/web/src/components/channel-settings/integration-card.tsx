import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, ChannelWebhookId } from "@hazel/schema"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"
import {
	createChannelWebhookMutation,
	deleteChannelWebhookMutation,
	updateChannelWebhookMutation,
	type WebhookData,
} from "~/atoms/channel-webhook-atoms"
import IconCheck from "~/components/icons/icon-check"
import IconCopy from "~/components/icons/icon-copy"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { matchExitWithToast } from "~/lib/toast-exit"
import { getProviderIconUrl } from "../embeds/use-embed-theme"

type IntegrationProvider = "openstatus" | "railway"

interface IntegrationConfig {
	name: string
	description: string
	webhookDescription: string
	urlSuffix: string
	docsUrl: string
	docsLabel: string
}

const INTEGRATION_CONFIG: Record<IntegrationProvider, IntegrationConfig> = {
	openstatus: {
		name: "OpenStatus",
		description: "Receive monitor alerts in this channel",
		webhookDescription: "OpenStatus monitor alerts",
		urlSuffix: "openstatus",
		docsUrl: "https://docs.openstatus.dev/alerting/providers/webhook/",
		docsLabel: "OpenStatus notification settings",
	},
	railway: {
		name: "Railway",
		description: "Receive deployment alerts in this channel",
		webhookDescription: "Railway deployment alerts",
		urlSuffix: "railway",
		docsUrl: "https://docs.railway.com/guides/webhooks",
		docsLabel: "Railway project webhook settings",
	},
}

interface IntegrationCardProps {
	provider: IntegrationProvider
	channelId: ChannelId
	webhook: WebhookData | null
	onWebhookChange: () => void
}

export function IntegrationCard({ provider, channelId, webhook, onWebhookChange }: IntegrationCardProps) {
	const config = INTEGRATION_CONFIG[provider]
	const logoUrl = getProviderIconUrl(provider)

	const [isCreating, setIsCreating] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [createdToken, setCreatedToken] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)

	const createWebhook = useAtomSet(createChannelWebhookMutation, { mode: "promiseExit" })
	const updateWebhook = useAtomSet(updateChannelWebhookMutation, { mode: "promiseExit" })
	const deleteWebhook = useAtomSet(deleteChannelWebhookMutation, { mode: "promiseExit" })

	const webhookId = createdToken ? undefined : webhook?.id
	const webhookUrl = webhookId
		? `${import.meta.env.VITE_BACKEND_URL}/webhooks/incoming/${webhookId}/`
		: null

	const handleConnect = async () => {
		setIsCreating(true)
		const exit = await createWebhook({
			payload: {
				channelId,
				name: config.name,
				description: config.webhookDescription,
				avatarUrl: logoUrl,
				integrationProvider: provider,
			},
		})

		matchExitWithToast(exit, {
			onSuccess: (result) => {
				setCreatedToken(result.token)
				onWebhookChange()
			},
			successMessage: `${config.name} connected`,
			customErrors: {
				ChannelNotFoundError: () => ({
					title: "Channel not found",
					description: "This channel may have been deleted.",
					isRetryable: false,
				}),
			},
		})
		setIsCreating(false)
	}

	const handleToggleEnabled = async () => {
		if (!webhook) return
		const exit = await updateWebhook({
			payload: {
				id: webhook.id as ChannelWebhookId,
				isEnabled: !webhook.isEnabled,
			},
		})

		matchExitWithToast(exit, {
			onSuccess: () => onWebhookChange(),
			successMessage: webhook.isEnabled ? `${config.name} disabled` : `${config.name} enabled`,
			customErrors: {
				ChannelWebhookNotFoundError: () => ({
					title: "Webhook not found",
					description: "This webhook may have been deleted.",
					isRetryable: false,
				}),
			},
		})
	}

	const handleDelete = async () => {
		if (!webhook) return
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
			onSuccess: () => {
				setConfirmDelete(false)
				onWebhookChange()
			},
			successMessage: `${config.name} disconnected`,
			customErrors: {
				ChannelWebhookNotFoundError: () => ({
					title: "Webhook not found",
					description: "This webhook may have been deleted.",
					isRetryable: false,
				}),
			},
		})
		setIsDeleting(false)
	}

	const handleCopy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			toast.success("URL copied")
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error("Failed to copy")
		}
	}

	const handleDismissToken = () => {
		setCreatedToken(null)
	}

	// Just created - show token prominently
	if (createdToken && webhook) {
		const fullUrl = `${import.meta.env.VITE_BACKEND_URL}/webhooks/incoming/${webhook.id}/${createdToken}/${config.urlSuffix}`
		return (
			<div className="rounded-xl border border-border bg-bg">
				<div className="flex items-center gap-3 border-border border-b p-4">
					<img src={logoUrl} alt={config.name} className="size-10 rounded-lg" />
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span className="font-medium text-fg">{config.name}</span>
							<Badge intent="success">Connected</Badge>
						</div>
						<p className="text-muted-fg text-sm">{config.description}</p>
					</div>
				</div>
				<div className="bg-amber-500/5 p-4">
					<div className="mb-3 flex items-start gap-2">
						<div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
							<svg
								className="size-3 text-amber-600 dark:text-amber-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
							</svg>
						</div>
						<p className="text-amber-700 text-sm dark:text-amber-300">
							Copy this URL now. The token won't be shown again.
						</p>
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={fullUrl}
							readOnly
							className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs"
						/>
						<Button intent="outline" size="sq-sm" onPress={() => handleCopy(fullUrl)}>
							{copied ? (
								<IconCheck className="size-4 text-success" />
							) : (
								<IconCopy className="size-4" />
							)}
						</Button>
					</div>
					<div className="mt-3 flex items-center justify-between">
						<a
							href={config.docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary text-xs underline"
						>
							View setup instructions
						</a>
						<Button intent="secondary" size="sm" onPress={handleDismissToken}>
							Done
						</Button>
					</div>
				</div>
			</div>
		)
	}

	// Not connected
	if (!webhook) {
		return (
			<div className="rounded-xl border border-border bg-bg p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src={logoUrl} alt={config.name} className="size-10 rounded-lg" />
						<div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-fg">{config.name}</span>
							</div>
							<p className="text-muted-fg text-sm">{config.description}</p>
						</div>
					</div>
					<Button intent="primary" size="sm" onPress={handleConnect} isDisabled={isCreating}>
						{isCreating ? "Connecting..." : "Connect"}
					</Button>
				</div>
			</div>
		)
	}

	// Connected state
	return (
		<div className="rounded-xl border border-border bg-bg p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<img src={logoUrl} alt={config.name} className="size-10 rounded-lg" />
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<span className="font-medium text-fg">{config.name}</span>
							<Badge intent={webhook.isEnabled ? "success" : "secondary"}>
								{webhook.isEnabled ? "Active" : "Disabled"}
							</Badge>
						</div>
						<p className="text-muted-fg text-sm">{config.description}</p>
						{webhook.lastUsedAt && (
							<p className="text-muted-fg text-xs">
								Last alert{" "}
								{formatDistanceToNow(new Date(webhook.lastUsedAt), { addSuffix: true })}
							</p>
						)}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button intent="outline" size="sm" onPress={handleToggleEnabled}>
						{webhook.isEnabled ? "Disable" : "Enable"}
					</Button>
					<Button
						intent={confirmDelete ? "danger" : "outline"}
						size="sm"
						onPress={handleDelete}
						isDisabled={isDeleting}
					>
						{confirmDelete ? "Confirm?" : "Delete"}
					</Button>
				</div>
			</div>
			<div className="mt-3 flex gap-2">
				<input
					type="text"
					value={`${webhookUrl}****${webhook.tokenSuffix}/${config.urlSuffix}`}
					readOnly
					className="flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-muted-fg text-xs"
				/>
				<Button
					intent="outline"
					size="sq-sm"
					onPress={() => toast.info("Delete and reconnect to get a new URL")}
				>
					<IconCopy className="size-4" />
				</Button>
			</div>
		</div>
	)
}
