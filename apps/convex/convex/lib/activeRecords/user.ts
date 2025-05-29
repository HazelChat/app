import type { Doc, Id } from "convex-hazel/_generated/dataModel"
import type { MutationCtx, QueryCtx } from "convex-hazel/_generated/server"
import type { UserIdentity } from "convex/server"
import { Account } from "./account"

export type GenericContext = QueryCtx | MutationCtx

export class User {
	private constructor(
		private readonly user: Doc<"users">,
		private readonly account: Account,
	) {}

	static async fromIdentity(ctx: GenericContext, identity: UserIdentity, serverId: string) {
		const account = await Account.fromIdentity(ctx, identity)

		const user = await ctx.db
			.query("users")
			.withIndex("by_accountId", (q) => q.eq("accountId", account.id))
			.filter((q) => q.eq(q.field("serverId"), serverId))
			.unique()

		if (!user) throw new Error("User not found")

		return new User(user, account)
	}

	public async isMemberOfChannel(args: { ctx: GenericContext; channelId: Id<"channels"> }) {
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

	public async canViewChannel({ ctx, channelId }: { ctx: GenericContext; channelId: Id<"channels"> }) {
		const channel = await ctx.db.get(channelId)
		if (!channel) throw new Error("Channel not found")

		return channel.type === "public" || (await this.isMemberOfChannel({ ctx, channelId }))
	}
	public async validateCanViewChannel({ ctx, channelId }: { ctx: GenericContext; channelId: Id<"channels"> }) {
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

	public async canAccessPinnedMessage(args: { ctx: GenericContext; pinnedMessageId: Id<"pinnedMessages"> }) {
		const pinnedMessage = await args.ctx.db.get(args.pinnedMessageId)
		if (!pinnedMessage) throw new Error("Pinned message not found")

		return await this.canViewChannel({ ctx: args.ctx, channelId: pinnedMessage.channelId })
	}
	public async validateCanAccessPinnedMessage(args: { ctx: GenericContext; pinnedMessageId: Id<"pinnedMessages"> }) {
		if (!(await this.canAccessPinnedMessage(args))) {
			throw new Error("You do not have permission to delete this pinned message")
		}
	}

	public async ownsReaction({ ctx, reactionId }: { ctx: GenericContext; reactionId: Id<"reactions"> }) {
		const reaction = await ctx.db.get(reactionId)
		if (!reaction) throw new Error("Reaction not found")

		return reaction.userId === this.user._id
	}
	public async validateOwnsReaction({ ctx, reactionId }: { ctx: GenericContext; reactionId: Id<"reactions"> }) {
		if (!(await this.ownsReaction({ ctx, reactionId }))) {
			throw new Error("You do not have permission to delete this reaction")
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
}
