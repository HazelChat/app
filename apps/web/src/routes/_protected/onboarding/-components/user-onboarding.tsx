import { api } from "@hazel/backend/api"
import { createForm } from "@tanstack/solid-form"
import { useNavigate } from "@tanstack/solid-router"
import { type } from "arktype"
import { useAuth } from "authkit-solidjs"
import { IconInternet } from "~/components/icons/internet"
import { Button } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"
import { createMutation } from "~/lib/convex"

export const Useronboarding = ({ redirectTo }: { redirectTo?: string }) => {
	const createAccount = createMutation(api.accounts.createAccount)

	const navigate = useNavigate({
		from: "/onboarding",
	})

	const { user } = useAuth()

	const form = createForm(() => ({
		defaultValues: {
			displayName: user?.firstName ?? "",
			tag: user?.lastName?.toLowerCase() ?? "",
		},
		validators: {
			onChange: type({
				displayName: "3 <= string <= 18",
				tag: "3 <= string <= 18",
			}),
		},
		onSubmit: async ({ value }) => {
			createAccount({
				displayName: value.displayName,
				tag: value.tag,
			})

			if (redirectTo) {
				navigate({ to: redirectTo, replace: true })
			}

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
