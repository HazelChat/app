import { createFileRoute } from "@tanstack/solid-router"
import { type } from "arktype"
import { useAuth } from "authkit-solidjs"
import { createEffect } from "solid-js"

export const Route = createFileRoute("/_auth/sign-in")({
	component: RouteComponent,
	validateSearch: type({
		"redirectTo?": "string",
	}),
})

function RouteComponent() {
	const { signIn } = useAuth()

	createEffect(() => {
		signIn({})
	})
	return <></>
}
