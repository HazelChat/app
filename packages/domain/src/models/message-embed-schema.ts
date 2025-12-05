import { Schema } from "effect"

// Embed author section
export const MessageEmbedAuthor = Schema.Struct({
	name: Schema.String.pipe(Schema.maxLength(256)),
	url: Schema.optional(Schema.String.pipe(Schema.maxLength(2048))),
	iconUrl: Schema.optional(Schema.String.pipe(Schema.maxLength(2048))),
})
export type MessageEmbedAuthor = Schema.Schema.Type<typeof MessageEmbedAuthor>

// Embed footer section
export const MessageEmbedFooter = Schema.Struct({
	text: Schema.String.pipe(Schema.maxLength(2048)),
	iconUrl: Schema.optional(Schema.String.pipe(Schema.maxLength(2048))),
})
export type MessageEmbedFooter = Schema.Schema.Type<typeof MessageEmbedFooter>

// Embed field (for key-value display)
export const MessageEmbedField = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
	value: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1024)),
	inline: Schema.optional(Schema.Boolean),
})
export type MessageEmbedField = Schema.Schema.Type<typeof MessageEmbedField>

// Full embed schema (Discord-style)
export const MessageEmbed = Schema.Struct({
	title: Schema.optional(Schema.String.pipe(Schema.maxLength(256))),
	description: Schema.optional(Schema.String.pipe(Schema.maxLength(4096))),
	url: Schema.optional(Schema.String.pipe(Schema.maxLength(2048))),
	color: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(0, 16777215))), // 0x000000 to 0xFFFFFF
	author: Schema.optional(MessageEmbedAuthor),
	footer: Schema.optional(MessageEmbedFooter),
	image: Schema.optional(Schema.Struct({ url: Schema.String.pipe(Schema.maxLength(2048)) })),
	thumbnail: Schema.optional(Schema.Struct({ url: Schema.String.pipe(Schema.maxLength(2048)) })),
	fields: Schema.optional(Schema.Array(MessageEmbedField).pipe(Schema.maxItems(25))),
	timestamp: Schema.optional(Schema.String), // ISO 8601 timestamp
})
export type MessageEmbed = Schema.Schema.Type<typeof MessageEmbed>

// Array of embeds for a message
export const MessageEmbeds = Schema.Array(MessageEmbed)
export type MessageEmbeds = Schema.Schema.Type<typeof MessageEmbeds>
