import { DialogCloseTrigger } from "@ark-ui/solid"
import { api } from "@hazel/backend/api"
import { useNavigate } from "@tanstack/solid-router"

import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
import { TextField } from "~/components/ui/text-field"
import { toaster } from "~/components/ui/toaster"
import { createMutation } from "~/lib/convex"

export interface CreateServerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const CreateServerDialog = (props: CreateServerDialogProps) => {
	const navigate = useNavigate()
	const createServer = createMutation(api.servers.createServer)

	return (
		<Dialog open={props.open} onOpenChange={(details) => props.onOpenChange(details.open)}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Create a Server</Dialog.Title>
					<Dialog.Description>Enter a name for your new server.</Dialog.Description>
				</Dialog.Header>
				<form
					class="flex flex-col gap-4"
					onSubmit={async (e) => {
						e.preventDefault()
						const formData = new FormData(e.currentTarget)
						const serverName = formData.get("serverName")

						if (!serverName) return
						try {
							const serverId = await createServer({
								name: serverName.toString(),
							})
							props.onOpenChange(false)
							navigate({ to: "/$serverId", params: { serverId } })
						} catch (error) {
							console.error("Failed to create server:", error)
							toaster.error({
								title: "Failed to create server",
								description: "Failed to create server. Please try again.",
								type: "error",
							})
						}
					}}
				>
					<TextField
						label="Server Name"
						name="serverName"
						required
						placeholder="Enter your server name"
					/>
					<Dialog.Footer class="justify-between!">
						<DialogCloseTrigger
							asChild={(props) => (
								<Button type="button" intent="outline" {...props}>
									Cancel
								</Button>
							)}
						/>
						<Button type="submit">Create Server</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog>
	)
}
