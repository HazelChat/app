import type { Message } from "@maki-chat/zero"
import Ably from "ably"
import { useAuth } from "clerk-solidjs"
import { type JSX, createContext, createEffect, createSignal, onCleanup, onMount, useContext } from "solid-js"

const ably = new Ably.Realtime("NY2l4Q._SC2Cw:4EX9XKKwif-URelo-XiW7AuAqAjy8QzOheHhnjocjkk")

type AblyContextType = {
	message: () => unknown | null
}

const AblyContext = createContext<AblyContextType>()

type AblyProviderProps = {
	children: JSX.Element
}

export function AblyProvider(props: AblyProviderProps) {
	const { userId } = useAuth()
	const [message, setMessage] = createSignal<unknown | null>(null)
	const [channel, setChannel] = createSignal<Ably.RealtimeChannel | undefined>(undefined)
	const audio = new Audio("/sounds/notification02.mp3")

	createEffect(() => {
		if (!userId()) return

		if (!channel()) {
			setChannel(ably.channels.get(`notifications:${userId()}`))
			return
		}

		const onMessage = (msg: Ably.InboundMessage) => {
			const data = msg.data as Message
			// toaster.create({
			// 	title: data.authorId,
			// 	description: data.content,
			// })
			setMessage(msg.data)
			audio.currentTime = 0
			audio.volume = 0.5
			audio.play()
		}

		if (channel()) {
			channel()?.subscribe(onMessage)
		}

		// onCleanup(() => {
		// 	channel()?.unsubscribe(onMessage)
		// 	ably.channels.release(`notifications:${userId()}`)
		// })
	})

	return <AblyContext.Provider value={{ message }}>{props.children}</AblyContext.Provider>
}

export function useAbly() {
	const ctx = useContext(AblyContext)
	if (!ctx) throw new Error("useAbly must be used within an AblyProvider")
	return ctx
}
