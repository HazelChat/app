import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import IconPlus from "~/components/icons/icon-plus"
import { Button } from "~/components/ui/button"
import { SectionHeader } from "~/components/ui/section-header"
import { Tab, TabList, Tabs } from "~/components/ui/tabs"
import { categories, getBrandfetchIcon, type Integration, integrations } from "./_data"

export const Route = createFileRoute("/_app/$orgSlug/settings/integrations/")({
	component: IntegrationsSettings,
})

function IntegrationsSettings() {
	const [selectedCategory, setSelectedCategory] = useState<string>("all")
	const { orgSlug } = Route.useParams()
	const navigate = useNavigate()

	const filteredIntegrations =
		selectedCategory === "all"
			? integrations
			: integrations.filter((i) => i.category === selectedCategory)

	const handleIntegrationClick = (integrationId: string) => {
		navigate({
			to: "/$orgSlug/settings/integrations/$integrationId",
			params: { orgSlug, integrationId },
		})
	}

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<SectionHeader.Root className="border-none pb-0">
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-1">
						<SectionHeader.Heading>Integrations</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Connect your favorite tools to supercharge your workflow.
						</SectionHeader.Subheading>
					</div>
					<SectionHeader.Actions>
						<Button intent="secondary" size="md">
							<IconPlus data-slot="icon" />
							Request integration
						</Button>
					</SectionHeader.Actions>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<Tabs
				className="hidden w-full lg:flex"
				selectedKey={selectedCategory}
				onSelectionChange={(value) => setSelectedCategory(value as string)}
			>
				<TabList className="w-full">
					{categories.map((category) => (
						<Tab key={category.id} id={category.id}>
							{category.label}
						</Tab>
					))}
				</TabList>
			</Tabs>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{filteredIntegrations.map((integration) => (
					<IntegrationCard
						key={integration.id}
						integration={integration}
						onClick={() => handleIntegrationClick(integration.id)}
					/>
				))}
			</div>

			{filteredIntegrations.length === 0 && (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<p className="text-muted-fg text-sm">No integrations found in this category.</p>
				</div>
			)}
		</div>
	)
}

function IntegrationCard({ integration, onClick }: { integration: Integration; onClick: () => void }) {
	// TODO: This should come from actual connection state
	const connected = integration.id === "github"

	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg text-left transition-all duration-200 hover:border-border-hover hover:shadow-md"
		>
			<div className="flex flex-1 flex-col gap-4 p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/8">
							<img
								src={getBrandfetchIcon(integration.logoDomain, { type: integration.logoType })}
								alt={`${integration.name} logo`}
								className="size-10 object-contain"
							/>
						</div>
						<div className="flex flex-col gap-0.5">
							<h3 className="font-semibold text-fg text-sm">{integration.name}</h3>
							<ConnectionStatus connected={connected} />
						</div>
					</div>
				</div>
				<p className="text-muted-fg text-sm leading-relaxed">{integration.description}</p>
			</div>
			<div className="flex items-center justify-between border-border border-t bg-bg-muted/50 px-5 py-3">
				<span className="font-medium text-fg text-xs opacity-0 transition-opacity group-hover:opacity-100">
					Configure
				</span>
				<svg
					className="size-4 text-muted-fg transition-transform group-hover:translate-x-0.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</div>
		</button>
	)
}

function ConnectionStatus({ connected }: { connected: boolean }) {
	return (
		<div className="flex items-center gap-1.5">
			<div
				className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
			/>
			<span
				className={`text-xs ${connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-fg"}`}
			>
				{connected ? "Connected" : "Not connected"}
			</span>
		</div>
	)
}
