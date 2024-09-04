import { entityKind, sql } from '~/index.ts';
import type { SQLWrapper } from '~/sql/sql.ts';
import { SQL } from '~/sql/sql.ts';
import type { PgDialect } from '../dialect.ts';
import type { PgSession } from '../session.ts';
import type { PgTable } from '../table.ts';

export class PgCountBuilder<
	TSession extends PgSession<any, any, any>,
> extends SQL<number> implements Promise<number>, SQLWrapper {
	private sql: SQL<number>;

	static readonly [entityKind] = 'PgCountBuilder';
	[Symbol.toStringTag] = 'PgCountBuilder';

	private session: TSession;

	private static buildEmbeddedCount(
		source: PgTable | SQL | SQLWrapper,
		filters?: SQL<unknown>,
	): SQL<number> {
		return sql<number>`(select count(*)::int from ${source}${sql.raw(' where ').if(filters)}${filters})`;
	}

	private static buildCount(
		source: PgTable | SQL | SQLWrapper,
		filters?: SQL<unknown>,
	): SQL<number> {
		return sql<number>`select count(*)::int from ${source}${sql.raw(' where ').if(filters)}${filters};`;
	}

	constructor(
		readonly params: {
			source: PgTable | SQL | SQLWrapper;
			filters?: SQL<unknown>;
			dialect: PgDialect;
			session: TSession;
		},
	) {
		super(PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);

		this.session = params.session;

		this.sql = PgCountBuilder.buildCount(
			params.source,
			params.filters,
		);
	}

	then<TResult1 = number, TResult2 = never>(
		onfulfilled?: ((value: number) => TResult1 | PromiseLike<TResult1>) | null | undefined,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
	): Promise<TResult1 | TResult2> {
		return Promise.resolve(this.session.all(this.sql)).then<number>((it) => {
			return (<[{ count: number }]> it)[0]['count'] as number;
		})
			.then(
				onfulfilled,
				onrejected,
			);
	}

	catch(
		onRejected?: ((reason: any) => never | PromiseLike<never>) | null | undefined,
	): Promise<number> {
		return this.then(undefined, onRejected);
	}

	finally(onFinally?: (() => void) | null | undefined): Promise<number> {
		return this.then(
			(value) => {
				onFinally?.();
				return value;
			},
			(reason) => {
				onFinally?.();
				throw reason;
			},
		);
	}
}