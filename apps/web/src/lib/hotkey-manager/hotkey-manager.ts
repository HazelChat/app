export interface HotkeyConfig {
	key: string
	meta?: boolean
	ctrl?: boolean
	shift?: boolean
	alt?: boolean
	preventDefault?: boolean
	stopPropagation?: boolean
	handler: (event: KeyboardEvent) => void
	description?: string
	disabled?: () => boolean
}

export interface HotkeyLayer {
	name: string
	priority: number
	active: boolean
	hotkeys: Map<string, HotkeyConfig>
}

class HotkeyManager {
	private layers = new Map<string, HotkeyLayer>()
	private listeners: (() => void)[] = []
	private cleanup?: () => void

	constructor() {
		this.setupEventListeners()
	}

	private setupEventListeners() {
		const handleKeyDown = (event: KeyboardEvent) => {
			const keyCombo = this.getKeyCombo(event)
			const activeLayers = this.getActiveLayers() // This is the private method

			// Process layers by priority (highest first)
			for (const layer of activeLayers) {
				const hotkey = layer.hotkeys.get(keyCombo)
				if (hotkey && (!hotkey.disabled || !hotkey.disabled())) {
					if (hotkey.preventDefault) event.preventDefault()
					if (hotkey.stopPropagation) event.stopPropagation()

					hotkey.handler(event)
					return // Stop at first match
				}
			}
		}

		document.addEventListener("keydown", handleKeyDown)

		this.cleanup = () => document.removeEventListener("keydown", handleKeyDown)
	}

	destroy() {
		this.cleanup?.()
	}

	private getKeyCombo(event: KeyboardEvent): string {
		const parts: string[] = []

		if (event.metaKey) parts.push("meta")
		if (event.ctrlKey) parts.push("ctrl")
		if (event.altKey) parts.push("alt")
		if (event.shiftKey) parts.push("shift")

		parts.push(event.key.toLowerCase())

		return parts.join("+")
	}

	// Private method that returns HotkeyLayer[]
	private getActiveLayers(): HotkeyLayer[] {
		return Array.from(this.layers.values())
			.filter((layer) => layer.active)
			.sort((a, b) => b.priority - a.priority)
	}

	registerLayer(name: string, priority = 0): void {
		this.layers.set(name, {
			name,
			priority,
			active: false,
			hotkeys: new Map(),
		})
		this.notifyListeners()
	}

	activateLayer(name: string): void {
		const layer = this.layers.get(name)
		if (layer) {
			layer.active = true
			this.notifyListeners()
		}
	}

	deactivateLayer(name: string): void {
		const layer = this.layers.get(name)
		if (layer) {
			layer.active = false
			this.notifyListeners()
		}
	}

	registerHotkey(layerName: string, config: HotkeyConfig): () => void {
		const layer = this.layers.get(layerName)
		if (!layer) throw new Error(`Layer ${layerName} not found`)

		const keyCombo = this.normalizeKeyCombo(config)
		layer.hotkeys.set(keyCombo, config)
		this.notifyListeners()

		return () => {
			layer.hotkeys.delete(keyCombo)
			this.notifyListeners()
		}
	}

	private normalizeKeyCombo(config: HotkeyConfig): string {
		const parts: string[] = []

		if (config.meta) parts.push("meta")
		if (config.ctrl) parts.push("ctrl")
		if (config.alt) parts.push("alt")
		if (config.shift) parts.push("shift")

		parts.push(config.key.toLowerCase())

		return parts.join("+")
	}

	getActiveHotkeys(): HotkeyConfig[] {
		const activeLayers = this.getActiveLayers()
		const hotkeys: HotkeyConfig[] = []

		for (const layer of activeLayers) {
			hotkeys.push(...Array.from(layer.hotkeys.values()))
		}

		return hotkeys
	}

	// Public method that returns string[] - renamed to avoid conflict
	getActiveLayerNames(): string[] {
		return Array.from(this.layers.keys()).filter((name) => this.layers.get(name)?.active)
	}

	subscribe(callback: () => void): () => void {
		this.listeners.push(callback)
		return () => {
			this.listeners = this.listeners.filter((cb) => cb !== callback)
		}
	}

	private notifyListeners() {
		this.listeners.forEach((callback) => callback())
	}
}

export const hotkeyManager = new HotkeyManager()
