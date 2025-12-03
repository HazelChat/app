import { type OrganizationId, withSystemActor } from "@hazel/domain"
import type { IntegrationConnection } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { OrganizationMemberRepo } from "../../repositories/organization-member-repo"
import { UserRepo } from "../../repositories/user-repo"

/**
 * Bot configuration per integration provider
 */
const BOT_CONFIGS: Record<
	IntegrationConnection.IntegrationProvider,
	{
		name: string
		avatarUrl: string
	}
> = {
	linear: {
		name: "Linear",
		avatarUrl: "https://cdn.brandfetch.io/linear.app/w/64/h/64/theme/dark/icon",
	},
	github: {
		name: "GitHub",
		avatarUrl: "https://cdn.brandfetch.io/github.com/w/64/h/64/theme/dark/icon",
	},
	figma: {
		name: "Figma",
		avatarUrl: "https://cdn.brandfetch.io/figma.com/w/64/h/64/theme/dark/icon",
	},
	notion: {
		name: "Notion",
		avatarUrl: "https://cdn.brandfetch.io/notion.so/w/64/h/64/theme/dark/icon",
	},
}

/**
 * Integration Bot Service
 *
 * Manages global bot users for integration providers.
 * Each provider has a single shared bot user across all organizations.
 */
export class IntegrationBotService extends Effect.Service<IntegrationBotService>()(
	"IntegrationBotService",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const userRepo = yield* UserRepo
			const orgMemberRepo = yield* OrganizationMemberRepo

			/**
			 * Get or create a global bot user for an integration provider.
			 * Bot users are machine users with predictable external IDs.
			 * Also ensures the bot is a member of the given organization so it appears in Electric sync.
			 */
			const getOrCreateBotUser = (
				provider: IntegrationConnection.IntegrationProvider,
				organizationId: OrganizationId,
			) =>
				Effect.gen(function* () {
					const externalId = `integration-bot-${provider}`

					// Try to find existing bot user
					const existing = yield* userRepo.findByExternalId(externalId).pipe(withSystemActor)

					const botUser = Option.isSome(existing)
						? existing.value
						: yield* Effect.gen(function* () {
								// Create new machine user for this integration
								const botConfig = BOT_CONFIGS[provider]
								const newUser = yield* userRepo
									.insert({
										externalId,
										email: `${provider}-bot@integrations.internal`,
										firstName: botConfig.name,
										lastName: "",
										avatarUrl: botConfig.avatarUrl,
										userType: "machine",
										settings: null,
										isOnboarded: true,
										deletedAt: null,
									})
									.pipe(withSystemActor)

								return newUser[0]
							})

					// Ensure bot is a member of this organization (so it shows in Electric sync)
					yield* orgMemberRepo
						.upsertByOrgAndUser({
							organizationId,
							userId: botUser.id,
							role: "member",
							nickname: null,
							joinedAt: new Date(),
							invitedBy: null,
							deletedAt: null,
						})
						.pipe(withSystemActor)

					return botUser
				})

			return { getOrCreateBotUser }
		}),
		dependencies: [UserRepo.Default, OrganizationMemberRepo.Default],
	},
) {}
