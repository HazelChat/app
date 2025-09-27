import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useAuth } from "../../providers/auth-provider"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/auth/login")({
	component: LoginPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			returnTo: search.returnTo as string | undefined,
		}
	},
})

function LoginPage() {
	const { user, login, isLoading } = useAuth()
	const search = Route.useSearch()

	useEffect(() => {
		if (!user && !isLoading) {
			// Redirect to backend login endpoint
			login(search.returnTo || "/")
		}
	}, [user, isLoading, login, search.returnTo])

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2"></div>
			</div>
		)
	}

	if (user) {
		return <Navigate to={search.returnTo || "/"} />
	}

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 font-semibold text-2xl">Redirecting to login...</h1>
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2"></div>
			</div>
		</div>
	)
}
