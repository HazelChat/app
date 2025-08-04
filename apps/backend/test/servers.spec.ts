import { describe, expect, test } from "vitest"
import { api } from "../convex/_generated/api"

import { convexTest, createAccount, createOrganization, createServerAndAccount, randomIdentity } from "./utils/data-generator"

describe("organizations", () => {
	test("organizations are created in data generator", async () => {
		const t = randomIdentity(convexTest())
		const organizationId = await createOrganization(t)
		expect(organizationId).toBeDefined()
	})

	test("can create account and organization", async () => {
		const t = randomIdentity(convexTest())
		const { organization, userId } = await createServerAndAccount(t)
		expect(organization).toBeDefined()
		expect(userId).toBeDefined()
	})

	test("cannot retrieve users without authentication", async () => {
		const ct = convexTest()
		const t = randomIdentity(ct)
		const { organization } = await createServerAndAccount(t)
		
		// Try to get users without auth
		const unauthenticatedT = convexTest()
		await expect(
			unauthenticatedT.query(api.users.getUsers, {})
		).rejects.toThrow("Not authenticated")
	})

	test("can retrieve users with authentication and membership", async () => {
		const ct = convexTest()
		const org = await createOrganization(ct)
		const orgDoc = await ct.run(async (ctx) => {
			const doc = await ctx.db.get(org)
			if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
			return doc
		})
		
		// Create identity with workosId
		const t = randomIdentity(ct, orgDoc.workosId)
		const userId = await createAccount(t)
		
		// Add user to organization
		await t.run(async (ctx) => {
			await ctx.db.insert("organizationMembers", {
				organizationId: org,
				userId,
				role: "owner",
				joinedAt: Date.now(),
			})
		})
		
		const users = await t.query(api.users.getUsers, {})
		expect(users.length).toEqual(1)
		expect(users[0]?.role).toEqual("owner")
	})

	test("cannot retrieve users from other organizations", async () => {
		const ct = convexTest()
		
		// Create first org with user
		const org1 = await createOrganization(ct)
		const org1Doc = await ct.run(async (ctx) => {
			const doc = await ctx.db.get(org1)
			if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
			return doc
		})
		const t1 = randomIdentity(ct, org1Doc.workosId)
		const user1 = await createAccount(t1)
		await t1.run(async (ctx) => {
			await ctx.db.insert("organizationMembers", {
				organizationId: org1,
				userId: user1,
				role: "owner",
				joinedAt: Date.now(),
			})
		})
		
		// Create second org with different user
		const org2 = await createOrganization(ct)
		const org2Doc = await ct.run(async (ctx) => {
			const doc = await ctx.db.get(org2)
			if (!doc || !('workosId' in doc)) throw new Error("Invalid organization")
			return doc
		})
		const t2 = randomIdentity(ct, org2Doc.workosId)
		const user2 = await createAccount(t2)
		await t2.run(async (ctx) => {
			await ctx.db.insert("organizationMembers", {
				organizationId: org2,
				userId: user2,
				role: "owner",
				joinedAt: Date.now(),
			})
		})
		
		// User 1 can see their own org users
		const users1 = await t1.query(api.users.getUsers, {})
		expect(users1.length).toEqual(1)
		
		// User 2 can see their own org users
		const users2 = await t2.query(api.users.getUsers, {})
		expect(users2.length).toEqual(1)
		
		// They should see different users
		expect(users1[0]?._id).not.toEqual(users2[0]?._id)
	})

	test("createServerAndAccount creates user as owner", async () => {
		const t = randomIdentity(convexTest())
		const { organization, userId } = await createServerAndAccount(t)
		
		// Check membership
		const membership = await t.run(async (ctx) => {
			return await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId_userId", (q) => 
					q.eq("organizationId", organization).eq("userId", userId)
				)
				.unique()
		})
		
		expect(membership).toBeDefined()
		expect(membership?.role).toEqual("owner")
	})
})