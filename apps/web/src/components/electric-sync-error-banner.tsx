import { useAtomValue } from "@effect-atom/atom-react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import { ArrowPathIcon } from "@heroicons/react/24/solid"
import { useEffect, useState } from "react"
import { electricSyncStatusAtom, hasElectricErrorAtom, isRetryingAtom } from "~/atoms/electric-sync-atoms"

export function ElectricSyncErrorBanner() {
	const hasError = useAtomValue(hasElectricErrorAtom)
	const isRetrying = useAtomValue(isRetryingAtom)
	const status = useAtomValue(electricSyncStatusAtom)
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

	// Don't render if there's no error
	if (!hasError || !status.error) {
		return null
	}

	const errorTypeText =
		status.error.type === "auth"
			? "Authentication"
			: status.error.type === "network"
				? "Connection"
				: "Sync"

	return (
		<div className="fixed top-0 right-0 left-0 z-50 bg-danger px-4 py-3 text-danger-fg shadow-lg">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<ExclamationTriangleIcon className="h-5 w-5 shrink-0" data-slot="icon" />
					<div className="flex flex-col gap-1">
						<p className="font-medium text-sm">{errorTypeText} Error - Sync Failed</p>
						<p className="text-xs opacity-90">{status.error.message}</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{isRetrying && remainingSeconds > 0 ? (
						<div className="flex items-center gap-2 text-sm">
							<ArrowPathIcon className="h-4 w-4 animate-spin" data-slot="icon" />
							<span>Retrying in {remainingSeconds}s...</span>
						</div>
					) : isRetrying ? (
						<div className="flex items-center gap-2 text-sm">
							<ArrowPathIcon className="h-4 w-4 animate-spin" data-slot="icon" />
							<span>Retrying...</span>
						</div>
					) : (
						<div className="flex items-center gap-2 text-xs">
							<span>Retry {status.retryCount}/5 failed</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
