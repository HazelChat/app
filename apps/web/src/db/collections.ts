import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import { createCollection } from "@tanstack/react-db"
import { convexQueryOptions } from "."

// export const channelCollections = (organizationId: Id<"organizations">) =>
// 	createCollection(
// 		queryCollectionOptions({
// 			...convexQueryOptions(api.channels.list, { organizationId }),
// 			getKey: (channel) => channel._id,
// 		}),
// 	)
