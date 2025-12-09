import { TanStackDevtools } from "@tanstack/react-devtools"
import { createRootRouteWithContext, Outlet, useRouter } from "@tanstack/react-router"
import { RpcDevtoolsPanel } from "effect-rpc-tanstack-devtools/components"
import { RouterProvider } from "react-aria-components"
import { VersionCheck } from "~/components/version-check"

export const Route = createRootRouteWithContext<{}>()({
	component: () => {
		const router = useRouter()

		return (
			<RouterProvider navigate={(to, options) => router.navigate({ to, ...options })}>
				{import.meta.env.DEV && (
					<TanStackDevtools
						plugins={[
							{
								name: "Effect RPC",
								render: <RpcDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Outlet />
				{import.meta.env.PROD && <VersionCheck />}
			</RouterProvider>
		)
	},
})
