import { createQuery } from "@rocicorp/zero/solid"
import { type Accessor, createMemo } from "solid-js"
import { useZero } from "~/lib/zero/zero-context"

export const useServerMemmbers = ({
	searchQuery,
	serverId,
}: { serverId: Accessor<string>; searchQuery: Accessor<string | undefined> }) => {
	const z = useZero()

	const serverMembersQuery = createMemo(() =>
		z.query.serverMembers
			.related("user")
			.where((eq) => eq.and(eq.cmp("serverId", "=", serverId())))
			.whereExists("user", (eq) => eq.where("displayName", "LIKE", `%${searchQuery() || ""}%`)),
	)

	const [serverMemberss, status] = createQuery(serverMembersQuery)

	const isLoading = createMemo(() => status().type !== "complete")

	return { members: serverMemberss, isLoading }
}
