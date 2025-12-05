import { Integrations, type OrganizationId, withSystemActor } from "@hazel/domain"
import type { IntegrationConnection } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { OrganizationMemberRepo } from "../../repositories/organization-member-repo"
import { UserRepo } from "../../repositories/user-repo"

/**
 * Integration Bot Service
 *
 * Manages global bot users for integration providers.
 * Each provider has a single shared bot user across all organizations.
 */
export class IntegrationBotService extends Effect.Service<IntegrationBotService>()("IntegrationBotService", {
	accessors: true,
	effect: Effect.gen(function* () {
		const userRepo = yield* UserRepo
		const orgMemberRepo = yield* OrganizationMemberRepo

		/**
		 * Get or create a global bot user for an OAuth integration provider.
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
							const botConfig = Integrations.getBotConfig(provider)
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

		/**
		 * Get or create a global bot user for a webhook-based integration provider.
		 * Similar to OAuth providers but uses WEBHOOK_BOT_CONFIGS.
		 */
		const getOrCreateWebhookBotUser = (
			provider: Integrations.WebhookProvider,
			organizationId: OrganizationId,
		) =>
			Effect.gen(function* () {
				const externalId = `webhook-bot-${provider}`

				// Try to find existing bot user
				const existing = yield* userRepo.findByExternalId(externalId).pipe(withSystemActor)

				const botUser = Option.isSome(existing)
					? existing.value
					: yield* Effect.gen(function* () {
							// Create new machine user for this webhook integration
							const botConfig = Integrations.getWebhookBotConfig(provider)
							const newUser = yield* userRepo
								.insert({
									externalId,
									email: `${provider}-bot@webhooks.internal`,
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

		return { getOrCreateBotUser, getOrCreateWebhookBotUser }
	}),
	dependencies: [UserRepo.Default, OrganizationMemberRepo.Default],
}) {}
