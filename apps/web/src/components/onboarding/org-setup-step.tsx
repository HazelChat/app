import { useAtomSet } from "@effect-atom/atom-react"
import { type } from "arktype"
import { Exit } from "effect"
import { createOrganizationMutation } from "~/atoms/organization-atoms"
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Description, FieldError, Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { TextField } from "~/components/ui/text-field"
import { useAppForm } from "~/hooks/use-app-form"
import { useAuth } from "~/lib/auth"
import { toastExit } from "~/lib/toast-exit"
import { OnboardingNavigation } from "./onboarding-navigation"

// Sanitize slug value to URL-safe format
function sanitizeSlug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 50)
}

// Define a custom slug validator
const slugValidator = (slug: string) => {
	if (slug.startsWith("-") || slug.endsWith("-")) {
		return false
	}
	return true
}

const orgSchema = type({
	name: "string > 0",
	slug: type("string >= 3").narrow(slugValidator),
})

type OrgFormData = typeof orgSchema.infer

interface OrgSetupStepProps {
	onBack: () => void
	onContinue: (data: { name: string; slug: string; organizationId: string }) => void
	defaultName?: string
	defaultSlug?: string
}

export function OrgSetupStep({ onBack, onContinue, defaultName = "", defaultSlug = "" }: OrgSetupStepProps) {
	const { user } = useAuth()
	const createOrganization = useAtomSet(createOrganizationMutation, { mode: "promiseExit" })

	const form = useAppForm({
		defaultValues: {
			name: defaultName,
			slug: defaultSlug,
		} as OrgFormData,
		validators: {
			onChange: orgSchema,
		},
		onSubmit: async ({ value }) => {
			if (!user?.id) return

			const exit = await toastExit(
				createOrganization({
					payload: {
						name: value.name,
						slug: value.slug,
						logoUrl: null,
						settings: null,
					},
				}),
				{
					loading: "Creating workspace...",
					success: "Workspace created successfully",
					customErrors: {
						OrganizationSlugAlreadyExistsError: (error) => ({
							title: "Slug already taken",
							description: `The slug "${error.slug}" is already in use. Please choose a different one.`,
							isRetryable: false,
						}),
					},
				},
			)

			if (Exit.isSuccess(exit)) {
				const organizationId = exit.value.data.id
				onContinue({ name: value.name, slug: value.slug, organizationId })
			}
		},
	})

	return (
		<div className="space-y-6">
			<CardHeader>
				<CardTitle>Set up your workspace</CardTitle>
				<CardDescription>
					Choose a name and URL for your organization. You can change these later.
				</CardDescription>
			</CardHeader>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
			>
				<div className="space-y-4">
					<form.AppField
						name="name"
						children={(field) => (
							<TextField isRequired>
								<Label>Organization name</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Acme Inc."
									autoFocus
									aria-invalid={!!field.state.meta.errors?.length}
								/>
								<Description>The display name for your organization</Description>
								{field.state.meta.errors?.[0] && (
									<FieldError>{field.state.meta.errors[0].message}</FieldError>
								)}
							</TextField>
						)}
					/>

					<form.AppField
						name="slug"
						children={(field) => (
							<>
								<TextField isRequired isInvalid={!!field.state.meta.errors?.length}>
									<Label>Workspace URL</Label>
									<div className="relative">
										<div className="flex items-center gap-2">
											<span className="text-muted-fg text-sm">hazel.app/</span>
											<Input
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(sanitizeSlug(e.target.value))
												}
												onBlur={field.handleBlur}
												placeholder="acme"
												aria-invalid={!!field.state.meta.errors?.length}
											/>
										</div>
									</div>
									{field.state.meta.errors?.[0] ? (
										<FieldError>{field.state.meta.errors[0].message}</FieldError>
									) : (
										<Description>
											Your unique workspace URL (lowercase letters, numbers, and
											hyphens)
										</Description>
									)}
								</TextField>

								{field.state.value &&
									field.state.value.length >= 3 &&
									!field.state.meta.errors?.length && (
										<div className="rounded-lg border border-border bg-muted/30 p-4">
											<p className="text-muted-fg text-sm">
												Your workspace will be accessible at:{" "}
												<span className="font-medium text-fg">
													hazel.app/{field.state.value}
												</span>
											</p>
										</div>
									)}
							</>
						)}
					/>
				</div>

				<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
					{([canSubmit, isSubmitting]) => (
						<OnboardingNavigation
							onBack={onBack}
							onContinue={() => form.handleSubmit()}
							canContinue={canSubmit}
							isLoading={isSubmitting}
						/>
					)}
				</form.Subscribe>
			</form>
		</div>
	)
}
