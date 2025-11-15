import { useAtomSet } from "@effect-atom/atom-react"
import type { OrganizationId } from "@hazel/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMachine } from "@xstate/react"
import { Exit } from "effect"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { fromPromise } from "xstate"
import { createOrganizationMutation, setOrganizationSlugMutation } from "~/atoms/organization-atoms"
import { updateUserMutation } from "~/atoms/user-atoms"
import { InviteTeamStep } from "~/components/onboarding/invite-team-step"
import { OnboardingLayout } from "~/components/onboarding/onboarding-layout"
import { OrgSetupStep } from "~/components/onboarding/org-setup-step"
import { ProfileInfoStep } from "~/components/onboarding/profile-info-step"
import { RoleStep } from "~/components/onboarding/role-step"
import { ThemeSelectionStep } from "~/components/onboarding/theme-selection-step"
import { UseCaseStep } from "~/components/onboarding/use-case-step"
import { WelcomeStep } from "~/components/onboarding/welcome-step"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"
import { onboardingMachine } from "~/machines/onboarding.machine"

export const Route = createFileRoute("/_app/onboarding/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { user } = useAuth()
	const navigate = useNavigate()

	const createOrganization = useAtomSet(createOrganizationMutation, { mode: "promiseExit" })
	const setOrganizationSlugAction = useAtomSet(setOrganizationSlugMutation, { mode: "promiseExit" })
	const updateUser = useAtomSet(updateUserMutation, { mode: "promiseExit" })

	// Track transition direction for animations
	const [direction, setDirection] = useState<"forward" | "backward">("forward")

	// Fetch user's organizations to determine if they're creating or joining
	const { data: userOrganizations } = useLiveQuery(
		(q) =>
			user?.id
				? q
						.from({ member: organizationMemberCollection })
						.innerJoin({ org: organizationCollection }, ({ member, org }) =>
							eq(member.organizationId, org.id),
						)
						.where(({ member }) => eq(member.userId, user.id))
						.orderBy(({ member }) => member.createdAt, "asc")
						.limit(1)
				: undefined,
		[user?.id],
	)

	const orgId = userOrganizations?.[0]?.org.id
	const organization = userOrganizations?.[0]?.org

	// Provide actor implementations with access to RPC functions
	const machineWithActors = onboardingMachine.provide({
		actors: {
			handleOrgSetup: fromPromise(
				async ({
					input,
				}: {
					input: { orgId?: string; createdOrgId?: string; name: string; slug: string }
				}) => {
					let effectiveOrgId = input.orgId || input.createdOrgId

					// If no orgId, create the organization first
					if (!effectiveOrgId) {
						const result = await createOrganization({
							payload: {
								name: input.name,
								slug: input.slug,
								logoUrl: null,
								settings: null,
							},
						})

						if (Exit.isSuccess(result)) {
							effectiveOrgId = result.value.data.id
						} else {
							throw new Error("Failed to create organization")
						}
					} else {
						// If orgId exists, just update the slug
						const result = await setOrganizationSlugAction({
							payload: {
								id: effectiveOrgId as OrganizationId,
								slug: input.slug,
							},
						})

						if (!Exit.isSuccess(result)) {
							throw new Error("Failed to set organization slug")
						}
					}

					return { orgId: effectiveOrgId }
				},
			),
			handleCompletion: fromPromise(
				async ({
					input,
				}: {
					input: {
						orgId?: string
						role: string
						useCases: string[]
						emails: string[]
						orgSlug?: string
						organizationSlug?: string
					}
				}) => {
					if (!input.orgId) {
						throw new Error("Organization ID is required")
					}

					// TODO: Save user preferences to organization settings
					// await updateOrganization({
					// 	payload: {
					// 		id: input.orgId as OrganizationId,
					// 		settings: {
					// 			onboarding: {
					// 				useCases: input.useCases,
					// 				role: input.role,
					// 				completedAt: new Date().toISOString(),
					// 			},
					// 		},
					// 	},
					// })

					// TODO: For creators, create default channels (#general, #announcements)
					// This requires implementing channel creation RPC or backend logic

					// TODO: Send team invites
					// This would require a backend RPC endpoint or WorkOS API integration
					if (input.emails.length > 0) {
						console.log("TODO: Send invites to:", input.emails)
					}

					// Determine the slug to use for navigation
					const slugToUse = input.orgSlug || input.organizationSlug

					if (!slugToUse) {
						throw new Error("Organization slug is missing. Please try again.")
					}

					return { slug: slugToUse }
				},
			),
		},
	})

	// Initialize state machine
	const [state, send] = useMachine(machineWithActors, {
		input: {
			orgId,
			organization: organization
				? {
						id: organization.id,
						name: organization.name,
						slug: organization.slug || undefined,
					}
				: undefined,
		},
	})

	// Navigate when onboarding is completed
	useEffect(() => {
		if (state.matches("completed")) {
			const slug = state.context.orgSlug || state.context.organization?.slug
			if (slug) {
				navigate({
					to: "/$orgSlug",
					params: { orgSlug: slug },
				})
			}
		}
	}, [state, navigate])

	// Determine if this is a creator or invited user
	const isCreator = !orgId || !organization?.slug

	const getTotalSteps = () => (isCreator ? 7 : 5)
	const getCurrentStepNumber = () => {
		const flowType = isCreator ? "creator" : "invited"
		const allMeta = state.getMeta()

		// Find stepNumber from the deepest state in the configuration
		// getMeta() returns an object where keys are state IDs and values are meta objects
		let stepNumber = 1
		for (const meta of Object.values(allMeta)) {
			if (meta && typeof meta === "object" && "stepNumber" in meta) {
				const stepNumberMeta = meta.stepNumber as { creator: number; invited: number | null }
				const num = stepNumberMeta[flowType]
				if (num !== null && num !== undefined) {
					stepNumber = num
				}
			}
		}

		return stepNumber
	}

	// Animation variants based on direction with blur effect
	const variants = {
		enter: {
			x: direction === "forward" ? 20 : -20,
			opacity: 0,
			filter: "blur(4px)",
		},
		center: {
			x: 0,
			opacity: 1,
			filter: "blur(0px)",
		},
		exit: {
			x: direction === "forward" ? -20 : 20,
			opacity: 0,
			filter: "blur(4px)",
		},
	}

	// Helper to send events and track direction
	const sendWithDirection = (event: any) => {
		if (event.type === "BACK") {
			setDirection("backward")
		} else {
			setDirection("forward")
		}
		send(event)
	}

	return (
		<OnboardingLayout currentStep={getCurrentStepNumber()} totalSteps={getTotalSteps()}>
			<AnimatePresence mode="wait" initial={false}>
				{state.matches("welcome") && (
					<motion.div
						key="welcome"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<WelcomeStep
							onContinue={() => sendWithDirection({ type: "WELCOME_CONTINUE" })}
							isCreatingOrg={isCreator}
							organizationName={organization?.name}
						/>
					</motion.div>
				)}

				{state.matches("profileInfo") && (
					<motion.div
						key="profileInfo"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<ProfileInfoStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={async (data) => {
								// Save user profile info
								if (user?.id) {
									await updateUser({
										payload: {
											id: user.id,
											firstName: data.firstName,
											lastName: data.lastName,
										} as any, // TODO: Fix type - need to check RPC contract for partial update
									})
								}
								sendWithDirection({ type: "PROFILE_INFO_CONTINUE", data })
							}}
							defaultFirstName={user?.firstName || ""}
							defaultLastName={user?.lastName || ""}
						/>
					</motion.div>
				)}

				{state.matches("themeSelection") && (
					<motion.div
						key="themeSelection"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<ThemeSelectionStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={(data) => sendWithDirection({ type: "THEME_CONTINUE", data })}
						/>
					</motion.div>
				)}

				{state.matches({ organizationSetup: "form" }) && isCreator && (
					<motion.div
						key="organizationSetup"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<OrgSetupStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={async (data) => {
								sendWithDirection({ type: "ORG_SETUP_CONTINUE", data })
							}}
							defaultName={organization?.name}
							defaultSlug={organization?.slug || ""}
						/>
					</motion.div>
				)}

				{state.matches({ profileSetup: "useCases" }) && (
					<motion.div
						key="useCases"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<UseCaseStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={(useCases) =>
								sendWithDirection({ type: "USE_CASE_CONTINUE", data: { useCases } })
							}
							defaultSelection={state.context.useCases}
						/>
					</motion.div>
				)}

				{state.matches({ profileSetup: "role" }) && (
					<motion.div
						key="role"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<RoleStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={(role) =>
								sendWithDirection({ type: "ROLE_CONTINUE", data: { role } })
							}
							defaultSelection={state.context.role}
						/>
					</motion.div>
				)}

				{state.matches({ teamInvitation: "inviteForm" }) && isCreator && (
					<motion.div
						key="teamInvitation"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<InviteTeamStep
							onBack={() => sendWithDirection({ type: "BACK" })}
							onContinue={async (emails) => {
								sendWithDirection({ type: "INVITE_TEAM_CONTINUE", data: { emails } })
							}}
							onSkip={() => sendWithDirection({ type: "INVITE_TEAM_SKIP" })}
						/>
					</motion.div>
				)}

				{(state.matches({ finalization: "processing" }) ||
					state.matches({ organizationSetup: "processing" })) && (
					<motion.div
						key="processing"
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
							<div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							<p className="font-medium text-lg">Setting up your workspace...</p>
							<p className="text-muted-fg text-sm">This will just take a moment</p>
							{state.context.error && (
								<p className="text-red-600 text-sm">{state.context.error}</p>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</OnboardingLayout>
	)
}
