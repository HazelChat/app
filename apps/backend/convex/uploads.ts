import { R2 } from "@convex-dev/r2"
import { v } from "convex/values"
import { components } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { userMutation, userQuery } from "./middleware/withUser"

const r2 = new R2(components.r2)

const R2_PUBLIC_URL = "https://cdn.hazel.sh"

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
	onUpload: async (_ctx, _bucket, key) => {
		console.log("File uploaded with key:", key)
	},
})

// Get attachment with metadata from R2
export const getAttachmentWithMetadata = userQuery({
	args: {
		attachmentId: v.id("attachments"),
	},
	handler: async (ctx, args) => {
		const attachment = await ctx.db.get(args.attachmentId)
		if (!attachment || attachment.deletedAt) {
			return null
		}

		// Fetch metadata from R2
		const metadata = await r2.getMetadata(ctx, attachment.r2Key)

		// Use the stored fileName from the database
		const publicUrl = `${R2_PUBLIC_URL}/${attachment.r2Key}`

		return {
			...attachment,
			fileName: attachment.fileName,
			fileSize: metadata?.size || 0,
			mimeType: metadata?.contentType || "application/octet-stream",
			publicUrl,
		}
	},
})

// Get multiple attachments by their IDs
export const getAttachmentsByIds = userQuery({
	args: {
		attachmentIds: v.array(v.id("attachments")),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const attachments = await Promise.all(
			args.attachmentIds.map(async (id) => {
				const attachment = await ctx.db.get(id)
				// Verify the attachment belongs to the organization and is not deleted
				if (
					!attachment ||
					attachment.deletedAt ||
					attachment.organizationId !== args.organizationId
				) {
					return null
				}
				return {
					id: attachment._id,
					fileName: attachment.fileName,
					r2Key: attachment.r2Key,
				}
			}),
		)
		return attachments.filter((a) => a !== null)
	},
})

// Helper function to enrich attachment with R2 metadata
export async function enrichAttachmentWithMetadata(
	ctx: any,
	attachment: Doc<"attachments">,
): Promise<
	(Doc<"attachments"> & { fileName: string; fileSize: number; mimeType: string; publicUrl: string }) | null
> {
	if (!attachment || attachment.deletedAt) {
		return null
	}

	// In test environment or when R2 is not available, return mock data
	let metadata = null
	try {
		metadata = await r2.getMetadata(ctx, attachment.r2Key)
	} catch (error) {
		// If R2 is not available (e.g., in tests), use mock values
		console.debug("R2 getMetadata failed, using mock values:", error)
	}

	const publicUrl = `${R2_PUBLIC_URL}/${attachment.r2Key}`

	// Use the stored fileName from the database
	return {
		...attachment,
		fileName: attachment.fileName,
		fileSize: metadata?.size || 1024, // Default size for tests
		mimeType: metadata?.contentType || "application/octet-stream",
		publicUrl,
	}
}

// Create attachment record in database after R2 upload
export const createAttachment = userMutation({
	args: {
		r2Key: v.string(),
		fileName: v.string(),
		organizationId: v.id("organizations"),
		channelId: v.optional(v.id("channels")),
	},
	handler: async (ctx, args) => {
		// Store fileName and essential data in database
		// fileSize and mimeType will be fetched from R2 when needed
		const attachmentId = await ctx.db.insert("attachments", {
			organizationId: args.organizationId,
			channelId: args.channelId,
			fileName: args.fileName,
			r2Key: args.r2Key,
			uploadedBy: ctx.user.id,
			uploadedAt: Date.now(),
			status: "complete",
		})

		return attachmentId
	},
})
