import { useAuth } from "@workos-inc/authkit-react"

export const useWorkOS = () => {
	const { switchToOrganization } = useAuth()

	return {
		switchToOrganization: async (organizationId: string) => {
			// The organizationId from Convex contains the WorkOS ID in the workosId field
			// We need to fetch the actual WorkOS ID if this is a Convex ID
			// For now, we'll assume the caller passes the correct WorkOS ID
			return switchToOrganization({ organizationId })
		},
	}
}
