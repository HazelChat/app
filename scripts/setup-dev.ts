import { $ } from "bun"

const envFile = ".env"
const composeFile = "./docker/docker-compose.yml"

async function waitForDockerServices(timeoutMs = 120000, pollIntervalMs = 2000) {
	console.info("Ensuring Docker Compose services are running...")
	const startTime = Date.now()

	const serviceNamesOutput = await $`docker compose --env-file ${envFile} -f ${composeFile} config --services`.text()
	const serviceNames = serviceNamesOutput
		.trim()
		.split("\n")
		.filter((s) => s.length > 0)

	if (serviceNames.length === 0) {
		console.info("No services defined in docker-compose.yml. Skipping wait.")
		return
	}
	console.info(`Found services: ${serviceNames.join(", ")}. Waiting for them to start...`)

	while (Date.now() - startTime < timeoutMs) {
		let allServicesRunning = true
		let runningCount = 0
		for (const serviceName of serviceNames) {
			try {
				const output =
					await $`docker compose --env-file ${envFile} -f ${composeFile} ps -q ${serviceName}`.text()
				if (output.trim() !== "") {
					runningCount++
				} else {
					allServicesRunning = false
				}
			} catch (error) {
				console.warn(
					`Could not query status for service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`,
				)
				allServicesRunning = false
			}
		}

		if (allServicesRunning) {
			console.info("All Docker Compose services are running.")
			return
		}

		console.info(`Waiting for services... (${runningCount}/${serviceNames.length} running)`)
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
	}

	throw new Error(`Timeout: Docker Compose services did not start within ${timeoutMs / 1000} seconds.`)
}

async function setupDev() {
	console.info("Starting Docker Compose services (using 'bun run dev:db-up')...")
	await $`bun run dev:db-up`

	await waitForDockerServices()

	console.info("Running database migrations (using 'bun run --filter @maki-chat/drizzle db migrate')...")
	// Assuming 'db' script in @maki-chat/drizzle is 'drizzle-kit' and can take 'migrate' as an argument.
	// If not, this might need to be: await $`bun --filter @maki-chat/drizzle exec drizzle-kit migrate`;
	await $`bun run --filter @maki-chat/drizzle db migrate`

	console.info("Starting development server (using 'bun run dev:zero-cache')...")
	// This is a long-running process. The script will stay alive as long as this command runs.
	await $`bun run dev:zero-cache`

	console.info("Development server started. The script will exit when the server stops.")
}

setupDev().catch((err) => {
	console.error("Error during setup:", err)
	process.exit(1)
})
