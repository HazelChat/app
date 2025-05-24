import { Schema } from "effect"
import { UserId } from "./user"

import { Model } from "@effect/sql"

import { types } from "cassandra-driver"
import type { Brand } from "effect/Brand"

export const ChannelId = Schema.String.pipe(Schema.brand("@hazel/channel-id"))
export type ChannelId = Schema.Schema.Type<typeof ChannelId>
export type MessageId = Schema.Schema.Type<typeof MessageId>

export const MessageId = Schema.String.pipe(Schema.brand("@hazel/message-id"))

const ModelArrayString = Model.Field({
	insert: Schema.Array(Schema.String),
	update: Schema.Array(Schema.String),
	select: Schema.transform(Schema.NullOr(Schema.Array(Schema.String)), Schema.Array(Schema.String), {
		strict: true,
		encode: (value) => value,
		decode: (value) => value || [],
	}),
	jsonCreate: Schema.Array(Schema.String),
	jsonUpdate: Schema.Array(Schema.String),
	json: Schema.Array(Schema.String),
})

export class Message extends Model.Class<Message>("@hazel/Message")({
	id: Model.Field({
		insert: MessageId,
		update: MessageId,
		select: Schema.transform(Schema.instanceOf(types.TimeUuid), MessageId, {
			strict: true,
			encode: (value) => types.TimeUuid.fromString(value),
			decode: (value) => value.toString(),
		}),
		json: MessageId,
	}),
	content: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(4000)),
	channelId: ChannelId,
	threadChannelId: Model.FieldOption(ChannelId),
	authorId: UserId,
	replyToMessageId: Model.FieldOption(MessageId),
	attachedFiles: ModelArrayString,
	createdAt: Model.DateTimeInsertFromDate,
	updatedAt: Model.DateTimeUpdateFromDate,
}) {}
