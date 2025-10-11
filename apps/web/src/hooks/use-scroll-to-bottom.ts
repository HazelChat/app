import { useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import type { ChannelId } from "@hazel/db/schema"
import { useCallback, useEffect, useRef } from "react"
import { isAtBottomAtomFamily } from "~/atoms/chat-atoms"
import { useResizeObserver } from "./use-resize-observer"

interface UseScrollToBottomOptions {
	channelId: ChannelId
	enabled?: boolean
	/**
	 * Array of messages to track changes
	 */
	messages: any[]
	/**
	 * Threshold in pixels to consider "at bottom" (distance from bottom)
	 * Larger = more aggressive sticking
	 * @default 200
	 */
	threshold?: number
}

interface UseScrollToBottomReturn {
	scrollContainerRef: React.RefObject<HTMLDivElement | null>
	isAtBottom: boolean
	scrollToBottom: (smooth?: boolean) => void
}

/**
 * ULTRA AGGRESSIVE scroll-to-bottom hook.
 *
 * Philosophy: Stay glued to the bottom unless user EXPLICITLY scrolls up significantly.
 *
 * Features:
 * - Tracks "intentional scroll up" (user must scroll >threshold away to stop auto-scroll)
 * - MutationObserver to catch ALL DOM changes
 * - Continuous retry loop (500ms of attempts after each change)
 * - 8x RAF chaining for maximum DOM settling time
 * - Large 200px threshold for forgiving "at bottom" detection
 * - Instant scroll state updates (no debouncing)
 * - Scrolls on EVERY message change unless user has scrolled away
 *
 * @example
 * ```tsx
 * const { scrollContainerRef } = useScrollToBottom({
 *   channelId,
 *   messages,
 * })
 *
 * return (
 *   <div ref={scrollContainerRef}>
 *     {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *   </div>
 * )
 * ```
 */
export function useScrollToBottom({
	channelId,
	enabled = true,
	messages,
	threshold = 200,
}: UseScrollToBottomOptions): UseScrollToBottomReturn {
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const isFirstRender = useRef(true)
	const isScrollingProgrammaticallyRef = useRef(false)
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const mutationObserverRef = useRef<MutationObserver | null>(null)

	// Get/set atom state for per-channel scroll position tracking
	const isAtBottom = useAtomValue(isAtBottomAtomFamily(channelId))
	const setIsAtBottom = useAtomSet(isAtBottomAtomFamily(channelId))

	/**
	 * Check if user is at bottom of scroll container (within threshold)
	 */
	const checkIfAtBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return false

		const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
		return distanceFromBottom <= threshold
	}, [threshold])

	/**
	 * Check if user has intentionally scrolled away from bottom
	 * Only returns true if they're SIGNIFICANTLY far from bottom
	 */
	const hasUserScrolledAway = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return false

		const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
		// User must be MORE than threshold away to be considered "scrolled away"
		return distanceFromBottom > threshold
	}, [threshold])

	/**
	 * ULTRA AGGRESSIVE scroll to bottom with continuous retries
	 * Uses 8x RAF chaining and keeps retrying for 500ms
	 */
	const scrollToBottom = useCallback(
		(smooth = false) => {
			const container = scrollContainerRef.current
			if (!container || !enabled) return

			// Clear any pending retries
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current)
			}

			isScrollingProgrammaticallyRef.current = true

			const performScroll = () => {
				if (!container) return
				container.scrollTo({
					top: container.scrollHeight,
					behavior: smooth ? "smooth" : "auto",
				})
			}

			let rafCount = 0
			const maxRafAttempts = 8

			const aggressiveScrollChain = () => {
				rafCount++
				requestAnimationFrame(() => {
					performScroll()

					if (rafCount < maxRafAttempts) {
						aggressiveScrollChain()
					} else {
						// After RAF chain completes, update state
						setIsAtBottom(true)
						isScrollingProgrammaticallyRef.current = false

						// CONTINUOUS RETRY: Keep trying to scroll for 500ms
						// This catches late-loading content
						const startTime = Date.now()
						const continuousRetry = () => {
							if (!container || !enabled) return

							const elapsed = Date.now() - startTime
							if (elapsed < 500) {
								// If we're not actually at bottom, try again
								const stillNotAtBottom = !checkIfAtBottom()
								if (stillNotAtBottom) {
									performScroll()
								}
								retryTimeoutRef.current = setTimeout(continuousRetry, 50)
							}
						}
						continuousRetry()
					}
				})
			}

			aggressiveScrollChain()
		},
		[enabled, checkIfAtBottom, setIsAtBottom],
	)

	/**
	 * Handle scroll events - update state immediately (no debouncing)
	 */
	const handleScroll = useCallback(() => {
		// Ignore if we're scrolling programmatically
		if (isScrollingProgrammaticallyRef.current) return

		const atBottom = checkIfAtBottom()
		setIsAtBottom(atBottom)
	}, [checkIfAtBottom, setIsAtBottom])

	// Attach scroll event listener
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || !enabled) return

		container.addEventListener("scroll", handleScroll, { passive: true })

		return () => {
			container.removeEventListener("scroll", handleScroll)
		}
	}, [handleScroll, enabled])

	// Auto-scroll to bottom on initial mount
	useEffect(() => {
		if (isFirstRender.current && messages.length > 0 && enabled) {
			isFirstRender.current = false
			setTimeout(() => {
				scrollToBottom()
			}, 100)
		}
	}, [messages.length, scrollToBottom, enabled])

	// AGGRESSIVE: Auto-scroll when messages change IF user hasn't scrolled away
	useEffect(() => {
		if (!enabled || messages.length === 0) return

		// Check if user has scrolled significantly away
		const userScrolledAway = hasUserScrolledAway()

		// If user HASN'T scrolled away, ALWAYS scroll to bottom
		if (!userScrolledAway) {
			scrollToBottom()
		}
	}, [messages, hasUserScrolledAway, scrollToBottom, enabled])

	// Handle container resize - scroll if at bottom
	const handleResize = useCallback(() => {
		if (!enabled) return

		const userScrolledAway = hasUserScrolledAway()
		if (!userScrolledAway) {
			scrollToBottom()
		}
	}, [hasUserScrolledAway, scrollToBottom, enabled])

	useResizeObserver({
		ref: scrollContainerRef,
		onResize: handleResize,
	})

	// MutationObserver: Watch for ANY DOM changes and scroll if at bottom
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || !enabled) return

		// Clean up existing observer
		if (mutationObserverRef.current) {
			mutationObserverRef.current.disconnect()
		}

		// Create new observer
		mutationObserverRef.current = new MutationObserver(() => {
			const userScrolledAway = hasUserScrolledAway()
			if (!userScrolledAway) {
				// Use RAF to avoid excessive scrolling during rapid mutations
				requestAnimationFrame(() => {
					scrollToBottom()
				})
			}
		})

		// Observe all changes to container and its children
		mutationObserverRef.current.observe(container, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		})

		return () => {
			if (mutationObserverRef.current) {
				mutationObserverRef.current.disconnect()
			}
		}
	}, [enabled, hasUserScrolledAway, scrollToBottom])

	// Cleanup
	useEffect(() => {
		return () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current)
			}
		}
	}, [])

	return {
		scrollContainerRef,
		isAtBottom,
		scrollToBottom,
	}
}
