import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { routeTree } from "./routeTree.gen"

import "@fontsource/inter/400.css"
import "@fontsource/inter/400-italic.css"
import "./styles/styles.css"

import { Toaster } from "./components/application/notifications/toaster.tsx"
import { Loader } from "./components/loader.tsx"
import { ThemeProvider } from "./components/theme-provider.tsx"
import reportWebVitals from "./reportWebVitals.ts"

export const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	defaultPendingComponent: Loader,
	Wrap: ({ children }) => (
		<ThemeProvider>
			<Toaster />
			{children}
		</ThemeProvider>
	),
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
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
