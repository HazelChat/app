import type { JSX } from "solid-js"

export function IconChat(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 13.3108 3.02267 14.558 3.51437 15.6878C3.67129 16.0484 3.71278 16.4524 3.59677 16.8281L2.82118 19.3402C2.4689 20.4812 3.52634 21.5564 4.67306 21.2231L7.32685 20.4518C7.68827 20.3468 8.07392 20.3864 8.42094 20.5321C9.52186 20.9945 10.7311 21.25 12 21.25Z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
