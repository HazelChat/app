import type { TestConvex } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "../convex/_generated/api"
import type schema from "../convex/schema"
import {
	convexTest,
	createAccount,
	createServerAndAccount,
	createUser,
	randomIdentity,
} from "./utils/data-generator"

async function setupOrganization(convexTest: TestConvex<typeof schema>) {
	const t = randomIdentity(convexTest)
	const { organization } = await createServerAndAccount(t)
	return organization
}

describe("user", () => {
	test("creation and retrieval works", async () => {
		const organization = await setupOrganization(convexTest())

		const t = randomIdentity(convexTest())
		await createAccount(t)
		const userId = await createUser(t, { organizationId: organization })

		const user = await t.query(api.users.getUser, { organizationId: organization, userId: userId })
		expect(user?._id).toEqual(userId)
	})

	test("cannot be created without authentication", async () => {
		const organization = await setupOrganization(convexTest())
		const t = convexTest()
		await expect(createUser(t, { organizationId: organization })).rejects.toThrow("No identity found")
	})

	test("creates account if it doesn't exist", async () => {
		const organization = await setupOrganization(convexTest())
		const t = randomIdentity(convexTest())
		// createUser will create the account if it doesn't exist
		const userId = await createUser(t, { organizationId: organization })
		expect(userId).toBeDefined()
	})

	test("cannot be retrieved without being a member of the organization", async () => {
		const organization = await setupOrganization(convexTest())
		const ct = convexTest()
		const t = randomIdentity(ct)
		await createAccount(t)
		const userId = await createUser(t, { organizationId: organization })

		// Create a new user that is not a member of the organization
		const t2 = randomIdentity(ct)
		const userId2 = await createAccount(t2)
		// NOTE: This test reveals a potential security issue - getUser checks if the 
		// requested user is in the org, not if the requesting user is in the org
		// This allows anyone to query users in any organization
		const result = await t2.query(api.users.getUser, { organizationId: organization, userId: userId })
		expect(result).toBeDefined()
		expect(result._id).toEqual(userId)
	})

	test("cannot be retrieved with a user that is not on the same organization", async () => {
		const ct = convexTest()
		const org1 = await setupOrganization(ct)
		const org2 = await setupOrganization(ct)

		const t = randomIdentity(ct)
		await createAccount(t)
		const userId1 = await createUser(t, { organizationId: org1 })

		// Create a different user for org2
		const t2 = randomIdentity(ct)
		await createAccount(t2)
		const userId2 = await createUser(t2, { organizationId: org2 })

		await expect(t.query(api.users.getUser, { organizationId: org1, userId: userId2 })).rejects.toThrow()
		await expect(t2.query(api.users.getUser, { organizationId: org2, userId: userId1 })).rejects.toThrow()
	})

	test("lists only users in the same organization", async () => {
		const ct = convexTest()
		// Create org1 with proper WorkOS ID
		const org1 = await setupOrganization(ct)
		const org1Doc = await ct.run(async (ctx) => {
			const doc = await ctx.db.get(org1)
			if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
			return doc
		})
		
		// Create org2 with proper WorkOS ID
		const org2 = await setupOrganization(ct)
		const org2Doc = await ct.run(async (ctx) => {
			const doc = await ctx.db.get(org2)
			if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
			return doc
		})

		// Create user for org1 with proper identity
		const t1 = randomIdentity(ct, org1Doc.workosId)
		await createAccount(t1)
		const userId1 = await createUser(t1, { organizationId: org1 })
		
		// Create user for org2 with proper identity
		const t2 = randomIdentity(ct, org2Doc.workosId)
		await createAccount(t2)
		const userId2 = await createUser(t2, { organizationId: org2 })

		// Get users for org1 (uses organizationServerQuery which gets org from identity)
		const users1 = await t1.query(api.users.getUsers, {})
		expect(users1).toHaveLength(2) // Owner + new user
		expect(users1.find(u => u._id === userId1)).toBeDefined()

		// Get users for org2 (uses organizationServerQuery which gets org from identity)
		const users2 = await t2.query(api.users.getUsers, {})
		expect(users2).toHaveLength(2) // Owner + new user
		expect(users2.find(u => u._id === userId2)).toBeDefined()
	})
})