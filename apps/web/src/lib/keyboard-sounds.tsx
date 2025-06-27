import type { ParentProps } from "solid-js"
import { createContext, createEffect, createSignal, onMount, useContext } from "solid-js"

export type KeyboardSoundType = "cherry-mx-blue" | "cherry-mx-brown" | "cherry-mx-red" | "topre" | "alps-blue"

interface KeyboardSoundsContextValue {
	enabled: () => boolean
	soundType: () => KeyboardSoundType
	volume: () => number
	setEnabled: (enabled: boolean) => void
	setSoundType: (type: KeyboardSoundType) => void
	setVolume: (volume: number) => void
	playSound: () => void
}

const KeyboardSoundsContext = createContext<KeyboardSoundsContextValue>()

const STORAGE_KEY = "keyboard-sounds-settings"

interface KeyboardSoundsSettings {
	enabled: boolean
	soundType: KeyboardSoundType
	volume: number
}

const defaultSettings: KeyboardSoundsSettings = {
	enabled: false,
	soundType: "cherry-mx-blue",
	volume: 50,
}

export function KeyboardSoundsProvider(props: ParentProps) {
	const [enabled, setEnabledSignal] = createSignal(defaultSettings.enabled)
	const [soundType, setSoundTypeSignal] = createSignal(defaultSettings.soundType)
	const [volume, setVolumeSignal] = createSignal(defaultSettings.volume)

	const audioCache: Map<string, HTMLAudioElement> = new Map()

	onMount(() => {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			try {
				const settings: KeyboardSoundsSettings = JSON.parse(stored)
				setEnabledSignal(settings.enabled)
				setSoundTypeSignal(settings.soundType)
				setVolumeSignal(settings.volume)
			} catch {
				console.warn("Failed to parse keyboard sounds settings")
			}
		}
	})

	const saveSettings = () => {
		const settings: KeyboardSoundsSettings = {
			enabled: enabled(),
			soundType: soundType(),
			volume: volume(),
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
	}

	createEffect(() => {
		saveSettings()
	})

	const preloadSound = (soundType: KeyboardSoundType) => {
		if (!audioCache.has(soundType)) {
			const audio = new Audio(`/sounds/keyboard/${soundType}.mp3`)
			audio.preload = "auto"
			audioCache.set(soundType, audio)
		}
	}

	const setEnabled = (newEnabled: boolean) => {
		setEnabledSignal(newEnabled)
		if (newEnabled) {
			preloadSound(soundType())
		}
	}

	const setSoundType = (newSoundType: KeyboardSoundType) => {
		setSoundTypeSignal(newSoundType)
		if (enabled()) {
			preloadSound(newSoundType)
		}
	}

	const setVolume = (newVolume: number) => {
		setVolumeSignal(Math.max(0, Math.min(100, newVolume)))
	}

	const playSound = () => {
		if (!enabled()) return

		const currentSoundType = soundType()
		let audio = audioCache.get(currentSoundType)

		if (!audio) {
			audio = new Audio(`/sounds/keyboard/${currentSoundType}.mp3`)
			audioCache.set(currentSoundType, audio)
		}

		audio.volume = volume() / 100
		audio.currentTime = 0
		audio.play().catch(() => {
			console.warn("Failed to play keyboard sound")
		})
	}

	const value: KeyboardSoundsContextValue = {
		enabled,
		soundType,
		volume,
		setEnabled,
		setSoundType,
		setVolume,
		playSound,
	}

	return <KeyboardSoundsContext.Provider value={value}>{props.children}</KeyboardSoundsContext.Provider>
}

export function useKeyboardSounds() {
	const context = useContext(KeyboardSoundsContext)
	if (!context) {
		throw new Error("useKeyboardSounds must be used within a KeyboardSoundsProvider")
	}
	return context
}
