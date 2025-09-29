import type { ChannelId } from "@hazel/db/schema"
import { Effect, Option } from "effect"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useChannelWithCurrentUser } from "~/db/hooks"
import { ApiClient } from "~/lib/services/common/api-client"
import { Button } from "../base/buttons/button"
import { Input } from "../base/input/input"
import { Dialog, DialogTrigger, Modal, ModalFooter, ModalOverlay } from "../application/modals/modal"

interface RenameChannelModalProps {
	channelId: ChannelId
	children: React.ReactNode
}

export const RenameChannelModal = ({ channelId, children }: RenameChannelModalProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const [newName, setNewName] = useState("")
	const [isLoading, setIsLoading] = useState(false)

	const { channel } = useChannelWithCurrentUser(channelId)

	const handleOpen = useCallback(() => {
		if (channel) {
			setNewName(channel.name)
			setIsOpen(true)
		}
	}, [channel])

	const handleClose = useCallback(() => {
		setIsOpen(false)
		setNewName("")
	}, [])

	const handleRename = useCallback(async () => {
		if (!channel || !newName.trim() || newName.trim() === channel.name) {
			return
		}

		setIsLoading(true)

		try {
			const result = await Effect.runPromise(
				ApiClient.pipe(
					Effect.flatMap((client) =>
						client.channels.update({
							path: { id: channelId },
							payload: { name: newName.trim() },
						}),
					),
				),
			)

			if (Option.isSome(result)) {
				toast.success(`Channel renamed to "${newName.trim()}"`)
				handleClose()
			}
		} catch (error) {
			console.error("Failed to rename channel:", error)
			toast.error("Failed to rename channel. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}, [channel, channelId, newName, handleClose])

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			handleRename()
		},
		[handleRename],
	)

	if (!channel) {
		return null
	}

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<div onClick={handleOpen}>{children}</div>

			<ModalOverlay>
				<Modal className="sm:w-96">
					<Dialog>
						<div className="space-y-6 p-6">
							<div className="space-y-2">
								<h2 className="font-semibold text-lg text-primary">Rename Channel</h2>
								<p className="text-quaternary text-sm">
									Choose a new name for the channel #{channel.name}
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<Input
									label="Channel name"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Enter channel name"
									disabled={isLoading}
									required
									autoFocus
									maxLength={255}
								/>
							</form>
						</div>

						<ModalFooter>
							<Button
								color="secondary"
								onClick={handleClose}
								isDisabled={isLoading}
							>
								Cancel
							</Button>
							<Button
								color="primary"
								onClick={handleRename}
								isDisabled={isLoading || !newName.trim() || newName.trim() === channel.name}
								isLoading={isLoading}
							>
								Rename Channel
							</Button>
						</ModalFooter>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</DialogTrigger>
	)
}