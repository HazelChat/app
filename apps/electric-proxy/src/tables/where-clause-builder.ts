import { inArray, type SQL, sql } from "@hazel/db"
import type { PgColumn } from "drizzle-orm/pg-core"
import { QueryBuilder } from "drizzle-orm/pg-core"

/**
 * Result of building a WHERE clause with parameterized values
 */
export interface WhereClauseResult {
	whereClause: string
	params: unknown[]
}

/**
 * Builds a WHERE clause using Drizzle's QueryBuilder.
 * Extracts just the WHERE portion from the full SELECT query.
 *
 * @param table - The Drizzle table to build the query against
 * @param condition - The WHERE condition using Drizzle operators
 * @returns WhereClauseResult with the WHERE clause string and params array
 */
export function buildWhereClause(table: any, condition: SQL | undefined): WhereClauseResult {
	const qb = new QueryBuilder()
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const query = qb.select().from(table).where(condition).toSQL()

	// Extract WHERE clause from: SELECT ... FROM "table" WHERE <clause>
	const whereMatch = query.sql.match(/WHERE\s+(.+)$/i)
	const whereClause = whereMatch?.[1] ?? ""

	return {
		whereClause,
		params: query.params,
	}
}

/**
 * Helper for IN clause with sorted IDs for deterministic Electric shapes.
 * Sorting ensures the same set of IDs always produces the same WHERE clause,
 * which is important for Electric shape stability.
 *
 * Handles empty arrays by returning a "false" condition that matches no rows.
 *
 * @param column - The Drizzle column to filter on
 * @param values - Array of values for the IN clause
 * @returns SQL expression for the IN clause
 */
export function inArraySorted<T extends string>(column: PgColumn, values: readonly T[]): SQL {
	if (values.length === 0) {
		// Return a condition that's always false - matches nothing
		return sql`false`
	}
	const sorted = [...values].sort()
	return inArray(column, sorted)
}

/**
 * Apply WHERE clause result to Electric URL with params.
 * Sets the "where" parameter and individual "params[N]" parameters.
 *
 * @param url - The URL to modify
 * @param result - The WhereClauseResult from buildWhereClause
 */
export function applyWhereToElectricUrl(url: URL, result: WhereClauseResult): void {
	url.searchParams.set("where", result.whereClause)

	// Electric uses params[1], params[2], etc. (1-indexed)
	result.params.forEach((value, index) => {
		url.searchParams.set(`params[${index + 1}]`, String(value))
	})
}
