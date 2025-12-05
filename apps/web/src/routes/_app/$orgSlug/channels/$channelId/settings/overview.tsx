import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId } from "@hazel/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute } from "@tanstack/react-router"
import { type } from "arktype"
import { Exit } from "effect"
import { useEffect } from "react"
import { toast } from "sonner"
import { updateChannelMutation } from "~/atoms/channel-atoms"
import { Button } from "~/components/ui/button"
import { FieldError, Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { SectionHeader } from "~/components/ui/section-header"
import { TextField } from "~/components/ui/text-field"
import { channelCollection } from "~/db/collections"
import { useAppForm } from "~/hooks/use-app-form"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings/overview")({
	component: OverviewPage,
})

const channelSchema = type({
	name: "1<string<101",
})

type ChannelFormData = typeof channelSchema.infer

function OverviewPage() {
	const { channelId } = Route.useParams()

	const { data: channelResult } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where(({ channel }) => eq(channel.id, channelId as ChannelId))
				.findOne()
				.select(({ channel }) => ({ channel })),
		[channelId],
	)
	const channel = channelResult?.channel

	const updateChannel = useAtomSet(updateChannelMutation, {
		mode: "promiseExit",
	})

	const form = useAppForm({
		defaultValues: {
			name: channel?.name ?? "",
		} as ChannelFormData,
		validators: {
			onChange: channelSchema,
		},
		onSubmit: async ({ value }) => {
			const exit = await updateChannel({
				payload: {
					id: channelId as ChannelId,
					name: value.name,
				},
			})

			Exit.match(exit, {
				onSuccess: () => {
					toast.success("Channel updated successfully")
				},
				onFailure: (cause) => {
					console.error("Failed to update channel:", cause)
					toast.error("Failed to update channel")
				},
			})
		},
	})

	// Reset form when channel data loads
	useEffect(() => {
		if (channel?.name) {
			form.reset({ name: channel.name })
		}
	}, [channel?.name, form])

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<SectionHeader.Root className="border-none pb-0">
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-1">
						<SectionHeader.Heading>Overview</SectionHeader.Heading>
						<SectionHeader.Subheading>
							General information about this channel.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="flex flex-col gap-6"
			>
				<form.AppField
					name="name"
					children={(field) => (
						<TextField>
							<Label>Channel name</Label>
							<Input
								placeholder="Channel name"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								aria-invalid={!!field.state.meta.errors?.length}
							/>
							{field.state.meta.errors?.[0] && (
								<FieldError>{field.state.meta.errors[0].message}</FieldError>
							)}
						</TextField>
					)}
				/>

				<div>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
					>
						{([canSubmit, isSubmitting, isDirty]) => (
							<Button
								intent="primary"
								type="submit"
								isDisabled={!canSubmit || isSubmitting || !isDirty}
							>
								{isSubmitting ? "Saving..." : "Save changes"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	)
}
