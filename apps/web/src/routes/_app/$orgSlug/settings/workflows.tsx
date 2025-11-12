import { AtomHttpApi, useAtomSet } from "@effect-atom/atom-react"
import { ExclamationTriangleIcon, BeakerIcon } from "@heroicons/react/20/solid"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { SectionHeader } from "~/components/ui/section-header"
import { SectionLabel } from "~/components/ui/section-label"
import { Cluster } from "@hazel/domain"
import { CustomFetchLive } from "~/lib/services/common/api-client"
import { toastExit } from "~/lib/toast-exit"

export const Route = createFileRoute("/_app/$orgSlug/settings/workflows")({
	component: WorkflowsSettings,
})

class WorkflowClient extends AtomHttpApi.Tag<WorkflowClient>()("WorkflowClient", {
	api: Cluster.WorkflowApi,
	httpClient: CustomFetchLive,
	baseUrl: import.meta.env.VITE_CLUSTER_URL || "http://localhost:3020",
}) {}

function WorkflowsSettings() {
	const [messageId, setMessageId] = useState("")
	const [channelId, setChannelId] = useState("")
	const [authorId, setAuthorId] = useState("")
	const [isExecuting, setIsExecuting] = useState(false)

	const executeWorkflow = useAtomSet(WorkflowClient.mutation("workflows", "MessageNotificationWorkflow"), {
		mode: "promiseExit",
	})

	const handleExecuteWorkflow = async () => {
		setIsExecuting(true)
		const msgId = (messageId || crypto.randomUUID()) as any
		const chanId = (channelId || crypto.randomUUID()) as any
		const authId = (authorId || crypto.randomUUID()) as any

		await toastExit(
			executeWorkflow({
				payload: {
					messageId: msgId,
					channelId: chanId,
					authorId: authId,
				},
			}),
			{
				loading: "Executing MessageNotificationWorkflow...",
				success: "Workflow executed successfully!",
				error: "Failed to execute workflow",
			},
		)
		setIsExecuting(false)
	}

	return (
		<form className="flex flex-col gap-6 px-4 lg:px-8">
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
						<SectionHeader.Heading>Workflow Testing</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Manually trigger workflows for testing and debugging.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			{/* Warning Banner */}
			<div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
				<div className="flex gap-3">
					<ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-warning" />
					<div className="flex-1">
						<p className="font-medium text-warning">Development Tools Only</p>
						<p className="mt-1 text-fg text-sm">
							These tools are intended for development and testing purposes only. Workflows
							will execute against real data in your database.
						</p>
					</div>
				</div>
			</div>

			{/* Message Notification Workflow Section */}
			<div className="flex flex-col gap-5">
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
					<SectionLabel.Root
						size="sm"
						title="Message Notification Workflow"
						description="Create notifications for channel members when a message is sent."
					/>

					<div className="flex flex-col gap-4">
						<div className="rounded-lg border border-border bg-secondary/50 p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/5">
									<BeakerIcon className="size-6 text-primary" />
								</div>
								<div className="flex-1">
									<h3 className="font-medium text-fg">Test Workflow Execution</h3>
									<p className="mt-1 text-muted-fg text-sm">
										Trigger the message notification workflow with custom parameters. Leave
										fields empty to use randomly generated UUIDs.
									</p>
								</div>
							</div>

							<div className="mt-4 space-y-4">
								<div className="space-y-2">
									<Label htmlFor="messageId">Message ID</Label>
									<Input
										id="messageId"
										type="text"
										placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
										value={messageId}
										onChange={(e) => setMessageId(e.target.value)}
									/>
									<p className="text-muted-fg text-xs">
										The ID of the message that triggered the notification
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="channelId">Channel ID</Label>
									<Input
										id="channelId"
										type="text"
										placeholder="e.g., 550e8400-e29b-41d4-a716-446655440001"
										value={channelId}
										onChange={(e) => setChannelId(e.target.value)}
									/>
									<p className="text-muted-fg text-xs">
										The ID of the channel where the message was sent
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="authorId">Author ID</Label>
									<Input
										id="authorId"
										type="text"
										placeholder="e.g., 550e8400-e29b-41d4-a716-446655440002"
										value={authorId}
										onChange={(e) => setAuthorId(e.target.value)}
									/>
									<p className="text-muted-fg text-xs">
										The ID of the user who sent the message (will not receive notifications)
									</p>
								</div>

								<Button
									size="sm"
									intent="primary"
									onPress={handleExecuteWorkflow}
									isPending={isExecuting}
									className="mt-2"
								>
									{isExecuting ? "Executing..." : "Execute Workflow"}
								</Button>
							</div>
						</div>

						<div className="text-muted-fg text-xs">
							<p className="font-medium">How it works:</p>
							<ul className="mt-1 list-inside list-disc space-y-0.5">
								<li>Queries all members of the specified channel</li>
								<li>Filters out members who have muted the channel</li>
								<li>Excludes the message author from notifications</li>
								<li>Creates notification entries for eligible members</li>
								<li>Increments notification counter for each member</li>
							</ul>
						</div>

						<div className="rounded-lg border border-border bg-secondary/50 p-4">
							<div className="space-y-2 font-mono text-fg text-xs">
								<div>
									<span className="text-muted-fg">Cluster URL:</span>{" "}
									<span className="break-all">
										{import.meta.env.VITE_CLUSTER_URL || "http://localhost:3020"}
									</span>
								</div>
								<div>
									<span className="text-muted-fg">Environment:</span>{" "}
									<span>{import.meta.env.MODE || "development"}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</form>
	)
}
