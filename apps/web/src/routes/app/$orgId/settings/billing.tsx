import { createFileRoute } from "@tanstack/react-router"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { Form } from "~/components/base/form/form"

export const Route = createFileRoute("/app/$orgId/settings/billing")({
	component: BillingSettings,
})

function BillingSettings() {
	return (
		<Form
			className="flex flex-col gap-6 px-4 lg:px-8"
			onSubmit={(e) => {
				e.preventDefault()
				const data = Object.fromEntries(new FormData(e.currentTarget))
				console.log("Form data:", data)
			}}
		>
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
						<SectionHeader.Heading>Billing</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Manage your billing information and subscription.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<div className="flex flex-col gap-5">
				<p className="text-secondary">Billing settings coming soon...</p>
			</div>
		</Form>
	)
}
