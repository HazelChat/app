import { Link } from "expo-router"
import { useQuery } from "convex/react"
import { api } from "@hazel/backend/api"
import { View, Text, FlatList, TouchableOpacity } from "react-native"

export default function ChannelList() {
	const servers = useQuery(api.servers.getServersForUser, {})
	const serverId = servers?.[0]?._id
	const channels = useQuery(api.channels.getChannels, serverId ? { serverId } : "skip")

	const serverChannels = channels?.serverChannels ?? []

	return (
		<View style={{ flex: 1, padding: 16 }}>
			<FlatList
				data={serverChannels}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => (
					<Link href={`/channels/${item._id}`} asChild>
						<TouchableOpacity style={{ paddingVertical: 12 }}>
							<Text style={{ fontSize: 16 }}>{item.name}</Text>
						</TouchableOpacity>
					</Link>
				)}
			/>
		</View>
	)
}
