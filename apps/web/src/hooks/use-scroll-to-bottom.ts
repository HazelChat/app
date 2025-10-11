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
	 * Threshold in pixels to consider "at bottom"
	 * @default 50
	 */
	threshold?: number
}

interface UseScrollToBottomReturn {
	scrollContainerRef: React.RefObject<HTMLDivElement | null>
	isAtBottom: boolean
	scrollToBottom: (smooth?: boolean) => void
}

/**
 * A robust hook for managing scroll-to-bottom behavior in a scrollable container.
 *
 * Features:
 * - Manual scroll tracking with debouncing for accurate position detection
 * - Synchronous bottom checks before scrolling (no stale state)
 * - Double RAF retry logic for DOM settling after content changes
 * - ResizeObserver for handling dynamic content (images, embeds)
 * - Auto-scroll when new messages arrive if already at bottom
 * - Per-channel state management via Effect Atoms
 *
 * @example
 * ```tsx
 * const { scrollContainerRef, isAtBottom } = useScrollToBottom({
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
	threshold = 50,
}: UseScrollToBottomOptions): UseScrollToBottomReturn {
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const isFirstRender = useRef(true)
	const previousMessageCountRef = useRef(messages.length)
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const isScrollingRef = useRef(false)

	// Get/set atom state for per-channel scroll position tracking
	const isAtBottom = useAtomValue(isAtBottomAtomFamily(channelId))
	const setIsAtBottom = useAtomSet(isAtBottomAtomFamily(channelId))

	/**
	 * Check if user is at bottom of scroll container
	 * This is a synchronous check that can be used immediately
	 */
	const checkIfAtBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return false

		const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
		return distanceFromBottom <= threshold
	}, [threshold])

	/**
	 * Handle scroll events with debouncing to track user position
	 */
	const handleScroll = useCallback(() => {
		if (isScrollingRef.current) return

		// Clear any pending timeout
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current)
		}

		// Debounce the state update
		scrollTimeoutRef.current = setTimeout(() => {
			const atBottom = checkIfAtBottom()
			setIsAtBottom(atBottom)
		}, 100)
	}, [checkIfAtBottom, setIsAtBottom])

	/**
	 * Scroll to bottom with aggressive retry logic
	 * Uses double RAF to ensure DOM has fully updated
	 */
	const scrollToBottom = useCallback(
		(smooth = false) => {
			const container = scrollContainerRef.current
			if (!container || !enabled) return

			isScrollingRef.current = true

			const performScroll = () => {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: smooth ? "smooth" : "auto",
				})
			}

			// Double RAF for better DOM settling
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					performScroll()

					// Wait a bit then verify and retry if needed
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							const stillNotAtBottom = !checkIfAtBottom()
							if (stillNotAtBottom) {
								performScroll()
							}

							// Update state and reset scrolling flag
							setIsAtBottom(true)
							isScrollingRef.current = false
						})
					})
				})
			})
		},
		[enabled, checkIfAtBottom, setIsAtBottom],
	)

	// Attach scroll event listener
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || !enabled) return

		container.addEventListener("scroll", handleScroll, { passive: true })

		return () => {
			container.removeEventListener("scroll", handleScroll)
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
		}
	}, [handleScroll, enabled])

	// Auto-scroll to bottom on initial mount/load
	useEffect(() => {
		if (isFirstRender.current && messages.length > 0 && enabled) {
			isFirstRender.current = false
			// Use timeout to ensure DOM has fully rendered
			setTimeout(() => {
				scrollToBottom()
			}, 100)
		}
	}, [messages.length, scrollToBottom, enabled])

	// Auto-scroll when new messages arrive IF user is at bottom
	useEffect(() => {
		const messageCountIncreased = messages.length > previousMessageCountRef.current
		previousMessageCountRef.current = messages.length

		if (messageCountIncreased && enabled) {
			// ALWAYS do a synchronous check - don't trust the atom state alone
			// The state might be stale due to async updates
			const actuallyAtBottom = checkIfAtBottom()

			if (actuallyAtBottom || isAtBottom) {
				scrollToBottom()
			}
		}
	}, [messages.length, isAtBottom, checkIfAtBottom, scrollToBottom, enabled])

	// Handle container resize - stay at bottom if already there
	// This catches images loading, embeds expanding, etc.
	const handleResize = useCallback(() => {
		if (!enabled) return

		// Do synchronous check to avoid stale state
		const actuallyAtBottom = checkIfAtBottom()

		if (actuallyAtBottom || isAtBottom) {
			scrollToBottom()
		}
	}, [checkIfAtBottom, isAtBottom, scrollToBottom, enabled])

	useResizeObserver({
		ref: scrollContainerRef,
		onResize: handleResize,
	})

	return {
		scrollContainerRef,
		isAtBottom,
		scrollToBottom,
	}
}
