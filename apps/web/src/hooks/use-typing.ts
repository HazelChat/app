import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, ChannelMemberId, TypingIndicatorId } from "@hazel/db/schema"
import { Exit } from "effect"
import { useCallback, useEffect, useRef, useState } from "react"
import { deleteTypingIndicatorMutation, upsertTypingIndicatorMutation } from "~/atoms/typing-indicator-atom"

interface UseTypingOptions {
	channelId: ChannelId
	memberId: ChannelMemberId | null
	onTypingStart?: () => void
	onTypingStop?: () => void
	debounceDelay?: number
	typingTimeout?: number
}

interface UseTypingResult {
	isTyping: boolean
	startTyping: () => void
	stopTyping: () => void
	handleContentChange: (content: string) => void
}

export function useTyping({
	channelId,
	memberId,
	onTypingStart,
	onTypingStop,
	debounceDelay = 500,
	typingTimeout = 3000,
}: UseTypingOptions): UseTypingResult {
	const [isTyping, setIsTyping] = useState(false)
	const lastContentRef = useRef("")
	const lastTypedRef = useRef<number>(0)
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const typingIndicatorIdRef = useRef<string | null>(null)

	// Use Effect Atom mutations with proper mode
	const upsertTypingIndicator = useAtomSet(upsertTypingIndicatorMutation, {
		mode: "promiseExit",
	})

	const deleteTypingIndicator = useAtomSet(deleteTypingIndicatorMutation, {
		mode: "promiseExit",
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const startTyping = useCallback(async () => {
		if (!memberId) return

		const now = Date.now()
		const timeSinceLastTyped = now - lastTypedRef.current

		// Clear existing timers
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}

		// Update local state
		if (!isTyping) {
			setIsTyping(true)
			onTypingStart?.()
		}

		// Debounce the server update
		debounceTimerRef.current = setTimeout(async () => {
			// Only send update if enough time has passed
			if (timeSinceLastTyped >= debounceDelay) {
				lastTypedRef.current = now

				const result = await upsertTypingIndicator({
					payload: {
						channelId,
						memberId,
						lastTyped: now,
					},
				})

				if (Exit.isSuccess(result)) {
					typingIndicatorIdRef.current = result.value.data.id
				} else {
					console.error(
						"Failed to create typing indicator:",
						Exit.match(result, {
							onFailure: (cause) => cause,
							onSuccess: () => null,
						}),
					)
				}
			}
		}, debounceDelay)

		// Set timeout to automatically stop typing
		typingTimeoutRef.current = setTimeout(() => {
			stopTyping()
		}, typingTimeout)
	}, [channelId, memberId, debounceDelay, typingTimeout, isTyping, onTypingStart, upsertTypingIndicator])

	const stopTyping = useCallback(async () => {
		// Clear all timers
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
			debounceTimerRef.current = null
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
			typingTimeoutRef.current = null
		}

		// Update local state
		if (isTyping) {
			setIsTyping(false)
			onTypingStop?.()
		}

		// Delete typing indicator from server if it exists
		if (typingIndicatorIdRef.current) {
			const result = await deleteTypingIndicator({
				payload: {
					id: typingIndicatorIdRef.current as TypingIndicatorId,
				},
			})

			if (Exit.isSuccess(result)) {
				typingIndicatorIdRef.current = null
				lastTypedRef.current = 0
			} else {
				console.error(
					"Failed to delete typing indicator:",
					Exit.match(result, {
						onFailure: (cause) => cause,
						onSuccess: () => null,
					}),
				)
			}
		}
	}, [isTyping, onTypingStop, deleteTypingIndicator])

	const handleContentChange = useCallback(
		(content: string) => {
			const wasEmpty = lastContentRef.current === ""
			const isEmpty = content === ""

			lastContentRef.current = content

			if (isEmpty && !wasEmpty) {
				// Content was cleared
				stopTyping()
			} else if (!isEmpty && wasEmpty) {
				// Started typing from empty
				startTyping()
			} else if (!isEmpty) {
				// Still typing (content changed but not empty)
				startTyping() // This will reset the timeout
			}
		},
		[startTyping, stopTyping],
	)

	// Cleanup on unmount or when memberId changes
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}, [])

	return {
		isTyping,
		startTyping,
		stopTyping,
		handleContentChange,
	}
}
