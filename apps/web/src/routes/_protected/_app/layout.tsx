import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { NotificationManager } from "~/lib/notification-manager"

export const Route = createFileRoute("/_protected/_app")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<NotificationManager>
			<Outlet />
		</NotificationManager>
	)
}
