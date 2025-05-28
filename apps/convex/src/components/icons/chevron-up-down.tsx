import type { JSX } from "solid-js"

export function IconChevronUpDown(props: JSX.IntrinsicElements["svg"]) {
	return (
		<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M8 9.00006L11.1161 5.88394C11.6043 5.39578 12.3957 5.39578 12.8839 5.88394L16 9.00006M16 15.0001L12.8839 18.1162C12.3957 18.6043 11.6043 18.6043 11.1161 18.1162L8 15.0001"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
