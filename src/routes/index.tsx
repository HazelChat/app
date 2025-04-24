import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<main class="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)] text-center">
			WOW
		</main>
	);
}
