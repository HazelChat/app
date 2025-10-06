import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconClose({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="12" width="12" {...props} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="2.25"
					x2="9.75"
					y1="9.75"
					y2="2.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="9.75"
					x2="2.25"
					y1="9.75"
					y2="2.25"
				/>
			</g>
		</svg>
	)
}

export default IconClose
