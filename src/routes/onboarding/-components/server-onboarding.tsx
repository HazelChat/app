import { Dialog, DialogCloseTrigger } from "@ark-ui/solid"
import { createSignal } from "solid-js"
import { Portal } from "solid-js/web"
import { Button } from "~/components/ui/button"
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "~/components/ui/dialog"
import { TextField } from "~/components/ui/text-field"

export const Serveronboarding = () => {
	const [createModalOpen, setCreateModalOpen] = createSignal(false)
	const [joinModalOpen, setJoinModalOpen] = createSignal(false)

	return (
		<div class="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
			<h1 class="font-bold text-3xl">Welcome!</h1>
			<p class="text-muted-foreground">Get started by creating a new server or joining an existing one.</p>
			<div class="mt-6 flex gap-4">
				<Button onClick={() => setCreateModalOpen(true)} size="large">
					Create My Own Server
				</Button>
				<Button onClick={() => setJoinModalOpen(true)} size="large" intent="secondary">
					Join a Server
				</Button>
			</div>
			<DialogRoot open={createModalOpen()} onOpenChange={(details) => setCreateModalOpen(details.open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Join a Server</DialogTitle>
						<DialogDescription>Enter an invite code to join an existing server.</DialogDescription>
					</DialogHeader>
					<form>
						<TextField label="Server Name" placeholder="Enter your server name" />
					</form>

					<DialogFooter class="justify-between!">
						<DialogCloseTrigger
							asChild={(props) => (
								<Button {...props} intent="outline">
									Cancel
								</Button>
							)}
						/>
						<Button>Join Server</Button>
					</DialogFooter>
				</DialogContent>
			</DialogRoot>
		</div>
	)
}
