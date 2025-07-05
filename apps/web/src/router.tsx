import { MutationCache, notifyManager, QueryClient } from "@tanstack/solid-query"
import { createRouter as createTanStackRouter } from "@tanstack/solid-router"
import { ClerkProvider, useAuth } from "clerk-solidjs"
import { Suspense } from "solid-js"
import { toaster } from "./components/ui/toaster"
import { ConvexProviderWithClerk } from "./lib/convex-clerk"
import { ConvexQueryClient } from "./lib/convex-query"
import { routerWithQueryClient } from "./lib/tsr/solid-router-with-query"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
	if (typeof document !== "undefined") {
		notifyManager.setScheduler(window.requestAnimationFrame)
	}

	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
	if (!CONVEX_URL) {
		console.error("missing envar CONVEX_URL")
	}
	const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
		mutationCache: new MutationCache({
			onError: (error) => {
				toaster.error({ title: error.message })
			},
		}),
	})
	convexQueryClient.connect(queryClient)

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			context: { queryClient, auth: undefined! },
			Wrap: ({ children }) => (
				<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
					<Suspense fallback={<div>Loading...</div>}>
						<ConvexProviderWithClerk useAuth={useAuth} client={convexQueryClient.convexClient}>
							{children}
						</ConvexProviderWithClerk>
					</Suspense>
				</ClerkProvider>
			),
			scrollRestoration: true,
		}),
		queryClient,
	)

	return router
}

declare module "@tanstack/solid-router" {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
