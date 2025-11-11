import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, Multipart } from "@effect/platform"
import { Schema } from "effect"
import { CurrentUser, InternalServerError, TransactionId, UnauthorizedError } from "../"
import { ChannelId, OrganizationId } from "../ids"
import { Attachment } from "../models"

export class AttachmentResponse extends Schema.Class<AttachmentResponse>("AttachmentResponse")({
	data: Attachment.Model.json,
	transactionId: TransactionId,
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
		HttpApiEndpoint.post("upload", "/upload")
			.setPayload(
				HttpApiSchema.Multipart(
					Schema.Struct({
						file: Multipart.SingleFileSchema,
						organizationId: OrganizationId,
						channelId: ChannelId,
					}),
				),
			)
			.addSuccess(AttachmentResponse)
			.addError(AttachmentUploadError)
			.addError(UnauthorizedError)
			.addError(InternalServerError),
	)
	.prefix("/attachments")
	.middleware(CurrentUser.Authorization) {}
