import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { convexQuery } from "../convex-query"
import { createMutation, useConvex } from "../convex/client"
import { createSingleFlight } from "./create-singleflight"

if (typeof window === "undefined") {
	throw new Error("this is frontend code, but it's running somewhere else!")
}

// Presence state for a user within the given room.
export interface PresenceState {
	userId: string
	online: boolean
	lastDisconnected: number
	// Set these accordingly in your Convex app.
	name?: string
	image?: string
}

/**
 * SolidJS primitive for maintaining presence state.
 *
 * This primitive is designed to be efficient and only sends a message to users
 * whenever a member joins or leaves the room, not on every heartbeat.
 *
 * Use of this primitive requires passing in a reference to the Convex presence
 * functions defined in your Convex app.
 *
 * @param roomId - The identifier for the room.
 * @param userId - The identifier for the current user.
 * @param interval - The heartbeat interval in milliseconds. Defaults to 10000.
 * @param convexUrl - Optional Convex deployment URL.
 * @returns A reactive signal containing the list of present users.
 */
export default function createPresence(
	roomId: Accessor<string>,
	userId: Accessor<Id<"users">>,
	interval = 10000,
	convexUrl?: string,
) {
	const convex = useConvex()
	const baseUrl = convexUrl ?? convex.address

	// Each session (browser tab etc) has a unique ID.
	const sessionId = crypto.randomUUID()
	const [sessionToken, setSessionToken] = createSignal<string | null>(null)
	const [roomToken, setRoomToken] = createSignal<string | null>(null)

	const heartbeatMutation = createMutation(api.presence.heartbeat)
	const disconnectMutation = createMutation(api.presence.disconnect)

	// Use single-flight wrappers to prevent redundant concurrent calls.
	const heartbeat = createSingleFlight(heartbeatMutation)
	const disconnect = createSingleFlight(disconnectMutation)

	createEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | null = null

		const sendHeartbeat = async () => {
			// The `heartbeat` function is single-flighted, so we can call it safely.
			const result = await heartbeat({ roomId: roomId(), userId: userId(), sessionId, interval })
			if (result) {
				setRoomToken(result.roomToken)
				setSessionToken(result.sessionToken)
			}
		}

		// Send initial heartbeat.
		void sendHeartbeat()

		// Set up periodic heartbeats.
		intervalId = setInterval(sendHeartbeat, interval)

		// Handle page unload using sendBeacon for reliability.
		const handleUnload = () => {
			const currentSessionToken = sessionToken()
			if (currentSessionToken) {
				const blob = new Blob(
					[
						JSON.stringify({
							path: "presence:disconnect", // Adjust if your function path is different
							args: { sessionToken: currentSessionToken },
						}),
					],
					{ type: "application/json" },
				)

				navigator.sendBeacon(`${baseUrl}/api/mutation`, blob)
			}
		}
		window.addEventListener("beforeunload", handleUnload)

		// Handle visibility changes to pause heartbeats when tab is hidden.
		const handleVisibility = async () => {
			if (document.hidden) {
				if (intervalId) {
					clearInterval(intervalId)
					intervalId = null
				}

				const currentSessionToken = sessionToken()
				if (currentSessionToken) {
					await disconnect({ sessionToken: currentSessionToken })
				}
			} else {
				// Tab became visible again, resume heartbeats.
				void sendHeartbeat()
				if (intervalId) clearInterval(intervalId)
				intervalId = setInterval(sendHeartbeat, interval)
			}
		}
		// document.addEventListener("visibilitychange", handleVisibility)

		// onCleanup handles component unmounting.
		onCleanup(() => {
			if (intervalId) {
				clearInterval(intervalId)
			}
			// document.removeEventListener("visibilitychange", handleVisibility)
			window.removeEventListener("beforeunload", handleUnload)

			const currentSessionToken = sessionToken()
			// Disconnect when the component unmounts.
			if (currentSessionToken) {
				void disconnect({ sessionToken: currentSessionToken })
			}
		})
	})

	const presenceListQuery = useQuery(() =>
		convexQuery(api.presence.list, roomToken() ? { roomToken: roomToken()! } : "skip"),
	)

	// Memoize the sorted list to prevent re-sorting on every render.
	// This is also reactive and will update when presenceList or userId changes.
	const sortedList = createMemo(() => {
		const list = presenceListQuery.data
		if (!list) {
			return []
		}
		// Sort to show the current user first.
		return list.slice().sort((a, b) => {
			if ((a.userId as Id<"users">) === userId()) return -1
			if ((b.userId as Id<"users">) === userId()) return 1
			return 0
		})
	})

	return sortedList
}
