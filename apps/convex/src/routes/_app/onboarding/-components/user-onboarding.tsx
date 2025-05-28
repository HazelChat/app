import { createForm } from "@tanstack/solid-form"
import { type } from "arktype"
import { useUser } from "clerk-solidjs"
import { api } from "convex-hazel/_generated/api"
import { IconInternet } from "~/components/icons/internet"
import { Button } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"
import { createMutation } from "~/lib/convex"
import { Route } from "../.."

export const Useronboarding = () => {
	const createUser = createMutation(api.users.createUser)

	const navigate = Route.useNavigate()

	const { user } = useUser()

	const form = createForm(() => ({
		defaultValues: {
			displayName: user()?.fullName ?? "",
			tag: user()?.username?.toLowerCase() ?? "",
		},
		validators: {
			onChange: type({
				displayName: "3 <= string <= 15",
				tag: "3 <= string <= 15",
			}),
		},
		onSubmit: async ({ value }) => {
			createUser({
				displayName: value.displayName,
				tag: value.tag,
			})

			navigate({ to: "/onboarding", search: { step: "server" } })
		},
	}))

	return (
		<div class="flex h-screen items-center justify-center">
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
							prefix={<IconInternet class="ml-2 size-4 text-muted-foreground" />}
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
		</div>
	)
}
