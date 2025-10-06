import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconDots({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="18" width="18" {...props} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M9 9.5C9.27614 9.5 9.5 9.27614 9.5 9C9.5 8.72386 9.27614 8.5 9 8.5C8.72386 8.5 8.5 8.72386 8.5 9C8.5 9.27614 8.72386 9.5 9 9.5Z"
					fill={fill}
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M3.25 9.5C3.52614 9.5 3.75 9.27614 3.75 9C3.75 8.72386 3.52614 8.5 3.25 8.5C2.97386 8.5 2.75 8.72386 2.75 9C2.75 9.27614 2.97386 9.5 3.25 9.5Z"
					fill={fill}
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M14.75 9.5C15.0261 9.5 15.25 9.27614 15.25 9C15.25 8.72386 15.0261 8.5 14.75 8.5C14.4739 8.5 14.25 8.72386 14.25 9C14.25 9.27614 14.4739 9.5 14.75 9.5Z"
					fill={fill}
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	)
}

export default IconDots
