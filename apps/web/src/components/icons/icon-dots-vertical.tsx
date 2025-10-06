import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconDotsVertical({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
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
					d="M9 3.75C9.27614 3.75 9.5 3.52614 9.5 3.25C9.5 2.97386 9.27614 2.75 9 2.75C8.72386 2.75 8.5 2.97386 8.5 3.25C8.5 3.52614 8.72386 3.75 9 3.75Z"
					fill={fill}
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M9 15.25C9.27614 15.25 9.5 15.0261 9.5 14.75C9.5 14.4739 9.27614 14.25 9 14.25C8.72386 14.25 8.5 14.4739 8.5 14.75C8.5 15.0261 8.72386 15.25 9 15.25Z"
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

export default IconDotsVertical
