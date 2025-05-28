import type { JSX } from "solid-js"

export function IconSidebarLeftArrow(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M15.25 9.75L13 12L15.25 14.25"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M3.75 6.75C3.75 5.09315 5.09315 3.75 6.75 3.75H17.25C18.9069 3.75 20.25 5.09315 20.25 6.75V17.25C20.25 18.9069 18.9069 20.25 17.25 20.25H6.75C5.09315 20.25 3.75 18.9069 3.75 17.25V6.75Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path d="M8.25 3.75V20.25" stroke="currentColor" stroke-width="1.5" />
		</svg>
	)
}
