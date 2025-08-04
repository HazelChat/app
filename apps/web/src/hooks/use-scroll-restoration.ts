import { useCallback, useRef } from "react"

interface ScrollState {
	height: number
	top: number
	distanceFromBottom: number
}

export function useScrollRestoration() {
	const savedStateRef = useRef<ScrollState | null>(null)

	const saveScrollState = useCallback((container: HTMLElement) => {
		savedStateRef.current = {
			height: container.scrollHeight,
			top: container.scrollTop,
			distanceFromBottom: container.scrollHeight - container.scrollTop - container.clientHeight,
		}
	}, [])

	const restoreScrollPosition = useCallback((container: HTMLElement, direction: "top" | "bottom") => {
		if (!savedStateRef.current) return

		const { height: prevHeight, top: prevTop, distanceFromBottom } = savedStateRef.current
		const newHeight = container.scrollHeight
		const heightDiff = newHeight - prevHeight

		if (heightDiff === 0) return

		if (direction === "top") {
			// Restore position after loading older messages
			container.scrollTop = prevTop + heightDiff
		} else {
			// Restore position after loading newer messages
			// Maintain the same distance from bottom
			container.scrollTop = newHeight - distanceFromBottom - container.clientHeight
		}

		// Clear saved state after restoration
		savedStateRef.current = null
	}, [])

	const clearSavedState = useCallback(() => {
		savedStateRef.current = null
	}, [])

	return {
		saveScrollState,
		restoreScrollPosition,
		clearSavedState,
		hasSavedState: () => savedStateRef.current !== null,
	}
}

