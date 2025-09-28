import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { Building02, Users01 } from "@untitledui/icons"
import { useState } from "react"
import { CreateOrganizationModal } from "~/components/application/modals/create-organization-modal"
import { Button } from "~/components/base/buttons/button"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import IconMagicWand from "~/components/icons/IconMagicWand"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"

export const Route = createFileRoute("/_app/onboarding")({
	component: OnboardingPage,
})

function OnboardingPage() {
	const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false)
	const { user } = useAuth()

	// Check if user already has organizations
	const { data: userOrganizations } = useLiveQuery(
		(q) =>
			q
				.from({ member: organizationMemberCollection })
				.innerJoin({ org: organizationCollection }, ({ member, org }) =>
					eq(member.organizationId, org.id),
				)
				.where(({ member }) => eq(member.userId, user?.id || ""))
				.orderBy(({ member }) => member.createdAt, "asc"),
		[user?.id],
	)

	// If user has organizations, redirect to the first one
	if (userOrganizations && userOrganizations.length > 0) {
		const firstOrg = userOrganizations[0]!
		return <Navigate to="/$orgId" params={{ orgId: firstOrg.org.id }} />
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				{/* Logo/Header */}
				<div className="text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-solid">
						<IconMagicWand className="h-8 w-8 text-white" />
					</div>
					<h2 className="mt-6 font-bold text-3xl text-primary">Welcome to Maki Chat</h2>
					<p className="mt-2 text-secondary text-sm">
						Let's get you started by creating your first organization
					</p>
				</div>

				{/* Features */}
				<div className="rounded-lg bg-primary p-6 shadow">
					<div className="space-y-4">
						<div className="flex items-start space-x-3">
							<FeaturedIcon icon={Building02} color="brand" size="md" theme="modern" />
							<div className="flex-1">
								<h3 className="font-medium text-primary text-sm">Create Your Organization</h3>
								<p className="mt-1 text-sm text-tertiary">
									Set up a workspace for your team to collaborate
								</p>
							</div>
						</div>

						<div className="flex items-start space-x-3">
							<FeaturedIcon icon={Users01} color="brand" size="md" theme="modern" />
							<div className="flex-1">
								<h3 className="font-medium text-primary text-sm">Invite Team Members</h3>
								<p className="mt-1 text-sm text-tertiary">
									Bring your colleagues into the conversation
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="space-y-3">
					<Button
						color="primary"
						size="lg"
						className="w-full"
						onClick={() => setCreateOrgModalOpen(true)}
					>
						Create Your First Organization
					</Button>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-secondary border-t" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-secondary px-2 text-tertiary">Or</span>
						</div>
					</div>

					<p className="text-center text-sm text-tertiary">
						Have an invitation? You'll be able to join once your administrator adds you.
					</p>
				</div>
			</div>

			{/* Create Organization Modal */}
			<CreateOrganizationModal isOpen={createOrgModalOpen} onOpenChange={setCreateOrgModalOpen} />
		</div>
	)
}
