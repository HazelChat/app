import { useCallback, useEffect, useRef, useState } from "react"

interface UseDebouncedIntersectionOptions {
	threshold?: number | number[]
	root?: Element | null
	rootMargin?: string
	enabled?: boolean
	debounceMs?: number
}

export function useDebouncedIntersection(
	options: UseDebouncedIntersectionOptions = {},
): [React.RefObject<HTMLDivElement | null>, boolean] {
	const { threshold = 0, root = null, rootMargin = "0px", enabled = true, debounceMs = 300 } = options

	const [isIntersecting, setIsIntersecting] = useState(false)
	const [debouncedIntersecting, setDebouncedIntersecting] = useState(false)
	const targetRef = useRef<HTMLDivElement | null>(null)
	const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>()

	// Debounce the intersection state
	useEffect(() => {
		clearTimeout(debounceTimeoutRef.current)

		if (isIntersecting) {
			debounceTimeoutRef.current = setTimeout(() => {
				setDebouncedIntersecting(true)
			}, debounceMs)
		} else {
			// Clear immediately when not intersecting
			setDebouncedIntersecting(false)
		}

		return () => {
			clearTimeout(debounceTimeoutRef.current)
		}
	}, [isIntersecting, debounceMs])

	useEffect(() => {
		if (!enabled || !targetRef.current) {
			setIsIntersecting(false)
			setDebouncedIntersecting(false)
			return
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsIntersecting(entry.isIntersecting)
			},
			{
				threshold,
				root,
				rootMargin,
			},
		)

		observer.observe(targetRef.current)

		return () => {
			observer.disconnect()
			clearTimeout(debounceTimeoutRef.current)
		}
	}, [enabled, threshold, root, rootMargin])

	return [targetRef, debouncedIntersecting]
}

