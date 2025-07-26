import { useConvexMutation } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { Building02 } from "@untitledui/icons"
import { useCallback, useState } from "react"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Input } from "~/components/base/input/input"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"

interface CreateOrganizationModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const CreateOrganizationModal = ({ isOpen, onOpenChange }: CreateOrganizationModalProps) => {
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [logoUrl, setLogoUrl] = useState("")
	const [isCreating, setIsCreating] = useState(false)
	const [slugError, setSlugError] = useState("")
	const [logoUrlError, setLogoUrlError] = useState("")

	const createOrganizationMutation = useConvexMutation(api.organizations.create)

	// Generate slug from name
	const generateSlug = useCallback((name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.substring(0, 50)
	}, [])

	// Auto-generate slug from name
	const handleNameChange = useCallback(
		(newName: string) => {
			setName(newName)
			// Auto-generate slug only if user hasn't manually edited it
			if (!slug || slug === generateSlug(name)) {
				setSlug(generateSlug(newName))
			}
		},
		[name, slug, generateSlug],
	)

	// Validate slug format
	const validateSlug = (slug: string) => {
		if (!slug) return "Slug is required"
		if (!/^[a-z0-9-]+$/.test(slug)) return "Slug can only contain lowercase letters, numbers, and hyphens"
		if (slug.startsWith("-") || slug.endsWith("-")) return "Slug cannot start or end with a hyphen"
		if (slug.length < 3) return "Slug must be at least 3 characters long"
		if (slug.length > 50) return "Slug must be less than 50 characters"
		return ""
	}

	// Validate logo URL
	const validateLogoUrl = (url: string) => {
		if (!url) return "" // Logo is optional
		try {
			const urlObj = new URL(url)
			if (!["http:", "https:"].includes(urlObj.protocol)) {
				return "Logo URL must use HTTP or HTTPS"
			}
			return ""
		} catch {
			return "Invalid URL format"
		}
	}

	const handleSlugChange = (newSlug: string) => {
		setSlug(newSlug)
		setSlugError(validateSlug(newSlug))
	}

	const handleLogoUrlChange = (newUrl: string) => {
		setLogoUrl(newUrl)
		setLogoUrlError(validateLogoUrl(newUrl))
	}

	const handleCreateOrganization = async () => {
		// Validate inputs
		const nameError = !name.trim() ? "Organization name is required" : ""
		const slugValidation = validateSlug(slug)
		const logoValidation = validateLogoUrl(logoUrl)

		if (nameError) {
			toast.error(nameError)
			return
		}
		if (slugValidation) {
			setSlugError(slugValidation)
			return
		}
		if (logoValidation) {
			setLogoUrlError(logoValidation)
			return
		}

		setIsCreating(true)
		try {
			await createOrganizationMutation({
				name: name.trim(),
				slug: slug.trim(),
				logoUrl: logoUrl.trim() || undefined,
			})

			toast.success(`Organization "${name}" created successfully`)

			// Close modal and reset state
			onOpenChange(false)
			setName("")
			setSlug("")
			setLogoUrl("")
			setSlugError("")
			setLogoUrlError("")

			// The WorkOS organization is created asynchronously, so we can't switch immediately
			// Instead, we'll show a success message and let the user know
			toast.info("Setting up your new organization. Please wait a moment and then refresh the page.")

			// Optionally refresh after a delay to allow WorkOS creation to complete
			setTimeout(() => {
				window.location.reload()
			}, 3000)
		} catch (error: any) {
			console.error("Failed to create organization:", error)
			if (error.message?.includes("slug already exists")) {
				setSlugError("This slug is already taken")
			} else {
				toast.error(error.message || "Failed to create organization")
			}
		} finally {
			setIsCreating(false)
		}
	}

	const handleClose = () => {
		onOpenChange(false)
		// Reset state when closing
		setName("")
		setSlug("")
		setLogoUrl("")
		setSlugError("")
		setLogoUrlError("")
	}

	return (
		<AriaDialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalOverlay isDismissable>
				<Modal>
					<Dialog>
						<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-130">
							<CloseButton
								onClick={handleClose}
								theme="light"
								size="lg"
								className="absolute top-3 right-3"
							/>
							<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
								<div className="relative w-max">
									<FeaturedIcon color="gray" size="lg" theme="modern" icon={Building02} />
									<BackgroundPattern
										pattern="circle"
										size="sm"
										className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
									/>
								</div>
								<div className="z-10 flex flex-col gap-0.5">
									<AriaHeading slot="title" className="font-semibold text-md text-primary">
										Create a new organization
									</AriaHeading>
									<p className="text-sm text-tertiary">
										Set up a new workspace for your team
									</p>
								</div>
							</div>
							<div className="h-5 w-full" />
							<div className="flex flex-col gap-4 px-4 sm:px-6">
								{/* Organization Name */}
								<div className="flex flex-col gap-1.5">
									<label htmlFor="org-name" className="text-sm font-medium text-primary">
										Organization name *
									</label>
									<Input
										id="org-name"
										size="md"
										placeholder="Acme Inc."
										value={name}
										onChange={handleNameChange}
										autoFocus
									/>
								</div>

								{/* Organization Slug */}
								<div className="flex flex-col gap-1.5">
									<label htmlFor="org-slug" className="text-sm font-medium text-primary">
										Organization slug *
									</label>
									<Input
										id="org-slug"
										size="md"
										placeholder="acme-inc"
										value={slug}
										onChange={handleSlugChange}
										isInvalid={!!slugError}
									/>
									{slugError && <p className="text-xs text-error">{slugError}</p>}
									{!slugError && slug && (
										<p className="text-xs text-tertiary">
											Your organization URL will be: /app/{slug}
										</p>
									)}
								</div>

								{/* Logo URL (Optional) */}
								<div className="flex flex-col gap-1.5">
									<label htmlFor="org-logo" className="text-sm font-medium text-primary">
										Logo URL (optional)
									</label>
									<Input
										id="org-logo"
										size="md"
										placeholder="https://example.com/logo.png"
										value={logoUrl}
										onChange={handleLogoUrlChange}
										isInvalid={!!logoUrlError}
									/>
									{logoUrlError && <p className="text-xs text-error">{logoUrlError}</p>}
								</div>
							</div>
							<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
								<Button
									color="secondary"
									size="lg"
									onClick={handleClose}
									isDisabled={isCreating}
								>
									Cancel
								</Button>
								<Button
									color="primary"
									size="lg"
									onClick={handleCreateOrganization}
									isDisabled={
										!name.trim() ||
										!slug.trim() ||
										!!slugError ||
										!!logoUrlError ||
										isCreating
									}
								>
									{isCreating ? "Creating..." : "Create organization"}
								</Button>
							</div>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</AriaDialogTrigger>
	)
}
