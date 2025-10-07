import { UserId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { userPresenceStatusCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"

type PresenceStatus = "online" | "away" | "busy" | "dnd"

const AFK_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const UPDATE_INTERVAL = 30 * 1000 // 30 seconds

export function usePresence() {
	const { user } = useAuth()
	const params = useParams({ strict: false })
	const [status, setStatus] = useState<PresenceStatus>("online")
	const [isAFK, setIsAFK] = useState(false)
	const lastActivityRef = useRef(Date.now())
	const afkTimerRef = useRef<NodeJS.Timeout>()
	const updateIntervalRef = useRef<NodeJS.Timeout>()
	const previousStatusRef = useRef<PresenceStatus>("online")

	// Get user's presence status from DB
	const { data: presenceData } = useLiveQuery(
		(q) =>
			user?.id
				? q
						.from({ presence: userPresenceStatusCollection })
						.where(({ presence }) => eq(presence.userId, UserId.make(user.id)))
						.limit(1)
				: undefined,
		[user?.id],
	)

	const currentPresence = presenceData?.[0]?.presence

	// Track user activity
	const handleActivity = useCallback(() => {
		lastActivityRef.current = Date.now()

		// If user was AFK, restore their previous status
		if (isAFK) {
			setIsAFK(false)
			setStatus(previousStatusRef.current)
			updatePresenceStatus(previousStatusRef.current)
		}
	}, [isAFK])

	// Update presence status in DB
	const updatePresenceStatus = useCallback(
		(newStatus: PresenceStatus) => {
			if (!user?.id) return

			userPresenceStatusCollection.update(currentPresence?.id ?? crypto.randomUUID(), () => ({
				userId: UserId.make(user.id),
				status: newStatus,
				customMessage: currentPresence?.customMessage ?? null,
				activeChannelId: currentPresence?.activeChannelId ?? null,
				updatedAt: new Date(),
			}))
		},
		[user?.id, currentPresence],
	)

	// Update active channel
	const updateActiveChannel = useCallback(
		(channelId: string | null) => {
			if (!user?.id) return

			userPresenceStatusCollection.update(currentPresence?.id ?? crypto.randomUUID(), (prev) => ({
				...prev,
				activeChannelId: channelId as any,
				updatedAt: new Date(),
			}))
		},
		[user?.id, currentPresence],
	)

	// Manually set status (for status picker UI)
	const setPresenceStatus = useCallback(
		(newStatus: PresenceStatus, customMessage?: string) => {
			if (!user?.id) return

			setStatus(newStatus)
			previousStatusRef.current = newStatus

			userPresenceStatusCollection.update(currentPresence?.id ?? crypto.randomUUID(), (prev) => ({
				...prev,
				status: newStatus,
				customMessage: customMessage ?? null,
				updatedAt: new Date(),
			}))
		},
		[user?.id, currentPresence],
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
		if (!user?.id) return

		updateIntervalRef.current = setInterval(() => {
			// Just update the timestamp to keep presence fresh
			if (currentPresence?.id) {
				userPresenceStatusCollection.update(currentPresence.id, (prev) => ({
					...prev,
					updatedAt: new Date(),
				}))
			}
		}, UPDATE_INTERVAL)

		return () => {
			if (updateIntervalRef.current) {
				clearInterval(updateIntervalRef.current)
			}
		}
	}, [user?.id, currentPresence?.id])

	// Handle window visibility (pause updates when hidden)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.hidden) {
				// Window is hidden, could reduce update frequency or mark as away
				if (updateIntervalRef.current) {
					clearInterval(updateIntervalRef.current)
				}
			} else {
				// Window is visible again, resume updates
				handleActivity()
				if (user?.id && !updateIntervalRef.current) {
					updateIntervalRef.current = setInterval(() => {
						if (currentPresence?.id) {
							userPresenceStatusCollection.update(currentPresence.id, (prev) => ({
								...prev,
								updatedAt: new Date(),
							}))
						}
					}, UPDATE_INTERVAL)
				}
			}
		}

		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}, [user?.id, currentPresence?.id, handleActivity])

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
				.limit(1),
		[userId],
	)

	const presence = presenceData?.[0]?.presence

	return {
		status: presence?.status ?? "offline",
		isOnline: presence?.status === "online" || presence?.status === "busy",
		activeChannelId: presence?.activeChannelId,
		customMessage: presence?.customMessage,
		lastUpdated: presence?.updatedAt,
	}
}
