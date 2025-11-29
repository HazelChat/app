import type { Channel, ChannelMember, IntegrationConnection, User } from "@hazel/domain/models"
import type { ChannelId, MessageId, OrganizationId } from "@hazel/schema"
import { and, eq, isNull, useLiveQuery } from "@tanstack/react-db"
import { useAuth } from "~/lib/auth"
import {
	attachmentCollection,
	channelCollection,
	integrationConnectionCollection,
	messageCollection,
	userCollection,
} from "./collections"
import { channelMemberWithUserCollection } from "./materialized-collections"

export const useMessage = (messageId: MessageId) => {
	const { data, ...rest } = useLiveQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.innerJoin({ author: userCollection }, ({ message, author }) =>
					eq(message.authorId, author.id),
				)
				.where((q) => eq(q.message.id, messageId))
				.findOne()
				.select(({ message, author }) => ({ ...message, author: author }))
				.orderBy((q) => q.message.createdAt, "desc"),
		[messageId],
	)

	return {
		data,
		...rest,
	}
}

type ChannelWithMembers = typeof Channel.Model.Type & {
	members: (typeof ChannelMember.Model.Type & {
		user: typeof User.Model.Type
	})[]
}

export const useChannel = (channelId: ChannelId) => {
	const { data, ...rest } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where((t) => eq(t.channel.id, channelId))
				.innerJoin({ member: channelMemberWithUserCollection }, ({ channel, member }) =>
					eq(channel.id, member.channelId),
				),
		[channelId],
	)

	const channelWithMember = data.reduce(
		(acc, row) => {
			if (!acc) {
				acc = { ...row.channel, members: [] }
			}
			acc.members.push(row.member)
			return acc
		},
		null as ChannelWithMembers | null,
	)

	return {
		channel: channelWithMember,
		...rest,
	}
}

export const useChannelWithCurrentUser = (channelId: ChannelId) => {
	const { user } = useAuth()

	const { data, ...rest } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where((t) => eq(t.channel.id, channelId))
				.innerJoin({ member: channelMemberWithUserCollection }, ({ channel, member }) =>
					eq(channel.id, member.channelId),
				),
		[channelId],
	)

	const channelWithMember = data.reduce(
		(acc, row) => {
			if (!acc) {
				acc = { ...row.channel, members: [] }
			}
			acc.members.push(row.member)
			return acc
		},
		null as ChannelWithMembers | null,
	)

	const currentUserMember = channelWithMember?.members.find((m) => m.userId === user?.id)

	if (!currentUserMember) {
		return {
			channel: null,
			...rest,
		}
	}

	return {
		channel: { ...channelWithMember, currentUser: currentUserMember },

		...rest,
	}
}

export const useAttachments = (messageId: MessageId) => {
	const { data: attachments, ...rest } = useLiveQuery((q) =>
		q
			.from({
				attachments: attachmentCollection,
			})
			.where(({ attachments }) => eq(attachments.messageId, messageId))
			.orderBy(({ attachments }) => attachments.uploadedAt, "asc"),
	)

	return {
		attachments: attachments || [],
		rest,
	}
}

/**
 * Query all integration connections for an organization.
 * Returns a map of provider -> connection for easy lookup.
 */
export const useIntegrationConnections = (organizationId: OrganizationId | null) => {
	const { data, ...rest } = useLiveQuery(
		(q) =>
			q
				.from({ connection: integrationConnectionCollection })
				.where(({ connection }) =>
					and(
						eq(connection.organizationId, organizationId ?? ("" as OrganizationId)),
						isNull(connection.deletedAt),
					),
				),
		[organizationId],
	)

	// Build a map of provider -> connection for easy lookup
	const connectionsByProvider = new Map<
		IntegrationConnection.IntegrationProvider,
		typeof IntegrationConnection.Model.Type
	>()

	if (organizationId && data) {
		for (const connection of data) {
			connectionsByProvider.set(connection.provider, connection)
		}
	}

	return {
		connections: data ?? [],
		connectionsByProvider,
		isConnected: (provider: IntegrationConnection.IntegrationProvider) => {
			const conn = connectionsByProvider.get(provider)
			return conn?.status === "active"
		},
		...rest,
	}
}

/**
 * Query integration connection by organization and provider.
 * Returns the active connection if one exists.
 */
export const useIntegrationConnection = (
	organizationId: OrganizationId | null,
	provider: IntegrationConnection.IntegrationProvider,
) => {
	const { data, ...rest } = useLiveQuery(
		(q) =>
			q
				.from({ connection: integrationConnectionCollection })
				.where(({ connection }) =>
					and(
						eq(connection.organizationId, organizationId ?? ("" as OrganizationId)),
						eq(connection.provider, provider),
						isNull(connection.deletedAt),
					),
				),
		[organizationId, provider],
	)

	// If no organizationId, return empty result
	if (!organizationId) {
		return {
			connection: null,
			isConnected: false,
			...rest,
		}
	}

	const connection = data?.[0] ?? null

	return {
		connection,
		isConnected: connection?.status === "active",
		...rest,
	}
}
