import {
	Attachment,
	Channel,
	ChannelMember,
	IntegrationConnection,
	Invitation,
	Message,
	MessageReaction,
	Notification,
	Organization,
	OrganizationMember,
	PinnedMessage,
	TypingIndicator,
	User,
	UserPresenceStatus,
} from "@hazel/domain/models"
import { createEffectCollection } from "@hazel/effect-electric-db-collection"
import { Effect } from "effect"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"
import { runtime } from "~/lib/services/common/runtime"

const electricUrl: string = import.meta.env.VITE_ELECTRIC_URL

export const organizationCollection = createEffectCollection({
	id: "organizations",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,

		params: {
			table: "organizations",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},

		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Organization.Model.json,
	getKey: (item) => item.id,
})

export const invitationCollection = createEffectCollection({
	id: "invitations",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "invitations",
		},
		liveSse: true,
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Invitation.Model.json,
	getKey: (item) => item.id,
})

export const messageCollection = createEffectCollection({
	id: "messages",
	// syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "messages",
		},
		// liveSse: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parser type assertion needed due to complex JSONB embeds field
		parser: {
			timestamptz: (date: string) => new Date(date),
		} as any,
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Message.Model.json,
	getKey: (item) => item.id,
})

export const messageReactionCollection = createEffectCollection({
	id: "message_reactions",
	syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "message_reactions",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: MessageReaction.Model.json,
	getKey: (item) => item.id,
})

export const pinnedMessageCollection = createEffectCollection({
	id: "pinned_messages",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "pinned_messages",
		},
		liveSse: true,
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: PinnedMessage.Model.json,
	getKey: (item) => item.id,
})

export const notificationCollection = createEffectCollection({
	id: "notifications",
	syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "notifications",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Notification.Model.json,
	getKey: (item) => item.id,
})

export const userCollection = createEffectCollection({
	id: "users",
	// syncMode: "progressive",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		// liveSse: true,
		params: {
			table: "users",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: User.Model.json,
	getKey: (item) => item.id,
})

export const organizationMemberCollection = createEffectCollection({
	id: "organization_members",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "organization_members",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: OrganizationMember.Model.json,
	getKey: (item) => item.id,
})

export const channelCollection = createEffectCollection({
	id: "channels",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "channels",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Channel.Model.json,
	getKey: (item) => item.id,
})

export const channelMemberCollection = createEffectCollection({
	id: "channel_members",
	// syncMode: "progressive",
	runtime: runtime,
	shapeOptions: {
		url: `${electricUrl}`,
		liveSse: true,
		params: {
			table: "channel_members",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: ChannelMember.Model.json,
	getKey: (item) => item.id,
})

export const attachmentCollection = createEffectCollection({
	id: "attachments",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "attachments",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Attachment.Model.json,
	getKey: (item) => item.id,
})

export const typingIndicatorCollection = createEffectCollection({
	id: "typing_indicators",
	syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "typing_indicators",
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: TypingIndicator.Model.json,
	getKey: (item) => item.id,
})

export const userPresenceStatusCollection = createEffectCollection({
	id: "user_presence_status",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "user_presence_status",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: UserPresenceStatus.Model.json,
	getKey: (item) => item.id,
})

export const integrationConnectionCollection = createEffectCollection({
	id: "integration_connections",
	// syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "integration_connections",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: IntegrationConnection.Model.json,
	getKey: (item) => item.id,
})
