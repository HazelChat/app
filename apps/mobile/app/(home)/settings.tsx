import { View, Text } from "react-native"
import { useUser } from "@clerk/clerk-expo"
import { SignOutButton } from "@/components/SignOutButton"
import { NotificationHandler } from "@/components/notification-handler"

export default function Settings() {
	const { user } = useUser()
	return (
		<View style={{ flex: 1, padding: 20 }}>
			<Text style={{ fontSize: 18, marginBottom: 20 }}>
				Signed in as {user?.emailAddresses[0].emailAddress}
			</Text>
			<NotificationHandler userId={user?.id!} />
			<View style={{ marginTop: 20 }}>
				<SignOutButton />
			</View>
		</View>
	)
}
