import type { JSX } from "solid-js"

export function IconUser(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M15.75 6.5C15.75 8.57107 14.0711 10.25 12 10.25C9.92893 10.25 8.25 8.57107 8.25 6.5C8.25 4.42893 9.92893 2.75 12 2.75C14.0711 2.75 15.75 4.42893 15.75 6.5Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
			<path
				d="M11.9997 13.25C9.02123 13.25 6.67402 14.8039 5.43304 17.1121C4.59593 18.6691 6.02717 20.25 7.79494 20.25H16.2044C17.9722 20.25 19.4034 18.6691 18.5663 17.1121C17.3254 14.8039 14.9781 13.25 11.9997 13.25Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
