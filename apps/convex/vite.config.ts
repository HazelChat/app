import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import devtools from "solid-devtools/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"

import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [
		TanStackRouterVite({ target: "solid", autoCodeSplitting: true, routeToken: "layout" }),
		devtools({
			autoname: true,
		}),
		solidPlugin(),
		tailwindcss(),
		tsconfigPaths(),
	],
})
