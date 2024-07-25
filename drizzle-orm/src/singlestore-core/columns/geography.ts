import type { ColumnBaseConfig } from '~/column';
import type { ColumnBuilderBaseConfig, ColumnBuilderRuntimeConfig, MakeColumnConfig } from '~/column-builder';
import { entityKind } from '~/entity.ts';
import { DrizzleError } from '~/errors.ts';
import type { AnySingleStoreTable } from '~/singlestore-core/tables/common.ts';
import { sql } from '~/sql/sql.ts';
import { SingleStoreColumn, SingleStoreColumnBuilder } from './common.ts';

export type LngLat = [lng: number, lat: number];

type GeographyPoint = LngLat;
type GeographyLineString = Array<LngLat>;
type GeographyPolygon = Array<Array<LngLat>>;

export type SingleStoreGeographyBuilderInitial<TName extends string> = SingleStoreGeographyBuilder<{
	name: TName;
	dataType: 'array';
	columnType: 'SingleStoreGeography';
	data: GeographyPoint | GeographyLineString | GeographyPolygon;
	driverParam: string;
	enumValues: undefined;
	generated: undefined;
}>;

export class SingleStoreGeographyBuilder<T extends ColumnBuilderBaseConfig<'array', 'SingleStoreGeography'>>
	extends SingleStoreColumnBuilder<T>
{
	static readonly [entityKind]: string = 'SingleStoreGeographyBuilder';

	constructor(name: T['name']) {
		super(name, 'array', 'SingleStoreGeography');
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnySingleStoreTable<{ name: TTableName }>,
	): SingleStoreGeography<MakeColumnConfig<T, TTableName>> {
		return new SingleStoreGeography(table, this.config as ColumnBuilderRuntimeConfig<any, any>);
	}
}

export class SingleStoreGeography<T extends ColumnBaseConfig<'array', 'SingleStoreGeography'>>
	extends SingleStoreColumn<T>
{
	static readonly [entityKind]: string = 'SingleStoreGeography';

	constructor(
		table: AnySingleStoreTable<{ name: T['tableName'] }>,
		config: SingleStoreGeographyBuilder<T>['config'],
	) {
		super(table, config);
	}

	getSQLType(): string {
		return 'text';
		// TODO `geography` is only supported on rowstore tables. Geography data
		// on columnstore should be stored as `text`
		// return 'geography';
	}

	override mapToDriverValue(value: GeographyPoint | GeographyLineString | GeographyPolygon) {
		if (_isPoint(value)) {
			const [lng, lat] = value;
			return sql`"POINT(${lng} ${lat})"`;
		} else if (_isLineString(value)) {
			const points = value.map((ls) => sql`${ls[0]} ${ls[1]}`);
			return sql`"LINESTRING(${sql.join(points, sql.raw(', '))})"`;
		} else if (_isPolygon(value)) {
			const rings = value.map((ring) => {
				const points = ring.map((point) => sql`${point[0]} ${point[1]}`);
				return sql`(${sql.join(points, sql.raw(', '))})`;
			});
			return sql`"POLYGON(${sql.join(rings, sql.raw(', '))})"`;
		} else {
			throw new DrizzleError({ message: 'value is not Array' });
		}
	}

	override mapFromDriverValue(value: string): GeographyPoint | GeographyLineString | GeographyPolygon {
		const firstParenIndex = value.indexOf('(');
		const __type = value.slice(0, firstParenIndex);
		const inner = value.slice(firstParenIndex + 1, -1);
		switch (__type) {
			case 'POINT': {
				return _pointToGeographyPoint(inner);
			}
			case 'LINESTRING': {
				return _linestringToGeographyLineString(inner);
			}
			case 'POLYGON': {
				return _polygonToGeographyPolygon(inner);
			}
			default: {
				throw new DrizzleError({ message: 'Unexpected Geography type' });
			}
		}
	}
}

export function geography<TName extends string>(name: TName): SingleStoreGeographyBuilderInitial<TName> {
	return new SingleStoreGeographyBuilder(name);
}

function _pointToGeographyPoint(value: string): GeographyPoint {
	return value.split(' ').map(Number) as GeographyPoint;
}

function _linestringToGeographyLineString(value: string): GeographyLineString {
	const pairs = value.split(', ');
	return pairs.map((pair) => _pointToGeographyPoint(pair));
}

function _polygonToGeographyPolygon(value: string): GeographyPolygon {
	const rings = value.slice(1, -1).split('), (');
	return rings.map((ring) => _linestringToGeographyLineString(ring));
}

function _isPoint(value: GeographyPoint | GeographyLineString | GeographyPolygon): value is GeographyPoint {
	return value.length === 2 && typeof value[0] === 'number';
}

function _isLineString(value: GeographyPoint | GeographyLineString | GeographyPolygon): value is GeographyLineString {
	try {
		const test = value as GeographyLineString;
		return typeof test[0]![0] === 'number';
	} catch {
		return false;
	}
}

function _isPolygon(value: GeographyPoint | GeographyLineString | GeographyPolygon): value is GeographyPolygon {
	try {
		const test = value as GeographyPolygon;
		return typeof test[0]![0]![0] === 'number';
	} catch {
		return false;
	}
}
