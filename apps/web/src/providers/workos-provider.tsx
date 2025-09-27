import { createClient } from "@workos-inc/authkit-js"
import { AuthKitProvider } from "@workos-inc/authkit-react"

export const authClient = createClient(import.meta.env.VITE_WORKOS_CLIENT_ID)

export const WorkOsProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<AuthKitProvider
			clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
			redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
			devMode={true}
		>
			{children}
		</AuthKitProvider>
	)
}
