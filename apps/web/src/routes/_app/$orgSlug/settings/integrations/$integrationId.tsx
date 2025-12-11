import { useAtomSet } from "@effect-atom/atom-react"
import type { IntegrationConnection } from "@hazel/domain/models"
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router"
import { Exit } from "effect"
import { useState } from "react"
import { OpenStatusIntegrationContent } from "~/components/integrations/openstatus-integration-content"
import { RailwayIntegrationContent } from "~/components/integrations/railway-integration-content"
import { Button } from "~/components/ui/button"
import { Input, InputGroup } from "~/components/ui/input"
import { SectionHeader } from "~/components/ui/section-header"
import { SectionLabel } from "~/components/ui/section-label"
import { Switch, SwitchLabel } from "~/components/ui/switch"
import { useIntegrationConnection } from "~/db/hooks"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { toastExitOnError } from "~/lib/toast-exit"
import {
	type ConfigOption,
	getBrandfetchIcon,
	getIntegrationById,
	type Integration,
	validIntegrationIds,
} from "./_data"

type IntegrationProvider = IntegrationConnection.IntegrationProvider

export const Route = createFileRoute("/_app/$orgSlug/settings/integrations/$integrationId")({
	component: IntegrationConfigPage,
	beforeLoad: ({ params }) => {
		if (!validIntegrationIds.includes(params.integrationId)) {
			throw notFound()
		}
	},
})

function IntegrationConfigPage() {
	const { orgSlug, integrationId } = Route.useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const { organizationId } = useOrganization()
	const integration = getIntegrationById(integrationId)
	const [isConnecting, setIsConnecting] = useState(false)
	const [isDisconnecting, setIsDisconnecting] = useState(false)

	// Query connection from TanStack DB collection (real-time sync via Electric)
	// Only used for OAuth-based integrations (not OpenStatus)
	const { connection, isConnected } = useIntegrationConnection(
		organizationId ?? null,
		integrationId as IntegrationProvider,
	)

	// Mutations for OAuth flow and disconnect
	const getOAuthUrl = useAtomSet(HazelApiClient.mutation("integrations", "getOAuthUrl"), {
		mode: "promiseExit",
	})
	const disconnectMutation = useAtomSet(HazelApiClient.mutation("integrations", "disconnect"), {
		mode: "promiseExit",
	})

	if (!integration) {
		return null
	}

	const externalAccountName = connection?.externalAccountName ?? null

	const handleConnect = async () => {
		if (!organizationId) return
		setIsConnecting(true)
		const exit = await getOAuthUrl({
			path: { orgId: organizationId, provider: integrationId as IntegrationProvider },
		})

		toastExitOnError(exit, {
			onFailure: () => setIsConnecting(false),
			customErrors: {
				UnsupportedProviderError: (error) => ({
					title: "Unsupported provider",
					description: `The provider "${error.provider}" is not supported.`,
					isRetryable: false,
				}),
			},
		})
		if (Exit.isSuccess(exit)) {
			// Redirect to OAuth authorization URL
			window.location.href = exit.value.authorizationUrl
		}
	}

	const handleDisconnect = async () => {
		if (!organizationId) return
		setIsDisconnecting(true)
		const exit = await disconnectMutation({
			path: { orgId: organizationId, provider: integrationId as IntegrationProvider },
		})

		toastExitOnError(exit, {
			customErrors: {
				IntegrationNotConnectedError: () => ({
					title: "Integration not connected",
					description: "This integration is already disconnected.",
					isRetryable: false,
				}),
				UnsupportedProviderError: (error) => ({
					title: "Unsupported provider",
					description: `The provider "${error.provider}" is not supported.`,
					isRetryable: false,
				}),
			},
		})
		// Status will be refetched automatically
		setIsDisconnecting(false)
	}

	const handleBack = () => {
		navigate({ to: "/$orgSlug/settings/integrations", params: { orgSlug } })
	}

	// OpenStatus and Railway use webhook-based integration (per-channel), not OAuth
	const isWebhookIntegration = integrationId === "openstatus" || integrationId === "railway"

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			{/* Back link */}
			<button
				type="button"
				onClick={handleBack}
				className="-ml-1 flex w-fit items-center gap-1 text-muted-fg text-sm transition-colors hover:text-fg"
			>
				<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				<span>Back to integrations</span>
			</button>

			{/* Header */}
			<SectionHeader.Root className="border-none pb-0">
				<SectionHeader.Group>
					<div className="flex items-center gap-4">
						<div
							className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md ring-1 ring-black/8"
							style={{ backgroundColor: `${integration.brandColor}10` }}
						>
							<img
								src={getBrandfetchIcon(integration.logoDomain, {
									theme: "light",
									type: integration.logoType,
								})}
								alt={`${integration.name} logo`}
								className="size-12 object-contain"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-3">
								<SectionHeader.Heading>{integration.name}</SectionHeader.Heading>
								{!isWebhookIntegration && <ConnectionBadge connected={isConnected} />}
							</div>
							<SectionHeader.Subheading>{integration.description}</SectionHeader.Subheading>
						</div>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			{/* Main content */}
			<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
				{/* Left column - Connection & Config (or webhook-based integration content) */}
				<div className="flex flex-col gap-8">
					{isWebhookIntegration ? (
						// Webhook-based integrations: Show channel-based webhook configuration
						organizationId &&
						(integrationId === "openstatus" ? (
							<OpenStatusIntegrationContent organizationId={organizationId} />
						) : integrationId === "railway" ? (
							<RailwayIntegrationContent organizationId={organizationId} />
						) : null)
					) : (
						<>
							{/* OAuth-based integration: Connection card */}
							<div className="overflow-hidden rounded-xl border border-border bg-bg">
								<div className="border-border border-b bg-bg-muted/30 px-5 py-3">
									<h3 className="font-medium text-fg text-sm">Connection</h3>
								</div>
								<div className="p-5">
									{isConnected ? (
										<ConnectedState
											integration={integration}
											externalAccountName={externalAccountName}
											isDisconnecting={isDisconnecting}
											onDisconnect={handleDisconnect}
										/>
									) : (
										<DisconnectedState
											integration={integration}
											isConnecting={isConnecting}
											onConnect={handleConnect}
										/>
									)}
								</div>
							</div>

							{/* Configuration */}
							{isConnected && (
								<div className="overflow-hidden rounded-xl border border-border bg-bg">
									<div className="border-border border-b bg-bg-muted/30 px-5 py-3">
										<h3 className="font-medium text-fg text-sm">Configuration</h3>
									</div>
									<div className="flex flex-col divide-y divide-border">
										{integration.configOptions.map((option) => (
											<ConfigOptionRow key={option.id} option={option} />
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Right column - Features */}
				<div className="lg:sticky lg:top-6 lg:self-start">
					<div className="overflow-hidden rounded-xl border border-border bg-bg">
						<div className="border-border border-b bg-bg-muted/30 px-5 py-3">
							<h3 className="font-medium text-fg text-sm">Features</h3>
						</div>
						<div className="p-5">
							<p className="mb-4 text-muted-fg text-sm leading-relaxed">
								{integration.fullDescription}
							</p>
							<ul className="flex flex-col gap-2.5">
								{integration.features.map((feature) => (
									<li key={feature} className="flex items-center gap-2.5 text-sm">
										<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
											<svg
												className="size-3 text-emerald-600 dark:text-emerald-400"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={3}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										</div>
										<span className="text-fg">{feature}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function ConnectionBadge({ connected }: { connected: boolean }) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs ${
				connected
					? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
					: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
			}`}
		>
			<span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-400"}`} />
			{connected ? "Connected" : "Not connected"}
		</span>
	)
}

function DisconnectedState({
	integration,
	isConnecting,
	onConnect,
}: {
	integration: Integration
	isConnecting: boolean
	onConnect: () => void
}) {
	return (
		<div className="flex flex-col items-center gap-4 py-4 text-center">
			<div className="flex size-14 items-center justify-center rounded-full bg-bg-muted">
				<svg
					className="size-6 text-muted-fg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={1.5}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
					/>
				</svg>
			</div>
			<div className="flex flex-col gap-1">
				<p className="font-medium text-fg text-sm">Connect your {integration.name} account</p>
				<p className="text-muted-fg text-sm">
					You'll be redirected to {integration.name} to authorize the connection.
				</p>
			</div>
			<Button
				intent="primary"
				size="md"
				className="mt-2"
				onPress={onConnect}
				isDisabled={isConnecting}
				style={{ backgroundColor: integration.brandColor }}
			>
				{isConnecting ? (
					<>
						<svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						Connecting...
					</>
				) : (
					<>
						<img
							src={getBrandfetchIcon(integration.logoDomain, {
								theme: "light",
								type: integration.logoType,
							})}
							alt=""
							className="size-4 rounded object-contain"
						/>
						Connect with {integration.name}
					</>
				)}
			</Button>
		</div>
	)
}

function ConnectedState({
	integration,
	externalAccountName,
	isDisconnecting,
	onDisconnect,
}: {
	integration: Integration
	externalAccountName: string | null
	isDisconnecting: boolean
	onDisconnect: () => void
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
					<svg
						className="size-5 text-emerald-600 dark:text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div className="flex flex-col gap-0.5">
					<p className="font-medium text-fg text-sm">Connected to {integration.name}</p>
					{externalAccountName && <p className="text-muted-fg text-xs">{externalAccountName}</p>}
				</div>
			</div>
			<Button intent="danger" size="sm" onPress={onDisconnect} isDisabled={isDisconnecting}>
				{isDisconnecting ? "Disconnecting..." : "Disconnect"}
			</Button>
		</div>
	)
}

function ConfigOptionRow({ option }: { option: ConfigOption }) {
	const [enabled, setEnabled] = useState(false)

	return (
		<div className="flex items-center justify-between gap-4 px-5 py-4">
			<SectionLabel.Root size="sm" title={option.label} description={option.description} />
			{option.type === "toggle" ? (
				<SwitchLabel>
					<Switch isSelected={enabled} onChange={setEnabled} />
				</SwitchLabel>
			) : (
				<InputGroup className="w-48">
					<Input placeholder={option.placeholder} className="text-sm" disabled />
				</InputGroup>
			)}
		</div>
	)
}
