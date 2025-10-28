import { createFileRoute } from "@tanstack/react-router"
import { SectionFooter } from "~/components/application/section-footers/section-footer"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { SectionLabel } from "~/components/application/section-headers/section-label"
import { Button } from "~/components/base/buttons/button"
import { Form } from "~/components/base/form/form"
import { RadioGroupCheckbox } from "~/components/base/radio-groups/radio-group-checkbox"
import { Slider } from "~/components/base/slider/slider"
import { Toggle } from "~/components/base/toggle/toggle"
import IconVolume from "~/components/icons/icon-volume"
import IconVolumeMute from "~/components/icons/icon-volume-mute"
import { Separator } from "~/components/ui/separator"
import { useNotificationSettings } from "~/hooks/use-notification-settings"
import { useNotificationSound } from "~/hooks/use-notification-sound"
import { cx } from "~/utils/cx"

export const Route = createFileRoute("/_app/$orgSlug/settings/notifications")({
	component: NotificationsSettings,
})

function NotificationsSettings() {
	const { settings, updateSettings, testSound } = useNotificationSound()
	const {
		desktopNotifications,
		messagePreference,
		emailNotifications,
		emailDigest,
		doNotDisturb,
		quietHoursStart,
		quietHoursEnd,
		isSubmitting,
		setDesktopNotifications,
		setMessagePreference,
		setEmailNotifications,
		setEmailDigest,
		setDoNotDisturb,
		setQuietHoursStart,
		setQuietHoursEnd,
		saveSettings,
	} = useNotificationSettings()

	return (
		<Form
			className="flex flex-col gap-6 px-4 lg:px-8"
			onSubmit={(e) => {
				e.preventDefault()
				saveSettings()
			}}
		>
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
						<SectionHeader.Heading>Notifications</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Manage your notification preferences and delivery methods.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<div className="flex flex-col gap-y-6">
				<NotificationSection>
					<SectionLabel.Root
						size="sm"
						title="Desktop notifications"
						description="Show alerts directly on your desktop when new activity happens"
						className="space-y-1 max-lg:hidden"
					/>

					<Toggle
						size="sm"
						label="Enable desktop notifications"
						isSelected={desktopNotifications}
						onChange={setDesktopNotifications}
					/>
				</NotificationSection>

				<Separator className="my-3" />

				<NotificationSection>
					<SectionLabel.Root
						size="sm"
						title="Sound notifications"
						description="Play a sound to notify you when new activity occurs"
						className="space-y-1 max-lg:hidden"
					/>

					<div className="space-y-4">
						<Toggle
							size="sm"
							label="Enable notification sounds"
							isSelected={settings.enabled}
							onChange={(checked) => updateSettings({ enabled: checked })}
						/>

						{settings.enabled && (
							<>
								<div className="flex flex-col gap-y-2">
									<span className="font-medium text-secondary text-sm">
										Notification sound
									</span>
									<div className="flex gap-2">
										<Button
											type="button"
											size="sm"
											color={
												settings.soundFile === "notification01"
													? "primary"
													: "secondary"
											}
											onClick={() => updateSettings({ soundFile: "notification01" })}
										>
											Sound 1
										</Button>
										<Button
											type="button"
											size="sm"
											color={
												settings.soundFile === "notification02"
													? "primary"
													: "secondary"
											}
											onClick={() => updateSettings({ soundFile: "notification02" })}
										>
											Sound 2
										</Button>
										<Button
											type="button"
											size="sm"
											color="secondary"
											onClick={testSound}
											iconLeading={IconVolume}
										>
											Test
										</Button>
									</div>
								</div>

								<div className="flex flex-col gap-y-2">
									<div className="flex items-center justify-between">
										<span className="font-medium text-secondary text-sm">Volume</span>
										<span className="tabular-numbs text-sm text-tertiary">
											{Math.round(settings.volume * 100)}%
										</span>
									</div>
									<div className="flex items-center gap-3">
										{settings.volume === 0 ? (
											<IconVolumeMute className="size-4 text-tertiary" />
										) : settings.volume < 0.5 ? (
											<IconVolumeMute className="size-4 text-tertiary" />
										) : (
											<IconVolume className="size-4 text-tertiary" />
										)}
										<Slider
											minValue={0}
											maxValue={100}
											value={settings.volume * 100}
											onChange={(e) =>
												updateSettings({ volume: Array.isArray(e) ? e[0] : e })
											}
											labelPosition="top-floating"
										/>
									</div>
								</div>
							</>
						)}
					</div>
				</NotificationSection>

				<Separator className="my-3" />

				<NotificationSection>
					<SectionLabel.Root
						size="sm"
						title="Message notifications"
						description="Choose when you want to be notified about new messages and conversations"
						className="space-y-1 max-lg:hidden"
					/>

					<RadioGroupCheckbox
						value={messagePreference}
						onChange={(value) =>
							setMessagePreference(value as "all" | "mentions" | "direct" | "none")
						}
						items={[
							{
								value: "all",
								title: "All messages",
								description: "Get notified for every new message",
							},
							{
								value: "mentions",
								title: "Mentions only",
								description: "Only when someone @mentions you",
							},
							{
								value: "direct",
								title: "Direct messages & mentions",
								description: "DMs and @mentions only",
							},
							{
								value: "none",
								title: "Nothing",
								description: "Turn off all message notifications",
							},
						]}
					/>
				</NotificationSection>

				<Separator className="my-3" />

				<NotificationSection>
					<SectionLabel.Root
						size="sm"
						title="Email notifications"
						description="Receive updates by email when you are away"
						className="space-y-1 max-lg:hidden"
					/>

					<div className="space-y-4">
						<Toggle
							size="sm"
							label="Enable email notifications"
							isSelected={emailNotifications}
							onChange={setEmailNotifications}
						/>

						{emailNotifications && (
							<div className="flex flex-col gap-y-2">
								<span className="font-medium text-secondary text-sm">
									Email digest frequency
								</span>
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										color={emailDigest === "instant" ? "primary" : "secondary"}
										onClick={() => setEmailDigest("instant" as const)}
									>
										Instant
									</Button>
									<Button
										type="button"
										size="sm"
										color={emailDigest === "daily" ? "primary" : "secondary"}
										onClick={() => setEmailDigest("daily" as const)}
									>
										Daily
									</Button>
									<Button
										type="button"
										size="sm"
										color={emailDigest === "weekly" ? "primary" : "secondary"}
										onClick={() => setEmailDigest("weekly" as const)}
									>
										Weekly
									</Button>
								</div>
							</div>
						)}
					</div>
				</NotificationSection>

				<Separator className="my-3" />

				<NotificationSection>
					<SectionLabel.Root
						size="sm"
						title="Quiet hours"
						description="Mute notifications during selected times"
						className="space-y-1 max-lg:hidden"
					/>

					<div className="space-y-4">
						<Toggle
							size="sm"
							label="Enable quiet hours"
							isSelected={doNotDisturb}
							onChange={setDoNotDisturb}
						/>

						{doNotDisturb && (
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="start-time"
										className="mb-2 block font-medium text-secondary text-sm"
									>
										Start time
									</label>
									<input
										id="start-time"
										type="time"
										value={quietHoursStart}
										onChange={(e) => setQuietHoursStart(e.target.value)}
										className="w-full rounded-lg border border-border bg-primary px-3 py-2 text-sm focus:border-brand-solid focus:outline-none focus:ring-2 focus:ring-brand-solid/20"
									/>
								</div>
								<div>
									<label
										htmlFor="end-time"
										className="mb-2 block font-medium text-secondary text-sm"
									>
										End time
									</label>
									<input
										id="end-time"
										type="time"
										value={quietHoursEnd}
										onChange={(e) => setQuietHoursEnd(e.target.value)}
										className="w-full rounded-lg border border-border bg-primary px-3 py-2 text-sm focus:border-brand-solid focus:outline-none focus:ring-2 focus:ring-brand-solid/20"
									/>
								</div>
							</div>
						)}
					</div>
				</NotificationSection>

				<SectionFooter.Root>
					<SectionFooter.Actions>
						<Button type="submit" color="primary" size="md" isDisabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					</SectionFooter.Actions>
				</SectionFooter.Root>
			</div>
		</Form>
	)
}

const NotificationSection = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div className={cx("grid grid-cols-1 lg:grid-cols-[24rem_1fr] lg:gap-14", className)} {...props} />
}
