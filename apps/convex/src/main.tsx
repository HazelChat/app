import { RouterProvider, createRouter } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import "solid-devtools"

import { routeTree } from "./routeTree.gen"

import "./styles/root.css"
import "./styles/code.css"
import "./styles/toast.css"

import { Toaster } from "./components/ui/toaster"

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPreloadStaleTime: 0,
})

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router
	}
}

const InnerProviders = () => {
	return <RouterProvider router={router} />
}

function App() {
	return (
		<>
			<Toaster />
			<InnerProviders />
		</>
	)
}

const rootElement = document.getElementById("app")
if (rootElement) {
	render(() => <App />, rootElement)
}
