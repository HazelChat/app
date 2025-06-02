import { SignOutButton } from "@/components/SignOutButton"
import { NotificationHandler } from "@/components/notification-handler"
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { Text, View } from "react-native"

export default function Page() {
	const { user } = useUser()

	return (
		<View>
			<SignedIn>
				<Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
				<SignOutButton />
				<NotificationHandler userId={user?.id!} />
			</SignedIn>
			<SignedOut>
				<Link href="/(auth)/sign-in">
					<Text>Sign in</Text>
				</Link>
				<Link href="/(auth)/sign-up">
					<Text>Sign up</Text>
				</Link>
			</SignedOut>
		</View>
	)
}
