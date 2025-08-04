import { useCallback, useRef, useState } from "react"

type LoadingState = "idle" | "loading-top" | "loading-bottom" | "cooldown"

interface UseLoadingStateReturn {
	canLoadTop: boolean
	canLoadBottom: boolean
	startLoadingTop: () => boolean
	startLoadingBottom: () => boolean
	finishLoading: () => void
	isLoading: boolean
	loadingState: LoadingState
}

const COOLDOWN_MS = 300

export function useLoadingState(): UseLoadingStateReturn {
	const [loadingState, setLoadingState] = useState<LoadingState>("idle")
	const cooldownTimeoutRef = useRef<NodeJS.Timeout | undefined>()

	const canLoadTop = loadingState === "idle"
	const canLoadBottom = loadingState === "idle"
	const isLoading = loadingState === "loading-top" || loadingState === "loading-bottom"

	const startLoadingTop = useCallback(() => {
		if (loadingState !== "idle") return false
		setLoadingState("loading-top")
		return true
	}, [loadingState])

	const startLoadingBottom = useCallback(() => {
		if (loadingState !== "idle") return false
		setLoadingState("loading-bottom")
		return true
	}, [loadingState])

	const finishLoading = useCallback(() => {
		setLoadingState("cooldown")
		clearTimeout(cooldownTimeoutRef.current)
		cooldownTimeoutRef.current = setTimeout(() => {
			setLoadingState("idle")
		}, COOLDOWN_MS)
	}, [])

	return {
		canLoadTop,
		canLoadBottom,
		startLoadingTop,
		startLoadingBottom,
		finishLoading,
		isLoading,
		loadingState,
	}
}

