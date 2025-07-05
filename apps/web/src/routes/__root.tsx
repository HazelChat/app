import { routerWithQueryClient } from "@tanstack/react-router-with-query"
import type { QueryClient } from "@tanstack/solid-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"

import type { useAuth } from "clerk-solidjs"

interface RootContext {
	auth: ReturnType<typeof useAuth>
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RootContext>()({
	component: RootComponent,
})

function RootComponent() {
	return <Outlet />
}
