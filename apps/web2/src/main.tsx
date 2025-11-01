import { createRouter, type NavigateOptions, RouterProvider, type ToOptions } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { routeTree } from "./routeTree.gen.ts"

import "@fontsource/inter/400.css"
import "@fontsource/inter/400-italic.css"
import "./styles/styles.css"

// Initialize app registry and mount runtimes
import "./lib/registry.ts"

import { Loader } from "./components/loader"
import { ThemeProvider } from "./components/theme-provider"
import { Toast } from "./components/ui/toast.tsx"
import reportWebVitals from "./reportWebVitals.ts"

export const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	defaultPendingMs: 300,
	defaultPendingMinMs: 300,
	defaultPendingComponent: Loader,
	Wrap: ({ children }) => (
		<ThemeProvider>
			<Toast />

			{children}
		</ThemeProvider>
	),
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

declare module "react-aria-components" {
	interface RouterConfig {
		href: ToOptions["to"]
		routerOptions: Omit<NavigateOptions, keyof ToOptions>
	}
}

const rootElement = document.getElementById("app")
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>,
	)
}

reportWebVitals()
