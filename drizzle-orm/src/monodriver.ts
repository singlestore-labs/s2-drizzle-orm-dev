import type { RDSDataClientConfig as RDSConfig } from '@aws-sdk/client-rds-data';
import type { Config as LibsqlConfig } from '@libsql/client';
import type {
	HTTPTransactionOptions as NeonHttpConfig,
	PoolConfig as NeonServerlessConfig,
} from '@neondatabase/serverless';
import type { Config as PlanetscaleConfig } from '@planetscale/database';
import type { Config as TiDBServerlessConfig } from '@tidbcloud/serverless';
import type { Options as BetterSQLite3Options } from 'better-sqlite3';
import type { ConnectionConfig as Mysql2Config } from 'mysql2';
import type { PoolConfig as NodePGPoolConfig } from 'pg';
import type { Options as PostgresJSOptions, PostgresType as PostgresJSPostgresType } from 'postgres';
import type { AwsDataApiPgDatabase, DrizzleAwsDataApiPgConfig } from './aws-data-api/pg/index.ts';
import type { BetterSQLite3Database } from './better-sqlite3/index.ts';
import type { BunSQLiteDatabase } from './bun-sqlite/index.ts';
import type { DrizzleD1Database } from './d1/index.ts';
import type { LibSQLDatabase } from './libsql/index.ts';
import type { MySql2Database, MySql2DrizzleConfig } from './mysql2/index.ts';
import type { NeonHttpDatabase } from './neon-http/index.ts';
import type { NeonDatabase } from './neon-serverless/index.ts';
import type { NodePgDatabase } from './node-postgres/index.ts';
import type { PlanetScaleDatabase } from './planetscale-serverless/index.ts';
import type { PostgresJsDatabase } from './postgres-js/index.ts';
import type { TiDBServerlessDatabase } from './tidb-serverless/index.ts';
import type { DrizzleConfig } from './utils.ts';
import type { VercelPgDatabase } from './vercel-postgres/index.ts';

type BunSqliteDatabaseOptions =
	| number
	| {
		/**
		 * Open the database as read-only (no write operations, no create).
		 *
		 * Equivalent to {@link constants.SQLITE_OPEN_READONLY}
		 */
		readonly?: boolean;
		/**
		 * Allow creating a new database
		 *
		 * Equivalent to {@link constants.SQLITE_OPEN_CREATE}
		 */
		create?: boolean;
		/**
		 * Open the database as read-write
		 *
		 * Equivalent to {@link constants.SQLITE_OPEN_READWRITE}
		 */
		readwrite?: boolean;
	};

type BunSqliteDatabaseConfig = {
	filename?: string;
	options?: BunSqliteDatabaseOptions;
};

type BetterSQLite3DatabaseConfig = {
	filename?: string | Buffer;
	options?: BetterSQLite3Options;
};

type MonodriverMysql2Config = Mysql2Config & {
	mode?: MySql2DrizzleConfig['mode'];
};

type MonodriverNeonHttpConfig = {
	connectionString: string;
	options?: NeonHttpConfig<boolean, boolean>;
};

type DatabaseClientType =
	| 'node-postgres'
	| 'postgres.js'
	| 'neon-serverless'
	| 'neon-http'
	| 'vercel-postgres'
	| 'aws-data-api-pg'
	| 'planetscale'
	| 'mysql2'
	| 'tidb-serverless'
	| 'libsql'
	| 'd1'
	| 'bun-sqlite'
	| 'better-sqlite3';

type ClientConnectionConfigMap = {
	'node-postgres': NodePGPoolConfig;
	'postgres.js': PostgresJSOptions<Record<string, PostgresJSPostgresType>>;
	'neon-serverless': NeonServerlessConfig;
	'neon-http': MonodriverNeonHttpConfig;
	'vercel-postgres': never;
	'aws-data-api-pg': RDSConfig;
	planetscale: PlanetscaleConfig;
	mysql2: MonodriverMysql2Config;
	'tidb-serverless': TiDBServerlessConfig;
	libsql: LibsqlConfig;
	d1: D1Database;
	'bun-sqlite': BunSqliteDatabaseConfig;
	'better-sqlite3': BetterSQLite3DatabaseConfig;
};

type ClientDrizzleInstanceMap<TSchema extends Record<string, any>> = {
	'node-postgres': NodePgDatabase<TSchema>;
	'postgres.js': PostgresJsDatabase<TSchema>;
	'neon-serverless': NeonDatabase<TSchema>;
	'neon-http': NeonHttpDatabase<TSchema>;
	'vercel-postgres': VercelPgDatabase<TSchema>;
	'aws-data-api-pg': AwsDataApiPgDatabase<TSchema>;
	planetscale: PlanetScaleDatabase<TSchema>;
	mysql2: MySql2Database<TSchema>;
	'tidb-serverless': TiDBServerlessDatabase<TSchema>;
	libsql: LibSQLDatabase<TSchema>;
	d1: DrizzleD1Database<TSchema>;
	'bun-sqlite': BunSQLiteDatabase<TSchema>;
	'better-sqlite3': BetterSQLite3Database<TSchema>;
};

type ClientParams<TClientType extends DatabaseClientType> = ClientConnectionConfigMap[TClientType];

type InitializerParams<
	TClientType extends DatabaseClientType,
	TSchema extends Record<string, unknown> = Record<string, never>,
> = {
	client: TClientType;
	connection: ClientParams<TClientType>;
} & DrizzleConfig<TSchema>;

type DetermineClient<
	TParams extends InitializerParams<any, any>,
	TSchema extends Record<string, unknown> = TParams extends { schema: Record<string, unknown> } ? TParams['schema']
		: Record<string, never>,
> = TParams extends { client: DatabaseClientType } ? ClientDrizzleInstanceMap<TSchema>[TParams['client']]
	: never;

import { drizzle as rdsPgDrizzle } from './aws-data-api/pg/index.ts';
import { drizzle as betterSqliteDrizzle } from './better-sqlite3/index.ts';
import { drizzle as bunSqliteDrizzle } from './bun-sqlite/index.ts';
import { drizzle as d1Drizzle } from './d1/index.ts';
import { drizzle as libsqlDrizzle } from './libsql/index.ts';
import { drizzle as mysql2Drizzle } from './mysql2/index.ts';
import { drizzle as neonHttpDrizzle } from './neon-http/index.ts';
import { drizzle as neonDrizzle } from './neon-serverless/index.ts';
import { drizzle as pgDrizzle } from './node-postgres/index.ts';
import { drizzle as planetscaleDrizzle } from './planetscale-serverless/index.ts';
import { drizzle as postgresJSDrizzle } from './postgres-js/index.ts';
import { drizzle as tidbDrizzle } from './tidb-serverless/index.ts';
import { drizzle as vercelDrizzle } from './vercel-postgres/index.ts';

export const drizzle = async <
	TClientType extends DatabaseClientType,
	TSchema extends Record<string, any>,
	TParams extends InitializerParams<TClientType, TSchema>,
>(params: TParams): Promise<DetermineClient<TParams>> => {
	const { client, connection } = params;
	const drizzleConfig = {
		logger: params.logger,
		schema: params.schema,
	};

	switch (client) {
		case 'node-postgres': {
			const { Pool } = await import('pg');
			const instance = new Pool(connection as NodePGPoolConfig);

			return pgDrizzle(instance, drizzleConfig) as any;
		}
		case 'aws-data-api-pg': {
			const { RDSDataClient } = await import('@aws-sdk/client-rds-data');
			const instance = new RDSDataClient(connection);

			return rdsPgDrizzle(instance, drizzleConfig as any as DrizzleAwsDataApiPgConfig) as any;
		}
		case 'better-sqlite3': {
			const { default: Client } = await import('better-sqlite3');
			const { filename, options } = connection as BetterSQLite3DatabaseConfig;
			const instance = new Client(filename, options);

			return betterSqliteDrizzle(instance, drizzleConfig) as any;
		}
		case 'bun-sqlite': {
			const { Database: Client } = await import('bun:sqlite');
			const { filename, options } = connection as BunSqliteDatabaseConfig;
			const instance = new Client(filename, options);

			return bunSqliteDrizzle(instance, drizzleConfig) as any;
		}
		case 'd1': {
			return d1Drizzle(connection as D1Database, drizzleConfig) as any;
		}
		case 'libsql': {
			const { createClient } = await import('@libsql/client');
			const instance = createClient(connection as LibsqlConfig);

			return libsqlDrizzle(instance, drizzleConfig) as any;
		}
		case 'mysql2': {
			const { createConnection } = await import('mysql2/promise');
			const instance = await createConnection(connection as MonodriverMysql2Config);
			const mode = (connection as MonodriverMysql2Config).mode ?? 'default';

			return mysql2Drizzle(instance, { logger: params.logger, schema: params.schema, mode }) as any;
		}
		case 'neon-http': {
			const { neon } = await import('@neondatabase/serverless');
			const { connectionString, options } = connection as MonodriverNeonHttpConfig;
			const instance = neon(connectionString, options);

			return neonHttpDrizzle(instance, drizzleConfig) as any;
		}
		case 'neon-serverless': {
			const { Pool } = await import('@neondatabase/serverless');
			const instance = new Pool(connection as NeonServerlessConfig);

			return neonDrizzle(instance, drizzleConfig) as any;
		}
		case 'planetscale': {
			const { Client } = await import('@planetscale/database');
			const instance = new Client(
				connection as PlanetscaleConfig,
			);

			return planetscaleDrizzle(instance, drizzleConfig) as any;
		}
		case 'postgres.js': {
			const { default: client } = await import('postgres');
			const instance = client(connection as PostgresJSOptions<Record<string, PostgresJSPostgresType>>);

			return postgresJSDrizzle(instance, drizzleConfig) as any;
		}
		case 'tidb-serverless': {
			const { connect } = await import('@tidbcloud/serverless');
			const instance = connect(connection as TiDBServerlessConfig);

			return tidbDrizzle(instance, drizzleConfig) as any;
		}
		case 'vercel-postgres': {
			const { sql } = await import('@vercel/postgres');

			return vercelDrizzle(sql, drizzleConfig) as any;
		}
	}

	// Shouldn't reach that point, but Typescript fails to infer that
	return {} as any;
};
