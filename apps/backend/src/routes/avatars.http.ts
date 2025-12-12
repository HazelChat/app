import { HttpApiBuilder } from "@effect/platform"
import { CurrentUser } from "@hazel/domain"
import { S3 } from "@hazel/effect-bun"
import { randomUUIDv7 } from "bun"
import { Effect } from "effect"
import { HazelApi } from "../api"

export const HttpAvatarLive = HttpApiBuilder.group(HazelApi, "avatars", (handlers) =>
	Effect.gen(function* () {
		const s3 = yield* S3

		return handlers.handle(
			"getUploadUrl",
			Effect.fn(function* ({ payload }) {
				const user = yield* CurrentUser.Context

				const key = `avatars/${user.id}/${randomUUIDv7()}`

				yield* Effect.log(
					`Generating presigned URL for avatar upload: ${key} (size: ${payload.fileSize} bytes, type: ${payload.contentType})`,
				)

				// Generate presigned URL (synchronous - no network call needed)
				const uploadUrl = s3.presign(key, {
					method: "PUT",
					type: payload.contentType,
					expiresIn: 300, // 5 minutes
				})

				yield* Effect.log(`Generated presigned URL for avatar: ${key}`)

				return {
					uploadUrl,
					key,
				}
			}),
		)
	}),
)
