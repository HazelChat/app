import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import type { Id as IdType } from "@hazel/backend"
import { ConfectMutationCtx } from "./confect"
import { accountMutation } from "./middleware/withAccountEffect"
import { confectSchema } from "./schema"

export const acceptInvite = accountMutation({
	args: Schema.Struct({
		code: Schema.String,
	}),
	returns: Id.Id("servers"),
	handler: Effect.fn(function* ({ code, account }) {
		const ctx = yield* ConfectMutationCtx

		// Find invite by code
		const inviteOption = yield* ctx.db
			.query("invites")
			.withIndex("by_code", (q) => q.eq("code", code))
			.unique()

		if (Option.isNone(inviteOption)) {
			return yield* Effect.fail(new Error("Invite not found or invalid"))
		}

		const invite = inviteOption.value

		// Expiry / revocation checks
		if (invite.expiresAt && invite.expiresAt < Date.now()) {
			return yield* Effect.fail(new Error("Invite has expired"))
		}
		if (invite.revokedAt) {
			return yield* Effect.fail(new Error("Invite has been revoked"))
		}

		// Create user/member if not already in server
		const userId = yield* ctx.db.insert("users", {
			accountId: account._id,
			serverId: invite.serverId as IdType<"servers">,
			displayName: account.displayName,
			tag: account.displayName,
			avatarUrl: account.avatarUrl,
			role: "member",
			status: "online",
			joinedAt: Date.now(),
			lastSeen: Date.now(),
		})

		// Optionally mark invite as used (single-use)
		// yield* ctx.db.patch(invite._id, { revokedAt: Date.now() })

		return invite.serverId
	}),
})

export const createInvite = accountMutation({
	args: Schema.Struct({
		serverId: Id.Id("servers"),
		expiresInHours: Schema.optional(Schema.Number),
	}),
	returns: Schema.Struct({
		inviteId: Id.Id("invites"),
		code: Schema.String,
	}),
	handler: Effect.fn(function* ({ serverId, expiresInHours, account }) {
		const ctx = yield* ConfectMutationCtx

		// Ensure requesting user is a member & owner/admin (simplified: just member)
		const membershipOption = yield* ctx.db
			.query("users")
			.withIndex("by_accountId_serverId", (q) =>
				q.eq("accountId", account._id).eq("serverId", serverId),
			)
			.unique()

		if (Option.isNone(membershipOption)) {
			return yield* Effect.fail(new Error("You are not a member of this server"))
		}

		const membership = membershipOption.value

		// Generate unique code
		let code: string
		let attempts = 0
		while (true) {
			code = Math.random().toString(36).substring(2, 8)
			const existingOption = yield* ctx.db
				.query("invites")
				.withIndex("by_code", (q) => q.eq("code", code))
				.unique()
			if (Option.isNone(existingOption)) break
			attempts++
			if (attempts > 5) {
				return yield* Effect.fail(new Error("Failed to generate invite code"))
			}
		}

		const inviteId = yield* ctx.db.insert("invites", {
			serverId: serverId,
			creatorId: membership._id as IdType<"users">,
			code,
			expiresAt: expiresInHours ? Date.now() + expiresInHours * 3600_000 : undefined,
			createdAt: Date.now(),
		})

		return { inviteId, code }
	}),
})
