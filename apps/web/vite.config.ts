import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"

import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [
		tanstackRouter({ target: "solid", autoCodeSplitting: true, routeToken: "layout" }),
		solidPlugin(),
		tailwindcss(),
		tsconfigPaths(),
	],
})
