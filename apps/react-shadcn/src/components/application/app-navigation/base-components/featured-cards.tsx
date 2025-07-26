import type { ReactNode } from "react"
import { Button } from "~/components/base/buttons/button"
import { ProgressBar } from "~/components/base/progress-indicators/progress-indicators"

interface FeaturedCardCommonProps {
	title: string
	description: ReactNode
	confirmLabel: string
	className?: string
	onDismiss: () => void
	onConfirm: () => void
}

export const FeaturedCardOnboardingSteps = ({
	title,
	supportingText,
	progress,
	description,
	confirmLabel,
	onConfirm,
}: FeaturedCardCommonProps & { supportingText: string; progress: number }) => {
	return (
		<div className="relative flex flex-col gap-4 rounded-xl bg-primary p-4 ring-1 ring-secondary ring-inset">
			<div className="flex flex-col gap-3">
				<div className="flex justify-between">
					<span className="text-sm font-semibold text-primary">{title}</span>
					<span className="text-sm text-quaternary">{supportingText}</span>
				</div>

				<div className="flex">
					<ProgressBar value={progress} />
				</div>
			</div>
			{description}
			<Button size="sm" color="secondary" onClick={onConfirm}>
				{confirmLabel}
			</Button>
		</div>
	)
}
