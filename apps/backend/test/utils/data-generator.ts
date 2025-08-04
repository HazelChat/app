import type { Id } from "@hazel/backend"
import { convexTest as _convexTest, type TestConvex, type TestConvexForDataModel } from "convex-test"
import { api } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import { modules } from "../setup"

export function randomIdentity(convexTest: TestConvex<typeof schema>, organizationId?: string) {
	const identity = { 
		tokenIdentifier: crypto.randomUUID(), 
		subject: crypto.randomUUID(),
		...(organizationId && { organizationId })
	}
	const t = convexTest.withIdentity(identity)
	// Store identity for later use
	;(t as any)._testIdentity = identity
	return t
}

export function convexTest() {
	const t = _convexTest(schema, modules)

	return t
}

export async function createAccount(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
) {
	// Get the stored identity
	const identity = (t as any)._testIdentity
	
	if (!identity) {
		throw new Error("No identity found - use randomIdentity() or withIdentity() first")
	}

	return await t.run(async (ctx) => {
		// Check if user already exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
			.unique()

		if (existingUser) {
			return existingUser._id
		}

		// Create user (simulating WorkOS webhook)
		return await ctx.db.insert("users", {
			externalId: identity.subject,
			email: `user-${identity.subject}@example.com`,
			firstName: "Test",
			lastName: "User",
			avatarUrl: `https://avatar.vercel.sh/${identity.subject}.svg`,
			lastSeen: Date.now(),
			status: "offline" as const,
		})
	})
}

export async function createServerAndAccount(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props?: { name?: string; slug?: string },
) {
	const userId = await createAccount(t)
	const organizationId = await createOrganization(t, props)

	// Add user as owner of the organization
	await t.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			organizationId,
			userId,
			role: "owner",
			joinedAt: Date.now(),
		})
	})

	return { server: organizationId, organization: organizationId, userId }
}

export async function createUser(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: { organizationId: Id<"organizations">; role?: "member" | "admin" | "owner" },
) {
	// Get the identity from the test context  
	const identity = (t as any)._testIdentity
	
	if (!identity) {
		throw new Error("No identity found - use randomIdentity() or withIdentity() first")
	}

	return await t.run(async (ctx) => {
		// Check if user already exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
			.unique()

		let userId: Id<"users">

		if (!existingUser) {
			// Create user if doesn't exist
			userId = await ctx.db.insert("users", {
				externalId: identity.subject,
				email: `user-${identity.subject}@example.com`,
				firstName: "Test",
				lastName: "User",
				avatarUrl: `https://avatar.vercel.sh/${identity.subject}.svg`,
				lastSeen: Date.now(),
				status: "offline" as const,
			})
		} else {
			userId = existingUser._id
		}

		// Check if already member
		const existingMembership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", props.organizationId).eq("userId", userId)
			)
			.unique()

		if (!existingMembership) {
			// Add user to organization
			await ctx.db.insert("organizationMembers", {
				organizationId: props.organizationId,
				userId,
				role: props.role || "member",
				joinedAt: Date.now(),
			})
		}

		return userId
	})
}

export async function createOrganization(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props?: { name?: string; slug?: string },
) {
	const name = props?.name || "Test Organization"
	const slug = props?.slug || "test-org"
	
	return await t.run(async (ctx) => {
		return await ctx.db.insert("organizations", {
			name,
			slug,
			workosId: `org_${crypto.randomUUID()}`,
		})
	})
}

// Servers are replaced by organizations - keeping for compatibility
export async function createServer(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props?: { name?: string },
) {
	return await createOrganization(t, { name: props?.name })
}

export async function createOrganizationAndUser(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
) {
	const organization = await createOrganization(t)
	const user = await createUser(t, { organizationId: organization })
	return { user, organization }
}

export async function addUserToOrganization(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: { role?: "member" | "admin" | "owner"; organizationId: Id<"organizations"> },
) {
	const role = props.role || "member"
	return await t.mutation(api.users.addToOrganization, { role, organizationId: props.organizationId })
}

export async function createChannel(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: { organizationId: Id<"organizations">; type?: "public" | "private" },
) {
	// Get the identity from the test context to find the current user
	const identity = (t as any)._testIdentity
	if (!identity) {
		throw new Error("No identity found - use randomIdentity() or withIdentity() first")
	}

	return await t.run(async (ctx) => {
		// Find the user
		const user = await ctx.db
			.query("users")
			.withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
			.unique()

		if (!user) {
			throw new Error("User not found - call createAccount first")
		}

		// Create the channel directly in the database
		const channelId = await ctx.db.insert("channels", {
			name: "Test Channel",
			organizationId: props.organizationId,
			type: props.type || "public",
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		// Add creator as member
		await ctx.db.insert("channelMembers", {
			channelId,
			userId: user._id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		return channelId
	})
}

export async function createMessage(
	t: TestConvex<typeof schema> | TestConvexForDataModel<(typeof schema)["schemaValidation"]>,
	props: {
		organizationId: Id<"organizations">
		channelId: Id<"channels">
		content?: string
		replyToMessageId?: Id<"messages">
		threadChannelId?: Id<"channels">
		attachedFiles?: string[]
	},
) {
	// Get the identity from the test context to find the current user
	const identity = (t as any)._testIdentity
	if (!identity) {
		throw new Error("No identity found - use randomIdentity() or withIdentity() first")
	}

	const messageId = await t.run(async (ctx) => {
		// Find the user
		const user = await ctx.db
			.query("users")
			.withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
			.unique()

		if (!user) {
			throw new Error("User not found - call createAccount first")
		}

		// Create the message directly in the database
		return await ctx.db.insert("messages", {
			channelId: props.channelId,
			content: props.content ?? "Test message content",
			jsonContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: props.content ?? "Test message content" }] }] },
			authorId: user._id,
			replyToMessageId: props.replyToMessageId,
			threadChannelId: props.threadChannelId,
			attachedFiles: props.attachedFiles || [],
			reactions: [],
			updatedAt: Date.now(),
		})
	})

	return messageId
}