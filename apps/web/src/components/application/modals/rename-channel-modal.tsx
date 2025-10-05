import type { ChannelId } from "@hazel/db/schema"
import { Edit05 } from "@untitledui/icons"
import { type } from "arktype"
import { Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { channelCollection } from "~/db/collections"
import { useChannel } from "~/db/hooks"
import { useAppForm } from "~/hooks/use-app-form"
import { Dialog, Modal, ModalFooter, ModalOverlay } from "./modal"

interface RenameChannelModalProps {
	channelId: ChannelId
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}

const channelNameSchema = type({
	name: "string.trim",
})

type ChannelNameFormData = typeof channelNameSchema.infer

export const RenameChannelModal = ({ channelId, isOpen, onOpenChange }: RenameChannelModalProps) => {
	const { channel } = useChannel(channelId)

	const form = useAppForm({
		defaultValues: {
			name: channel?.name || "",
		} as ChannelNameFormData,
		validators: {
			onChange: channelNameSchema,
		},
		onSubmit: async ({ value }) => {
			if (!channel) return

			const trimmedName = value.name.trim()

			if (trimmedName === channel.name) {
				onOpenChange(false)
				return
			}

			try {
				await channelCollection.update(channel.id, (item) => {
					item.name = trimmedName
				})
				toast.success("Channel renamed successfully")
				onOpenChange(false)
				form.reset()
			} catch (error) {
				console.error("Failed to rename channel:", error)
				toast.error("Failed to rename channel")
			}
		},
	})

	const handleClose = () => {
		onOpenChange(false)
		form.reset()
	}

	return (
		<ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
			<Modal>
				<Dialog>
					<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-130">
						<CloseButton
							onClick={handleClose}
							theme="light"
							size="lg"
							className="absolute top-3 right-3"
						/>
						<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
							<div className="relative w-max">
								<FeaturedIcon color="gray" size="lg" theme="modern" icon={Edit05} />
								<BackgroundPattern
									pattern="circle"
									size="sm"
									className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
								/>
							</div>
							<div className="z-10 flex flex-col gap-0.5">
								<AriaHeading slot="title" className="font-semibold text-md text-primary">
									Rename Channel
								</AriaHeading>
								<p className="text-sm text-tertiary">Enter a new name for this channel</p>
							</div>
						</div>
						<div className="h-5 w-full" />
						<div className="flex flex-col gap-4 px-4 sm:px-6">
							<form.AppField
								name="name"
								children={(field) => (
									<field.Input
										label="Channel name"
										id="channel-name"
										size="md"
										placeholder="general"
										value={field.state.value}
										onChange={(value) => field.handleChange(value)}
										onBlur={field.handleBlur}
										isInvalid={!!field.state.meta.errors?.length}
										autoFocus
										hint={field.state.meta.errors
											?.map((error) => error?.message)
											.join(", ")}
									/>
								)}
							/>
						</div>
						<ModalFooter>
							<Button
								color="secondary"
								size="lg"
								onClick={handleClose}
								isDisabled={form.state.isSubmitting}
							>
								Cancel
							</Button>
							<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
								{([canSubmit, isSubmitting]) => (
									<Button
										color="primary"
										size="lg"
										onClick={form.handleSubmit}
										isDisabled={!canSubmit || isSubmitting}
									>
										{isSubmitting ? "Saving..." : "Rename"}
									</Button>
								)}
							</form.Subscribe>
						</ModalFooter>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
