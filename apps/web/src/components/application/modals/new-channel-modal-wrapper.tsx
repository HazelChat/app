import { useAtomSet } from "@effect-atom/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Select } from "~/components/base/select/select"
import IconHashtag from "~/components/icons/icon-hashtag"
import { useAppForm } from "~/hooks/use-app-form"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { toastExit } from "~/lib/toast-exit"
import { createChannelMutation } from "~/atoms/channel-atoms"

const channelSchema = type({
	name: "string > 2",
	type: "'public'|'private'",
})

type ChannelFormData = typeof channelSchema.infer

interface NewChannelModalWrapperProps {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
}

export const NewChannelModalWrapper = ({ isOpen, setIsOpen }: NewChannelModalWrapperProps) => {
	const { user } = useAuth()
	const { organizationId, slug } = useOrganization()

	const navigate = useNavigate()

	const createChannel = useAtomSet(createChannelMutation, {
		mode: "promiseExit",
	})

	const form = useAppForm({
		defaultValues: {
			name: "",
			type: "public" as "public" | "private",
		} as ChannelFormData,
		validators: {
			onChange: channelSchema,
		},
		onSubmit: async ({ value }) => {
			if (!user?.id || !organizationId || !slug) return

			const exit = await toastExit(
				createChannel({
					payload: {
						name: value.name,
						type: value.type,
						organizationId,
						parentChannelId: null,
					},
				}),
				{
					loading: "Creating channel...",
					success: (result) => {
						// Navigate to the created channel
						if (result.data.id) {
							navigate({
								to: "/$orgSlug/chat/$id",
								params: {
									orgSlug: slug,
									id: result.data.id,
								},
							})
						}

						// Close modal and reset form
						setIsOpen(false)
						form.reset()

						return "Channel created successfully"
					},
				},
			)

			// Return the exit for form handling
			return exit
		},
	})

	return (
		<AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<span />
			<ModalOverlay isDismissable>
				<Modal>
					<Dialog>
						<form
							onSubmit={(e) => {
								e.preventDefault()
								form.handleSubmit()
							}}
						>
							<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-120">
								<CloseButton
									onClick={() => setIsOpen(false)}
									theme="light"
									size="lg"
									className="absolute top-3 right-3"
								/>
								<div className="flex flex-col gap-0.5 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
									<AriaHeading slot="title" className="font-semibold text-md text-primary">
										Create a new Channel
									</AriaHeading>
									<p className="text-sm text-tertiary">
										Give your channel a name and type to create a new channel.
									</p>
								</div>
								<div className="mt-4 flex flex-col gap-4 px-4 sm:px-6 md:mt-5">
									<form.AppField
										name="name"
										children={(field) => (
											<field.Input
												label="Channel Name"
												size="sm"
												placeholder="general"
												icon={IconHashtag}
												value={field.state.value}
												onChange={(value) => field.handleChange(value)}
												onBlur={field.handleBlur}
												hint={field.state.meta.errors?.[0]?.message}
												isInvalid={!!field.state.meta.errors?.length}
											></field.Input>
										)}
									></form.AppField>

									<form.AppField
										name="type"
										children={(fiield) => (
											<fiield.Select
												label="Channel Type"
												size="sm"
												selectedKey={fiield.state.value}
												onSelectionChange={(key) =>
													fiield.handleChange(key as "public" | "private")
												}
												hint={fiield.state.meta.errors?.[0]?.message}
												isInvalid={!!fiield.state.meta.errors?.length}
												items={[
													{
														id: "public",
														label: "Public",
													},
													{
														id: "private",
														label: "Private",
													},
												]}
											>
												{(item) => (
													<Select.Item
														id={item.id}
														supportingText={item.supportingText}
													>
														{item.label}
													</Select.Item>
												)}
											</fiield.Select>
										)}
									></form.AppField>
								</div>

								<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 sm:flex-row-reverse sm:items-center sm:px-6 sm:pt-8 sm:pb-6">
									<form.Subscribe
										selector={(state) => [state.canSubmit, state.isSubmitting]}
									>
										{([canSubmit, isSubmitting]) => (
											<Button
												color="primary"
												size="lg"
												onClick={form.handleSubmit}
												isDisabled={!canSubmit || isSubmitting}
											>
												{isSubmitting ? "Creating..." : "Create channel"}
											</Button>
										)}
									</form.Subscribe>
								</div>
							</div>
						</form>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</AriaDialogTrigger>
	)
}
