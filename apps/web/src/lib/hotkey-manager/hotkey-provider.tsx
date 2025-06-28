import { createContext, createSignal, onCleanup, type ParentComponent, useContext } from "solid-js"
import { type HotkeyConfig, hotkeyManager } from "./hotkey-manager"

interface HotkeyContextValue {
	registerLayer: (name: string, priority?: number) => void
	activateLayer: (name: string) => void
	deactivateLayer: (name: string) => void
	registerHotkey: (layerName: string, config: HotkeyConfig) => () => void
	getActiveHotkeys: () => HotkeyConfig[]
	activeLayers: () => string[]
}

const HotkeyContext = createContext<HotkeyContextValue>()

export const HotkeyProvider: ParentComponent = (props) => {
	const [activeLayers, setActiveLayers] = createSignal<string[]>([])

	const unsubscribe = hotkeyManager.subscribe(() => {
		setActiveLayers(hotkeyManager.getActiveLayerNames())
	})

	hotkeyManager.registerLayer("global", 0)
	hotkeyManager.activateLayer("global")

	onCleanup(() => {
		unsubscribe()
		hotkeyManager.destroy()
	})

	const contextValue: HotkeyContextValue = {
		registerLayer: hotkeyManager.registerLayer.bind(hotkeyManager),
		activateLayer: hotkeyManager.activateLayer.bind(hotkeyManager),
		deactivateLayer: hotkeyManager.deactivateLayer.bind(hotkeyManager),
		registerHotkey: hotkeyManager.registerHotkey.bind(hotkeyManager),
		getActiveHotkeys: hotkeyManager.getActiveHotkeys.bind(hotkeyManager),
		activeLayers,
	}

	return <HotkeyContext.Provider value={contextValue}>{props.children}</HotkeyContext.Provider>
}

export const useHotkeys = () => {
	const context = useContext(HotkeyContext)
	if (!context) {
		throw new Error("useHotkeys must be used within HotkeyProvider")
	}
	return context
}
