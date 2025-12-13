import { and, Database, eq, isNull, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { type ChannelId, type ChannelWebhookId, type OrganizationId, policyRequire } from "@hazel/domain"
import { ChannelWebhook } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class ChannelWebhookRepo extends Effect.Service<ChannelWebhookRepo>()("ChannelWebhookRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.channelWebhooksTable,
			ChannelWebhook.Model,
			{
				idColumn: "id",
				name: "ChannelWebhook",
			},
		)
		const db = yield* Database.Database

		// Override findById to filter by deletedAt = NULL (respect soft deletes)
		const findById = (id: ChannelWebhookId, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, data: { id: ChannelWebhookId }) =>
						execute((client) =>
							client
								.select()
								.from(schema.channelWebhooksTable)
								.where(
									and(
										eq(schema.channelWebhooksTable.id, data.id),
										isNull(schema.channelWebhooksTable.deletedAt),
									),
								)
								.limit(1),
						).pipe(Effect.map((results) => Option.fromNullable(results[0]))),
					policyRequire("ChannelWebhook", "select"),
				)({ id }, tx)

		// Find all webhooks for a channel
		const findByChannel = (channelId: ChannelId, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { channelId: ChannelId }) =>
					execute((client) =>
						client
							.select()
							.from(schema.channelWebhooksTable)
							.where(
								and(
									eq(schema.channelWebhooksTable.channelId, data.channelId),
									isNull(schema.channelWebhooksTable.deletedAt),
								),
							),
					),
				policyRequire("ChannelWebhook", "select"),
			)({ channelId }, tx)

		// Find webhook by token hash (for authentication)
		const findByTokenHash = (tokenHash: string, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, data: { tokenHash: string }) =>
						execute((client) =>
							client
								.select()
								.from(schema.channelWebhooksTable)
								.where(
									and(
										eq(schema.channelWebhooksTable.tokenHash, data.tokenHash),
										isNull(schema.channelWebhooksTable.deletedAt),
									),
								)
								.limit(1),
						),
					policyRequire("ChannelWebhook", "select"),
				)({ tokenHash }, tx)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		// Update last used timestamp
		const updateLastUsed = (id: ChannelWebhookId, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { id: ChannelWebhookId }) =>
					execute((client) =>
						client
							.update(schema.channelWebhooksTable)
							.set({ lastUsedAt: new Date(), updatedAt: new Date() })
							.where(
								and(
									eq(schema.channelWebhooksTable.id, data.id),
									isNull(schema.channelWebhooksTable.deletedAt),
								),
							)
							.returning(),
					),
				policyRequire("ChannelWebhook", "update"),
			)({ id }, tx)

		// Update token hash (for token regeneration)
		const updateToken = (id: ChannelWebhookId, tokenHash: string, tokenSuffix: string, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { id: ChannelWebhookId; tokenHash: string; tokenSuffix: string }) =>
					execute((client) =>
						client
							.update(schema.channelWebhooksTable)
							.set({
								tokenHash: data.tokenHash,
								tokenSuffix: data.tokenSuffix,
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(schema.channelWebhooksTable.id, data.id),
									isNull(schema.channelWebhooksTable.deletedAt),
								),
							)
							.returning(),
					),
				policyRequire("ChannelWebhook", "update"),
			)({ id, tokenHash, tokenSuffix }, tx)

		// Soft delete webhook (only if not already deleted)
		const softDelete = (id: ChannelWebhookId, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { id: ChannelWebhookId }) =>
					execute((client) =>
						client
							.update(schema.channelWebhooksTable)
							.set({
								deletedAt: new Date(),
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(schema.channelWebhooksTable.id, data.id),
									isNull(schema.channelWebhooksTable.deletedAt),
								),
							)
							.returning(),
					),
				policyRequire("ChannelWebhook", "delete"),
			)({ id }, tx)

		// Find all webhooks for an organization
		const findByOrganization = (organizationId: OrganizationId, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { organizationId: OrganizationId }) =>
					execute((client) =>
						client
							.select()
							.from(schema.channelWebhooksTable)
							.where(
								and(
									eq(schema.channelWebhooksTable.organizationId, data.organizationId),
									isNull(schema.channelWebhooksTable.deletedAt),
								),
							),
					),
				policyRequire("ChannelWebhook", "select"),
			)({ organizationId }, tx)

		return {
			...baseRepo,
			findById,
			findByChannel,
			findByTokenHash,
			updateLastUsed,
			updateToken,
			softDelete,
			findByOrganization,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
