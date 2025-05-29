import type { Id } from "convex-hazel/_generated/dataModel"
import { api } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import { convexTest as _convexTest, type TestConvex, type TestConvexForDataModel } from "convex-test"
import { modules } from "../../convex/test.setup"

export function randomIdentity(convexTest: TestConvex<typeof schema>) {
	return convexTest.withIdentity({ tokenIdentifier: crypto.randomUUID(), subject: crypto.randomUUID() })
}

export function convexTest() {
	return _convexTest(schema, modules)
}

export async function createAccount(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props?: { displayName?: string },
) {
	const displayName = props?.displayName || "Alice"
	return await t.mutation(api.accounts.createAccount, { displayName })
}

export async function createServer(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props?: { name?: string },
) {
	const name = props?.name || "Test Server"
	return await t.mutation(api.servers.createServer, { name })
}

export async function createServerAndAccount(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
) {
	const account = await createAccount(t)
	const server = await createServer(t)
	return { account, server }
}

export async function createUser(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: { role?: "member" | "admin" | "owner"; serverId: Id<"servers"> },
) {
	const role = props.role || "member"
	return await t.mutation(api.users.createUser, { role, serverId: props.serverId })
}

export async function createChannel(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: { serverId: Id<"servers">; userId: Id<"users"> },
) {
	return await t.mutation(api.channels.createChannel, {
		serverId: props.serverId,
		name: "Test Channel",
		type: "public",
		ownerId: props.userId,
	})
}
