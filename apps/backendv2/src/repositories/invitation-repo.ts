import { and, Database, eq, lte, ModelRepository, schema } from "@hazel/db"
import { Invitation } from "@hazel/db/models"
import type { InvitationId, OrganizationId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

export class InvitationRepo extends Effect.Service<InvitationRepo>()("InvitationRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.invitationsTable, Invitation.Model, {
			idColumn: "id",
		})
		const db = yield* Database.Database

		const findByWorkosId = (workosInvitationId: string) =>
			db
				.execute((client) =>
					client
						.select()
						.from(schema.invitationsTable)
						.where(eq(schema.invitationsTable.workosInvitationId, workosInvitationId))
						.limit(1),
				)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		const upsertByWorkosId = (data: Schema.Schema.Type<typeof Invitation.Insert>) =>
			db
				.execute((client) =>
					client
						.insert(schema.invitationsTable)
						.values(data)
						.onConflictDoUpdate({
							target: schema.invitationsTable.workosInvitationId,
							set: {
								status: data.status,
								acceptedAt: data.acceptedAt,
								acceptedBy: data.acceptedBy,
							},
						})
						.returning(),
				)
				.pipe(Effect.map((results) => results[0]))

		const findAllByOrganization = (organizationId: OrganizationId) =>
			db.execute((client) =>
				client
					.select()
					.from(schema.invitationsTable)
					.where(eq(schema.invitationsTable.organizationId, organizationId)),
			)

		const findPendingByOrganization = (organizationId: OrganizationId) =>
			db.execute((client) =>
				client
					.select()
					.from(schema.invitationsTable)
					.where(
						and(
							eq(schema.invitationsTable.organizationId, organizationId),
							eq(schema.invitationsTable.status, "pending"),
						),
					),
			)

		const updateStatus = (id: InvitationId, status: "pending" | "accepted" | "expired" | "revoked") =>
			db
				.execute((client) =>
					client
						.update(schema.invitationsTable)
						.set({ status })
						.where(eq(schema.invitationsTable.id, id))
						.returning(),
				)
				.pipe(Effect.map((results) => results[0]))

		const markExpired = () => {
			const now = new Date()
			return db.execute((client) =>
				client
					.update(schema.invitationsTable)
					.set({ status: "expired" })
					.where(
						and(
							eq(schema.invitationsTable.status, "pending"),
							lte(schema.invitationsTable.expiresAt, now),
						),
					)
					.returning(),
			)
		}

		const bulkUpsertByWorkosId = (invitations: Schema.Schema.Type<typeof Invitation.Insert>[]) =>
			Effect.forEach(invitations, upsertByWorkosId, { concurrency: 10 })

		return {
			...baseRepo,
			findByWorkosId,
			upsertByWorkosId,
			findAllByOrganization,
			findPendingByOrganization,
			updateStatus,
			markExpired,
			bulkUpsertByWorkosId,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
