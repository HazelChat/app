import { DialogCloseTrigger } from "@ark-ui/solid"
import { useNavigate } from "@tanstack/solid-router"
import { createSignal } from "solid-js"

import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
import { TextField } from "~/components/ui/text-field"
import { toaster } from "~/components/ui/toaster"

export const Serveronboarding = () => {
	const navigate = useNavigate()

	const [createModalOpen, setCreateModalOpen] = createSignal(false)
	const [joinModalOpen, setJoinModalOpen] = createSignal(false)

	return (
		<div class="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
			<h1 class="font-bold text-3xl">Welcome!</h1>
			<p class="text-muted-foreground">Get started by creating a new server or joining an existing one.</p>
			<div class="mt-6 flex gap-4">
				<Button onClick={() => setCreateModalOpen(true)} size="large">
					Create My Own Server
				</Button>
				<Button onClick={() => setJoinModalOpen(true)} size="large" intent="secondary">
					Join a Server
				</Button>
			</div>
			<Dialog open={createModalOpen()} onOpenChange={(details) => setCreateModalOpen(details.open)}>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Create a Server</Dialog.Title>
						<Dialog.Description>Enter an invite code to join an existing server.</Dialog.Description>
					</Dialog.Header>
					<form
						class="flex flex-col gap-4"
						onSubmit={async (e) => {
							e.preventDefault()

							// const newServerId = newId("server")
							// const defaultChannelId = newId("serverChannels")

							const formData = new FormData(e.currentTarget)

							const serverName = formData.get("serverName")

							if (!serverName) {
								return
							}

							try {
								// await z.mutateBatch(async (tx) => {
								// 	await tx.server.insert({
								// 		id: newServerId,
								// 		name: serverName.toString(),
								// 		ownerId: z.userID,
								// 		slug: serverName
								// 			.toString()
								// 			.toLowerCase()
								// 			.replace(/\s+/g, "-")
								// 			.replace(/[^a-z0-9-]/g, ""),
								// 		createdAt: new Date().getTime(),
								// 		updatedAt: new Date().getTime(),
								// 		imageUrl: "",
								// 	})

								// 	// Add owner as a member
								// 	await tx.serverMembers.insert({
								// 		id: newId("serverMembers"),
								// 		userId: z.userID,
								// 		serverId: newServerId,
								// 		role: "owner",
								// 		joinedAt: new Date().getTime(),
								// 	})

								// 	// Create a default 'general' channel
								// 	await tx.serverChannels.insert({
								// 		id: defaultChannelId,
								// 		serverId: newServerId,
								// 		name: "general",
								// 		channelType: "public",
								// 		createdAt: new Date().getTime(),
								// 		updatedAt: new Date().getTime(),
								// 	})

								// 	// Add owner to the default channel
								// 	await tx.channelMembers.insert({
								// 		userId: z.userID,
								// 		channelId: defaultChannelId,
								// 		joinedAt: new Date().getTime(),
								// 	})
								// })

								// // Navigate to the new server's default channel
								// navigate({
								// 	to: "/$serverId/chat/$id",
								// 	params: { serverId: newServerId, id: defaultChannelId },
								// })

								setCreateModalOpen(false)
							} catch (error) {
								console.error("Failed to create server:", error)
								// TODO: Add user-facing error handling
							}

							setCreateModalOpen(false)
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
									<Button type="button" {...props} intent="outline">
										Cancel
									</Button>
								)}
							/>
							<Button type="submit">Create Server</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog>
			<Dialog open={joinModalOpen()} onOpenChange={(details) => setJoinModalOpen(details.open)}>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Join a Server</Dialog.Title>
						<Dialog.Description>Enter an invite code to join an existing server.</Dialog.Description>
					</Dialog.Header>
					<form
						class="flex flex-col gap-4"
						onSubmit={async (e) => {
							e.preventDefault()

							const formData = new FormData(e.currentTarget)

							const serverId = formData.get("serverId") as string

							if (!serverId) {
								return
							}

							// const server = await z.query.server.where("id", "=", serverId).one()

							// if (!server) {
							// 	toaster.error({
							// 		title: "Server not found",
							// 		description: "The server you entered does not exist.",
							// 		type: "error",
							// 	})
							// 	return
							// }

							// try {
							// 	await z.mutateBatch(async (tx) => {
							// 		// Add owner as a member
							// 		await tx.serverMembers.insert({
							// 			id: newId("serverMembers"),
							// 			userId: z.userID,
							// 			serverId: server.id,
							// 			role: "member",
							// 			joinedAt: new Date().getTime(),
							// 		})
							// 	})

							// 	navigate({
							// 		to: "/$serverId",
							// 		params: { serverId: serverId },
							// 	})

							// 	setCreateModalOpen(false)
							// } catch (error) {
							// 	toaster.error({
							// 		title: "Failed to join server",
							// 		description: "Failed to join server. Please try again.",
							// 		type: "error",
							// 	})
							// }

							setJoinModalOpen(false)
						}}
					>
						<TextField label="ServerID" name="serverId" required placeholder="Enter your server ID" />

						<Dialog.Footer class="justify-between!">
							<DialogCloseTrigger
								asChild={(props) => (
									<Button type="button" {...props} intent="outline">
										Cancel
									</Button>
								)}
							/>
							<Button type="submit">Create Server</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
