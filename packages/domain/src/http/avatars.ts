import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { CurrentUser, InternalServerError, UnauthorizedError } from "../"

export class GetAvatarUploadUrlRequest extends Schema.Class<GetAvatarUploadUrlRequest>(
	"GetAvatarUploadUrlRequest",
)({
	contentType: Schema.String.pipe(
		Schema.filter((s) => ["image/jpeg", "image/png", "image/webp"].includes(s), {
			message: () => "Content type must be image/jpeg, image/png, or image/webp",
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
