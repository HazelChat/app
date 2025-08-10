import { v } from "convex/values"
import { components } from "./_generated/api"
import { userMutation, userQuery } from "./middleware/withUser"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB default limit
const ALLOWED_MIME_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	// Documents
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/plain",
	"text/csv",
	// Videos
	"video/mp4",
	"video/webm",
	"video/ogg",
	// Audio
	"audio/mpeg",
	"audio/wav",
	"audio/webm",
	"audio/ogg",
]

export const generateUploadUrl = userMutation({
	args: {
		organizationId: v.id("organizations"),
		fileName: v.string(),
		fileSize: v.number(),
		mimeType: v.string(),
	},
	handler: async (ctx, args) => {
		// Validate file size
		if (args.fileSize > MAX_FILE_SIZE) {
			throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
		}

		// Validate mime type
		if (!ALLOWED_MIME_TYPES.includes(args.mimeType)) {
			throw new Error("File type not allowed")
		}

		// Create attachment record
		const attachmentId = await ctx.db.insert("attachments", {
			organizationId: args.organizationId,
			fileName: args.fileName,
			fileSize: args.fileSize,
			mimeType: args.mimeType,
			r2Key: "", // Will be updated after upload
			uploadedBy: ctx.user.id,
			uploadedAt: Date.now(),
			status: "uploading",
		})

		// Generate unique R2 key
		const r2Key = `${args.organizationId}/${attachmentId}/${args.fileName}`

		// Update attachment with R2 key
		await ctx.db.patch(attachmentId, { r2Key })

		// Generate presigned upload URL using R2 component
		const uploadUrl = await ctx.runAction(components.r2.generateUploadUrl, {
			key: r2Key,
		})

		return {
			attachmentId,
			uploadUrl,
		}
	},
})

export const completeUpload = userMutation({
	args: {
		attachmentId: v.id("attachments"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const attachment = await ctx.db.get(args.attachmentId)
		if (!attachment) {
			throw new Error("Attachment not found")
		}

		// Verify the user owns this attachment
		if (attachment.uploadedBy !== ctx.user.id) {
			throw new Error("Unauthorized")
		}

		// Verify organization matches
		if (attachment.organizationId !== args.organizationId) {
			throw new Error("Organization mismatch")
		}

		// Mark upload as complete
		await ctx.db.patch(args.attachmentId, {
			status: "complete",
		})

		return { success: true }
	},
})

export const getFileUrl = userQuery({
	args: {
		attachmentId: v.id("attachments"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const attachment = await ctx.db.get(args.attachmentId)
		if (!attachment || attachment.deletedAt) {
			throw new Error("Attachment not found")
		}

		// Verify organization matches
		if (attachment.organizationId !== args.organizationId) {
			throw new Error("Unauthorized")
		}

		// Verify user has access to this file
		if (attachment.messageId) {
			const message = await ctx.db.get(attachment.messageId)
			if (!message) {
				throw new Error("Message not found")
			}
			
			// Validate user can view the channel
			await ctx.user.validateCanViewChannel({ ctx, channelId: message.channelId })
		}

		// Generate signed URL for file access
		const signedUrl = await ctx.runAction(components.r2.generateDownloadUrl, {
			key: attachment.r2Key,
		})

		return {
			url: signedUrl,
			fileName: attachment.fileName,
			mimeType: attachment.mimeType,
			fileSize: attachment.fileSize,
		}
	},
})

export const deleteFile = userMutation({
	args: {
		attachmentId: v.id("attachments"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const attachment = await ctx.db.get(args.attachmentId)
		if (!attachment) {
			throw new Error("Attachment not found")
		}

		// Verify the user owns this attachment or is an admin
		if (attachment.uploadedBy !== ctx.user.id) {
			// Check if user is admin
			const member = await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId_userId", (q) =>
					q.eq("organizationId", args.organizationId).eq("userId", ctx.user.id),
				)
				.unique()

			if (!member || member.role !== "admin") {
				throw new Error("Unauthorized")
			}
		}

		// Verify organization matches
		if (attachment.organizationId !== args.organizationId) {
			throw new Error("Organization mismatch")
		}

		// Soft delete the attachment
		await ctx.db.patch(args.attachmentId, {
			deletedAt: Date.now(),
		})

		// Delete from R2
		await ctx.runAction(components.r2.deleteFile, {
			key: attachment.r2Key,
		})

		return { success: true }
	},
})

export const getMessageAttachments = userQuery({
	args: {
		messageId: v.id("messages"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId)
		if (!message) {
			throw new Error("Message not found")
		}

		// Validate user can view the channel
		await ctx.user.validateCanViewChannel({ ctx, channelId: message.channelId })

		// Fetch all attachments for this message
		const attachments = await Promise.all(
			message.attachedFiles.map(async (attachmentId) => {
				const attachment = await ctx.db.get(attachmentId)
				if (!attachment || attachment.deletedAt) {
					return null
				}
				return attachment
			}),
		)

		return attachments.filter(Boolean)
	},
})

// Cleanup orphaned uploads (run periodically)
export const cleanupOrphanedUploads = userMutation({
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		// Check if user is admin
		const member = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.user.id),
			)
			.unique()

		if (!member || member.role !== "admin") {
			throw new Error("Only admins can cleanup orphaned uploads")
		}

		// Find uploads older than 24 hours that are still in "uploading" status
		const cutoffTime = Date.now() - 24 * 60 * 60 * 1000
		const orphanedUploads = await ctx.db
			.query("attachments")
			.withIndex("by_status", (q) => q.eq("status", "uploading"))
			.filter((q) =>
				q.and(
					q.eq(q.field("organizationId"), args.organizationId),
					q.lt(q.field("uploadedAt"), cutoffTime),
				),
			)
			.collect()

		// Clean up each orphaned upload
		for (const upload of orphanedUploads) {
			await ctx.db.patch(upload._id, {
				status: "failed",
				deletedAt: Date.now(),
			})

			// Delete from R2 if key exists
			if (upload.r2Key) {
				await ctx.runAction(components.r2.deleteFile, {
					key: upload.r2Key,
				})
			}
		}

		return { cleanedCount: orphanedUploads.length }
	},
})