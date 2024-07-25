import { entityKind } from '~/entity.ts';
import { QueryPromise } from '~/query-promise.ts';
import {
	type BuildQueryResult,
	type BuildRelationalQueryResult,
	type DBQueryConfig,
	mapRelationalRow,
	type TableRelationalConfig,
	type TablesRelationalConfig,
} from '~/relations.ts';
import type { Query, QueryWithTypings, SQL } from '~/sql/sql.ts';
import type { KnownKeysOnly } from '~/utils.ts';
import type { SingleStoreDialect } from '../dialect.ts';
import type {
	Mode,
	PreparedQueryHKTBase,
	PreparedQueryKind,
	SingleStorePreparedQueryConfig,
	SingleStoreSession,
} from '../session.ts';
import type { SingleStoreTable } from '../tables/common.ts';

export class RelationalQueryBuilder<
	TPreparedQueryHKT extends PreparedQueryHKTBase,
	TSchema extends TablesRelationalConfig,
	TFields extends TableRelationalConfig,
> {
	static readonly [entityKind]: string = 'SingleStoreRelationalQueryBuilder';

	constructor(
		private fullSchema: Record<string, unknown>,
		private schema: TSchema,
		private tableNamesMap: Record<string, string>,
		private table: SingleStoreTable,
		private tableConfig: TableRelationalConfig,
		private dialect: SingleStoreDialect,
		private session: SingleStoreSession,
		private mode: Mode,
	) {}

	findMany<TConfig extends DBQueryConfig<'many', true, TSchema, TFields>>(
		config?: KnownKeysOnly<TConfig, DBQueryConfig<'many', true, TSchema, TFields>>,
	): SingleStoreRelationalQuery<TPreparedQueryHKT, BuildQueryResult<TSchema, TFields, TConfig>[]> {
		return new SingleStoreRelationalQuery(
			this.fullSchema,
			this.schema,
			this.tableNamesMap,
			this.table,
			this.tableConfig,
			this.dialect,
			this.session,
			config ? (config as DBQueryConfig<'many', true>) : {},
			'many',
			this.mode,
		);
	}

	findFirst<TSelection extends Omit<DBQueryConfig<'many', true, TSchema, TFields>, 'limit'>>(
		config?: KnownKeysOnly<TSelection, Omit<DBQueryConfig<'many', true, TSchema, TFields>, 'limit'>>,
	): SingleStoreRelationalQuery<TPreparedQueryHKT, BuildQueryResult<TSchema, TFields, TSelection> | undefined> {
		return new SingleStoreRelationalQuery(
			this.fullSchema,
			this.schema,
			this.tableNamesMap,
			this.table,
			this.tableConfig,
			this.dialect,
			this.session,
			config ? { ...(config as DBQueryConfig<'many', true> | undefined), limit: 1 } : { limit: 1 },
			'first',
			this.mode,
		);
	}
}

export class SingleStoreRelationalQuery<
	TPreparedQueryHKT extends PreparedQueryHKTBase,
	TResult,
> extends QueryPromise<TResult> {
	static readonly [entityKind]: string = 'SingleStoreRelationalQuery';

	declare protected $brand: 'SingleStoreRelationalQuery';

	constructor(
		private fullSchema: Record<string, unknown>,
		private schema: TablesRelationalConfig,
		private tableNamesMap: Record<string, string>,
		private table: SingleStoreTable,
		private tableConfig: TableRelationalConfig,
		private dialect: SingleStoreDialect,
		private session: SingleStoreSession,
		private config: DBQueryConfig<'many', true> | true,
		private queryMode: 'many' | 'first',
		private mode?: Mode,
	) {
		super();
	}

	prepare() {
		const { query, builtQuery } = this._toSQL();
		return this.session.prepareQuery(
			builtQuery,
			undefined,
			(rawRows) => {
				const rows = rawRows.map((row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection));
				if (this.queryMode === 'first') {
					return rows[0] as TResult;
				}
				return rows as TResult;
			},
		) as PreparedQueryKind<TPreparedQueryHKT, SingleStorePreparedQueryConfig & { execute: TResult }, true>;
	}

	private _getQuery() {
		const query = this.mode === 'planetscale'
			? this.dialect.buildRelationalQueryWithoutLateralSubqueries({
				fullSchema: this.fullSchema,
				schema: this.schema,
				tableNamesMap: this.tableNamesMap,
				table: this.table,
				tableConfig: this.tableConfig,
				queryConfig: this.config,
				tableAlias: this.tableConfig.tsName,
			})
			: this.dialect.buildRelationalQuery({
				fullSchema: this.fullSchema,
				schema: this.schema,
				tableNamesMap: this.tableNamesMap,
				table: this.table,
				tableConfig: this.tableConfig,
				queryConfig: this.config,
				tableAlias: this.tableConfig.tsName,
			});
		return query;
	}

	private _toSQL(): { query: BuildRelationalQueryResult; builtQuery: QueryWithTypings } {
		const query = this._getQuery();

		const builtQuery = this.dialect.sqlToQuery(query.sql as SQL);

		return { builtQuery, query };
	}

	/** @internal */
	getSQL(): SQL {
		return this._getQuery().sql as SQL;
	}

	toSQL(): Query {
		return this._toSQL().builtQuery;
	}

	override execute(): Promise<TResult> {
		return this.prepare().execute();
	}
}
