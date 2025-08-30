import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import { createCollection } from "@tanstack/react-db"
import { convexQueryOptions } from "."

export const channelCollection = (organizationId: Id<"organizations">) =>
	createCollection({
		...queryCollectionOptions({
			...convexQueryOptions(api.channels.list, { organizationId }),
			getKey: (channel) => channel._id,
		}),
	})

export const messageCollection = createCollection(
	electricCollectionOptions({
		id: "messages",
		shapeOptions: {
			url: "https://api.electric-sql.cloud/v1/shape?source_id=382e0de8-797d-4395-9a5e-dafa86df0821&secret=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzb3VyY2VfaWQiOiIzODJlMGRlOC03OTdkLTQzOTUtOWE1ZS1kYWZhODZkZjA4MjEiLCJpYXQiOjE3NTY0MTkzMTJ9.Mgw0AAyt-vDM8In0G5BZN7FK6oYkvZV5Lw1sE4wRT6c",
			params: {
				table: "messages",
			},
		},
		getKey: (item) => item.id,
	}),
)
