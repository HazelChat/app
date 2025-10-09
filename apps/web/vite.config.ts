import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import tanstackRouter from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/**
 * Plugin to generate version.json file during build
 * Used for detecting when new app versions are available
 */
function versionPlugin(): Plugin {
	return {
		name: "version-plugin",
		buildStart() {
			const version = {
				buildTime: Date.now(),
				version: process.env.npm_package_version || "1.0.0",
			}

			// Write to public directory so it's served at /version.json
			const publicDir = resolve(__dirname, "public")
			writeFileSync(`${publicDir}/version.json`, JSON.stringify(version, null, 2))
		},
	}
}

export default defineConfig({
	plugins: [
		tanstackRouter({ target: "react", autoCodeSplitting: false, routeToken: "layout" }),

		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		tailwindcss(),
		versionPlugin(),
	],

	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
})
