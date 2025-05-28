import type { JSX } from "solid-js"

export function IconPlusSmall(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M12 6.75V12M12 12V17.25M12 12H6.75M12 12H17.25"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		</svg>
	)
}
