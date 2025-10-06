import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconPhone({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="18" width="18" {...props} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M15.6 11.4946L12.674 10.1956C11.961 9.87858 11.123 10.0816 10.634 10.6896L9.39952 11.8784C8.09252 11.0244 6.97652 9.90743 6.12252 8.59843L7.32614 7.36907C7.93514 6.88107 8.13914 6.04207 7.82314 5.32907L6.52314 2.40107C6.18014 1.62907 5.33814 1.22307 4.51914 1.43407L2.54452 1.94843C1.69852 2.16843 1.15152 2.98843 1.27152 3.85543C2.20552 10.5044 7.50052 15.8004 14.1515 16.7344C14.2315 16.7454 14.3095 16.7504 14.3875 16.7504C15.1615 16.7504 15.8555 16.2284 16.0565 15.4604L16.566 13.4966C16.777 12.6796 16.371 11.8376 15.6 11.4946Z"
					fill={secondaryfill}
					fillOpacity="0.4"
				/>
			</g>
		</svg>
	)
}

export default IconPhone
