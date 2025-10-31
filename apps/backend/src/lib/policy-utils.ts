type OrganizationRole = "admin" | "member" | "owner"

/**
 * Check if an organization member role has admin privileges
 * @param role - The organization member role ("admin", "member", or "owner")
 * @returns true if role is "admin" or "owner"
 */
export const isAdminOrOwner = (role: OrganizationRole): boolean => {
	return role === "admin" || role === "owner"
}
