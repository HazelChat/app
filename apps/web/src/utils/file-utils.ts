/**
 * Formats file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/**
 * Gets the file type identifier from a filename for use with FileIcon component
 */
export function getFileTypeFromName(fileName: string): string {
	const extension = fileName.split(".").pop()?.toLowerCase() || ""

	const typeMap: Record<string, string> = {
		jpg: "jpg",
		jpeg: "jpg",
		png: "png",
		gif: "gif",
		webp: "webp",
		svg: "svg",
		pdf: "pdf",
		doc: "doc",
		docx: "docx",
		xls: "xls",
		xlsx: "xlsx",
		txt: "txt",
		csv: "csv",
		mp4: "mp4",
		webm: "webm",
		mp3: "mp3",
		wav: "wav",
	}

	return typeMap[extension] || "file"
}
