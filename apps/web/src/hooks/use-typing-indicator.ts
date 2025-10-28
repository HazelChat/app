import { useAtomSet } from "@effect-atom/atom-react"
import { Exit } from "effect"
import type { ChannelId, ChannelMemberId, TypingIndicatorId } from "@hazel/db/schema"
import { useCallback, useRef } from "react"
import {
	deleteTypingIndicatorMutation,
	upsertTypingIndicatorMutation,
} from "~/atoms/typing-indicator-atom"

interface UseTypingIndicatorOptions {
	channelId: ChannelId
	memberId: ChannelMemberId | null | undefined
	/**
	 * Debounce delay in milliseconds
	 * @default 2000
	 */
	debounceMs?: number
}

/**
 * Hook for managing typing indicators with Effect Atom patterns
 */
export function useTypingIndicator({
	channelId,
	memberId,
	debounceMs = 2000,
}: UseTypingIndicatorOptions) {
	const upsertTypingIndicator = useAtomSet(upsertTypingIndicatorMutation, {
		mode: "promiseExit",
	})

	const deleteTypingIndicator = useAtomSet(deleteTypingIndicatorMutation, {
		mode: "promiseExit",
	})

	// Track last typing timestamp and debounce timer
	const lastTypedRef = useRef<number>(0)
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
	const typingIndicatorIdRef = useRef<string | null>(null)

	// Start typing indicator with debouncing to prevent excessive RPC calls
	const startTyping = useCallback(async () => {
		if (!memberId) return

		const now = Date.now()
		const timeSinceLastTyped = now - lastTypedRef.current

		// Debounce: only send update if enough time has passed
		if (timeSinceLastTyped < debounceMs) {
			return
		}

		lastTypedRef.current = now

		const result = await upsertTypingIndicator({
			payload: {
				channelId,
				memberId,
				lastTyped: now,
			},
		})

		if (Exit.isSuccess(result)) {
			// Store the indicator ID for potential cleanup
			typingIndicatorIdRef.current = result.value.data.id
		} else {
			// Silent failure - just log to console
			console.error("Failed to create typing indicator:", Exit.match(result, {
				onFailure: (cause) => cause,
				onSuccess: () => null,
			}))
		}
	}, [channelId, memberId, debounceMs, upsertTypingIndicator])

	// Stop typing indicator and clean up
	const stopTyping = useCallback(async () => {
		if (!typingIndicatorIdRef.current) return

		const result = await deleteTypingIndicator({
			payload: {
				id: typingIndicatorIdRef.current as TypingIndicatorId,
			},
		})

		if (Exit.isSuccess(result)) {
			typingIndicatorIdRef.current = null
			lastTypedRef.current = 0
		} else {
			console.error("Failed to delete typing indicator:", Exit.match(result, {
				onFailure: (cause) => cause,
				onSuccess: () => null,
			}))
		}

		// Clear any pending debounce timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
			debounceTimerRef.current = null
		}
	}, [deleteTypingIndicator])

	return {
		startTyping,
		stopTyping,
	}
}
