import { Atom } from "@effect-atom/atom-react"
import type { ChannelId, MessageId } from "@hazel/db/schema"

/**
 * Per-channel reply state using Atom.family
 * Each channel gets its own isolated reply state
 */
export const replyToMessageAtomFamily = Atom.family((_channelId: ChannelId) =>
	Atom.make<MessageId | null>(null).pipe(Atom.keepAlive),
)

/**
 * Global active thread channel ID
 * Threads are app-wide, not per-channel
 */
export const activeThreadChannelIdAtom = Atom.make<ChannelId | null>(null).pipe(Atom.keepAlive)

/**
 * Global active thread message ID
 * Tracks which message the thread is for
 */
export const activeThreadMessageIdAtom = Atom.make<MessageId | null>(null).pipe(Atom.keepAlive)

/**
 * Per-channel scroll state tracking
 * Tracks whether the user is currently at the bottom of the scroll container
 * Managed by the useScrollToBottom hook via IntersectionObserver
 */
export const isAtBottomAtomFamily = Atom.family((_channelId: ChannelId) =>
	Atom.make<boolean>(true).pipe(Atom.keepAlive),
)
