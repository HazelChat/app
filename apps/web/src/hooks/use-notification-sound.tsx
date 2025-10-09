import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { Schema } from "effect"
import { useCallback, useEffect, useRef } from "react"

interface NotificationSoundSettings {
	enabled: boolean
	volume: number
	soundFile: "notification01" | "notification02"
	cooldownMs: number
}

// Schema for notification settings validation
const NotificationSoundSettingsSchema = Schema.Struct({
	enabled: Schema.Boolean,
	volume: Schema.Number,
	soundFile: Schema.Literal("notification01", "notification02"),
	cooldownMs: Schema.Number,
})

// localStorage runtime for settings persistence
const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

// Notification settings atom with automatic localStorage persistence
const notificationSettingsAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notification-sound-settings",
	schema: Schema.NullOr(NotificationSoundSettingsSchema),
	defaultValue: () => ({
		enabled: true,
		volume: 0.5,
		soundFile: "notification01" as const,
		cooldownMs: 2000,
	}),
})

export function useNotificationSound() {
	const settings = useAtomValue(notificationSettingsAtom) || {
		enabled: true,
		volume: 0.5,
		soundFile: "notification01" as const,
		cooldownMs: 2000,
	}
	const setSettings = useAtomSet(notificationSettingsAtom)

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const lastPlayedRef = useRef<number>(0)
	const isPlayingRef = useRef<boolean>(false)

	// Initialize or update audio element when sound file changes
	useEffect(() => {
		if (typeof window === "undefined") return

		// Only create new audio element if file changed or doesn't exist
		if (
			!audioRef.current ||
			audioRef.current.src !== `${window.location.origin}/sounds/${settings.soundFile}.mp3`
		) {
			if (audioRef.current) {
				audioRef.current.pause()
			}
			const audio = new Audio(`/sounds/${settings.soundFile}.mp3`)
			audioRef.current = audio
		}

		// Cleanup
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current = null
			}
		}
	}, [settings.soundFile])

	// Update volume separately to avoid recreating audio element
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = settings.volume
		}
	}, [settings.volume])

	const playSound = useCallback(async () => {
		if (!settings.enabled || !audioRef.current) return

		// Check cooldown
		const now = Date.now()
		if (now - lastPlayedRef.current < settings.cooldownMs) {
			return
		}

		// Prevent overlapping sounds
		if (isPlayingRef.current) return

		try {
			isPlayingRef.current = true
			lastPlayedRef.current = now

			// Reset and play
			audioRef.current.currentTime = 0
			await audioRef.current.play()
		} catch (error) {
			// Handle autoplay policy restrictions
			console.warn("Failed to play notification sound:", error)
		} finally {
			isPlayingRef.current = false
		}
	}, [settings.enabled, settings.cooldownMs])

	const updateSettings = useCallback(
		(updates: Partial<NotificationSoundSettings>) => {
			setSettings((prev) => ({
				...(prev || {
					enabled: true,
					volume: 0.5,
					soundFile: "notification01" as const,
					cooldownMs: 2000,
				}),
				...updates,
			}))
		},
		[setSettings],
	)

	const testSound = useCallback(async () => {
		if (!audioRef.current) return

		try {
			audioRef.current.currentTime = 0
			await audioRef.current.play()
		} catch (error) {
			console.warn("Failed to play test sound:", error)
		}
	}, [])

	return {
		settings,
		updateSettings,
		playSound,
		testSound,
	}
}
