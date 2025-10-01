import { Heatmap } from "@paper-design/shaders-react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/test2")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div>
			<Heatmap
				colors={["#11206a", "#1f3ba2", "#2f63e7", "#6bd7ff", "#ffe679", "#ff991e", "#ff4c00"]}
				colorBack="#00000000"
				speed={1}
				contour={0.5}
				angle={0}
				noise={0.4}
				innerGlow={0.5}
				outerGlow={0.5}
				scale={1}
				image="https://workers.paper.design/file-assets/01K4PDB7KC8P1Z6GJK4P4SD56R/01K4TP1AXPND599GX4ZGB4HDRB.svg"
				frame={130138.50000000006}
				style={{ height: "516px", width: "516px" }}
			/>
		</div>
	)
}
