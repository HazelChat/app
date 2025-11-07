import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

export function IconDownload({
	fill = "currentColor",
	secondaryfill,
	title = "badge 13",
	...props
}: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="18" width="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...props}>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M11.599 6H12.152C13.064 6 13.845 6.725 14.011 7.724L14.968 13.514C15.182 14.807 14.291 16 13.109 16H4.891C3.709 16 2.81799 14.807 3.03199 13.514L3.98899 7.724C4.15499 6.725 4.936 6 5.848 6H6.40099"
					fill={secondaryfill}
					opacity="0.3"
					stroke="none"
				/>
				<path
					d="M12 6.25H12.335C13.3 6.25 14.127 6.939 14.302 7.888L15.315 13.388C15.541 14.617 14.598 15.75 13.348 15.75H4.65199C3.40199 15.75 2.45899 14.617 2.68499 13.388L3.69799 7.888C3.87299 6.939 4.69999 6.25 5.66499 6.25H5.99999"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M12 9.5L9 12.5L6 9.5"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M9 12.5V1.25"
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
