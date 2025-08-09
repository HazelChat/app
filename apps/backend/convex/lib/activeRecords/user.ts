import type { Doc, Id } from "@hazel/backend"
import type { MutationCtx, QueryCtx } from "@hazel/backend/server"
import type { UserIdentity } from "convex/server"

export type GenericContext = QueryCtx | MutationCtx

export class User {
	private constructor(
		private readonly user: Doc<"users">,
		private readonly organizationMembership?: Doc<"organizationMembers">,
	) {}

	static async fromIdentity(
		ctx: GenericContext,
		identity: UserIdentity,
		organizationId?: Id<"organizations">,
	) {
		// Find user by externalId (from WorkOS)
		const user = await ctx.db
			.query("users")
			.withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
			.unique()

		if (!user) throw new Error("User not found")

		// If organizationId is provided, get membership
		let membership: Doc<"organizationMembers"> | undefined
		if (organizationId) {
			membership =
				(await ctx.db
					.query("organizationMembers")
					.withIndex("by_organizationId_userId", (q) =>
						q.eq("organizationId", organizationId).eq("userId", user._id),
					)
					.unique()) || undefined
		}

		return new User(user, membership)
	}

	public async isMemberOfChannel(args: { ctx: GenericContext; channelId: Id<"channels"> }): Promise<boolean> {
		const channel = await args.ctx.db.get(args.channelId)
		if (!channel) return false

		// For thread channels, check membership of parent channel
		if (channel.type === "thread" && channel.parentChannelId) {
			return await this.isMemberOfChannel({ ctx: args.ctx, channelId: channel.parentChannelId })
		}

		const channelMember = await args.ctx.db
			.query("channelMembers")
			.filter((q) => q.eq(q.field("userId"), this.user._id))
			.filter((q) => q.eq(q.field("channelId"), args.channelId))
			.first()

		return channelMember != null
	}
	public async validateIsMemberOfChannel(args: { ctx: GenericContext; channelId: Id<"channels"> }) {
		if (!(await this.isMemberOfChannel(args))) {
			throw new Error("You are not a member of this channel")
		}
	}

	public async canViewChannel({ ctx, channelId }: { ctx: GenericContext; channelId: Id<"channels"> }): Promise<boolean> {
		const channel = await ctx.db.get(channelId)
		if (!channel) throw new Error("Channel not found")

		// For thread channels, check if user can view the parent channel
		if (channel.type === "thread" && channel.parentChannelId) {
			return await this.canViewChannel({ ctx, channelId: channel.parentChannelId })
		}

		return channel.type === "public" || (await this.isMemberOfChannel({ ctx, channelId }))
	}
	public async validateCanViewChannel({
		ctx,
		channelId,
	}: {
		ctx: GenericContext
		channelId: Id<"channels">
	}) {
		if (!(await this.canViewChannel({ ctx, channelId }))) {
			throw new Error("You do not have access to this channel")
		}
	}

	public async ownsMessage({ ctx, messageId }: { ctx: GenericContext; messageId: Id<"messages"> }) {
		const message = await ctx.db.get(messageId)
		if (!message) throw new Error("Message not found")

		return message.authorId === this.user._id
	}
	public async validateOwnsMessage({ ctx, messageId }: { ctx: GenericContext; messageId: Id<"messages"> }) {
		if (!(await this.ownsMessage({ ctx, messageId }))) {
			throw new Error("You do not have permission to update this message")
		}
	}

	// public async canViewUser({ ctx, userId }: { ctx: GenericContext; userId: Id<"users"> }) {
	// 	if(userId === this.user._id) return true
	// }
	// public async validateCanViewUser({ ctx, userId }: { ctx: GenericContext; userId: Id<"users"> }) {
	// 	if (!(await this.canViewUser({ ctx, userId }))) {
	// 		throw new Error("You do not have permission to view this user")
	// 	}
	// }
	public get doc(): Doc<"users"> {
		return this.user
	}

	public get id(): Id<"users"> {
		return this.user._id
	}

	public get membership(): Doc<"organizationMembers"> | undefined {
		return this.organizationMembership
	}

	public get role(): string | undefined {
		return this.organizationMembership?.role
	}
}
