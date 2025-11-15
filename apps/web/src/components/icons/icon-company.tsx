import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

export function IconOffice({
	fill = "currentColor",
	secondaryfill,
	title = "badge 13",
	...props
}: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg
			height="18"
			width="18"
			data-slot="icon"
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M10.75 5.75H15.25C15.802 5.75 16.25 6.198 16.25 6.75V14.75C16.25 15.302 15.802 15.75 15.25 15.75H9.75V6.75C9.75 6.198 10.198 5.75 10.75 5.75Z"
					fill={secondaryfill}
					opacity="0.3"
					stroke="none"
				/>
				<path
					d="M2.75 8.75H5.75C6.302 8.75 6.75 9.198 6.75 9.75V15.75H2.75C2.198 15.75 1.75 15.302 1.75 14.75V9.75C1.75 9.198 2.198 8.75 2.75 8.75Z"
					fill={secondaryfill}
					opacity="0.3"
					stroke="none"
				/>
				<path
					d="M10.75 5.75H15.25C15.802 5.75 16.25 6.198 16.25 6.75V14.75C16.25 15.302 15.802 15.75 15.25 15.75H9.75V6.75C9.75 6.198 10.198 5.75 10.75 5.75Z"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M2.75 8.75H5.75C6.302 8.75 6.75 9.198 6.75 9.75V15.75H2.75C2.198 15.75 1.75 15.302 1.75 14.75V9.75C1.75 9.198 2.198 8.75 2.75 8.75Z"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M4.75 6.24999V4.44799C4.75 4.02799 5.01201 3.65399 5.40601 3.50899L10.906 1.493C11.559 1.254 12.25 1.737 12.25 2.432V3.24999"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M6.75 15.75H9.75"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M12.25 8.75H13.75"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M12.25 11.25H13.75"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	)
}
