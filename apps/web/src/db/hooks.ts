import type { Channel, ChannelMember, User } from "@hazel/db/models"
import type { ChannelId, MessageId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useUser } from "~/lib/auth"
import { attachmentCollection, channelCollection, messageCollection, userCollection } from "./collections"
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
				.limit(1)
				.select(({ message, author }) => ({ ...message, author: author }))
				.orderBy((q) => q.message.createdAt, "desc"),
		[messageId],
	)

	const replyMessage = data?.[0]

	return {
		data: replyMessage,
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
				// .where((t) => eq(t.channel.id, channelId))
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
	const { user } = useUser()

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
