import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid"
import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelWebhookId } from "@hazel/schema"
import { Exit } from "effect"
import { useState } from "react"
import { toast } from "sonner"
import { regenerateChannelWebhookTokenMutation } from "~/atoms/channel-webhook-atoms"
import IconCheck from "~/components/icons/icon-check"
import IconCopy from "~/components/icons/icon-copy"
import { Button } from "~/components/ui/button"
import { Description, Label } from "~/components/ui/field"
import { Input, InputGroup } from "~/components/ui/input"
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "~/components/ui/modal"

interface RegenerateTokenDialogProps {
	webhookId: ChannelWebhookId
	webhookName: string
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function RegenerateTokenDialog({
	webhookId,
	webhookName,
	isOpen,
	onOpenChange,
	onSuccess,
}: RegenerateTokenDialogProps) {
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [newToken, setNewToken] = useState<{
		token: string
		webhookUrl: string
	} | null>(null)
	const [isTokenVisible, setIsTokenVisible] = useState(false)
	const [copiedField, setCopiedField] = useState<"token" | "url" | null>(null)

	const regenerateToken = useAtomSet(regenerateChannelWebhookTokenMutation, {
		mode: "promiseExit",
	})

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

	const handleRegenerate = async () => {
		setIsRegenerating(true)

		const exit = await regenerateToken({
			payload: { id: webhookId },
		})

		setIsRegenerating(false)

		Exit.match(exit, {
			onSuccess: (result) => {
				setNewToken({
					token: result.token,
					webhookUrl: result.webhookUrl,
				})
				toast.success("Token regenerated successfully")
				onSuccess?.()
			},
			onFailure: (cause) => {
				console.error("Failed to regenerate token:", cause)
				toast.error("Failed to regenerate token")
			},
		})
	}

	const handleClose = () => {
		setNewToken(null)
		setIsTokenVisible(false)
		setCopiedField(null)
		onOpenChange(false)
	}

	return (
		<Modal isOpen={isOpen} onOpenChange={handleClose}>
			<ModalContent size="lg">
				<ModalHeader>
					<ModalTitle>Regenerate token</ModalTitle>
					<Description>
						{newToken
							? "Your new token has been generated. Make sure to copy it now - you won't be able to see it again!"
							: `This will invalidate the current token for ${webhookName} immediately. Any integrations using the old token will stop working.`}
					</Description>
				</ModalHeader>

				{newToken && (
					<ModalBody className="flex flex-col gap-4">
						<div>
							<Label className="mb-1.5 block">Token</Label>
							<div className="flex gap-2">
								<InputGroup className="flex-1 [--input-gutter-end:--spacing(12)]">
									<Input
										value={newToken.token}
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
									onPress={() => handleCopy(newToken.token, "token")}
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
							<Label className="mb-1.5 block">Webhook URL</Label>
							<div className="flex gap-2">
								<Input
									value={newToken.webhookUrl}
									readOnly
									className="flex-1 font-mono text-xs"
								/>
								<Button
									intent="outline"
									size="sq-sm"
									onPress={() => handleCopy(newToken.webhookUrl, "url")}
								>
									{copiedField === "url" ? (
										<IconCheck className="size-4 text-emerald-500" />
									) : (
										<IconCopy className="size-4" />
									)}
								</Button>
							</div>
						</div>
					</ModalBody>
				)}

				<ModalFooter>
					{newToken ? (
						<Button intent="primary" onPress={handleClose}>
							Done
						</Button>
					) : (
						<>
							<Button intent="outline" onPress={handleClose} isDisabled={isRegenerating}>
								Cancel
							</Button>
							<Button intent="warning" onPress={handleRegenerate} isDisabled={isRegenerating}>
								{isRegenerating ? "Regenerating..." : "Regenerate token"}
							</Button>
						</>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
