import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import tanstackRouter from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [
		tanstackRouter({ target: "react", autoCodeSplitting: true, routeToken: "layout" }),

		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
})
