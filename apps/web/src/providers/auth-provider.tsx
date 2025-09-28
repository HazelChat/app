import { useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import type { CurrentUser } from "@hazel/db/schema"
import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { HazelApiClient } from "~/lib/services/common/atom-client"

type User = typeof CurrentUser.Schema.Type

interface LoginOptions {
	returnTo?: string
	workosOrganizationId?: string
	invitationToken?: string
}

interface AuthContextType {
	user: User | null
	isLoading: boolean
	login: (options?: LoginOptions) => Promise<void>
	logout: () => void
	refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const loginMutation = useAtomSet(HazelApiClient.mutation("auth", "login"), {
		mode: "promise",
	})

	const currentUserResult = useAtomValue(
		HazelApiClient.query("users", "me", {
			reactivityKeys: ["currentUser"],
		}),
	)

	useEffect(() => {
		if (currentUserResult._tag === "Success") {
			setUser(currentUserResult.value)
			setIsLoading(false)
		} else if (currentUserResult._tag === "Failure") {
			setUser(null)
			setIsLoading(false)
		} else if (currentUserResult._tag === "Initial") {
			setIsLoading(true)
		}
	}, [currentUserResult])

	// Refresh user by invalidating the atom
	const refreshUser = async () => {
		// The atom will automatically refresh when dependencies change
		// For manual refresh, we would need to use atom invalidation
		// For now, this will be handled by the atom's internal caching
	}

	const login = async (options?: LoginOptions) => {
		const data = await loginMutation({
			urlParams: {
				...options,
				returnTo: options?.returnTo || location.href,
			},
		})

		window.location.href = data.authorizationUrl
	}

	// Logout using Effect Atom mutation
	const logout = async () => {
		try {
			setUser(null)

			window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/logout`
		} catch (error) {
			console.error("Failed to logout:", error)
		}
	}

	// The atom will automatically fetch on mount, no need for manual effect

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
