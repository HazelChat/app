import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import tanstackRouter, { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		tanstackRouter({ target: "react", autoCodeSplitting: true, routeToken: "layout" }),

		viteReact(),
		tailwindcss(),
	],
	test: {
		globals: true,
		environment: "jsdom",
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
})
