import { RouterProvider, createRouter } from "@tanstack/solid-router"
import { Show, Suspense, render } from "solid-js/web"

import "solid-devtools"

import { routeTree } from "./routeTree.gen"

import "./styles/root.css"
import "./styles/toast.css"

import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { ClerkProvider, useAuth } from "clerk-solidjs"
import { FpsCounter } from "./components/devtools/fps-counter"
import { IconLoader } from "./components/icons/loader"
import { Logo } from "./components/logo"
import { Toaster } from "./components/ui/toaster"
import { ConvexSolidClient } from "./lib/convex"
import { ConvexProviderWithClerk } from "./lib/convex-clerk"
import { ConvexQueryClient } from "./lib/convex-query"
import { ThemeProvider, applyInitialTheme } from "./lib/theme"

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

import { persistQueryClient } from "@tanstack/query-persist-client-core"
import { createEffect, onCleanup } from "solid-js"

import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"

applyInitialTheme()

const convex = new ConvexSolidClient(import.meta.env.VITE_CONVEX_URL)

const convexQueryClient = new ConvexQueryClient(convex)

// const persister = createSyncStoragePersister({
// 	storage: localStorage,
// })

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
})

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	// scrollRestoration: true,
	defaultPreloadStaleTime: 0,

	defaultViewTransition: true,

	context: {
		auth: undefined!,
		convex: convex,
		queryClient,
	},
	defaultErrorComponent: (err) => {
		console.error(err)
		return (
			<div class="flex min-h-screen items-center justify-center">
				<div class="flex flex-col items-center justify-center gap-3">
					<Logo class="h-12" />
					<div class="text-center text-red-500">
						<h1>Error</h1>
						<p>Something went wrong.</p>
					</div>
				</div>
			</div>
		)
	},
	defaultPendingComponent: () => (
		<div class="flex min-h-screen items-center justify-center">
			<div class="flex flex-col items-center justify-center gap-3">
				<Logo class="h-12" />
				<IconLoader class="animate-spin" />
			</div>
		</div>
	),
})

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router
	}
}

const InnerProviders = () => {
	const auth = useAuth()

	// createEffect(() => {
	// 	const [unsubscribe] = persistQueryClient({
	// 		queryClient,
	// 		persister,
	// 		maxAge: 1000 * 60 * 60 * 24,
	// 	})

	// 	onCleanup(() => {
	// 		unsubscribe()
	// 	})
	// })

	return (
		<RouterProvider
			router={router}
			context={{
				auth: auth,
			}}
		/>
	)
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<SolidQueryDevtools />
			<ThemeProvider>
				<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
					<Suspense fallback={<div>Loading...</div>}>
						<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
							<Toaster />
							<InnerProviders />
							<Show when={import.meta.env.DEV}>
								<FpsCounter />
							</Show>
						</ConvexProviderWithClerk>
					</Suspense>
				</ClerkProvider>
			</ThemeProvider>
		</QueryClientProvider>
	)
}

const rootElement = document.getElementById("app")
if (rootElement) {
	render(() => <App />, rootElement)
}
