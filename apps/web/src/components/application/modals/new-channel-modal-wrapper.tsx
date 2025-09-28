import { ChannelId, ChannelMemberId, type OrganizationId } from "@hazel/db/schema"
import { useParams } from "@tanstack/react-router"
import { type } from "arktype"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Select } from "~/components/base/select/select"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useAppForm } from "~/hooks/use-app-form"
import { useAuth } from "~/providers/auth-provider"

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
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const { user } = useAuth()
	const organizationId = orgId as OrganizationId

	const form = useAppForm({
		defaultValues: {
			name: "",
			type: "public" as "public" | "private",
		} as ChannelFormData,
		validators: {
			onChange: channelSchema,
		},
		onSubmit: async ({ value }) => {
			if (!user?.id) return
			try {
				channelCollection.insert({
					id: ChannelId.make(uuid()),
					name: value.name,
					type: value.type,
					organizationId,
					parentChannelId: null,
					createdAt: new Date(),
					updatedAt: null,
					deletedAt: null,
				})

				toast.success("Channel created successfully")
				setIsOpen(false)
				form.reset()
			} catch {
				toast.error("Failed to create channel")
			}
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
												icon={IconHashtagStroke}
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
