import { useEffect, useRef, useState } from "react"

interface UseIntersectionObserverOptions {
	threshold?: number
	root?: Element | null
	rootMargin?: string
	enabled?: boolean
}

export function useIntersectionObserver(
	options: UseIntersectionObserverOptions = {},
): [React.RefObject<HTMLDivElement | null>, boolean] {
	const { threshold = 0, root = null, rootMargin = "0px", enabled = true } = options
	const [isIntersecting, setIsIntersecting] = useState(false)
	const targetRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (!enabled || !targetRef.current) return

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
		}
	}, [enabled, threshold, root, rootMargin])

	return [targetRef, isIntersecting]
}