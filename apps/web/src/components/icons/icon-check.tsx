import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconCheck({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="12" width="12" {...props} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="m1.76,7.004l2.25,3L10.24,1.746"
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

export default IconCheck
