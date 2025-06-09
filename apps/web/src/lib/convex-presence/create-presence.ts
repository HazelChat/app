import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import type { Value } from "convex/values"
import { type Accessor, createEffect, createMemo, createSignal } from "solid-js"
import { createMutation, createQuery } from "../convex/client"
import { createSingleFlight } from "./create-singleflight"

export type PresenceData<D> = {
	created: number
	latestJoin: number
	user: string
	data: D
	present: boolean
}

const HEARTBEAT_PERIOD = 5000

/**
 * createPresence is a SolidJS primitive for reading & writing presence data.
 *
 * The data is written by various users, and comes back as a list of data for
 * other users in the same room. It is not meant for mission-critical data, but
 * rather for optimistic metadata, like whether a user is online, typing, or
 * at a certain location on a page. The data is single-flighted, and when many
 * updates are requested while an update is in flight, only the latest data will
 * be sent in the next request. See for more details on single-flighting:
 * https://stack.convex.dev/throttling-requests-by-single-flighting
 *
 * Data updates are merged with previous data. This data will reflect all
 * updates, not just the data that gets synchronized to the server. So if you
 * update with {mug: userMug} and {typing: true}, the data will have both
 * `mug` and `typing` fields set, and will be immediately reflected in the data
 * returned as the first parameter.
 *
 * @param room - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @param user - The user associated with the presence data.
 * @param initialData - The initial data to associate with the user.
 * @param heartbeatPeriod? - If specified, the interval between heartbeats, in
 * milliseconds. A heartbeat updates the user's presence "updated" timestamp.
 * The faster the updates, the more quickly you can detect a user "left" at
 * the cost of more server function calls.
 * @returns A list with 1. this user's data; 2. A list of other users' data;
 * 3. function to update this user's data. It will do a shallow merge.
 */
export const createPresence = <T extends { [key: string]: Value }>(
	serverId: Accessor<Id<"servers">>,
	room: Accessor<string>,
	user: Accessor<string>,
	initialData: T,
	heartbeatPeriod = HEARTBEAT_PERIOD,
) => {
	let hearbeatTimer: NodeJS.Timeout | null = null
	const [data, setData] = createSignal(initialData)

	const presenceQuery = createQuery(api.typingIndicator.list, () => [{ room: room() }])

	const filteredPresence = createMemo(() => {
		const presence = presenceQuery()
		if (presence) {
			return presence.filter((p: PresenceData<T>) => p.user !== user())
		}
		return undefined
	})

	const updatePresenceMutation = createMutation(api.typingIndicator.update)
	const heartbeatMutation = createMutation(api.typingIndicator.heartbeat)

	const updatePresence = createSingleFlight(updatePresenceMutation)
	const heartbeat = createSingleFlight(heartbeatMutation)

	createEffect(() => {
		void updatePresence({ room: room(), user: user(), data: data(), serverId: serverId() })
	})

	// Heartbeat effect
	createEffect(() => {
		if (hearbeatTimer) {
			clearInterval(hearbeatTimer)
		}
		hearbeatTimer = setInterval(() => {
			void heartbeat({ room: room(), user: user() })
		}, heartbeatPeriod)

		return () => hearbeatTimer && clearInterval(hearbeatTimer)
	})

	const updateData = (patch: Partial<T>) => {
		setData((prevState) => {
			const newData = { ...prevState, ...patch }
			return newData
		})
	}

	return [data, filteredPresence, updateData] as const
}
