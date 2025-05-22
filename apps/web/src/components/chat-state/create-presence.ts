import type { User } from "@maki-chat/zero"
import { useAuth, useUser } from "clerk-solidjs"
import { createEffect, createMemo, onCleanup } from "solid-js"
import { supabase } from "~/lib/supabase"
import { useChat } from "./chat-store"

interface PresenceUser {
	user_id: string
	channel_id: string
	online_at: string
	typing: boolean
}

export const createPresence = () => {
	const { userId } = useAuth()

	const { state, setState } = useChat()

	const channel = createMemo(() => {
		return supabase.channel(`channel-${state.channelId}`, {
			config: {
				presence: {
					key: userId()!,
				},
			},
		})
	})

	const trackPresence = async (data: Partial<PresenceUser>) => {
		await channel().track({
			user_id: userId(),
			channel_id: state.channelId,
			online_at: new Date().toISOString(),
			typing: false,
			...data,
		})
	}

	createEffect(() => {
		channel().subscribe(async (status) => {
			if (status === "SUBSCRIBED") {
				await trackPresence({})
			}
		})

		const updateState = () => {
			const state = channel().presenceState<PresenceUser>()

			const presenceUsers = Object.keys(state)
				.map((key) => state[key][0])
				.filter((user) => user.user_id !== userId())

			setState(
				"typingUserIds",
				presenceUsers.filter((user) => user.typing).map((user) => user.user_id),
			)
			setState(
				"onlineUserIds",
				presenceUsers.map((user) => user.user_id),
			)
		}

		channel().on("presence", { event: "sync" }, updateState)
		channel().on("presence", { event: "join" }, updateState)
		channel().on("presence", { event: "leave" }, updateState)
	})

	onCleanup(() => {
		channel().untrack()
		supabase.removeChannel(channel())
	})

	return {
		trackPresence,
	} as const
}
