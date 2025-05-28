import type { JSX } from "solid-js"

export function IconImage(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M3.75 5.75C3.75 4.64543 4.64543 3.75 5.75 3.75H18.25C19.3546 3.75 20.25 4.64543 20.25 5.75V18.25C20.25 19.3546 19.3546 20.25 18.25 20.25H5.75C4.64543 20.25 3.75 19.3546 3.75 18.25V5.75Z"
				stroke="currentColor"
				stroke-width="1.5"
			/>
			<path
				d="M4 14.2104L6.84488 12.082C7.66137 11.5377 8.75215 11.6662 9.41987 12.3852C10.9123 13.9925 12.6426 15.4537 15 15.4537C17.1727 15.4537 18.6125 14.6484 20 13.2609"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
			<path
				d="M17.25 8.75C17.25 9.85457 16.3546 10.75 15.25 10.75C14.1454 10.75 13.25 9.85457 13.25 8.75C13.25 7.64543 14.1454 6.75 15.25 6.75C16.3546 6.75 17.25 7.64543 17.25 8.75Z"
				stroke="currentColor"
				stroke-width="1.5"
			/>
		</svg>
	)
}
