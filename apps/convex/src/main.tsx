import { RouterProvider, createRouter } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import "solid-devtools"

import { routeTree } from "./routeTree.gen"

import "./styles/root.css"
import "./styles/code.css"
import "./styles/toast.css"

import { ClerkProvider, useAuth } from "clerk-solidjs"
import { Toaster } from "./components/ui/toaster"
import { ConvexProvider, ConvexSolidClient } from "./lib/convex"
import { ConvexProviderWithClerk } from "./lib/convex-clerk"

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPreloadStaleTime: 0,
	context: {
		auth: undefined!,
	},
})

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router
	}
}

const InnerProviders = () => {
	const auth = useAuth()

	return (
		<RouterProvider
			router={router}
			context={{
				auth: auth,
			}}
		/>
	)
}

const convex = new ConvexSolidClient("http://127.0.0.1:3210")

function App() {
	return (
		<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<Toaster />
				<InnerProviders />
			</ConvexProviderWithClerk>
		</ClerkProvider>
	)
}

const rootElement = document.getElementById("app")
if (rootElement) {
	render(() => <App />, rootElement)
}
