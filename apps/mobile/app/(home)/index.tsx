import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo"
import { Link } from "expo-router"
import { Button, Text, View } from "react-native"

import * as Sentry from "@sentry/react-native"

export default function Page() {
	const { user } = useUser()

	return (
		<View style={{ padding: 20 }}>
			<SignedIn>
				<Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
				<Link href="/channels">
					<Text style={{ marginTop: 12 }}>Open Chat</Text>
				</Link>
				<Link href="/settings">
					<Text style={{ marginTop: 12 }}>Settings</Text>
				</Link>
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
