import { prepareElectricUrl, proxyElectricRequest } from "./electric-proxy"

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "*",
				},
			})
		}

		// Only allow GET and DELETE methods (Electric protocol)
		if (request.method !== "GET" && request.method !== "DELETE") {
			return new Response("Method not allowed", {
				status: 405,
				headers: {
					Allow: "GET, DELETE, OPTIONS",
				},
			})
		}

		// Get Electric URL from environment
		const electricUrl = env.ELECTRIC_URL
		if (!electricUrl) {
			return new Response("ELECTRIC_URL not configured", { status: 500 })
		}

		const originUrl = prepareElectricUrl(request.url)

		const searchParams = new URL(request.url).searchParams

		originUrl.searchParams.set(`table`, searchParams.get("table")!)

		return await proxyElectricRequest(originUrl)
	},
} satisfies ExportedHandler<Env>
