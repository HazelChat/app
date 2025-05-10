import { ANYONE_CAN, type ExpressionBuilder, type PermissionsConfig, type Row, definePermissions } from "@rocicorp/zero"

import { type Schema, schema } from "./drizzle-zero.gen"

export { schema, type Schema }

export type Message = Row<typeof schema.tables.messages>
export type User = Row<typeof schema.tables.users>
export type Channel = Row<typeof schema.tables.serverChannels>
export type Member = Row<typeof schema.tables.channelMembers>

// The contents of your decoded JWT.
type AuthData = {
	sub: string | null
}

type TableName = keyof Schema["tables"]

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	const messages_allowIfMessageSender = (authData: AuthData, { cmp }: ExpressionBuilder<Schema, "messages">) =>
		cmp("authorId", "=", authData.sub ?? "")

	const users_allowIfOwner = (authData: AuthData, { cmp }: ExpressionBuilder<Schema, "users">) =>
		cmp("id", "=", authData.sub ?? "")

	const allowIfRowOwner = (authData: AuthData, { cmpLit }: ExpressionBuilder<Schema, TableName>) =>
		cmpLit("userId", "=", authData.sub)

	const serverChannels_isChannelParticipant = (authData: AuthData, eb: ExpressionBuilder<Schema, "serverChannels">) =>
		eb.exists("users", (iq) => iq.where("id", "=", authData.sub ?? ""))

	const serverChannels_isChannelPublic = (authData: AuthData, eb: ExpressionBuilder<Schema, "serverChannels">) =>
		eb.and(
			// Channel is public
			eb.cmp("channelType", "=", "public"),
			// And the user is a member of the server
			eb.exists("server", (iq) => iq.whereExists("members", (iq) => iq.where("userId", "=", authData.sub ?? ""))),
		)

	const pinnedMessages_isChannelParticipant = (
		authData: AuthData,
		eb: ExpressionBuilder<Schema, "pinnedMessages" | "messages">,
	) => eb.or(eb.exists("channel", (iq) => iq.whereExists("users", (iq) => iq.where("id", "=", authData.sub ?? ""))))

	const server_isMemberOfServer = (authData: AuthData, eb: ExpressionBuilder<Schema, "server">) =>
		eb.or(eb.exists("members", (iq) => iq.where("userId", "=", authData.sub ?? "")))

	const serverMembers_isServerMember = (authData: AuthData, eb: ExpressionBuilder<Schema, "serverMembers">) =>
		eb.exists("server", (iq) => iq.whereExists("members", (mq) => mq.where("userId", "=", authData.sub ?? "")))

	const server_isServerOwner = (authData: AuthData, eb: ExpressionBuilder<Schema, "server">) =>
		eb.or(
			eb.exists("members", (iq) =>
				iq.where((eq) => eq.and(eq.cmp("userId", "=", authData.sub ?? ""), eq.cmp("role", "=", "owner"))),
			),
		)

	const server_isPublicServer = (_: AuthData, eb: ExpressionBuilder<Schema, "server">) =>
		eb.cmp("type", "=", "public")

	// Only allow access to messages in channels the user is part of or public channels in servers the user is part of
	const messages_canAccessMessage = (authData: AuthData, eb: ExpressionBuilder<Schema, "messages">) =>
		eb.or(
			// Message is in a channel the user is a participant of
			eb.exists("channel", (iq) => iq.whereExists("users", (uq) => uq.where("id", "=", authData.sub ?? ""))),
			// Message is in a public channel of a server the user is a member of
			eb.exists("channel", (iq) =>
				iq.where((chq) =>
					chq.and(
						chq.cmp("channelType", "=", "public"),
						chq.exists("server", (siq) =>
							siq.whereExists("members", (miq) => miq.where("userId", "=", authData.sub ?? "")),
						),
					),
				),
			),
		)

	const channelMembers_isChannelParticipant = (authData: AuthData, eb: ExpressionBuilder<Schema, "channelMembers">) =>
		eb.exists("channel", (iq) => iq.whereExists("users", (uq) => uq.where("id", "=", authData.sub ?? "")))

	const channelMembers_isPublicChannel = (authData: AuthData, eb: ExpressionBuilder<Schema, "channelMembers">) =>
		eb.and(
			// Channel is public
			eb.exists("channel", (iq) => iq.where("channelType", "=", "public")),
			// And the user is a member of the server
			eb.exists("channel", (iq) =>
				iq.whereExists("server", (siq) =>
					siq.whereExists("members", (miq) => miq.where("userId", "=", authData.sub ?? "")),
				),
			),
		)

	const reactions_isChannelParticipant = (authData: AuthData, eb: ExpressionBuilder<Schema, "reactions">) =>
		eb.or(
			// Reaction is in a public channel
			eb.exists("message", (iq) => iq.whereExists("channel", (cq) => cq.where("channelType", "=", "public"))),
			// Reaction is in a channel the user is a participant of
			eb.exists("message", (iq) =>
				iq.whereExists("channel", (cq) =>
					cq.whereExists("users", (uq) => uq.where("id", "=", authData.sub ?? "")),
				),
			),
		)

	const reactions_isReactionOwner = (authData: AuthData, eb: ExpressionBuilder<Schema, "reactions">) =>
		eb.cmp("userId", "=", authData.sub ?? "")

	const reactions_canAccessReaction = (authData: AuthData, eb: ExpressionBuilder<Schema, "reactions">) =>
		eb.or(
			// Reaction is in a channel the user is a participant of
			eb.exists("message", (iq) =>
				iq.whereExists("channel", (cq) =>
					cq.whereExists("users", (uq) => uq.where("id", "=", authData.sub ?? "")),
				),
			),
		)

	return {
		users: {
			row: {
				// If we ever have PII data in here (e.g. emails, phone numbers, etc.) we should restrict this
				select: ANYONE_CAN,
				insert: [users_allowIfOwner],
				update: {
					preMutation: [users_allowIfOwner],
					postMutation: [users_allowIfOwner],
				},
				// TODO: We probably don't want to allow this at all and instead set the user to inactive
				delete: [users_allowIfOwner],
			},
		},
		messages: {
			row: {
				insert: [messages_allowIfMessageSender],
				update: {
					preMutation: [messages_allowIfMessageSender],
					postMutation: [messages_allowIfMessageSender],
				},
				delete: [messages_allowIfMessageSender],
				select: [messages_canAccessMessage],
			},
		},
		pinnedMessages: {
			row: {
				select: [pinnedMessages_isChannelParticipant],
				update: {
					preMutation: [pinnedMessages_isChannelParticipant],
					postMutation: [pinnedMessages_isChannelParticipant],
				},
				insert: [pinnedMessages_isChannelParticipant],
				delete: [pinnedMessages_isChannelParticipant],
			},
		},
		server: {
			row: {
				select: [server_isMemberOfServer, server_isPublicServer],
				// TODO: We probably want some restrictions on here, like max servers per user.
				insert: ANYONE_CAN,
				update: {
					preMutation: [server_isServerOwner],
					postMutation: [server_isServerOwner],
				},
			},
		},
		serverMembers: {
			row: {
				select: [serverMembers_isServerMember],
				// TODO: This is definitely incorrect, we should only allow inserts if the user is a member of the server (via invites)
				insert: ANYONE_CAN,
			},
		},
		serverChannels: {
			row: {
				select: [serverChannels_isChannelParticipant, serverChannels_isChannelPublic],
				update: {
					preMutation: [serverChannels_isChannelParticipant],
					postMutation: [serverChannels_isChannelParticipant],
				},
				insert: [serverChannels_isChannelParticipant],
				delete: [serverChannels_isChannelParticipant],
			},
		},
		channelMembers: {
			row: {
				select: [channelMembers_isChannelParticipant, channelMembers_isPublicChannel],
				insert: [channelMembers_isChannelParticipant],
				update: {
					preMutation: [channelMembers_isChannelParticipant],
					postMutation: [channelMembers_isChannelParticipant],
				},
				delete: [channelMembers_isChannelParticipant],
			},
		},
		reactions: {
			row: {
				select: [reactions_canAccessReaction],
				insert: [reactions_isChannelParticipant],
				delete: [reactions_isReactionOwner],
			},
		},
	} satisfies PermissionsConfig<AuthData, Schema>
})
