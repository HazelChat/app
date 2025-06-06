import { useQuery, useSuspenseQuery } from "@tanstack/solid-query"
import { describe, test, expectTypeOf } from "vitest"
import { api } from "../../backend/convex/_generated/api.js"
import { convexAction, convexQuery } from "../src/lib/convex-query"

describe("query options factory types", () => {
        test("with useQuery", () => {
                if (1 + 2 === 3) return // test types only

                type ActionFunc = typeof api.expo.recordPushNotificationToken
                {
                        const action = convexAction(
                                api.expo.recordPushNotificationToken as any,
                                { token: "" },
                        )
                        const result = useQuery(action)
                        expectTypeOf(result.data).toEqualTypeOf<ActionFunc["_returnType"] | undefined>()
                }

                {
                        const action = convexAction(
                                api.expo.recordPushNotificationToken as any,
                                "skip",
                        )
                        const result = useQuery(action)
                        // Skip doesn't need to cause data in types since there's no point
                        // to always passing "skip".
                        expectTypeOf(result.data).toEqualTypeOf<ActionFunc["_returnType"] | undefined>()

                        // @ts-expect-error Actions with "skip" can't be used with useSuspenseQuery
                        useSuspenseQuery(action)
                }

                type QueryFunc = typeof api.presence.list
                {
                        const query = convexQuery(api.presence.list, { room: "" })
                        const result = useQuery(query)
                        expectTypeOf(result.data).toEqualTypeOf<QueryFunc["_returnType"] | undefined>()
                }

                {
                        const query = convexQuery(api.presence.list, "skip")
                        const result = useQuery(query)
                        // Skip doesn't need to cause data in types since there's no point
                        // to always passing "skip".
                        expectTypeOf(result.data).toEqualTypeOf<QueryFunc["_returnType"] | undefined>()

                        // @ts-expect-error Queries with "skip" can't be used with useSuspenseQuery
                        useSuspenseQuery(query)
                }
	})
})
