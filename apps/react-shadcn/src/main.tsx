import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

import "./styles/styles.css"

import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react"
import { ConvexReactClient } from "convex/react"
import { Toaster } from "./components/application/notifications/toaster.tsx"
import { ConvexProviderWithAuthKit } from "./components/convex-provider-with-authkit.tsx"
import { ThemeProvider } from "./components/theme-provider.tsx"
import reportWebVitals from "./reportWebVitals.ts"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

const convexQueryClient = new ConvexQueryClient(convex)

const queryClient: QueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
})

convexQueryClient.connect(queryClient)

const router = createRouter({
	routeTree,
	context: { queryClient, convexClient: convex, convexQueryClient },
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	Wrap: ({ children }) => (
		<ThemeProvider>
			<QueryClientProvider client={queryClient}>
				<AuthKitProvider
					clientId={import.meta.env.VITE_WORKOS_CLIENT_ID || "client_01HGZR2CV5G9VPBYK6XFA8YG17"}
					redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
				>
					<ConvexProviderWithAuthKit client={convexQueryClient.convexClient} useAuth={useAuth}>
						<Toaster />
						{children}
					</ConvexProviderWithAuthKit>
				</AuthKitProvider>
			</QueryClientProvider>
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
