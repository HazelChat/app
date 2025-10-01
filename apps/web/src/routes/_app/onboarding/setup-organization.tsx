import type { OrganizationId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router"
import { Building02 } from "@untitledui/icons"
import { type } from "arktype"
import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "~/components/base/buttons/button"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { organizationCollection } from "~/db/collections"
import { useAppForm } from "~/hooks/use-app-form"

const setupSchema = type({
	slug: "3 <= string < 50",
})

type SetupFormData = typeof setupSchema.infer

export const Route = createFileRoute("/_app/onboarding/setup-organization")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			orgId: (search.orgId as string) || undefined,
		}
	},
})

function RouteComponent() {
	const search = useSearch({ from: "/_app/onboarding/setup-organization" })
	const navigate = useNavigate()

	const { data: organizations } = useLiveQuery(
		(q) =>
			search.orgId
				? q
						.from({ org: organizationCollection })
						.where(({ org }) => eq(org.id, search.orgId as OrganizationId))
						.orderBy(({ org }) => org.createdAt, "asc")
						.limit(1)
				: null,
		[search.orgId],
	)

	const organization = organizations?.[0]

	// If no orgId provided, redirect to main onboarding
	if (!search.orgId) {
		return <Navigate to="/onboarding" />
	}

	// If org already has a slug, redirect to it
	if (organization?.slug) {
		return <Navigate to="/$orgSlug" params={{ orgSlug: organization.slug }} />
	}

	const generateSlug = useCallback((name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.substring(0, 50)
	}, [])

	const form = useAppForm({
		defaultValues: {
			slug: "",
		} as SetupFormData,
		validators: {
			onChange: setupSchema,
		},
		onSubmit: async ({ value }) => {
			if (!organization) return

			try {
				organizationCollection.update(organization.id, (org) => {
					org.slug = value.slug.trim()
					org.updatedAt = new Date()
				})

				toast.success("Organization setup complete!")

				// Navigate to the organization
				await navigate({ to: "/$orgSlug", params: { orgSlug: value.slug.trim() } })
			} catch (error: any) {
				console.error("Failed to update organization:", error)
				if (error.message?.includes("slug already exists")) {
					form.setFieldMeta("slug", (meta) => ({
						...meta,
						errors: [{ message: "This slug is already taken" }],
					}))
				} else {
					toast.error(error.message || "Failed to update organization")
				}
			}
		},
	})

	// Auto-generate slug from organization name
	useEffect(() => {
		if (organization?.name && !form.getFieldValue("slug")) {
			form.setFieldValue("slug", generateSlug(organization.name))
		}
	}, [organization?.name, form, generateSlug])

	if (!organization) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-130">
				<div className="relative overflow-hidden rounded-2xl bg-primary shadow-xl">
					<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
						<div className="relative w-max">
							<FeaturedIcon color="gray" size="lg" theme="modern" icon={Building02} />
							<BackgroundPattern
								pattern="circle"
								size="sm"
								className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
							/>
						</div>
						<div className="z-10 flex flex-col gap-0.5">
							<h1 className="font-semibold text-md text-primary">Setup Your Organization</h1>
							<p className="text-sm text-tertiary">
								Configure a URL slug for <strong>{organization.name}</strong>
							</p>
						</div>
					</div>

					<div className="h-5 w-full" />

					<div className="flex flex-col gap-4 px-4 sm:px-6">
						{/* Slug Field */}
						<form.AppField
							name="slug"
							children={(field) => (
								<div className="flex flex-col gap-1.5">
									<field.Input
										label="Organization URL"
										size="md"
										placeholder="my-organization"
										value={field.state.value}
										onChange={(value) => field.handleChange(value)}
										onBlur={field.handleBlur}
										isInvalid={!!field.state.meta.errors?.length}
										hint={field.state.meta.errors
											?.map((error) => error?.message)
											.join(", ")}
										autoFocus
									/>
									{!field.state.meta.errors?.length && field.state.value && (
										<p className="text-tertiary text-xs">
											Your organization URL will be:{" "}
											<span className="font-medium text-primary">
												/{field.state.value}
											</span>
										</p>
									)}
								</div>
							)}
						/>
					</div>

					<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:px-6 sm:pt-8 sm:pb-6">
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button
									color="primary"
									size="lg"
									onClick={form.handleSubmit}
									isDisabled={!canSubmit || isSubmitting}
								>
									{isSubmitting ? "Completing Setup..." : "Complete Setup"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</div>
			</div>
		</div>
	)
}
