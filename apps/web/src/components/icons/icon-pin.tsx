import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconPin({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="18" width="18" {...props} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M9.34064 2.50266C10.4145 1.42876 12.1554 1.42876 13.2293 2.50266L15.4973 4.77066C16.5712 5.84455 16.5712 7.58542 15.4973 8.65932L12.6978 11.4588C12.6683 11.9192 12.5957 12.4505 12.4443 13.0259C12.0908 14.3707 11.4638 15.3601 10.9942 15.9729C10.9677 16.0122 10.9371 16.0496 10.9023 16.0843C10.6094 16.3772 10.1345 16.3772 9.84164 16.0843L1.91663 8.15932C1.76439 8.00707 1.68492 7.79675 1.69844 7.58187C1.71197 7.36699 1.81719 7.16829 1.98732 7.03634C2.59674 6.56369 3.59983 5.91693 4.97406 5.5557C5.54946 5.40426 6.08039 5.33159 6.54117 5.30212L9.34064 2.50266Z"
					fill={secondaryfill}
					fillOpacity="0.4"
				/>
				<path
					d="M5.34833 11.591L2.55066 14.3887C2.25777 14.6816 2.25777 15.1564 2.55066 15.4493C2.84356 15.7422 3.31843 15.7422 3.61132 15.4493L6.40899 12.6517L5.34833 11.591Z"
					fill={fill}
				/>
			</g>
		</svg>
	)
}

export default IconPin
