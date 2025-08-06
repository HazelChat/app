import { createFileRoute } from "@tanstack/react-router"

import { useEffect, useState } from "react"
import type { Color } from "react-aria-components"
import { ColorField, ColorSwatch, parseColor, Radio, RadioGroup } from "react-aria-components"
import { Dark, Light, System } from "~/components/application/modals/appearances"
import { generateRgbShades } from "~/components/application/modals/base-components/generate-shades"

import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { SectionLabel } from "~/components/application/section-headers/section-label"

import { Form } from "~/components/base/form/form"
import { InputBase } from "~/components/base/input/input"
import { RadioButtonBase } from "~/components/base/radio-buttons/radio-buttons"
import { Select } from "~/components/base/select/select"
import { type Theme, useTheme } from "~/components/theme-provider"

import { cx } from "~/utils/cx"

export const Route = createFileRoute("/app/$orgId/settings/")({
	component: AppearanceSettings,
})

function AppearanceSettings() {
	const colorSwatches = [
		{ hex: "#535862", name: "gray" },
		{ hex: "#099250", name: "green" },
		{ hex: "#1570EF", name: "blue" },
		{ hex: "#444CE7", name: "indigo" },
		{ hex: "#6938EF", name: "purple" },
		{ hex: "#BA24D5", name: "fuchsia" },
		{ hex: "#DD2590", name: "pink" },
		{ hex: "#E04F16", name: "orange" },
	]

	// Get saved color from localStorage or default
	const getSavedColor = () => {
		try {
			const savedColorHex = localStorage.getItem("brand-color")
			if (savedColorHex) {
				return parseColor(savedColorHex)
			}
		} catch {
			// localStorage not available or invalid color
		}
		return parseColor("#7F56D9") // Default color
	}

	const [color, setColor] = useState<Color>(getSavedColor())

	const { theme, setTheme } = useTheme()

	useEffect(() => {
		// Save color to localStorage
		try {
			localStorage.setItem("brand-color", color.toString("hex"))
		} catch {
			// localStorage not available
		}

		const existingColorSwatch = colorSwatches.find((swatch) => swatch.hex === color.toString("hex"))
		if (existingColorSwatch) {
			const shades = ["25", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]

			// Re-map the brand color variables to the existing primitive color variables.
			shades.forEach((shade) =>
				document.documentElement.style.setProperty(
					`--color-brand-${shade}`,
					`var(--color-${existingColorSwatch.name}-${shade})`,
				),
			)

			return
		}

		const shades = generateRgbShades(color.toString("hex"))
		if (!shades) return

		// Set the brand color variables to the new custom color shades.
		Object.entries(shades).forEach(([key, { r, g, b }]) =>
			document.documentElement.style.setProperty(`--color-brand-${key}`, `rgb(${r} ${g} ${b})`),
		)
	}, [color])

	const _handleCustomColorChange = (value: Color | null) => {
		if (!value) return

		// Always update the selected color when custom color changes
		setColor(value)
	}

	const themes = [
		{
			value: "system",
			label: "System preference",
			component: System,
		},
		{
			value: "light",
			label: "Light mode",
			component: Light,
		},
		{
			value: "dark",
			label: "Dark mode",
			component: Dark,
		},
	]

	return (
		<Form
			className="flex flex-col gap-6 px-4 lg:px-8"
			onSubmit={(e) => {
				e.preventDefault()
				const data = Object.fromEntries(new FormData(e.currentTarget))
				console.log("Form data:", data)
			}}
		>
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
						<SectionHeader.Heading>Appearance</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Change how your dashboard looks and feels.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			{/* Form content */}
			<div className="flex flex-col gap-5">
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
					<SectionLabel.Root
						size="sm"
						title="Brand color"
						description="Select or customize your brand color."
					/>

					<div className="flex flex-col gap-3 md:flex-row md:items-center">
						<RadioGroup
							aria-label="Brand color"
							value={color?.toString("hex")}
							onChange={(value) => {
								const newColor = parseColor(value)
								setColor(newColor)
							}}
							className="flex flex-col items-start gap-4 md:flex-row md:items-center"
						>
							<div className="flex gap-2">
								{colorSwatches.map((swatch) => (
									<Radio
										key={swatch.hex}
										value={swatch.hex}
										aria-label={parseColor(swatch.hex).getColorName("en-US")}
									>
										{({ isSelected, isFocused }) => (
											<ColorSwatch
												id={"color-${swatch.hex}"}
												color={swatch.hex}
												className={cx(
													"-outline-offset-1 size-7 cursor-pointer rounded-full outline-1 outline-black/10",
													(isSelected || isFocused) &&
														"ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-primary",
												)}
											/>
										)}
									</Radio>
								))}
							</div>
						</RadioGroup>
					</div>
				</div>

				<hr className="h-px w-full border-none bg-border-secondary" />

				<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
					<SectionLabel.Root
						size="sm"
						title="Display preference"
						description="Switch between light and dark modes."
					/>

					<div className="-m-4 w-screen overflow-auto p-4 lg:w-[calc(100%+48px)]">
						<RadioGroup
							aria-label="Display preference"
							defaultValue="system"
							className="flex gap-5"
							value={theme}
							onChange={(value) => setTheme(value as Theme)}
						>
							{themes.map((theme) => (
								<Radio
									key={theme.value}
									value={theme.value}
									aria-label={theme.label}
									className="flex cursor-pointer flex-col gap-3"
								>
									{({ isSelected, isFocusVisible }) => (
										<>
											<section
												className={cx(
													"relative h-33 w-50 rounded-[10px] bg-utility-gray-100",
													isSelected &&
														"outline-2 outline-focus-ring outline-offset-2",
												)}
											>
												<theme.component className="size-full" />

												{isSelected && (
													<RadioButtonBase
														size="md"
														isSelected={isSelected}
														isFocusVisible={isFocusVisible}
														className="absolute bottom-2 left-2"
													/>
												)}
											</section>
											<section className="w-full">
												<p className="font-semibold text-primary text-sm">
													{theme.label}
												</p>
											</section>
										</>
									)}
								</Radio>
							))}
						</RadioGroup>
					</div>
				</div>

				<hr className="h-px w-full border-none bg-border-secondary" />

				<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
					<SectionLabel.Root
						size="sm"
						title="Language"
						description="Default language for public dashboard."
					/>

					<div className="w-max min-w-50">
						<Select
							name="language"
							aria-label="Language"
							size="sm"
							defaultSelectedKey="en-US"
							items={[
								{
									id: "en-US",
									label: "English (US)",
									icon: (
										<img
											src="https://www.untitledui.com/images/flags/US.svg"
											alt="United States flag"
											className="size-5"
										/>
									),
								},
								{
									id: "de-DE",
									label: "German (DE)",
									icon: (
										<img
											src="https://www.untitledui.com/images/flags/DE.svg"
											alt="German flag"
											className="size-5"
										/>
									),
								},
								{
									id: "es-ES",
									label: "Spanish (ES)",
									icon: (
										<img
											src="https://www.untitledui.com/images/flags/ES.svg"
											alt="Spanish flag"
											className="size-5"
										/>
									),
								},
							]}
						>
							{(item) => (
								<Select.Item id={item.id} icon={item.icon}>
									{item.label}
								</Select.Item>
							)}
						</Select>
					</div>
				</div>
			</div>
		</Form>
	)
}
