import { HttpApiBuilder } from "@effect/platform"
import { S3 } from "@effect-aws/client-s3"
import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/domain"
import { AttachmentUploadError } from "@hazel/domain/http"
import { AttachmentId } from "@hazel/domain/ids"
import { randomUUIDv7 } from "bun"
import { Config, Effect } from "effect"
import { HazelApi } from "../api"
import { AttachmentPolicy } from "../policies/attachment-policy"
import { AttachmentRepo } from "../repositories/attachment-repo"

export const HttpAttachmentLive = HttpApiBuilder.group(HazelApi, "attachments", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers.handle(
			"getUploadUrl",
			Effect.fn(function* ({ payload }) {
				const user = yield* CurrentUser.Context
				const bucketName = yield* Config.string("R2_BUCKET_NAME").pipe(Effect.orDie)

				const attachmentId = AttachmentId.make(randomUUIDv7())

				yield* Effect.log(
					`Generating presigned URL for attachment upload: ${attachmentId} (size: ${payload.fileSize} bytes, type: ${payload.contentType})`,
				)

				// Create attachment record with "uploading" status
				yield* db
					.transaction(
						Effect.gen(function* () {
							yield* AttachmentRepo.insert({
								id: attachmentId,
								uploadedBy: user.id,
								organizationId: payload.organizationId,
								status: "uploading",
								channelId: payload.channelId,
								messageId: null,
								fileName: payload.fileName,
								fileSize: payload.fileSize,
								uploadedAt: new Date(),
							})
						}),
					)
					.pipe(withRemapDbErrors("AttachmentRepo", "create"), policyUse(AttachmentPolicy.canCreate()))

				// Generate presigned URL
				const uploadUrl = yield* S3.putObject(
					{
						Bucket: bucketName,
						Key: attachmentId,
						ContentType: payload.contentType,
					},
					{
						presigned: true,
						expiresIn: 300, // 5 minutes
					},
				).pipe(
					Effect.tapError((error) =>
						Effect.logError("Failed to generate attachment presigned URL", {
							userId: user.id,
							attachmentId,
							fileName: payload.fileName,
							fileSize: payload.fileSize,
							contentType: payload.contentType,
							error: String(error),
						}),
					),
					Effect.mapError(
						(error) =>
							new AttachmentUploadError({
								message: `Failed to generate presigned URL: ${error}`,
							}),
					),
				)

				return {
					uploadUrl,
					attachmentId,
				}
			}),
		)
	}),
)
