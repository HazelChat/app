import type { JSX } from "solid-js"

export function IconCopy(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M15.25 15.25V19C15.25 20.2426 14.2426 21.25 13 21.25H5C3.75736 21.25 2.75 20.2426 2.75 19V11C2.75 9.75736 3.75736 8.75 5 8.75H8.75"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M19 15.25H11C9.75736 15.25 8.75 14.2426 8.75 13V5C8.75 3.75736 9.75736 2.75 11 2.75H19C20.2426 2.75 21.25 3.75736 21.25 5V13C21.25 14.2426 20.2426 15.25 19 15.25Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
