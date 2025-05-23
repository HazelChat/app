import { type Component, createSignal, onCleanup, onMount } from "solid-js"

export const FpsCounter: Component = () => {
	const getInitialVisibility = (): boolean => {
		try {
			const stored = localStorage.getItem("fps-counter-visible")
			return stored !== null ? JSON.parse(stored) : true
		} catch {
			return true
		}
	}

	const [fps, setFps] = createSignal<number>(0)
	const [isVisible, setIsVisible] = createSignal<boolean>(getInitialVisibility())

	let frameCount = 0
	let lastTime: number = performance.now()
	let animationFrameId: number | undefined

	const loop = (currentTime: DOMHighResTimeStamp) => {
		frameCount++
		const elapsedTime: number = currentTime - lastTime

		if (elapsedTime >= 1000) {
			const calculatedFps: number = Math.round((frameCount * 1000) / elapsedTime)
			setFps(calculatedFps)

			frameCount = 0
			lastTime = currentTime
		}

		animationFrameId = requestAnimationFrame(loop)
	}

	const toggleVisibility = () => {
		const newVisibility = !isVisible()
		setIsVisible(newVisibility)
		try {
			localStorage.setItem("fps-counter-visible", JSON.stringify(newVisibility))
		} catch {
			console.warn("Failed to save FPS counter visibility to localStorage")
		}
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.metaKey && event.key === "g") {
			event.preventDefault()
			toggleVisibility()
		}
	}

	onMount(() => {
		lastTime = performance.now()
		frameCount = 0
		animationFrameId = requestAnimationFrame(loop)

		document.addEventListener("keydown", handleKeyDown)
	})

	onCleanup(() => {
		if (animationFrameId !== undefined) {
			cancelAnimationFrame(animationFrameId)
		}
		document.removeEventListener("keydown", handleKeyDown)
	})

	return (
		<div
			style={{
				position: "fixed",
				top: "10px",
				right: "10px",
				"background-color": "rgba(0, 0, 0, 0.7)",
				color: "lime",
				padding: "5px 10px",
				"border-radius": "3px",
				"font-family": "monospace",
				"z-index": "9999",
				display: isVisible() ? "block" : "none",
			}}
		>
			FPS: {fps()}
		</div>
	)
}
