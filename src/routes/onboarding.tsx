import { createForm } from "@tanstack/solid-form"
import { createFileRoute } from "@tanstack/solid-router"
import { Button } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"

import { type } from "arktype"
import { useZero } from "~/lib/zero-context"

const searchType = type({
	"step?": "'user' | 'server'",
})

export const Route = createFileRoute("/onboarding")({
	component: RouteComponent,
	validateSearch: searchType,
})

function RouteComponent() {
	const z = useZero()

	const searchData = Route.useSearch()
	const navigate = Route.useNavigate()

	const form = createForm(() => ({
		defaultValues: {
			displayName: "",
			tag: "",
		},
		validators: {
			onChange: type({
				displayName: "3 <= string <= 15",
				tag: "3 <= string <= 15",
			}),
		},
		onSubmit: async ({ value }) => {
			await z.mutate.users.upsert({
				id: z.userID,
				displayName: value.displayName,
				tag: value.tag,
				avatarUrl: "https://avatars.githubusercontent.com/u/84227753",
			})

			navigate({ to: "/onboarding", search: { step: "server" } })
		},
	}))

	return (
		<div class="flex h-screen items-center justify-center">
			{searchData().step === "server" ? (
				<p>Server</p>
			) : (
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						form.handleSubmit()
					}}
					class="flex flex-col gap-2"
				>
					<form.Field
						name="displayName"
						children={(field) => (
							<TextField
								label="Display Name"
								name={field().name}
								value={field().state.value}
								onBlur={field().handleBlur}
								onInput={(e) => field().handleChange(e.target.value)}
								isInvalid={field().state.meta.errors.length > 0}
								errorText={field().state.meta.errors.join(", ")}
							/>
						)}
					/>
					<form.Field
						name="tag"
						children={(field) => (
							<TextField
								label="Tag"
								prefix="@"
								name={field().name}
								value={field().state.value}
								onBlur={field().handleBlur}
								isInvalid={field().state.meta.errors.length > 0}
								errorText={field().state.meta.errors.join(", ")}
								onInput={(e) => field().handleChange(e.target.value)}
							/>
						)}
					/>

					<Button type="submit">Create Profile</Button>
				</form>
			)}
		</div>
	)
}
