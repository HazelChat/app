import { useAtomValue } from "@effect-atom/atom-react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import { ArrowPathIcon } from "@heroicons/react/24/solid"
import { useEffect, useState } from "react"
import { electricSyncStatusAtom } from "~/atoms/electric-sync-atoms"
import { useAuth } from "~/lib/auth"
import { Button } from "./ui/button"

interface ElectricSyncErrorPageProps {
	onRetry?: () => Promise<void>
}

export function ElectricSyncErrorPage({ onRetry }: ElectricSyncErrorPageProps) {
	const status = useAtomValue(electricSyncStatusAtom)
	const { logout } = useAuth()
	const [isRetrying, setIsRetrying] = useState(false)
	const [remainingSeconds, setRemainingSeconds] = useState(0)

	// Calculate remaining time until next retry
	useEffect(() => {
		if (!status.nextRetryAt) {
			setRemainingSeconds(0)
			return
		}

		const updateRemainingTime = () => {
			const now = Date.now()
			const remaining = Math.max(0, Math.ceil((status.nextRetryAt! - now) / 1000))
			setRemainingSeconds(remaining)

			if (remaining === 0) {
				clearInterval(interval)
			}
		}

		updateRemainingTime()
		const interval = setInterval(updateRemainingTime, 1000)

		return () => clearInterval(interval)
	}, [status.nextRetryAt])

	const handleRetry = async () => {
		if (!onRetry || isRetrying) return

		setIsRetrying(true)
		try {
			await onRetry()
		} catch (error) {
			console.error("Manual retry failed:", error)
		} finally {
			setIsRetrying(false)
		}
	}

	const handleLogout = () => {
		logout({ redirectTo: "/" })
	}

	const errorTypeText =
		status.error?.type === "auth"
			? "Authentication Error"
			: status.error?.type === "network"
				? "Connection Error"
				: "Sync Error"

	return (
		<div className="flex h-screen flex-col items-center justify-center gap-6 px-4">
			<div className="flex w-full max-w-md flex-col items-center gap-6">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="rounded-full bg-danger/10 p-4">
						<ExclamationTriangleIcon className="h-12 w-12 text-danger" />
					</div>

					<div className="flex flex-col gap-2">
						<h1 className="font-bold text-2xl">Unable to Connect</h1>
						<p className="text-muted-fg text-sm">
							{errorTypeText}: {status.error?.message || "Failed to sync with server"}
						</p>
					</div>
				</div>

				<div className="flex w-full flex-col gap-3">
					{status.state === "retrying" && remainingSeconds > 0 ? (
						<div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
							<ArrowPathIcon className="h-4 w-4 animate-spin text-muted-fg" />
							<span className="text-muted-fg">
								Retrying automatically in {remainingSeconds}s...
							</span>
						</div>
					) : (
						<Button
							intent="primary"
							size="lg"
							onPress={handleRetry}
							isPending={isRetrying}
							className="w-full"
						>
							{isRetrying ? "Retrying..." : "Retry Connection"}
						</Button>
					)}

					<Button intent="outline" size="lg" onPress={handleLogout} className="w-full">
						Logout and Try Again
					</Button>
				</div>

				{status.retryCount > 0 && (
					<p className="text-center text-muted-fg text-xs">
						Retry attempt {status.retryCount} of 5 failed
					</p>
				)}
			</div>
		</div>
	)
}
