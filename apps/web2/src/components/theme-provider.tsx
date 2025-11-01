import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom, useAtomMount, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { Schema } from "effect"
import { generateRgbShades } from "~/lib/helper/generate-shades"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: Theme
	storageKey?: string
}

const colorSwatches = [
	{ hex: "#535862", name: "gray" },
	{ hex: "#099250", name: "green" },
	{ hex: "#1570EF", name: "blue" },
	{ hex: "#444CE7", name: "indigo" },
	{ hex: "#6938EF", name: "purple" },
	{ hex: "#BA24D5", name: "fuchsia" },
	{ hex: "#DD2590", name: "pink" },
	{ hex: "#E04F16", name: "orange" },
]

const ThemeSchema = Schema.Literal("dark", "light", "system")

const HexColorSchema = Schema.String.pipe(
	Schema.pattern(/^#[0-9A-Fa-f]{6}$/),
	Schema.annotations({ message: () => "Must be a valid hex color (#RRGGBB)" }),
)

// localStorage runtime for theme persistence
const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

// Theme atom with automatic localStorage persistence
export const themeAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "hazel-ui-theme",
	schema: Schema.NullOr(ThemeSchema),
	defaultValue: () => "system" as const,
})

export const brandColorAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "brand-color",
	schema: Schema.NullOr(HexColorSchema),
	defaultValue: () => "#7F56D9" as const,
})

export const resolvedThemeAtom = Atom.transform(themeAtom, (get) => {
	const theme = get(themeAtom)
	if (theme !== "system" && theme !== null) return theme

	if (typeof window === "undefined") return "light"

	// Listen to system theme changes
	const matcher = window.matchMedia("(prefers-color-scheme: dark)")

	matcher.addEventListener("change", onChange)
	get.addFinalizer(() => matcher.removeEventListener("change", onChange))

	return matcher.matches ? "dark" : "light"

	function onChange() {
		get.setSelf(matcher.matches ? "dark" : "light")
	}
})

export const applyThemeAtom = Atom.make((get) => {
	const theme = get(resolvedThemeAtom)
	if (typeof document === "undefined") return

	const root = document.documentElement
	root.classList.remove("light", "dark")
	root.classList.add(theme)
})

export const applyBrandColorAtom = Atom.make((get) => {
	const brandColor = get(brandColorAtom)
	if (typeof document === "undefined") return

	const hexColor = brandColor || "#7F56D9"

	const existingColorSwatch = colorSwatches.find((swatch) => swatch.hex === hexColor)

	if (existingColorSwatch) {
		const shades = ["25", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]

		shades.forEach((shade) => {
			document.documentElement.style.setProperty(
				`--color-brand-${shade}`,
				`var(--color-${existingColorSwatch.name}-${shade})`,
			)
		})

		return
	}

	const shades = generateRgbShades(hexColor)
	if (!shades) return

	Object.entries(shades).forEach(([key, { r, g, b }]) => {
		document.documentElement.style.setProperty(`--color-brand-${key}`, `rgb(${r} ${g} ${b})`)
	})
})

export function ThemeProvider({ children }: ThemeProviderProps) {
	useAtomMount(applyThemeAtom)
	useAtomMount(applyBrandColorAtom)

	return <>{children}</>
}

export const useTheme = () => {
	const theme = useAtomValue(themeAtom)
	const setTheme = useAtomSet(themeAtom)
	const brandColor = useAtomValue(brandColorAtom)
	const setBrandColor = useAtomSet(brandColorAtom)

	return {
		theme: theme || "system",
		setTheme,
		brandColor: brandColor || "#7F56D9",
		setBrandColor,
	}
}
