import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { CurrentUser, InternalServerError, UnauthorizedError } from "../"

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

export class GetAvatarUploadUrlRequest extends Schema.Class<GetAvatarUploadUrlRequest>(
	"GetAvatarUploadUrlRequest",
)({
	contentType: Schema.String.pipe(
		Schema.filter((s) => ["image/jpeg", "image/png", "image/webp"].includes(s), {
			message: () => "Content type must be image/jpeg, image/png, or image/webp",
		}),
	),
	fileSize: Schema.Number.pipe(
		Schema.between(1, MAX_AVATAR_SIZE, {
			message: () => "File size must be between 1 byte and 5MB",
		}),
	),
}) {}

export class GetAvatarUploadUrlResponse extends Schema.Class<GetAvatarUploadUrlResponse>(
	"GetAvatarUploadUrlResponse",
)({
	uploadUrl: Schema.String,
	key: Schema.String,
}) {}

export class AvatarUploadError extends Schema.TaggedError<AvatarUploadError>("AvatarUploadError")(
	"AvatarUploadError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class AvatarGroup extends HttpApiGroup.make("avatars")
	.add(
		HttpApiEndpoint.post("getUploadUrl", "/upload-url")
			.setPayload(GetAvatarUploadUrlRequest)
			.addSuccess(GetAvatarUploadUrlResponse)
			.addError(AvatarUploadError)
			.addError(UnauthorizedError)
			.addError(InternalServerError),
	)
	.prefix("/users/avatar")
	.middleware(CurrentUser.Authorization) {}
