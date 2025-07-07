export default {
	providers: [
		{
			type: "customJwt",
			applicationID: "convex",
			issuer: "https://api.workos.com",
			jwks: `https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`,
			algorithm: "RS256",
		},
	],
}
