import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		tanstackStart({
			tsr: {
				routeToken: "layout",
			},
			spa: {
				enabled: true,
			},
		}),
		// @ts-expect-error
		solidPlugin(),
		tailwindcss(),
	],
})
