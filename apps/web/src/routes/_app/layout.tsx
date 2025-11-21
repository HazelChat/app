import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Option } from "effect"
import { toast } from "sonner"
import { Loader } from "~/components/loader"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"

export const Route = createFileRoute("/_app")({
	component: RouteComponent,
	loader: async () => {
		await organizationCollection.preload()
		await organizationMemberCollection.preload()

		return null
	},
})

function RouteComponent() {
	const { user, error, isLoading } = useAuth()

	console.log("user", user, isLoading)

	// Redirect unauthenticated users directly to backend login endpoint
	// This skips the intermediate "Redirecting to login..." page

	// return <div>Hello</div>
	if (!user && !isLoading) {
		const returnTo = encodeURIComponent(window.location.href)
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
		window.location.href = `${backendUrl}/auth/login?returnTo=${returnTo}`

		if (Option.isSome(error)) {
			toast.error(error.value.message)
		}

		return <Loader />
	}

	return isLoading && !user ? <Loader /> : <Outlet />
}
