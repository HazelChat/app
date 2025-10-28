import { Atom, Result, useAtomMount, useAtomValue } from "@effect-atom/atom-react"
import type { ChannelId, UserId } from "@hazel/db/schema"
import { makeQuery } from "@hazel/tanstack-db-atom"
import { eq } from "@tanstack/db"
import { DateTime, Duration, Effect, Schedule, Stream } from "effect"
import { useCallback, useEffect, useRef } from "react"
import { userPresenceStatusCollection } from "~/db/collections"
import { userAtom } from "~/lib/auth"
import { RpcClient } from "~/lib/services/common/rpc-client"
import { runtime } from "~/lib/services/common/runtime"
import { router } from "~/main"

type PresenceStatus = "online" | "away" | "busy" | "dnd" | "offline"

const AFK_TIMEOUT = Duration.minutes(5)


/**
 * Atom that tracks the last user activity timestamp
 * Updates on mousemove, keydown, scroll, click, touchstart
 */
const lastActivityAtom = Atom.make((get) => {
	let lastActivity = DateTime.unsafeMake(new Date())

	const handleActivity = () => {
		lastActivity = DateTime.unsafeMake(new Date())
		get.setSelf(lastActivity)
	}

	const events = ["mousemove", "keydown", "scroll", "click", "touchstart"]
	events.forEach((event) => {
		window.addEventListener(event, handleActivity, { passive: true })
	})

	get.addFinalizer(() => {
		events.forEach((event) => {
			window.removeEventListener(event, handleActivity)
		})
	})

	return lastActivity
}).pipe(Atom.keepAlive)

/**
 * Atom for manual status updates
 * Stores the user's manually set status and custom message
 */
interface ManualStatus {
	status: PresenceStatus | null
	customMessage: string | null
	previousStatus: PresenceStatus
}

const manualStatusAtom = Atom.make<ManualStatus>({
	status: null,
	customMessage: null,
	previousStatus: "online",
}).pipe(Atom.keepAlive)

/**
 * Derived atom that determines if the user is AFK
 * Uses a Stream that checks every 10 seconds if activity timeout has been exceeded
 */
const afkStateAtom = Atom.make((get) =>
	Stream.fromSchedule(Schedule.spaced(Duration.seconds(10))).pipe(
		Stream.map(() => {
			const lastActivity = get(lastActivityAtom)
			const manualStatus = get(manualStatusAtom)
			const now = DateTime.unsafeMake(new Date())
			const timeSinceActivity = DateTime.distance(lastActivity, now)

			const isAFK =
				Duration.greaterThanOrEqualTo(timeSinceActivity, AFK_TIMEOUT) &&
				manualStatus.status !== "away"

			return {
				isAFK,
				timeSinceActivity,
				shouldMarkAway: isAFK && manualStatus.status !== "busy" && manualStatus.status !== "dnd",
			}
		}),
	),
).pipe(Atom.keepAlive)

/**
 * Derived atom that computes the final presence status
 * Combines manual status and AFK detection
 * Note: Offline status is only set on tab close or via server-side heartbeat timeout
 */
const computedPresenceStatusAtom = Atom.make((get) =>
	Effect.gen(function* () {
		const manualStatus = get(manualStatusAtom)
		const afkState = yield* get.result(afkStateAtom)

		// Manual status takes precedence
		if (manualStatus.status !== null) {
			return manualStatus.status
		}

		// Mark as away if AFK (works even when window is hidden)
		if (afkState.shouldMarkAway) {
			return "away" as PresenceStatus
		}

		// Default to online
		return "online" as PresenceStatus
	}),
)

/**
 * Atom that tracks the current route's channel ID
 */
const currentChannelIdAtom = Atom.make((get) => {
	let currentChannelId: string | null = null

	const unsubscribe = router.subscribe("onResolved", (event) => {
		// Extract channel ID from pathname
		const paramsId = event.toLocation.pathname.split("/").pop()
		const channelId = paramsId && paramsId.length > 0 ? paramsId : null

		if (channelId !== currentChannelId) {
			currentChannelId = channelId
			get.setSelf(channelId)
		}
	})

	get.addFinalizer(unsubscribe)

	// Get initial value from current route
	const pathSegments = router.state.location.pathname.split("/")
	currentChannelId = pathSegments[pathSegments.length - 1] || null
	return currentChannelId
}).pipe(Atom.keepAlive)

/**
 * Atom that manages the beforeunload event listener
 * Reads from userAtom and sends beacon to mark user offline when tab closes
 * Automatically reactive to user changes
 */
const beforeUnloadAtom = Atom.make((get) => {
	const user = get(userAtom)

	// Skip setup if no user
	if (!user?.id) return null

	const handleBeforeUnload = () => {
		// Use sendBeacon for reliable delivery even as page unloads
		const url = `${import.meta.env.VITE_BACKEND_URL}/presence/offline`
		const blob = new Blob([JSON.stringify({ userId: user.id })], { type: "application/json" })
		navigator.sendBeacon(url, blob)
	}

	window.addEventListener("beforeunload", handleBeforeUnload)

	get.addFinalizer(() => {
		window.removeEventListener("beforeunload", handleBeforeUnload)
	})

	return user.id
})

/**
 * Atom family that queries the current user's presence status from TanStack DB
 * Returns Result<PresenceData[]> that automatically updates when data changes
 */
const currentUserPresenceAtomFamily = Atom.family((userId: UserId) =>
	makeQuery((q) =>
		q
			.from({ presence: userPresenceStatusCollection })
			.where(({ presence }) => eq(presence.userId, userId))
			.orderBy(({ presence }) => presence.updatedAt, "desc")
			.limit(1),
	),
)

/**
 * Atom that automatically queries presence for the current user
 * Reads from userAtom and returns the presence data
 */
const currentUserPresenceAtom = Atom.make((get) => {
	const user = get(userAtom)
	if (!user?.id) return Result.initial(false)

	return get(currentUserPresenceAtomFamily(user.id))
})


/**
 * Hook for managing the current user's presence status
 */
export function usePresence() {
	const user = useAtomValue(userAtom)
	const presenceResult = useAtomValue(currentUserPresenceAtom)
	const presenceData = Result.getOrElse(presenceResult, () => [])
	const currentPresence = presenceData?.[0]
	const computedStatusResult = useAtomValue(computedPresenceStatusAtom)
	const computedStatus = Result.getOrElse(computedStatusResult, () => "online" as PresenceStatus)
	const afkStateResult = useAtomValue(afkStateAtom)
	const afkState = Result.getOrElse(afkStateResult, () => ({
		isAFK: false,
		timeSinceActivity: 0,
		shouldMarkAway: false,
	}))

	const currentChannelId = useAtomValue(currentChannelIdAtom)

	const lastSentStatusRef = useRef<PresenceStatus | null>(null)
	const lastSentChannelRef = useRef<string | null>(null)

	useEffect(() => {
		if (!user?.id) return
		if (lastSentStatusRef.current === computedStatus) return

		lastSentStatusRef.current = computedStatus

		const program = Effect.gen(function* () {
			const client = yield* RpcClient
			yield* client.userPresenceStatus.update({
				status: computedStatus,
			})
		})

		runtime.runPromise(program).catch(console.error)
	}, [computedStatus, user?.id])

	useEffect(() => {
		if (!user?.id) return
		if (lastSentChannelRef.current === currentChannelId) return

		lastSentChannelRef.current = currentChannelId

		const program = Effect.gen(function* () {
			const client = yield* RpcClient
			yield* client.userPresenceStatus.update({
				activeChannelId: currentChannelId ? (currentChannelId as ChannelId) : null,
			})
		})

		runtime.runPromise(program).catch(console.error)
	}, [currentChannelId, user?.id])

	useAtomMount(beforeUnloadAtom)

	const previousManualStatusRef = useRef<PresenceStatus>("online")

	const setStatus = useCallback(
		async (status: PresenceStatus, customMessage?: string) => {
			if (!user?.id) return

			Atom.batch(() => {
				Atom.set(manualStatusAtom, {
					status,
					customMessage: customMessage ?? null,
					previousStatus: previousManualStatusRef.current,
				})
			})

			previousManualStatusRef.current = status

			const program = Effect.gen(function* () {
				const client = yield* RpcClient
				yield* client.userPresenceStatus.update({
					status,
					customMessage: customMessage ?? null,
				})
			})

			await runtime.runPromise(program).catch(console.error)
		},
		[user?.id],
	)

	return {
		status: currentPresence?.status ?? computedStatus,
		isAFK: afkState.isAFK,
		setStatus,
		activeChannelId: currentPresence?.activeChannelId,
		customMessage: currentPresence?.customMessage,
	}
}

/**
 * Hook to get another user's presence
 */
export function useUserPresence(userId: UserId) {
	const presenceResult = useAtomValue(currentUserPresenceAtomFamily(userId))
	const presenceData = Result.getOrElse(presenceResult, () => [])
	const presence = presenceData?.[0]

	return {
		status: presence?.status ?? ("offline" as const),
		isOnline:
			presence?.status === "online" ||
			presence?.status === "busy" ||
			presence?.status === "dnd" ||
			presence?.status === "away",
		activeChannelId: presence?.activeChannelId,
		customMessage: presence?.customMessage,
		lastUpdated: presence?.updatedAt,
	}
}
