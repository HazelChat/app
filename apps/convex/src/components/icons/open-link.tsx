import type { JSX } from "solid-js"

export function IconOpenLink(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M18.25 14V15.45C18.25 17.1302 18.25 17.9702 17.923 18.612C17.6354 19.1765 17.1765 19.6354 16.612 19.923C15.9702 20.25 15.1302 20.25 13.45 20.25H8.55C6.86984 20.25 6.02976 20.25 5.38803 19.923C4.82354 19.6354 4.3646 19.1765 4.07698 18.612C3.75 17.9702 3.75 17.1302 3.75 15.45V8.875C3.75 8.75894 3.75 8.70091 3.75161 8.65184C3.80332 7.072 5.072 5.80332 6.65184 5.75161C6.70091 5.75 6.75894 5.75 6.875 5.75H9.25M13.75 3.75H20.25M20.25 3.75V10.25M20.25 3.75L11 13"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
