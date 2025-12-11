import { Activity } from "@effect/workflow"
import { and, Database, eq, isNull, lt, schema } from "@hazel/db"
import { type AttachmentId, Cluster } from "@hazel/domain"
import { Effect } from "effect"

const DEFAULT_MAX_AGE_MINUTES = 10

export const CleanupUploadsWorkflowLayer = Cluster.CleanupUploadsWorkflow.toLayer(
	Effect.fn(function* (payload: Cluster.CleanupUploadsWorkflowPayload) {
		const maxAgeMinutes = payload.maxAgeMinutes ?? DEFAULT_MAX_AGE_MINUTES

		yield* Effect.log(`Starting CleanupUploadsWorkflow (maxAgeMinutes: ${maxAgeMinutes})`)

		const staleUploadsResult = yield* Activity.make({
			name: "FindStaleUploads",
			success: Cluster.FindStaleUploadsResult,
			error: Cluster.FindStaleUploadsError,
			execute: Effect.gen(function* () {
				const db = yield* Database.Database

				yield* Effect.log(
					`Finding attachments in 'uploading' status older than ${maxAgeMinutes} minutes`,
				)

				const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000)

				const staleUploads = yield* db
					.execute((client) =>
						client
							.select({
								id: schema.attachmentsTable.id,
								fileName: schema.attachmentsTable.fileName,
								uploadedAt: schema.attachmentsTable.uploadedAt,
							})
							.from(schema.attachmentsTable)
							.where(
								and(
									eq(schema.attachmentsTable.status, "uploading"),
									lt(schema.attachmentsTable.uploadedAt, cutoffTime),
									isNull(schema.attachmentsTable.deletedAt),
								),
							),
					)
					.pipe(Effect.orDie)

				const uploads = staleUploads.map((upload) => ({
					id: upload.id,
					fileName: upload.fileName,
					uploadedAt: upload.uploadedAt,
					ageMinutes: Math.floor((Date.now() - upload.uploadedAt.getTime()) / (60 * 1000)),
				}))

				yield* Effect.log(`Found ${uploads.length} stale uploads`)

				return {
					uploads,
					totalCount: uploads.length,
				}
			}),
		}).pipe(Effect.orDie)

		// If no stale uploads found, we're done
		if (staleUploadsResult.totalCount === 0) {
			yield* Effect.log("No stale uploads found, workflow complete")
			return
		}

		const markFailedResult = yield* Activity.make({
			name: "MarkUploadsFailed",
			success: Cluster.MarkUploadsFailedResult,
			error: Cluster.MarkUploadsFailedError,
			execute: Effect.gen(function* () {
				const db = yield* Database.Database
				const failedIds: AttachmentId[] = []

				yield* Effect.log(`Marking ${staleUploadsResult.uploads.length} uploads as failed`)

				for (const upload of staleUploadsResult.uploads) {
					yield* db
						.execute((client) =>
							client
								.update(schema.attachmentsTable)
								.set({ status: "failed" })
								.where(
									and(
										eq(schema.attachmentsTable.id, upload.id),
										eq(schema.attachmentsTable.status, "uploading"),
									),
								),
						)
						.pipe(Effect.orDie)

					failedIds.push(upload.id)
					yield* Effect.log(
						`Marked attachment ${upload.id} (${upload.fileName}) as failed (age: ${upload.ageMinutes}min)`,
					)
				}

				return {
					markedCount: failedIds.length,
					failedIds,
				}
			}),
		}).pipe(Effect.orDie)

		yield* Effect.log(
			`CleanupUploadsWorkflow completed: ${markFailedResult.markedCount} uploads marked as failed`,
		)
	}),
)
