import { Database, eq, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { type IntegrationConnectionId, type IntegrationTokenId, policyRequire } from "@hazel/domain"
import { IntegrationToken } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class IntegrationTokenRepo extends Effect.Service<IntegrationTokenRepo>()("IntegrationTokenRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.integrationTokensTable,
			IntegrationToken.Model,
			{
				idColumn: "id",
				name: "IntegrationToken",
			},
		)
		const db = yield* Database.Database

		// Find token by connection ID
		const findByConnectionId = (connectionId: IntegrationConnectionId, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, data: { connectionId: IntegrationConnectionId }) =>
						execute((client) =>
							client
								.select()
								.from(schema.integrationTokensTable)
								.where(eq(schema.integrationTokensTable.connectionId, data.connectionId))
								.limit(1),
						),
					policyRequire("IntegrationToken", "select"),
				)({ connectionId }, tx)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		// Update token (for refresh)
		const updateToken = (
			tokenId: IntegrationTokenId,
			data: {
				encryptedAccessToken: string
				encryptedRefreshToken?: string | null
				iv: string
				encryptionKeyVersion: number
				expiresAt?: Date | null
				scope?: string | null
			},
			tx?: TxFn,
		) =>
			db.makeQuery(
				(
					execute,
					params: {
						tokenId: IntegrationTokenId
						encryptedAccessToken: string
						encryptedRefreshToken?: string | null
						iv: string
						encryptionKeyVersion: number
						expiresAt?: Date | null
						scope?: string | null
					},
				) =>
					execute((client) =>
						client
							.update(schema.integrationTokensTable)
							.set({
								encryptedAccessToken: params.encryptedAccessToken,
								encryptedRefreshToken: params.encryptedRefreshToken,
								iv: params.iv,
								encryptionKeyVersion: params.encryptionKeyVersion,
								expiresAt: params.expiresAt,
								scope: params.scope,
								lastRefreshedAt: new Date(),
								updatedAt: new Date(),
							})
							.where(eq(schema.integrationTokensTable.id, params.tokenId))
							.returning(),
					),
				policyRequire("IntegrationToken", "update"),
			)({ tokenId, ...data }, tx)

		// Delete token (hard delete for security)
		const deleteByConnectionId = (connectionId: IntegrationConnectionId, tx?: TxFn) =>
			db.makeQuery(
				(execute, data: { connectionId: IntegrationConnectionId }) =>
					execute((client) =>
						client
							.delete(schema.integrationTokensTable)
							.where(eq(schema.integrationTokensTable.connectionId, data.connectionId)),
					),
				policyRequire("IntegrationToken", "delete"),
			)({ connectionId }, tx)

		return {
			...baseRepo,
			findByConnectionId,
			updateToken,
			deleteByConnectionId,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
