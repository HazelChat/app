import { Toast as ArkToast, Toaster as ArkToaster, createToaster } from "@ark-ui/solid"
import { Show } from "solid-js"
import { tv } from "tailwind-variants"
import { IconX } from "../icons/x"
import { Button } from "./button"

export const toaster = createToaster({
	placement: "bottom-end",
	overlap: true,
	max: 5,
	gap: 24,
	duration: 3000,
})

export const toastVariants = tv({
	base: [
		"text-sm",
		"flex flex-col gap-px",
		"w-[calc(100%-var(--gap)*2)] sm:w-64",
		"rounded-md shadow shadow-md bg-background border text-foreground border-border",
		"px-3 py-2",
	],
})

export const Toaster = () => {
	return (
		<ArkToaster class="w-full sm:w-auto" toaster={toaster}>
			{(toast) => (
				<ArkToast.Root class={toastVariants()}>
					<ArkToast.Title>{toast().title}</ArkToast.Title>
					<ArkToast.Description class="text-muted-foreground">{toast().description}</ArkToast.Description>
					<Show when={toast()}>
						<ArkToast.ActionTrigger>{toast().action?.label}</ArkToast.ActionTrigger>
					</Show>
					<Show when={toast().closable}>
						<ArkToast.CloseTrigger
							asChild={(closeProps) => (
								<Button
									class="absolute top-2 right-2 flex size-6 items-center justify-between"
									{...closeProps()}
									size="icon-small"
									intent="icon"
								>
									<IconX class="size-4" />
								</Button>
							)}
						/>
					</Show>
				</ArkToast.Root>
			)}
		</ArkToaster>
	)
}
