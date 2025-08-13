import type { ConvexQueryClient } from "@convex-dev/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { ConvexReactClient } from "convex/react"

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
	convexClient: ConvexReactClient
	convexQueryClient: ConvexQueryClient
}>()({
	component: () => (
		<>
			<Outlet />
			{/* <TanStackRouterDevtools position="top-right" /> */}
		</>
	),
})
