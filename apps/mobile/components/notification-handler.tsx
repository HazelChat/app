import { Button, Platform, Text, View } from "react-native"

import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { useEffect, useState } from "react"

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
})

function handleRegistrationError(errorMessage: string) {
	alert(errorMessage)
	throw new Error(errorMessage)
}

async function sendPushNotification(expoPushToken: string) {
	const message = {
		to: expoPushToken,
		sound: "default",
		title: "Original Title",
		body: "And here is the body!",
		data: { someData: "goes here" },
	}

	await fetch("https://exp.host/--/api/v2/push/send", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Accept-encoding": "gzip, deflate",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	})
}

async function registerForPushNotificationsAsync(channelId: string) {
	if (Platform.OS === "android") {
		Notifications.setNotificationChannelAsync(channelId, {
			name: "default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#FF231F7C",
		})
	}

	if (Device.isDevice) {
		const { status: existingStatus } = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus
		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync()
			finalStatus = status
		}
		if (finalStatus !== "granted") {
			handleRegistrationError("Permission not granted to get push token for push notification!")
			return
		}
		const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
		if (!projectId) {
			handleRegistrationError("Project ID not found")
		}
		try {
			const pushTokenString = (
				await Notifications.getExpoPushTokenAsync({
					projectId,
				})
			).data
			console.log(pushTokenString)
			return pushTokenString
		} catch (e: unknown) {
			handleRegistrationError(`${e}`)
		}
	} else {
		handleRegistrationError("Must use physical device for push notifications")
	}
}

export const NotificationHandler = ({ userId }: { userId: string }) => {
	const [expoPushToken, setExpoPushToken] = useState("")
	const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined)

	useEffect(() => {
		registerForPushNotificationsAsync(userId)
			.then((token) => setExpoPushToken(token ?? ""))
			.catch((error: any) => setExpoPushToken(`${error}`))

		const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
			setNotification(notification)
		})

		const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
			console.log(response)
		})

		return () => {
			notificationListener.remove()
			responseListener.remove()
		}
	}, [userId])
	return (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "space-around" }}>
			<Text>Your Expo push token: {expoPushToken}</Text>
			<View style={{ alignItems: "center", justifyContent: "center" }}>
				<Text>Title: {notification?.request.content.title} </Text>
				<Text>Body: {notification?.request.content.body}</Text>
				<Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
			</View>
			<Button
				title="Press to Send Notification"
				onPress={async () => {
					await sendPushNotification(expoPushToken)
				}}
			/>
		</View>
	)
}
