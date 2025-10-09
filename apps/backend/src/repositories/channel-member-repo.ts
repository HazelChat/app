import {
	and,
	Database,
	eq,
	inArray,
	isNull,
	ModelRepository,
	schema,
	sql,
	type TransactionClient,
} from "@hazel/db"
import { ChannelMember } from "@hazel/db/models"
import { type ChannelId, type OrganizationId, policyRequire, type UserId } from "@hazel/db/schema"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class ChannelMemberRepo extends Effect.Service<ChannelMemberRepo>()("ChannelMemberRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.channelMembersTable,
			ChannelMember.Model,
			{
				idColumn: "id",
				name: "ChannelMember",
			},
		)
		const db = yield* Database.Database

		// Extended method to find channel member by channel and user
		const findByChannelAndUser = (channelId: ChannelId, userId: UserId, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, data: { channelId: ChannelId; userId: UserId }) =>
						execute((client) =>
							client
								.select()
								.from(schema.channelMembersTable)
								.where(
									and(
										eq(schema.channelMembersTable.channelId, data.channelId),
										eq(schema.channelMembersTable.userId, data.userId),
										isNull(schema.channelMembersTable.deletedAt),
									),
								)
								.limit(1),
						),
					policyRequire("ChannelMember", "select"),
				)({ channelId, userId }, tx)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		// Find existing single DM channel between two users
		const findExistingSingleDmChannel = (
			userId1: UserId,
			userId2: UserId,
			organizationId: OrganizationId,
			tx?: TxFn,
		) =>
			db
				.makeQuery(
					(execute, data: { userId1: UserId; userId2: UserId; organizationId: OrganizationId }) =>
						execute((client) =>
							client
								.selectDistinct({ channel: schema.channelsTable })
								.from(schema.channelMembersTable)
								.innerJoin(
									schema.channelsTable,
									eq(schema.channelMembersTable.channelId, schema.channelsTable.id),
								)
								.where(
									and(
										eq(schema.channelsTable.organizationId, data.organizationId),
										eq(schema.channelsTable.type, "single"),
										isNull(schema.channelsTable.deletedAt),
										isNull(schema.channelMembersTable.deletedAt),
										// Channel must have both users as members
										inArray(schema.channelMembersTable.userId, [
											data.userId1,
											data.userId2,
										]),
									),
								)
								.groupBy(schema.channelsTable.id)
								// Ensure the channel has exactly 2 members and they are our users
								.having(
									and(
										sql`COUNT(DISTINCT ${schema.channelMembersTable.userId}) = 2`,
										sql`COUNT(DISTINCT ${schema.channelMembersTable.userId}) FILTER (WHERE ${schema.channelMembersTable.userId} IN (${data.userId1}, ${data.userId2})) = 2`,
									),
								)
								.limit(1),
						),
					policyRequire("ChannelMember", "select"),
				)({ userId1, userId2, organizationId }, tx)
				.pipe(Effect.map((results) => Option.fromNullable(results[0]?.channel)))

		return {
			...baseRepo,
			findByChannelAndUser,
			findExistingSingleDmChannel,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
