// convex/example.ts
import { R2 } from "@convex-dev/r2"
import { components } from "./_generated/api"

export const r2 = new R2(components.r2)

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
	checkUpload: async (ctx, bucket) => {
		// const user = await userFromAuth(ctx);
		// ...validate that the user can upload to this bucket
	},
	onUpload: async (ctx, key) => {
		// ...do something with the key
		// Runs in the `syncMetadata` mutation, before the upload is performed from the
		// client side. Convenient way to create relations between the newly created
		// object key and other data in your Convex database. Runs after the `checkUpload`
		// callback.
	},
})
