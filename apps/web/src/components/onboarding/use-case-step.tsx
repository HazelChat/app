import { useState } from "react"
import { IconCircleDottedUser } from "~/components/icons/icon-circle-dotted-user"
import { IconOffice } from "~/components/icons/icon-company"
import { IconUsers } from "~/components/icons/icon-users"
import { IconUsersPlus } from "~/components/icons/icon-users-plus"
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { ChoiceBox, ChoiceBoxDescription, ChoiceBoxItem, ChoiceBoxLabel } from "~/components/ui/choice-box"
import { OnboardingNavigation } from "./onboarding-navigation"

const teamSizes = [
	{
		id: "solo",
		label: "Just me",
		description: "Solo user or personal workspace",
		icon: IconCircleDottedUser,
	},
	{
		id: "small",
		label: "2-10 people",
		description: "Small team or startup",
		icon: IconUsers,
	},
	{
		id: "medium",
		label: "11-50 people",
		description: "Growing team",
		icon: IconUsersPlus,
	},
	{
		id: "large",
		label: "51-200 people",
		description: "Medium-sized company",
		icon: IconOffice,
	},
	{
		id: "xlarge",
		label: "201-1000 people",
		description: "Large organization",
		icon: IconOffice,
	},
	{
		id: "enterprise",
		label: "1000+ people",
		description: "Enterprise",
		icon: IconOffice,
	},
]

interface UseCaseStepProps {
	onBack: () => void
	onContinue: (useCases: string[]) => void
	defaultSelection?: string[]
}

export function UseCaseStep({ onBack, onContinue, defaultSelection = [] }: UseCaseStepProps) {
	const [selected, setSelected] = useState<string | undefined>(defaultSelection[0])

	const handleContinue = () => {
		if (selected) {
			onContinue([selected])
		}
	}

	return (
		<div className="space-y-6">
			<CardHeader>
				<CardTitle>How big is your team?</CardTitle>
				<CardDescription>This helps us optimize Hazel for your team size.</CardDescription>
			</CardHeader>

			<div>
				<ChoiceBox
					gap={4}
					columns={2}
					selectionMode="single"
					layout="grid"
					aria-label="Team size"
					selectedKeys={selected ? [selected] : []}
					onSelectionChange={(keys) => {
						const values = Array.from(keys)
						setSelected(values[0] as string)
					}}
					items={teamSizes}
				>
					{(item) => {
						const Icon = item.icon
						return (
							<ChoiceBoxItem key={item.id} id={item.id} textValue={item.label}>
								<Icon />
								<ChoiceBoxLabel>{item.label}</ChoiceBoxLabel>
								<ChoiceBoxDescription>{item.description}</ChoiceBoxDescription>
							</ChoiceBoxItem>
						)
					}}
				</ChoiceBox>
			</div>

			<OnboardingNavigation onBack={onBack} onContinue={handleContinue} canContinue={!!selected} />
		</div>
	)
}
