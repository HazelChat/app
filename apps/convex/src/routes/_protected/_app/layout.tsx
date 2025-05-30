import { Outlet, createFileRoute, redirect } from "@tanstack/solid-router"
import { api } from "convex-hazel/_generated/api"

export const Route = createFileRoute("/_protected/_app")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		// TOOD: there is a race condition here currentl with getting the auth token in convex
		setTimeout(async () => {
			const account = await context.convex.query(api.me.get)

			if (!account) {
				throw redirect({
					to: "/onboarding",
					search: {
						step: "user",
					},
				})
			}
		}, 0)
	},
})

function RouteComponent() {
	return <Outlet />
}
