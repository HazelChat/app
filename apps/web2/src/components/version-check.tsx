import { Atom, Result, useAtomMount } from "@effect-atom/atom-react"
import { toast } from "sonner"
import { versionCheckAtom } from "~/atoms/version-atom"

/**
 * Atom that applies the version update toast as a side effect
 * Reads from versionCheckAtom and shows toast when update is available
 */
const applyVersionToastAtom = Atom.make((get) => {
	const versionStateResult = get(versionCheckAtom)
	const versionState = Result.getOrElse(versionStateResult, () => null)

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
})

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
	// useAtomMount activates the toast atom without subscribing to it
	useAtomMount(applyVersionToastAtom)

	return null
}
