import { createRootRouteWithContext, Outlet, useRouter } from "@tanstack/react-router"
import { RouterProvider } from "react-aria-components"
import { VersionCheck } from "~/components/version-check"

export const Route = createRootRouteWithContext<{}>()({
	component: () => {
		const router = useRouter()

		return (
			<RouterProvider navigate={(to, options) => router.navigate({ to, ...options })}>
				<Outlet />
				{import.meta.env.PROD && <VersionCheck />}
				{/* <TanStackRouterDevtools position="top-right" /> */}
			</RouterProvider>
		)
	},
})
