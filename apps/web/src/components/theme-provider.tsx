import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { Schema } from "effect"
import { useEffect } from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: Theme
	storageKey?: string
}

// Schema for theme validation
const ThemeSchema = Schema.Literal("dark", "light", "system")

// localStorage runtime for theme persistence
const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

// Theme atom with automatic localStorage persistence
export const themeAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "hazel-ui-theme",
	schema: Schema.NullOr(ThemeSchema),
	defaultValue: () => "system" as const,
})

// Derived atom that resolves "system" to actual theme
export const resolvedThemeAtom = Atom.make((get) => {
	const theme = get(themeAtom)
	if (theme === "system") {
		// Check system preference
		if (typeof window !== "undefined") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
		}
		return "light"
	}
	return theme || "system"
})

export function ThemeProvider({ children }: ThemeProviderProps) {
	const resolvedTheme = useAtomValue(resolvedThemeAtom)

	useEffect(() => {
		const root = window.document.documentElement

		root.classList.remove("light", "dark")
		root.classList.add(resolvedTheme)
	}, [resolvedTheme])

	return <>{children}</>
}

export const useTheme = () => {
	const theme = useAtomValue(themeAtom)
	const setTheme = useAtomSet(themeAtom)

	return {
		theme: theme || "system",
		setTheme,
	}
}
