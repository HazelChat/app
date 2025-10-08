import { UserId, UserPresenceStatusId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { userPresenceStatusCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"

type PresenceStatus = "online" | "away" | "busy" | "dnd" | "offline"

const AFK_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const OFFLINE_TIMEOUT = 2 * 60 * 1000 // 2 minutes (when window is hidden)
const UPDATE_INTERVAL = 30 * 1000 // 30 seconds

export function usePresence() {
	const { user } = useAuth()
	const params = useParams({ strict: false })
	const [status, setStatus] = useState<PresenceStatus>("online")
	const [isAFK, setIsAFK] = useState(false)
	const lastActivityRef = useRef(Date.now())
	const windowHiddenSinceRef = useRef<number | null>(null)
	const afkTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
	const updateIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
	const offlineTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
	const previousStatusRef = useRef<PresenceStatus>("online")

	// Get user's presence status from DB
	const { data: presenceData } = useLiveQuery(
		(q) =>
			user?.id
				? q
						.from({ presence: userPresenceStatusCollection })
						.where(({ presence }) => eq(presence.userId, UserId.make(user.id)))
						.orderBy(({ presence }) => presence.updatedAt, "desc")
						.limit(1)
				: undefined,
		[user?.id],
	)

	const currentPresence = presenceData?.[0]

	// Update or create presence status in DB
	const updatePresenceStatus = useCallback(
		(newStatus: PresenceStatus) => {
			if (!user?.id) return

			if (currentPresence?.id) {
				// Update existing
				userPresenceStatusCollection.update(currentPresence.id, (draft) => {
					draft.status = newStatus
					draft.updatedAt = new Date()
				})
			} else {
				// Insert new
				userPresenceStatusCollection.insert({
					id: UserPresenceStatusId.make(crypto.randomUUID()),
					userId: UserId.make(user.id),
					status: newStatus,
					customMessage: null,
					activeChannelId: null,
					updatedAt: new Date(),
				})
			}
		},
		[user?.id, currentPresence?.id],
	)

	// Track user activity
	const handleActivity = useCallback(() => {
		lastActivityRef.current = Date.now()

		// If user was AFK, restore their previous status
		if (isAFK) {
			setIsAFK(false)
			setStatus(previousStatusRef.current)
			updatePresenceStatus(previousStatusRef.current)
		}
	}, [isAFK, updatePresenceStatus])

	// Update active channel
	const updateActiveChannel = useCallback(
		(channelId: string | null) => {
			if (!user?.id) return

			if (currentPresence?.id) {
				userPresenceStatusCollection.update(currentPresence.id, (draft) => {
					draft.activeChannelId = channelId as any
					draft.updatedAt = new Date()
				})
			} else {
				// Insert new with active channel
				userPresenceStatusCollection.insert({
					id: UserPresenceStatusId.make(crypto.randomUUID()),
					userId: UserId.make(user.id),
					status: "online",
					customMessage: null,
					activeChannelId: channelId as any,
					updatedAt: new Date(),
				})
			}
		},
		[user?.id, currentPresence?.id],
	)

	// Manually set status (for status picker UI)
	const setPresenceStatus = useCallback(
		(newStatus: PresenceStatus, customMessage?: string) => {
			if (!user?.id) return

			setStatus(newStatus)
			previousStatusRef.current = newStatus

			if (currentPresence?.id) {
				userPresenceStatusCollection.update(currentPresence.id, (draft) => {
					draft.status = newStatus
					draft.customMessage = customMessage ?? null
					draft.updatedAt = new Date()
				})
			} else {
				// Insert new with custom message
				userPresenceStatusCollection.insert({
					id: UserPresenceStatusId.make(crypto.randomUUID()),
					userId: UserId.make(user.id),
					status: newStatus,
					customMessage: customMessage ?? null,
					activeChannelId: null,
					updatedAt: new Date(),
				})
			}
		},
		[user?.id, currentPresence?.id],
	)

	// Check for AFK
	useEffect(() => {
		const checkAFK = () => {
			const timeSinceActivity = Date.now() - lastActivityRef.current

			if (timeSinceActivity >= AFK_TIMEOUT && !isAFK && status !== "away") {
				setIsAFK(true)
				previousStatusRef.current = status
				setStatus("away")
				updatePresenceStatus("away")
			}
		}

		afkTimerRef.current = setInterval(checkAFK, 10000) // Check every 10 seconds

		return () => {
			if (afkTimerRef.current) {
				clearInterval(afkTimerRef.current)
			}
		}
	}, [isAFK, status, updatePresenceStatus])

	// Track activity events
	useEffect(() => {
		const events = ["mousemove", "keydown", "scroll", "click", "touchstart"]

		events.forEach((event) => {
			window.addEventListener(event, handleActivity, { passive: true })
		})

		return () => {
			events.forEach((event) => {
				window.removeEventListener(event, handleActivity)
			})
		}
	}, [handleActivity])

	// Update active channel when route changes
	useEffect(() => {
		const channelId = params.id as string | undefined
		updateActiveChannel(channelId ?? null)
	}, [params.id, updateActiveChannel])

	// Periodic status update (heartbeat)
	useEffect(() => {
		if (!user?.id || !currentPresence?.id) return

		updateIntervalRef.current = setInterval(() => {
			// Just update the timestamp to keep presence fresh
			userPresenceStatusCollection.update(currentPresence.id, (draft) => {
				draft.updatedAt = new Date()
			})
		}, UPDATE_INTERVAL)

		return () => {
			if (updateIntervalRef.current) {
				clearInterval(updateIntervalRef.current)
			}
		}
	}, [user?.id, currentPresence?.id])

	// Handle window visibility (pause updates when hidden, mark offline after timeout)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.hidden) {
				// Window is hidden - start offline timer
				windowHiddenSinceRef.current = Date.now()

				// Stop heartbeat updates
				if (updateIntervalRef.current) {
					clearInterval(updateIntervalRef.current)
					updateIntervalRef.current = undefined
				}

				// Set timer to mark as offline after 15 minutes
				offlineTimerRef.current = setTimeout(() => {
					// Only mark as offline if user didn't manually set busy/dnd
					if (status !== "busy" && status !== "dnd") {
						previousStatusRef.current = status
						setStatus("offline")
						updatePresenceStatus("offline")
					}
				}, OFFLINE_TIMEOUT)
			} else {
				// Window is visible again
				windowHiddenSinceRef.current = null

				// Clear offline timer
				if (offlineTimerRef.current) {
					clearTimeout(offlineTimerRef.current)
					offlineTimerRef.current = undefined
				}

				// If user was marked offline due to window being hidden, restore previous status
				if (status === "offline") {
					setStatus(previousStatusRef.current)
					updatePresenceStatus(previousStatusRef.current)
				}

				// Resume activity tracking and heartbeat
				handleActivity()
				if (user?.id && currentPresence?.id && !updateIntervalRef.current) {
					updateIntervalRef.current = setInterval(() => {
						userPresenceStatusCollection.update(currentPresence.id, (draft) => {
							draft.updatedAt = new Date()
						})
					}, UPDATE_INTERVAL)
				}
			}
		}

		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			if (offlineTimerRef.current) {
				clearTimeout(offlineTimerRef.current)
			}
		}
	}, [user?.id, currentPresence?.id, handleActivity, status, updatePresenceStatus])

	return {
		status: currentPresence?.status ?? status,
		isAFK,
		setStatus: setPresenceStatus,
		activeChannelId: currentPresence?.activeChannelId,
		customMessage: currentPresence?.customMessage,
	}
}

// Hook to get another user's presence
export function useUserPresence(userId: string) {
	const { data: presenceData } = useLiveQuery(
		(q) =>
			q
				.from({ presence: userPresenceStatusCollection })
				.where(({ presence }) => eq(presence.userId, UserId.make(userId)))
				.orderBy(({ presence }) => presence.updatedAt, "desc")
				.limit(1),
		[userId],
	)

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
