import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { Input } from "~/components/ui/input"
import { Select } from "~/components/ui/select"
import { TextField } from "~/components/ui/text-field"

const { fieldContext, formContext } = createFormHookContexts()

export const { useAppForm } = createFormHook({
	fieldComponents: {
		Input,
		Select,
		TextField,
	},
	formComponents: {},
	fieldContext,
	formContext,
})
