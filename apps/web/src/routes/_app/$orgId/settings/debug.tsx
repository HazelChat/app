import { useAtomSet } from "@effect-atom/atom-react"
import type { OrganizationId } from "@hazel/db/schema"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Database01 } from "@untitledui/icons"
import { useState } from "react"
import { Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { SectionLabel } from "~/components/application/section-headers/section-label"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Form } from "~/components/base/form/form"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { HazelApiClient } from "~/lib/client"

export const Route = createFileRoute("/_app/$orgId/settings/debug")({
	component: DebugSettings,
})

function DebugSettings() {
	const [showMockDataDialog, setShowMockDataDialog] = useState(false)
	const [isGeneratingMockData, setIsGeneratingMockData] = useState(false)

	const { orgId } = Route.useParams()

	const generateMockData = useAtomSet(HazelApiClient.mutation("mockData", "generate"), {
		mode: "promise",
	})

	const handleGenerateMockData = async () => {
		setIsGeneratingMockData(true)
		try {
			const result = await generateMockData({
				payload: {
					organizationId: orgId as OrganizationId,
					userCount: 10,
					channelCount: 5,
					messageCount: 50,
				},
			})
			toast.success(
				`Mock data generated successfully! Created ${result.created.users} users, ${result.created.channels} channels, and ${result.created.messages} messages.`,
			)
			setShowMockDataDialog(false)
		} catch (error) {
			console.error("Error generating mock data:", error)
			toast.error("Failed to generate mock data")
		} finally {
			setIsGeneratingMockData(false)
		}
	}

	return (
		<>
			<Form className="flex flex-col gap-6 px-4 lg:px-8">
				<SectionHeader.Root>
					<SectionHeader.Group>
						<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
							<SectionHeader.Heading>Debug Tools</SectionHeader.Heading>
							<SectionHeader.Subheading>
								Development and testing utilities for your organization.
							</SectionHeader.Subheading>
						</div>
					</SectionHeader.Group>
				</SectionHeader.Root>

				{/* Warning Banner */}
				<div className="rounded-lg border border-warning-500/20 bg-warning-500/10 p-4">
					<div className="flex gap-3">
						<AlertTriangle className="mt-0.5 size-5 text-warning" />
						<div className="flex-1">
							<p className="font-medium text-warning">Development Tools Only</p>
							<p className="mt-1 text-secondary text-sm">
								These tools are intended for development and testing purposes only. Use with
								caution.
							</p>
						</div>
					</div>
				</div>

				{/* Mock Data Section */}
				<div className="flex flex-col gap-5">
					<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
						<SectionLabel.Root
							size="sm"
							title="Mock Data Generation"
							description="Generate sample data for testing."
						/>

						<div className="flex flex-col gap-4">
							<div className="rounded-lg border border-primary bg-secondary/50 p-4">
								<div className="flex items-start gap-3">
									<FeaturedIcon size="sm" theme="modern" color="brand">
										<Database01 className="size-5" />
									</FeaturedIcon>
									<div className="flex-1">
										<h3 className="font-medium text-primary">Generate Sample Data</h3>
										<p className="mt-1 text-secondary text-sm">
											Quickly populate your organization with realistic test data
											including users, channels, and messages.
										</p>
										<Button
											size="sm"
											color="secondary"
											onClick={() => setShowMockDataDialog(true)}
											className="mt-3"
										>
											Generate Mock Data
										</Button>
									</div>
								</div>
							</div>

							<div className="text-tertiary text-xs">
								<p>Mock data includes:</p>
								<ul className="mt-1 list-inside list-disc space-y-0.5">
									<li>8 sample users with realistic profiles</li>
									<li>Public and private channels</li>
									<li>Direct message conversations</li>
									<li>Messages with reactions and threads</li>
								</ul>
							</div>
						</div>
					</div>

					<hr className="h-px w-full border-none bg-border-secondary" />

					{/* Additional Debug Tools Section (placeholder for future tools) */}
					<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
						<SectionLabel.Root
							size="sm"
							title="System Information"
							description="View system and environment details."
						/>

						<div className="rounded-lg border border-primary bg-secondary/50 p-4">
							<div className="space-y-2 font-mono text-secondary text-xs">
								<div>
									<span className="text-tertiary">Environment:</span>{" "}
									<span>{import.meta.env.MODE || "development"}</span>
								</div>
								<div>
									<span className="text-tertiary">Organization ID:</span>{" "}
									<span>{orgId}</span>
								</div>
								<div>
									<span className="text-tertiary">Backend URL:</span>{" "}
									<span className="break-all">
										{import.meta.env.VITE_BACKEND_URL || "N/A"}
									</span>
								</div>
								<div>
									<span className="text-tertiary">Electric URL:</span>{" "}
									<span className="break-all">
										{import.meta.env.VITE_ELECTRIC_URL || "N/A"}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Form>

			{/* Mock Data Generation Modal */}
			<ModalOverlay isOpen={showMockDataDialog} onOpenChange={setShowMockDataDialog}>
				<Modal>
					<Dialog>
						<div className="flex flex-col gap-5 rounded-xl border border-primary bg-primary max-sm:rounded-b-none sm:p-6">
							<div className="flex w-full items-start justify-between gap-4">
								<div className="flex-1">
									<AriaHeading className="font-semibold text-lg text-primary">
										Generate Mock Data
									</AriaHeading>
									<p className="mt-1 text-secondary text-sm">
										Create sample data for development and testing
									</p>
								</div>
								<CloseButton onPress={() => setShowMockDataDialog(false)} />
							</div>

							<div className="space-y-4">
								<p className="text-secondary text-sm">
									This will create sample data in your current organization including:
								</p>
								<ul className="list-disc space-y-1 pl-5 text-secondary text-sm">
									<li>8 mock users with profiles</li>
									<li>5 channels (public and private)</li>
									<li>Direct message conversations</li>
									<li>Sample messages with reactions</li>
									<li>Thread replies</li>
								</ul>
								<div className="rounded-lg border border-warning-500/20 bg-warning-500/10 p-3">
									<p className="font-medium text-sm text-warning">
										⚠️ Warning: This is intended for development purposes only.
									</p>
								</div>
							</div>

							<div className="flex justify-end gap-3">
								<Button
									size="sm"
									color="secondary"
									onClick={() => setShowMockDataDialog(false)}
									isDisabled={isGeneratingMockData}
								>
									Cancel
								</Button>
								<Button
									size="sm"
									color="primary"
									onClick={handleGenerateMockData}
									isLoading={isGeneratingMockData}
								>
									{isGeneratingMockData ? "Generating..." : "Generate Data"}
								</Button>
							</div>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</>
	)
}
