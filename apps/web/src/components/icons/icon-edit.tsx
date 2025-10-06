import React, { type SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
	secondaryfill?: string
	strokewidth?: number
	title?: string
}

function IconEdit({ fill = "currentColor", secondaryfill, title = "badge 13", ...props }: IconProps) {
	secondaryfill = secondaryfill || fill

	return (
		<svg height="18" width="18" {...props} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M9.25 15.25C9.25 14.8358 9.58579 14.5 10 14.5H15.25C15.6642 14.5 16 14.8358 16 15.25C16 15.6642 15.6642 16 15.25 16H10C9.58579 16 9.25 15.6642 9.25 15.25Z"
					fill={fill}
					fillRule="evenodd"
				/>
				<path
					d="M12.75 11.75C12.75 11.3358 13.0858 11 13.5 11H15.25C15.6642 11 16 11.3358 16 11.75C16 12.1642 15.6642 12.5 15.25 12.5H13.5C13.0858 12.5 12.75 12.1642 12.75 11.75Z"
					fill={fill}
					fillRule="evenodd"
				/>
				<path
					d="M11.4097 2.84199L3.60069 10.651C2.73769 11.515 2.19969 14.057 2.00769 15.11C1.96369 15.352 2.04169 15.601 2.21569 15.775C2.35769 15.917 2.54869 15.995 2.74569 15.995C2.78969 15.995 2.83469 15.991 2.87969 15.983C3.93269 15.792 6.47469 15.254 7.33869 14.39L15.1477 6.58099C16.1777 5.54999 16.1777 3.87399 15.1477 2.84299C14.1497 1.84499 12.4077 1.84499 11.4097 2.84199Z"
					fill={secondaryfill}
					fillOpacity="0.4"
				/>
			</g>
		</svg>
	)
}

export default IconEdit
