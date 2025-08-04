import { describe, expect, test } from "vitest"
import { api } from "../convex/_generated/api"
import { convexTest, createAccount, createOrganization, randomIdentity } from "./utils/data-generator"

describe("users and organizations", () => {
	test("creating users works", async () => {
		const t = randomIdentity(convexTest())
		const userId = await createAccount(t)

		// Check user was created
		const user = await t.run(async (ctx) => ctx.db.get(userId))
		expect(user).toBeDefined()
		expect(user?.externalId).toBeDefined()
	})

	test("creating users multiple times returns the same id", async () => {
		const t = randomIdentity(convexTest())
		const id = await createAccount(t)
		const id2 = await createAccount(t)
		expect(id).toEqual(id2)
	})

	test("creating users without authentication fails", async () => {
		const t = convexTest()
		await expect(createAccount(t)).rejects.toThrow("No identity found")
	})

	test("users can join organizations", async () => {
		const ct = convexTest()
		const t = randomIdentity(ct)
		const userId = await createAccount(t)
		const organizationId = await createOrganization(t)

		// Add user to organization
		const membershipId = await t.mutation(api.users.addToOrganization, {
			organizationId,
			role: "member",
		})

		// Check membership was created
		const membership = await t.run(async (ctx) => ctx.db.get(membershipId))
		expect(membership).toBeDefined()
		expect(membership?.userId).toEqual(userId)
		expect(membership?.organizationId).toEqual(organizationId)
		expect(membership?.role).toEqual("member")
	})

	test("users cannot join organization twice", async () => {
		const ct = convexTest()
		const t = randomIdentity(ct)
		await createAccount(t)
		const organizationId = await createOrganization(t)

		// Add user to organization
		await t.mutation(api.users.addToOrganization, {
			organizationId,
			role: "member",
		})

		// Try to add again
		await expect(
			t.mutation(api.users.addToOrganization, {
				organizationId,
				role: "member",
			}),
		).rejects.toThrow("User is already a member of this organization")
	})

	test("users can retrieve their information", async () => {
		const ct = convexTest()
		const t = randomIdentity(ct)
		const userId = await createAccount(t)

		// Get user info via me.get
		const me = await t.query(api.me.get, {})
		expect(me._id).toEqual(userId)
	})
})
