// src/caretUtils.ts
export function getCaretCharacterOffsetWithin(element: HTMLElement): number {
	let caretOffset = 0
	const selection = window.getSelection()
	if (selection && selection.rangeCount > 0) {
		const range = selection.getRangeAt(0)
		// Ensure the range's start container is within the editor element
		if (element.contains(range.startContainer)) {
			const preCaretRange = range.cloneRange()
			preCaretRange.selectNodeContents(element)
			// It's crucial that setEnd's first argument is a node within 'element'
			// and range.startContainer is that node or a descendant.
			try {
				preCaretRange.setEnd(range.startContainer, range.startOffset)
				caretOffset = preCaretRange.toString().length
			} catch (e) {
				console.warn("Error calculating preCaretRange length (getCaretCharacterOffsetWithin):", e, {
					elementContainsStartContainer: element.contains(range.startContainer),
					startContainer: range.startContainer,
					startOffset: range.startOffset,
				})
				// Fallback or error state, caret might jump
			}
		}
	}
	return caretOffset
}

export function setCaretByCharacterOffset(element: HTMLElement, offset: number): void {
	const selection = window.getSelection()
	if (!selection) return

	const range = document.createRange()
	let accumulatedLength = 0
	let targetNode: Node | null = null
	let targetOffsetInNode = 0 // Renamed for clarity

	function findPositionRecursive(parentNode: Node): boolean {
		for (let i = 0; i < parentNode.childNodes.length; i++) {
			const currentNode = parentNode.childNodes[i]

			if (currentNode.nodeType === Node.TEXT_NODE) {
				const nodeTextLength = currentNode.textContent?.length || 0
				if (accumulatedLength + nodeTextLength >= offset) {
					targetNode = currentNode
					targetOffsetInNode = offset - accumulatedLength
					// Ensure targetOffsetInNode is not out of bounds for the text node
					if (targetOffsetInNode > nodeTextLength) {
						targetOffsetInNode = nodeTextLength
					}
					return true // Found
				}
				accumulatedLength += nodeTextLength
			} else if (currentNode.nodeType === Node.ELEMENT_NODE) {
				if (findPositionRecursive(currentNode)) {
					return true // Found in child
				}
			}
			// Other node types (comments, etc.) are ignored
		}
		return false // Not found in this branch
	}

	if (findPositionRecursive(element)) {
		if (targetNode) {
			try {
				// console.log("Setting caret to node:", targetNode, "offset:", targetOffsetInNode);
				range.setStart(targetNode, targetOffsetInNode)
				range.collapse(true)
				selection.removeAllRanges()
				selection.addRange(range)
				return
			} catch (e) {
				console.error("Error setting caret in setCaretByCharacterOffset:", e, {
					targetNode,
					targetOffsetInNode,
					elementTextContentLength: element.textContent?.length,
					requestedOffset: offset,
				})
			}
		}
	}

	// Fallback: if exact position not found or error
	// console.warn("Caret position not found or error, falling back to end of element. Offset:", offset, "Accumulated:", accumulatedLength);
	try {
		range.selectNodeContents(element)
		range.collapse(false) // false for end
		selection.removeAllRanges()
		selection.addRange(range)
	} catch (e) {
		console.error("Fallback caret positioning to end failed (setCaretByCharacterOffset):", e)
	}
}
