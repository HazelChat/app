import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

interface User {
	id: string
	email: string
	firstName?: string
	lastName?: string
	avatarUrl?: string
}

interface AuthContextType {
	user: User | null
	isLoading: boolean
	login: (returnTo?: string) => Promise<void>
	logout: () => void
	refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3003"

	// Fetch current user from backend
	const refreshUser = async () => {
		try {
			const response = await fetch(`${backendUrl}/users/me`, {
				credentials: "include", // Include cookies in the request
			})

			if (response.ok) {
				const userData = await response.json()
				setUser(userData)
			} else {
				setUser(null)
			}
		} catch (error) {
			console.error("Failed to fetch user:", error)
			setUser(null)
		} finally {
			setIsLoading(false)
		}
	}

	// Login by fetching the authorization URL from backend
	const login = async (returnTo?: string) => {
		const loginUrl = new URL(`${backendUrl}/auth/login`)
		if (returnTo) {
			loginUrl.searchParams.append("returnTo", returnTo)
		}

		const response = await fetch(loginUrl.toString(), {
			credentials: "include",
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(error || "Failed to get login URL")
		}

		const data = await response.json()
		window.location.href = data.authorizationUrl
	}

	// Logout
	const logout = async () => {
		try {
			await fetch(`${backendUrl}/auth/logout`, {
				method: "POST",
				credentials: "include",
			})
			setUser(null)
			window.location.href = "/"
		} catch (error) {
			console.error("Failed to logout:", error)
		}
	}

	// Check auth status on mount
	useEffect(() => {
		refreshUser()
	}, [])

	return (
		<AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}