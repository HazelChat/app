import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid"
import { useState } from "react"
import { toast } from "sonner"
import IconCheck from "~/components/icons/icon-check"
import IconCopy from "~/components/icons/icon-copy"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/field"
import { Input, InputGroup } from "~/components/ui/input"

interface TokenDisplayProps {
	token: string
	webhookUrl: string
	onDismiss: () => void
}

export function TokenDisplay({ token, webhookUrl, onDismiss }: TokenDisplayProps) {
	const [copiedField, setCopiedField] = useState<"token" | "url" | null>(null)
	const [isTokenVisible, setIsTokenVisible] = useState(false)

	const handleCopy = async (value: string, field: "token" | "url") => {
		try {
			await navigator.clipboard.writeText(value)
			setCopiedField(field)
			toast.success(field === "token" ? "Token copied" : "URL copied")
			setTimeout(() => setCopiedField(null), 2000)
		} catch {
			toast.error("Failed to copy to clipboard")
		}
	}

	return (
		<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
					<svg
						className="size-4 text-amber-600 dark:text-amber-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div className="flex-1 space-y-4">
					<p className="font-medium text-amber-700 text-sm dark:text-amber-300">
						Make sure to copy your token now. You won't be able to see it again!
					</p>

					<div className="space-y-3">
						<div>
							<Label className="mb-1.5 block text-muted-fg text-xs">Token</Label>
							<div className="flex gap-2">
								<InputGroup className="flex-1 [--input-gutter-end:--spacing(12)]">
									<Input
										value={token}
										readOnly
										type={isTokenVisible ? "text" : "password"}
										className="font-mono text-xs"
									/>
									<Button
										intent="plain"
										size="sq-sm"
										aria-pressed={isTokenVisible}
										onPress={() => setIsTokenVisible(!isTokenVisible)}
										aria-label={isTokenVisible ? "Hide token" : "Show token"}
									>
										{isTokenVisible ? (
											<EyeSlashIcon className="size-4" />
										) : (
											<EyeIcon className="size-4" />
										)}
									</Button>
								</InputGroup>
								<Button
									intent="outline"
									size="sq-sm"
									onPress={() => handleCopy(token, "token")}
								>
									{copiedField === "token" ? (
										<IconCheck className="size-4 text-emerald-500" />
									) : (
										<IconCopy className="size-4" />
									)}
								</Button>
							</div>
						</div>

						<div>
							<Label className="mb-1.5 block text-muted-fg text-xs">Webhook URL</Label>
							<div className="flex gap-2">
								<Input value={webhookUrl} readOnly className="flex-1 font-mono text-xs" />
								<Button
									intent="outline"
									size="sq-sm"
									onPress={() => handleCopy(webhookUrl, "url")}
								>
									{copiedField === "url" ? (
										<IconCheck className="size-4 text-emerald-500" />
									) : (
										<IconCopy className="size-4" />
									)}
								</Button>
							</div>
						</div>
					</div>

					<Button intent="secondary" size="sm" onPress={onDismiss}>
						Done
					</Button>
				</div>
			</div>
		</div>
	)
}
