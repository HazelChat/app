import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/auth/callback")({
	component: CallbackPage,
})

function CallbackPage() {
	const [error, setError] = useState<string | null>(null)
	const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3003"

	useEffect(() => {
		// The backend callback will handle the authentication
		// and redirect back to the frontend with the session cookie set
		const searchParams = new URLSearchParams(window.location.search)
		const code = searchParams.get("code")
		const state = searchParams.get("state")
		const errorParam = searchParams.get("error")

		if (errorParam) {
			setError(`Authentication failed: ${errorParam}`)
			return
		}

		if (code) {
			// Redirect to backend callback with the same parameters
			const backendCallbackUrl = new URL(`${backendUrl}/auth/callback`)
			backendCallbackUrl.search = window.location.search
			window.location.href = backendCallbackUrl.toString()
		} else {
			setError("No authorization code received")
		}
	}, [backendUrl])

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="mb-4 font-semibold text-red-600 text-2xl">Authentication Error</h1>
					<p className="mb-4 text-gray-600">{error}</p>
					<button
						onClick={() => window.location.href = "/auth/login"}
						className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Try Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 font-semibold text-2xl">Processing authentication...</h1>
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2"></div>
			</div>
		</div>
	)
}