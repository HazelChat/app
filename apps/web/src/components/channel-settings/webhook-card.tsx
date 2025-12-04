import type { ChannelId, ChannelWebhookId, OrganizationId, UserId } from "@hazel/schema"
import { formatDistanceToNow } from "date-fns"

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

import IconDotsVertical from "~/components/icons/icon-dots-vertical"
import IconEdit from "~/components/icons/icon-edit"
import IconTrash from "~/components/icons/icon-trash"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "~/components/ui/menu"

interface WebhookCardProps {
	webhook: WebhookData
	onEdit: () => void
	onRegenerateToken: () => void
	onDelete: () => void
}

export function WebhookCard({ webhook, onEdit, onRegenerateToken, onDelete }: WebhookCardProps) {
	return (
		<div className="flex items-start justify-between rounded-xl border border-border bg-bg p-4 transition-colors hover:border-border-hover">
			<div className="flex items-start gap-3">
				{webhook.avatarUrl ? (
					<img
						src={webhook.avatarUrl}
						alt={webhook.name}
						className="size-10 rounded-full object-cover"
					/>
				) : (
					<div className="flex size-10 items-center justify-center rounded-full bg-secondary">
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
					</div>
				)}

				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="font-medium text-fg">{webhook.name}</span>
						<Badge intent={webhook.isEnabled ? "success" : "secondary"}>
							{webhook.isEnabled ? "Active" : "Disabled"}
						</Badge>
					</div>

					{webhook.description && <p className="text-muted-fg text-sm">{webhook.description}</p>}

					<div className="flex items-center gap-2 text-muted-fg text-xs">
						<span className="font-mono">****{webhook.tokenSuffix}</span>
						{webhook.lastUsedAt && (
							<>
								<span className="text-muted-fg/50">•</span>
								<span>
									Last used{" "}
									{formatDistanceToNow(new Date(webhook.lastUsedAt), {
										addSuffix: true,
									})}
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			<Menu>
				<Button intent="plain" size="sq-xs" className="text-muted-fg">
					<IconDotsVertical className="size-4" />
				</Button>
				<MenuContent placement="bottom end">
					<MenuItem onAction={onEdit}>
						<IconEdit className="size-4" />
						<MenuLabel>Edit</MenuLabel>
					</MenuItem>
					<MenuItem onAction={onRegenerateToken}>
						<svg
							className="size-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
							/>
						</svg>
						<MenuLabel>Regenerate Token</MenuLabel>
					</MenuItem>
					<MenuSeparator />
					<MenuItem intent="danger" onAction={onDelete}>
						<IconTrash className="size-4" />
						<MenuLabel>Delete</MenuLabel>
					</MenuItem>
				</MenuContent>
			</Menu>
		</div>
	)
}
