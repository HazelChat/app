import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, Multipart } from "@effect/platform"
import { Attachment } from "@hazel/db/models"
import { ChannelId, OrganizationId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"

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
