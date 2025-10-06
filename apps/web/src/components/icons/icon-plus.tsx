import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconPlus({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="12" width="12" {...props} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="m10.75,6.75H1.25c-.414,0-.75-.336-.75-.75s.336-.75.75-.75h9.5c.414,0,.75.336.75.75s-.336.75-.75.75Z"
					fill={secondaryfill}
					strokeWidth="0"
				/>
				<path
					d="m6,11.5c-.414,0-.75-.336-.75-.75V1.25c0-.414.336-.75.75-.75s.75.336.75.75v9.5c0,.414-.336.75-.75.75Z"
					fill={fill}
					strokeWidth="0"
				/>
			</g>
		</svg>
	)
}

export default IconPlus
