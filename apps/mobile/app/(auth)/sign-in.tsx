import { useSSO } from "@clerk/clerk-expo"
import { FontAwesome } from "@expo/vector-icons"
import * as AuthSession from "expo-auth-session"
import * as WebBrowser from "expo-web-browser"
import React, { useCallback, useEffect } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export const useWarmUpBrowser = () => {
	useEffect(() => {
		// Preloads the browser for Android devices to reduce authentication load time
		// See: https://docs.expo.dev/guides/authentication/#improving-user-experience
		void WebBrowser.warmUpAsync()
		return () => {
			// Cleanup: closes browser when component unmounts
			void WebBrowser.coolDownAsync()
		}
	}, [])
}

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession()

export default function Page() {
	useWarmUpBrowser()
	const { startSSOFlow } = useSSO()

	const handleSignIn = useCallback(
		async (strategy: "oauth_google" | "oauth_github") => {
			try {
				const { createdSessionId, setActive } = await startSSOFlow({
					strategy,
					redirectUrl: AuthSession.makeRedirectUri(),
				})
				if (createdSessionId) {
					setActive!({ session: createdSessionId })
				}
			} catch (err) {
				console.error(JSON.stringify(err, null, 2))
			}
		},
		[startSSOFlow],
	)

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={[styles.button, { backgroundColor: "#fff", borderColor: "#4285F4", borderWidth: 1 }]}
				onPress={() => handleSignIn("oauth_google")}
				activeOpacity={0.8}
			>
				<FontAwesome name="google" size={22} color="#4285F4" style={styles.icon} />
				<Text style={[styles.buttonText, { color: "#4285F4" }]}>Sign in with Google</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.button, { backgroundColor: "#24292F", marginTop: 16 }]}
				onPress={() => handleSignIn("oauth_github")}
				activeOpacity={0.8}
			>
				<FontAwesome name="github" size={22} color="#fff" style={styles.icon} />
				<Text style={[styles.buttonText, { color: "#fff" }]}>Sign in with GitHub</Text>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f9f9f9",
		paddingHorizontal: 24,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
		width: "100%",
		maxWidth: 340,
	},
	icon: {
		marginRight: 12,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
	},
})
