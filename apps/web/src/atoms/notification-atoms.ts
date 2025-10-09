import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom } from "@effect-atom/atom-react"
import { Schema } from "effect"

/**
 * Schema definitions for notification settings
 */
const MessagePreferenceSchema = Schema.Literal("all", "mentions", "direct", "none")
const EmailDigestSchema = Schema.Literal("instant", "daily", "weekly")

export type MessagePreference = typeof MessagePreferenceSchema.Type
export type EmailDigest = typeof EmailDigestSchema.Type

/**
 * localStorage runtime for notification settings persistence
 */
const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

/**
 * Desktop notifications enabled/disabled
 */
export const desktopNotificationsAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-desktop-enabled",
	schema: Schema.NullOr(Schema.Boolean),
	defaultValue: () => true,
})

/**
 * Message notification preference (all/mentions/direct/none)
 */
export const messagePreferenceAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-message-preference",
	schema: Schema.NullOr(MessagePreferenceSchema),
	defaultValue: () => "all" as const,
})

/**
 * Email notifications enabled/disabled
 */
export const emailNotificationsAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-email-enabled",
	schema: Schema.NullOr(Schema.Boolean),
	defaultValue: () => true,
})

/**
 * Email digest frequency (instant/daily/weekly)
 */
export const emailDigestAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-email-digest",
	schema: Schema.NullOr(EmailDigestSchema),
	defaultValue: () => "instant" as const,
})

/**
 * Do not disturb / Quiet hours enabled/disabled
 */
export const doNotDisturbAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-dnd-enabled",
	schema: Schema.NullOr(Schema.Boolean),
	defaultValue: () => false,
})

/**
 * Quiet hours start time (HH:MM format)
 */
export const quietHoursStartAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-quiet-hours-start",
	schema: Schema.NullOr(Schema.String),
	defaultValue: () => "22:00",
})

/**
 * Quiet hours end time (HH:MM format)
 */
export const quietHoursEndAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "notifications-quiet-hours-end",
	schema: Schema.NullOr(Schema.String),
	defaultValue: () => "08:00",
})
