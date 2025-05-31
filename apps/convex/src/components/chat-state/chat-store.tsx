import { api } from "convex-hazel/_generated/api"
import type { Doc, Id } from "convex-hazel/_generated/dataModel"
import { type JSX, Show, createContext, createEffect, createMemo, splitProps, useContext } from "solid-js"
import { createStore } from "solid-js/store"
import { createQuery } from "~/lib/convex"

interface ChatStore extends InputChatStore {
	replyToMessageId: Id<"messages"> | null
	openThreadId: Id<"channels"> | null
	imageDialog: {
		open: boolean
		messageId: Id<"messages"> | null
		selectedImage: string | null
	}
	onlineUserIds: string[]
	typingUserIds: string[]
}

interface InputChatStore {
	serverId: Id<"servers">
	channelId: Id<"channels">
	channel: Doc<"channels"> | undefined
}

const createChatStore = (props: InputChatStore) => {
	const [state, setState] = createStore<ChatStore>({
		replyToMessageId: null,
		openThreadId: null,
		imageDialog: {
			open: false,
			messageId: null,
			selectedImage: null,
		},
		onlineUserIds: [],
		typingUserIds: [],
		...props,
	})

	return {
		state,
		setState,
	}
}

export const ChatContext = createContext<ReturnType<typeof createChatStore> | undefined>()

export const ChatProvider = (props: { children: JSX.Element } & Omit<InputChatStore, "channel">) => {
	const [childProps, restProps] = splitProps(props, ["children"])

	const params = createMemo(() => ({
		serverId: props.serverId,
		channelId: props.channelId,
	}))

	return (
		<Show when={params()} keyed>
			{(params) => {
				const { data: channel } = createQuery(api.channels.getChannel, {
					channelId: props.channelId,
					serverId: props.serverId,
				})

				const chatStore$ = createChatStore({
					...restProps,
					channel: undefined,
					channelId: params.channelId,
					serverId: params.serverId,
				})

				createEffect(() => {
					const currChannel = channel()

					if (currChannel) {
						chatStore$.setState("channel", currChannel)
						return
					}
				})

				return <ChatContext.Provider value={chatStore$}>{childProps.children}</ChatContext.Provider>
			}}
		</Show>
	)
}

export const useChat = () => {
	const context = useContext(ChatContext)

	if (!context) {
		throw new Error("useChat must be used within a ChatProvider")
	}

	return context
}
