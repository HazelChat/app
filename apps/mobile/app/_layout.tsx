import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"

import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth } from "@clerk/clerk-expo"
import { tokenCache } from "@clerk/clerk-expo/token-cache"
import * as Sentry from "@sentry/react-native"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { Text } from "react-native"
import { useColorScheme } from "@/hooks/useColorScheme"

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
	unsavedChangesWarning: false,
})

import { isRunningInExpoGo } from "expo"

const navigationIntegration = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
	dsn: "https://0ee2b32bf56d2c4f7185ae72172ef3c3@o4509442487746560.ingest.de.sentry.io/4509442494103632",
	debug: true,
	tracesSampleRate: 1.0,
	integrations: [navigationIntegration],
	enableNativeFramesTracking: !isRunningInExpoGo(),
})

export default Sentry.wrap(function RootLayout() {
	const colorScheme = useColorScheme()
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	})

	if (!loaded) {
		// Async font loading only occurs in development.
		return null
	}

	return (
		<ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<ClerkLoaded>
					<ConvexProviderWithClerk useAuth={useAuth} client={convex}>
						<Stack>
							<Stack.Screen name="(home)" options={{ headerShown: false }} />
							<Stack.Screen name="(auth)" options={{ headerShown: false }} />
							<Stack.Screen name="+not-found" />
						</Stack>
						<StatusBar style="auto" />
					</ConvexProviderWithClerk>
				</ClerkLoaded>
				<ClerkLoading>
					<Text>Loading Clerk...</Text>
				</ClerkLoading>
			</ThemeProvider>
		</ClerkProvider>
	)
})
