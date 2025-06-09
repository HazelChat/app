import type { JSX } from "solid-js"

export function IconMic(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
		>
			<path
				d="M7.75 7C7.75 4.65279 9.65279 2.75 12 2.75C14.3472 2.75 16.25 4.65279 16.25 7V11.5C16.25 13.8472 14.3472 15.75 12 15.75C9.65279 15.75 7.75 13.8472 7.75 11.5V7Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M12.0009 19C15.0764 19 17.7195 17.1489 18.8769 14.5M12.0009 19C8.92546 19 6.28233 17.1489 5.125 14.5M12.0009 19V21.25"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
