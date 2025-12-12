import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/domain"
import { AttachmentUploadError } from "@hazel/domain/http"
import { AttachmentId } from "@hazel/domain/ids"
import { S3 } from "@hazel/effect-bun"
import { randomUUIDv7 } from "bun"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { AttachmentPolicy } from "../policies/attachment-policy"
import { AttachmentRepo } from "../repositories/attachment-repo"

export const HttpAttachmentLive = HttpApiBuilder.group(HazelApi, "attachments", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database
		const s3 = yield* S3

		return handlers.handle(
			"getUploadUrl",
			Effect.fn(function* ({ payload }) {
				const user = yield* CurrentUser.Context

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
					.pipe(
						withRemapDbErrors("AttachmentRepo", "create"),
						policyUse(AttachmentPolicy.canCreate()),
					)

				// Generate presigned URL (synchronous - no network call needed)
				const uploadUrl = s3.presign(attachmentId, {
					acl: "public-read",
					method: "PUT",
					type: payload.contentType,
					expiresIn: 300, // 5 minutes
				})

				yield* Effect.log(`Generated presigned URL for attachment: ${attachmentId}`)

				return {
					uploadUrl,
					attachmentId,
				}
			}),
		)
	}),
)
