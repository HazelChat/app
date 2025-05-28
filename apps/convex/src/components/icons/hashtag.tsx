import type { JSX } from "solid-js"

export function IconHashtag(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M8.75 3.75L6.75 20.25M17.25 3.75L15.25 20.25M3.75 7.75H20.25M20.25 16.25H3.75"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
