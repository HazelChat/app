import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Button, FlatList, Text, TextInput, View } from "react-native"

export default function ChannelView() {
	const { channelId } = useLocalSearchParams<{ channelId: Id<"channels"> }>()
	const servers = useQuery(api.servers.getServersForUser, {})
	const serverId = servers?.[0]?._id

	const PAGE_SIZE = 30

	const messages = usePaginatedQuery(
		api.messages.getMessages,
		channelId && serverId ? { serverId, channelId } : "skip",
		{ initialNumItems: PAGE_SIZE },
	)

	const displayedMessages = (messages.results ?? []).slice().reverse()

	const createMessage = useMutation(api.messages.createMessage)
	const [text, setText] = useState("")

	const send = async () => {
		if (!text.trim() || !serverId || !channelId) return
		await createMessage({
			serverId,
			channelId: channelId,
			content: text,
			threadChannelId: undefined,
			replyToMessageId: undefined,
			attachedFiles: [],
		})
		setText("")
	}

	return (
		<View style={{ flex: 1, padding: 16 }}>
			<FlatList
				data={displayedMessages}
				keyExtractor={(item) => item._id}
				onEndReached={() => {
					if (messages.status === "CanLoadMore") {
						messages.loadMore(PAGE_SIZE)
					}
				}}
				onEndReachedThreshold={0.2}
				renderItem={({ item }) => (
					<View style={{ marginBottom: 8 }}>
						<Text style={{ fontWeight: "bold" }}>{item.author.displayName}</Text>
						<Text>{item.content}</Text>
					</View>
				)}
			/>
			<View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
				<TextInput
					style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4 }}
					value={text}
					onChangeText={setText}
					placeholder="Type a message"
				/>
				<Button title="Send" onPress={send} />
			</View>
		</View>
	)
}
