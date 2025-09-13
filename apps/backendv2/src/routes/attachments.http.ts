import { FileSystem, HttpApiBuilder } from "@effect/platform"
import { MultipartUpload } from "@effect-aws/s3"
import { Database } from "@hazel/db"
import { AttachmentId } from "@hazel/db/schema"
import { randomUUIDv7 } from "bun"
import { Config, Effect } from "effect"
import { HazelApi } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { AttachmentRepo } from "../repositories/attachment-repo"

export const HttpAttachmentLive = HttpApiBuilder.group(HazelApi, "attachments", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database
		const mu = yield* MultipartUpload.MultipartUpload

		return handlers
			.handle(
				"upload",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser
					const fs = yield* FileSystem.FileSystem

					yield* Effect.log("Uploading attachment...")

					const attachmentId = AttachmentId.make(randomUUIDv7())
					
					// Get the original filename from the file
					const fileName = (payload.file as any).filename || (payload.file as any).name || "unnamed_file"

					const bucketName = yield* Config.string("R2_BUCKET_NAME").pipe(Effect.orDie)

					yield* mu
						.uploadObject(
							{
								Bucket: bucketName,
								Key: attachmentId,
								Body: fs.stream(payload.file.path),
							},
							{ queueSize: 3 },
						)
						// TODO: Map errors
						.pipe(Effect.orDie)

					const stats = yield* fs.stat(payload.file.path).pipe(Effect.orDie)

					const { createdAttachment, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdAttachment = yield* AttachmentRepo.insert({
									id: attachmentId,
									uploadedBy: user.id,
									organizationId: payload.organizationId,
									status: "complete",
									channelId: payload.channelId,
									messageId: null,
									fileName: fileName,
									fileSize: Number(stats.size),
									uploadedAt: new Date(),
								}).pipe(Effect.map((res) => res[0]!))

								const txid = yield* generateTransactionId(tx)

								return { createdAttachment, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Attachment",
										cause: err,
									}),
								ParseError: (err) =>
									new InternalServerError({
										message: "Error Parsing Response Schema",
										cause: err,
									}),
							}),
						)

					return {
						data: createdAttachment,
						transactionId: txid,
					}
				}),
			)

			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* AttachmentRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Deleting Attachment",
										cause: err,
									}),
							}),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
