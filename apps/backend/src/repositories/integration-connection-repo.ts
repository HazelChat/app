import { and, Database, eq, isNull, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { type IntegrationConnectionId, type OrganizationId, policyRequire, type UserId } from "@hazel/domain"
import { IntegrationConnection } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class IntegrationConnectionRepo extends Effect.Service<IntegrationConnectionRepo>()(
	"IntegrationConnectionRepo",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const baseRepo = yield* ModelRepository.makeRepository(
				schema.integrationConnectionsTable,
				IntegrationConnection.Model,
				{
					idColumn: "id",
					name: "IntegrationConnection",
				},
			)
			const db = yield* Database.Database

			// Find org-level connection for a specific provider
			const findOrgConnection = (
				organizationId: OrganizationId,
				provider: IntegrationConnection.IntegrationProvider,
				tx?: TxFn,
			) =>
				db
					.makeQuery(
						(
							execute,
							data: { organizationId: OrganizationId; provider: IntegrationConnection.IntegrationProvider },
						) =>
							execute((client) =>
								client
									.select()
									.from(schema.integrationConnectionsTable)
									.where(
										and(
											eq(schema.integrationConnectionsTable.organizationId, data.organizationId),
											eq(schema.integrationConnectionsTable.provider, data.provider),
											isNull(schema.integrationConnectionsTable.userId),
											eq(schema.integrationConnectionsTable.level, "organization"),
											isNull(schema.integrationConnectionsTable.deletedAt),
										),
									)
									.limit(1),
							),
						policyRequire("IntegrationConnection", "select"),
					)({ organizationId, provider }, tx)
					.pipe(Effect.map((results) => Option.fromNullable(results[0])))

			// Find user-level connection for a specific provider
			const findUserConnection = (
				organizationId: OrganizationId,
				userId: UserId,
				provider: IntegrationConnection.IntegrationProvider,
				tx?: TxFn,
			) =>
				db
					.makeQuery(
						(
							execute,
							data: {
								organizationId: OrganizationId
								userId: UserId
								provider: IntegrationConnection.IntegrationProvider
							},
						) =>
							execute((client) =>
								client
									.select()
									.from(schema.integrationConnectionsTable)
									.where(
										and(
											eq(schema.integrationConnectionsTable.organizationId, data.organizationId),
											eq(schema.integrationConnectionsTable.userId, data.userId),
											eq(schema.integrationConnectionsTable.provider, data.provider),
											eq(schema.integrationConnectionsTable.level, "user"),
											isNull(schema.integrationConnectionsTable.deletedAt),
										),
									)
									.limit(1),
							),
						policyRequire("IntegrationConnection", "select"),
					)({ organizationId, userId, provider }, tx)
					.pipe(Effect.map((results) => Option.fromNullable(results[0])))

			// Get all connections for an organization (both org-level and user-level)
			const findAllForOrg = (organizationId: OrganizationId, tx?: TxFn) =>
				db.makeQuery(
					(execute, data: { organizationId: OrganizationId }) =>
						execute((client) =>
							client
								.select()
								.from(schema.integrationConnectionsTable)
								.where(
									and(
										eq(schema.integrationConnectionsTable.organizationId, data.organizationId),
										isNull(schema.integrationConnectionsTable.deletedAt),
									),
								),
						),
					policyRequire("IntegrationConnection", "select"),
				)({ organizationId }, tx)

			// Update connection status
			const updateStatus = (
				connectionId: IntegrationConnectionId,
				status: IntegrationConnection.ConnectionStatus,
				errorMessage?: string,
				tx?: TxFn,
			) =>
				db.makeQuery(
					(
						execute,
						data: {
							connectionId: IntegrationConnectionId
							status: IntegrationConnection.ConnectionStatus
							errorMessage?: string
						},
					) =>
						execute((client) =>
							client
								.update(schema.integrationConnectionsTable)
								.set({
									status: data.status,
									errorMessage: data.errorMessage ?? null,
									updatedAt: new Date(),
								})
								.where(eq(schema.integrationConnectionsTable.id, data.connectionId))
								.returning(),
						),
					policyRequire("IntegrationConnection", "update"),
				)({ connectionId, status, errorMessage }, tx)

			// Soft delete connection
			const softDelete = (connectionId: IntegrationConnectionId, tx?: TxFn) =>
				db.makeQuery(
					(execute, data: { connectionId: IntegrationConnectionId }) =>
						execute((client) =>
							client
								.update(schema.integrationConnectionsTable)
								.set({
									deletedAt: new Date(),
									status: "revoked",
									updatedAt: new Date(),
								})
								.where(eq(schema.integrationConnectionsTable.id, data.connectionId))
								.returning(),
						),
					policyRequire("IntegrationConnection", "delete"),
				)({ connectionId }, tx)

			// Upsert org-level connection for a provider
			const upsertByOrgAndProvider = (
				insertData: typeof IntegrationConnection.Insert.Type,
				tx?: TxFn,
			) =>
				Effect.gen(function* () {
					const existing = yield* findOrgConnection(
						insertData.organizationId,
						insertData.provider,
						tx,
					)

					if (Option.isSome(existing)) {
						// Update existing connection
						const results = yield* db.makeQuery(
							(execute, updateParams: { id: IntegrationConnectionId; data: Partial<typeof IntegrationConnection.Update.Type> }) =>
								execute((client) =>
									client
										.update(schema.integrationConnectionsTable)
										.set({
											...updateParams.data,
											updatedAt: new Date(),
										})
										.where(eq(schema.integrationConnectionsTable.id, updateParams.id))
										.returning(),
								),
							policyRequire("IntegrationConnection", "update"),
						)({ id: existing.value.id, data: insertData }, tx)
						return results[0]!
					}

					// Insert new connection - returns array, take first element
					const inserted = yield* baseRepo.insert(insertData, tx)
					return inserted[0]!
				})

			return {
				...baseRepo,
				findOrgConnection,
				findByOrgAndProvider: findOrgConnection, // Alias for consistency
				findUserConnection,
				findAllForOrg,
				updateStatus,
				softDelete,
				upsertByOrgAndProvider,
			}
		}),
		dependencies: [DatabaseLive],
	},
) {}
