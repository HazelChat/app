import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/$orgSlug/")({
	component: RouteComponent,
})

function RouteComponent() {
	return <div>Hello "/_app/$orgSlug/"!</div>
}
