import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { CurrentUser, InternalServerError, UnauthorizedError } from "../"
import { AttachmentId, ChannelId, OrganizationId } from "../ids"

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

// Presigned URL upload schemas
export class GetAttachmentUploadUrlRequest extends Schema.Class<GetAttachmentUploadUrlRequest>(
	"GetAttachmentUploadUrlRequest",
)({
	fileName: Schema.String,
	fileSize: Schema.Number.pipe(
		Schema.between(1, MAX_ATTACHMENT_SIZE, {
			message: () => "File size must be between 1 byte and 10MB",
		}),
	),
	contentType: Schema.String,
	organizationId: OrganizationId,
	channelId: ChannelId,
}) {}

export class GetAttachmentUploadUrlResponse extends Schema.Class<GetAttachmentUploadUrlResponse>(
	"GetAttachmentUploadUrlResponse",
)({
	uploadUrl: Schema.String,
	attachmentId: AttachmentId,
}) {}

export class AttachmentUploadError extends Schema.TaggedError<AttachmentUploadError>("AttachmentUploadError")(
	"AttachmentUploadError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class AttachmentGroup extends HttpApiGroup.make("attachments")
	.add(
		HttpApiEndpoint.post("getUploadUrl", "/upload-url")
			.setPayload(GetAttachmentUploadUrlRequest)
			.addSuccess(GetAttachmentUploadUrlResponse)
			.addError(AttachmentUploadError)
			.addError(UnauthorizedError)
			.addError(InternalServerError),
	)
	.prefix("/attachments")
	.middleware(CurrentUser.Authorization) {}
