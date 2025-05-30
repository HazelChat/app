import { Outlet, createRootRouteWithContext } from "@tanstack/solid-router"

import type { useAuth } from "clerk-solidjs"
import type { ConvexSolidClient } from "~/lib/convex"

interface RootContext {
	auth: ReturnType<typeof useAuth>
	convex: ConvexSolidClient
}

export const Route = createRootRouteWithContext<RootContext>()({
	component: RootComponent,
})

function RootComponent() {
	return <Outlet />
}
