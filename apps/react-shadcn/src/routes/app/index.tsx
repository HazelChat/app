import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "@workos-inc/authkit-react"

export const Route = createFileRoute("/app/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { user, organizationId } = useAuth()
	console.log("user", user, organizationId)
	return <div>Hello "/app/"!</div>
}
