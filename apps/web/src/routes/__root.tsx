import { routerWithQueryClient } from "@tanstack/react-router-with-query"
import type { QueryClient } from "@tanstack/solid-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router"

import type { useAuth } from "clerk-solidjs"
import type { ConvexSolidClient } from "~/lib/convex"

interface RootContext {
	auth: ReturnType<typeof useAuth>
	convex: ConvexSolidClient
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RootContext>()({
	component: RootComponent,
})

function RootComponent() {
	return <Outlet />
}
