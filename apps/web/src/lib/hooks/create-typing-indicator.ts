import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { type Accessor, createEffect, createMemo, onCleanup } from "solid-js"
import { createMutation, createQuery } from "../convex"

const STOP_TYPING_DELAY = 1500

export function createTypingIndicator(channelId: Accessor<Id<"channels">>, text: Accessor<string>) {
	const typingUsersQuery = createQuery(api.typingIndicator.list, () => [
		{
			channelId: channelId(),
		},
	])

	const updateTyping = createMutation(api.typingIndicator.update)
	const stopTyping = createMutation(api.typingIndicator.stop)

	let typingTimer: NodeJS.Timeout | null = null

	onCleanup(() => {
		if (typingTimer) {
			clearTimeout(typingTimer)
		}
	})

	createEffect(() => {
		const currentChannelid = channelId()
		const currentText = text()

		if (typingTimer) {
			clearTimeout(typingTimer)
		}

		if (currentText.length === 0) {
			return
		}

		updateTyping({ channelId: currentChannelid })

		typingTimer = setTimeout(() => {
			stopTyping({ channelId: currentChannelid })
		}, STOP_TYPING_DELAY)
	})

	const typingUsers = createMemo(() => {
		const curr = typingUsersQuery()

		return curr ?? []
	})

	return { typingUsers, stopTyping }
}
