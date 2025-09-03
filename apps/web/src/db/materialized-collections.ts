import { createCollection, eq, liveQueryCollectionOptions } from "@tanstack/react-db"
import { channelMemberCollection, userCollection } from "./collections"

export const channelMemberWithUserCollection = createCollection(
	liveQueryCollectionOptions({
		query: (q) =>
			q
				.from({ member: channelMemberCollection })
				.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
				.select(({ member, user }) => ({ ...member, user })),
		getKey: (item) => item.id,
	}),
)
