import type { ReactNode } from "react"
import { Logo } from "~/components/logo"
import { Link } from "~/components/ui/link"

interface OnboardingLayoutProps {
	children: ReactNode
	currentStep?: number
	totalSteps?: number
}

function getOnboardingImage() {
	const now = new Date()
	const month = now.getMonth() // 0-11
	const hour = now.getHours() // 0-23

	// Determine season based on month
	let season: string
	if (month >= 2 && month <= 4)
		season = "spring" // Mar-May
	else if (month >= 5 && month <= 7)
		season = "summer" // Jun-Aug
	else if (month >= 8 && month <= 10) season = "autumn"
	else season = "winter" // Dec-Feb

	// Determine time of day (day = 6AM-6PM, night = 6PM-6AM)
	const timeOfDay = hour >= 6 && hour < 18 ? "day" : "night"

	return `/images/onboarding/${season}-${timeOfDay}.png`
}

export function OnboardingLayout({ children, currentStep, totalSteps }: OnboardingLayoutProps) {
	return (
		<main className="relative grid h-dvh grid-cols-1 flex-col items-center justify-center lg:max-w-none lg:grid-cols-2">
			{/* Left panel - branding and visual */}
			<div className="relative hidden h-full flex-col p-10 text-white lg:flex">
				<img
					src={getOnboardingImage()}
					alt="Onboarding background"
					className="absolute inset-0 size-full object-cover object-top-left"
					style={{ imageRendering: "pixelated" }}
				/>

				<Link href="/" aria-label="Go to homepage" className="relative z-20 flex items-center gap-2">
					<Logo className="size-8 text-white" />
					<strong className="font-semibold">Hazel</strong>
				</Link>

				<div className="relative z-20 mt-auto rounded-xl bg-black/60 p-6 ring ring-white/10 backdrop-blur-sm">
					<blockquote className="space-y-2">
						<p className="text-lg text-white">
							Welcome to your new workspace. Let's get you set up in just a few steps.
						</p>
						<div className="text-sm text-white/80">
							{currentStep && totalSteps
								? `Step ${currentStep} of ${totalSteps}`
								: "Getting started"}
						</div>
					</blockquote>
				</div>
			</div>

			{/* Right panel - content */}
			<div className="flex min-h-dvh items-center justify-center p-4 sm:p-12">
				<div className="w-full max-w-2xl space-y-6">{children}</div>
			</div>
		</main>
	)
}
