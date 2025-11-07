import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

export function IconExternalLink({
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
					d="M4 3.75C4 2.64543 4.89543 1.75 6 1.75H12.25C13.3546 1.75 14.25 2.64543 14.25 3.75V13C14.25 14.1046 13.3546 15 12.25 15H6C4.89543 15 4 14.1046 4 13V3.75Z"
					fill={secondaryfill}
					fillOpacity="0.3"
					stroke="none"
				/>
				<path
					d="M4.25 9.25V3.75C4.25 2.645 5.145 1.75 6.25 1.75H12.25C13.355 1.75 14.25 2.645 14.25 3.75V13.25C14.25 14.355 13.355 15.25 12.25 15.25H7.25"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M7.23999 6.75H11.25V10.76"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M11.25 6.75L1.75 16.25"
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
