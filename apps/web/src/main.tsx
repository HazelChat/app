import { createRouter, RouterProvider } from "@tanstack/solid-router"
import { render, Show, Suspense } from "solid-js/web"

import "solid-devtools"

import { routeTree } from "./routeTree.gen"

import "./styles/root.css"
import "./styles/toast.css"

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"
import { ClerkProvider, useAuth } from "clerk-solidjs"
import { FpsCounter } from "./components/devtools/fps-counter"
import { IconLoader } from "./components/icons/loader"
import { Logo } from "./components/logo"
import { Toaster } from "./components/ui/toaster"
import { ConvexSolidClient } from "./lib/convex"
import { ConvexProviderWithClerk } from "./lib/convex-clerk"
import { ConvexQueryClient } from "./lib/convex-query"
import { HotkeyProvider } from "./lib/hotkey-manager"
import { KeyboardSoundsProvider } from "./lib/keyboard-sounds"
import { applyInitialTheme, ThemeProvider } from "./lib/theme"

import "@fontsource-variable/geist-mono/index.css"
import "@fontsource-variable/geist/index.css"

applyInitialTheme()

const convex = new ConvexSolidClient(import.meta.env.VITE_CONVEX_URL)

const convexQueryClient = new ConvexQueryClient(convex)

const _persister = createSyncStoragePersister({
	storage: localStorage,
})

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),

			gcTime: 1000 * 60 * 60 * 24,
		},
	},
})

convexQueryClient.connect(queryClient)

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollToTopSelectors: ["#chat-scrollarea"],
	scrollRestoration: false,
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
				<KeyboardSoundsProvider>
					<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
						<Suspense fallback={<div>Loading...</div>}>
							<HotkeyProvider>
								<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
									<Toaster />
									<InnerProviders />
									<Show when={import.meta.env.DEV}>
										<FpsCounter />
									</Show>
								</ConvexProviderWithClerk>
							</HotkeyProvider>
						</Suspense>
					</ClerkProvider>
				</KeyboardSoundsProvider>
			</ThemeProvider>
		</QueryClientProvider>
	)
}

const rootElement = document.getElementById("app")
if (rootElement) {
	render(() => <App />, rootElement)
}
