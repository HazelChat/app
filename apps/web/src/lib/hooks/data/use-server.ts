import { createQuery } from "@rocicorp/zero/solid"
import { type Accessor, createMemo } from "solid-js"
import { CACHE_AWHILE } from "~/lib/zero/query-cache-policy"
import { useZero } from "~/lib/zero/zero-context"

export const useServer = (serverId: Accessor<string>) => {
	const z = useZero()

	const serverQuery = createMemo(() => z.query.server.where((eq) => eq.and(eq.cmp("id", "=", serverId()))).one())

	const [server, serversStatus] = createQuery(serverQuery, CACHE_AWHILE)

	const isLoading = createMemo(() => serversStatus().type !== "complete")

	return { server, isLoading }
}
