import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { type Accessor, type JSX, Show, createContext, createMemo, splitProps, useContext } from "solid-js"
import { createStore } from "solid-js/store"
import { convexQuery } from "~/lib/convex-query"

interface ChatStore extends InputChatStore {
	replyToMessageId: Id<"messages"> | null
	openThreadId: Id<"channels"> | null
	imageDialog: {
		open: boolean
		messageId: Id<"messages"> | null
		selectedImageKey: string | null
	}
	onlineUserIds: string[]
	typingUserIds: string[]

	inputText: string
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
			selectedImageKey: null,
		},
		inputText: "",
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

export const ChatProvider = (props: {
	children: JSX.Element
	serverId: Accessor<Id<"servers">>
	channelId: Accessor<Id<"channels">>
}) => {
	const [childProps] = splitProps(props, ["children"])

	const channelQuery = useQuery(() =>
		convexQuery(api.channels.getChannel, {
			channelId: props.channelId(),
			serverId: props.serverId(),
		}),
	)

	const params = createMemo(() => ({
		serverId: props.serverId(),
		channelId: props.channelId(),
	}))

	return (
		<Show when={params()} keyed>
			{(params) => {
				const chatStore$ = createChatStore({
					channel: channelQuery.data,
					channelId: params.channelId,
					serverId: params.serverId,
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
