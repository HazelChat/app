/**
 * Verify if the current session is still valid
 * This is used when Electric returns a 401/403 to check if the session has expired
 *
 * @returns true if the session is valid, false if it's expired
 */
export async function verifyAuthSession(): Promise<boolean> {
	try {
		// Try to fetch the /auth/verify endpoint or similar
		// For now, we'll just make a simple fetch to the user.me endpoint
		const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rpc/user.me`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		})

		// If we get a 200, the session is valid
		return response.ok
	} catch (error) {
		// If the call fails, the session is likely expired
		console.error("Auth session verification failed:", error)
		return false
	}
}

/**
 * Handle auth error by verifying session and redirecting if needed
 * Returns true if session is still valid (can retry), false if session expired (should redirect)
 */
export async function handleAuthError(): Promise<boolean> {
	// Verify if the session is still valid
	const isValid = await verifyAuthSession()

	if (!isValid) {
		// Session is expired, redirect to login
		console.log("Session expired, redirecting to login...")
		const loginUrl = new URL("/auth/login", import.meta.env.VITE_BACKEND_URL)
		loginUrl.searchParams.set("returnTo", window.location.href)
		window.location.href = loginUrl.toString()
		return false
	}

	// Session is still valid, can retry
	console.log("Session is still valid, retrying Electric connection...")
	return true
}
