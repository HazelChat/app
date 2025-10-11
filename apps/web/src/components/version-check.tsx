import { Result, useAtomValue } from "@effect-atom/atom-react"
import { useEffect } from "react"
import { toast } from "sonner"
import { versionCheckAtom } from "~/atoms/version-atom"

/**
 * Component that monitors for new app versions and displays a toast notification
 * when an update is available, prompting the user to reload the page.
 *
 * Features:
 * - Checks immediately on mount, then polls every 1 minute
 * - Shows toast whenever a new version is detected
 * - Provides "Reload" action button in toast
 * - Gracefully handles errors (fails silently)
 */
export const VersionCheck = () => {
	// Subscribe to version check atom
	const versionStateResult = useAtomValue(versionCheckAtom)
	const versionState = Result.getOrElse(versionStateResult, () => null)

	useEffect(() => {
		if (versionState?.shouldShowToast) {
			toast("A new version is available", {
				id: "version-update",
				description: "Reload the page to get the latest updates",
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Reload",
					onClick: () => {
						window.location.reload()
					},
				},
				cancel: {
					label: "Dismiss",
					onClick: () => {},
				},
			})
		}
	}, [versionState])

	return null
}
