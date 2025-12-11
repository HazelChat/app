import { HttpApiBuilder } from "@effect/platform"
import { S3 } from "@effect-aws/client-s3"
import { CurrentUser } from "@hazel/domain"
import { AvatarUploadError } from "@hazel/domain/http"
import { randomUUIDv7 } from "bun"
import { Config, Effect } from "effect"
import { HazelApi } from "../api"

export const HttpAvatarLive = HttpApiBuilder.group(HazelApi, "avatars", (handlers) =>
	Effect.gen(function* () {
		const bucketName = yield* Config.string("R2_BUCKET_NAME").pipe(Effect.orDie)

		return handlers.handle(
			"getUploadUrl",
			Effect.fn(function* ({ payload }) {
				const user = yield* CurrentUser.Context

				const key = `avatars/${user.id}/${randomUUIDv7()}`

				yield* Effect.log(
					`Generating presigned URL for avatar upload: ${key} (size: ${payload.fileSize} bytes, type: ${payload.contentType})`,
				)

				const uploadUrl = yield* S3.putObject(
					{
						Bucket: bucketName,
						Key: key,
						ContentType: payload.contentType,
					},
					{
						presigned: true,
						expiresIn: 300, // 5 minutes
					},
				).pipe(
					Effect.tapError((error) =>
						Effect.logError("Failed to generate avatar presigned URL", {
							userId: user.id,
							key,
							fileSize: payload.fileSize,
							contentType: payload.contentType,
							error: String(error),
						}),
					),
					Effect.mapError(
						(error) =>
							new AvatarUploadError({
								message: `Failed to generate presigned URL: ${error}`,
							}),
					),
				)

				return {
					uploadUrl,
					key,
				}
			}),
		)
	}),
)
