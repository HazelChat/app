// Helper function to add CORS headers
const addCorsHeaders = (response: Response): Response => {
	response.headers.set("Access-Control-Allow-Origin", "*") // Allow any origin (adjust in production!)
	response.headers.set("Access-Control-Allow-Methods", "PUT, GET, DELETE, OPTIONS")
	response.headers.set("Access-Control-Allow-Headers", "Content-Type") // Allow Content-Type header
	return response
}

// Simple function to extract extension
const getExtension = (filename: string | null, contentType: string | null): string => {
	if (filename?.includes(".")) {
		const parts = filename.split(".")
		const ext = parts[parts.length - 1]
		if (ext && ext.length < 10) {
			// Basic check for a reasonable extension
			return `.${ext.toLowerCase()}`
		}
	}
	// Explicitly check contentType before calling startsWith
	if (contentType) {
		if (contentType.startsWith("image/jpeg")) return ".jpg"
		if (contentType.startsWith("image/png")) return ".png"
		if (contentType.startsWith("image/gif")) return ".gif"
		if (contentType.startsWith("application/pdf")) return ".pdf"
		if (contentType.startsWith("text/plain")) return ".txt"
	}
	return ".bin" // Default fallback
}

export const oldUploadHandler = async (request: Request) => {
	const url = new URL(request.url)

	if (request.method === "OPTIONS" && url.pathname === "/upload") {
		return addCorsHeaders(new Response(null, { status: 204 }))
	}

	if (url.pathname === "/upload" && request.method === "PUT") {
		// Handle File Upload
		if (!request.body) {
			return new Response("Request body is missing", { status: 400 })
		}

		// Generate a unique key on the server
		const uniqueId = crypto.randomUUID()
		const contentType = request.headers.get("Content-Type")
		// Attempt to get extension from Content-Type or original filename (if provided)
		const originalFilename = url.searchParams.get("filename")
		const extension = getExtension(originalFilename, contentType)
		const generatedKey = `${uniqueId}${extension}`

		try {
			await env.FILE_BUCKET.put(generatedKey, request.body, {
				httpMetadata: { contentType: contentType ?? undefined },
			})
			// Return the *generated* key as JSON on success
			return addCorsHeaders(
				new Response(JSON.stringify({ key: generatedKey }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			)
		} catch (error) {
			console.error(`Error uploading file ${generatedKey}:`, error)
			return new Response(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`, {
				status: 500,
			})
		}
	}

	throw new Error("Not Found or Method Not Allowed")
}
