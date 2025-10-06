import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { SectionFooter } from "~/components/application/section-footers/section-footer"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { TabList, Tabs } from "~/components/application/tabs/tabs"
import { Button } from "~/components/base/buttons/button"
import { Toggle } from "~/components/base/toggle/toggle"
import IconPlus from "~/components/icons/icon-plus"

export const Route = createFileRoute("/_app/$orgSlug/settings/integrations")({
	component: IntegrationsSettings,
})

const integrations = [
	{
		name: "Linear",
		description: "Streamline software projects, sprints, and bug tracking.",
		logo: "https://www.untitledui.com/logos/integrations/linear.svg",
		active: true,
	},
	{
		name: "GitHub",
		description: "Link pull requests and automate workflows.",
		logo: "https://www.untitledui.com/logos/integrations/github.svg",
		active: true,
	},
	{
		name: "Figma",
		description: "Embed file previews in projects.",
		logo: "https://www.untitledui.com/logos/integrations/figma.svg",
		active: true,
	},
	{
		name: "Zapier",
		description: "Build custom automations and integrations with apps.",
		logo: "https://www.untitledui.com/logos/integrations/zapier.svg",
		active: false,
	},
	{
		name: "Notion",
		description: "Embed notion pages and notes in projects.",
		logo: "https://www.untitledui.com/logos/integrations/notion.svg",
		active: true,
	},
	{
		name: "Slack",
		description: "Send notifications to channels and create projects.",
		logo: "https://www.untitledui.com/logos/integrations/slack.svg",
		active: true,
	},
	{
		name: "Zendesk",
		description: "Link and automate Zendesk tickets.",
		logo: "https://www.untitledui.com/logos/integrations/zendesk.svg",
		active: true,
	},
	{
		name: "Atlassian JIRA",
		description: "Plan, track, and release great software.",
		logo: "https://www.untitledui.com/logos/integrations/jira.svg",
		active: false,
	},
	{
		name: "Dropbox",
		description: "Everything you need for work, all in one place.",
		logo: "https://www.untitledui.com/logos/integrations/dropbox.svg",
		active: true,
	},
]

const categories = [
	{
		id: "all",
		label: "View all",
	},
	{
		id: "developer-tools",
		label: "Developer tools",
	},
	{
		id: "communication",
		label: "Communication",
	},
	{
		id: "productivity",
		label: "Productivity",
	},
	{
		id: "browser-tools",
		label: "Browser tools",
	},
	{
		id: "marketplace",
		label: "Marketplace",
	},
]

function IntegrationsSettings() {
	const [selectedCategory, setSelectedCategory] = useState<string>("all")

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<SectionHeader.Root className="border-none pb-0">
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5">
						<SectionHeader.Heading>Integrations and connected apps</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Supercharge your workflow and connect the tool you use every day.
						</SectionHeader.Subheading>
					</div>
					<SectionHeader.Actions>
						<Button color="secondary" size="md" iconLeading={IconPlus}>
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
				<TabList type="underline" className="w-full" items={categories} />
			</Tabs>

			<ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
				{integrations.map((integration) => (
					<li
						key={integration.name}
						className="w-full flex-1 rounded-xl bg-primary_alt shadow-xs ring-1 ring-secondary ring-inset"
					>
						<div className="flex flex-col gap-6 px-4 py-5 lg:px-5">
							<div className="flex gap-2">
								<div className="flex flex-1 items-center gap-3">
									<div className="w-max shrink-0 rounded-lg bg-white p-0.5 shadow-xs ring-1 ring-secondary ring-inset">
										<img
											src={integration.logo}
											alt={"${integration.name} logo"}
											className="size-12 object-contain"
										/>
									</div>
									<p className="font-medium text-md text-primary lg:font-semibold lg:text-md">
										{integration.name}
									</p>
								</div>
								<Toggle isSelected={integration.active} size="sm" />
							</div>
							<p className="text-sm text-tertiary">{integration.description}</p>
						</div>
						<SectionFooter.Root isCard className="px-6 py-4">
							<SectionFooter.Actions>
								<Button color="link-color" size="md">
									View integration
								</Button>
							</SectionFooter.Actions>
						</SectionFooter.Root>
					</li>
				))}
			</ul>
		</div>
	)
}
