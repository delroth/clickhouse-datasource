import {
  BuilderMetricField,
  BuilderMode,
  OrderBy,
  SqlBuilderOptions,
  Filter,
  NullFilter,
  BooleanFilter,
  NumberFilter,
  DateFilter,
  StringFilter,
  MultiFilter,
  FilterOperator,
  DateFilterWithoutValue,
} from 'types';

export const isBooleanType = (type: string): boolean => {
  return ['boolean'].includes(type.toLowerCase());
};
export const isNumberType = (type: string): boolean => {
  const numericTypes = ['int', 'float', 'decimal'];
  const match = numericTypes.find((t) => type.toLowerCase().includes(t));
  return match !== undefined;
};
export const isDateType = (type: string): boolean => {
  return ['date', 'datetime'].includes(type.toLowerCase());
};
export const isStringType = (type: string): boolean => {
  return !(isBooleanType(type) || isNumberType(type) || isDateType(type));
};
export const isNullFilter = (filter: Filter): filter is NullFilter => {
  return [FilterOperator.IsNull, FilterOperator.IsNotNull].includes(filter.operator);
};
export const isBooleanFilter = (filter: Filter): filter is BooleanFilter => {
  return isBooleanType(filter.type);
};
export const isNumberFilter = (filter: Filter): filter is NumberFilter => {
  return isNumberType(filter.type);
};
export const isDateFilterWithOutValue = (filter: Filter): filter is DateFilterWithoutValue => {
  return (
    isDateType(filter.type) &&
    [FilterOperator.WithInGrafanaTimeRange, FilterOperator.OutsideGrafanaTimeRange].includes(filter.operator)
  );
};
export const isDateFilter = (filter: Filter): filter is DateFilter => {
  return isDateType(filter.type);
};
export const isStringFilter = (filter: Filter): filter is StringFilter => {
  return isStringType(filter.type) && ![FilterOperator.In, FilterOperator.NotIn].includes(filter.operator);
};
export const isMultiFilter = (filter: Filter): filter is MultiFilter => {
  return isStringType(filter.type) && [FilterOperator.In, FilterOperator.NotIn].includes(filter.operator);
};

const getListQuery = (database = '', table = '', fields: string[] = []): string => {
  const sep = database === '' || table === '' ? '' : '.';
  fields = fields && fields.length > 0 ? fields : [''];
  return `SELECT ${fields.join(', ')} FROM ${database}${sep}${table}`;
};

const getAggregationQuery = (
  database = '',
  table = '',
  fields: string[] = [],
  metrics: BuilderMetricField[] = [],
  groupBy: string[] = []
): string => {
  metrics = metrics && metrics.length > 0 ? metrics : [];
  let selected = fields.length > 0 ? fields.join(', ') : '';
  let metricsQuery = metrics
    .map((m) => {
      const alias = m.alias ? ` ` + m.alias.replace(/ /g, '_') : '';
      return `${m.aggregation}(${m.field})${alias}`;
    })
    .join(', ');
  if (groupBy && groupBy.length > 0) {
    metricsQuery = groupBy.map((g) => `${g}`).join(', ') + ', ' + metricsQuery;
  }
  if (metricsQuery !== '' && selected !== '') {
    selected = `${selected},`;
  }
  const sep = database === '' || table === '' ? '' : '.';
  return `SELECT ${selected}${metricsQuery} FROM ${database}${sep}${table}`;
};

const getTrendByQuery = (
  database = '',
  table = '',
  metrics: BuilderMetricField[] = [],
  groupBy: string[] = [],
  timeField = '',
  timeFieldType = ''
): string => {
  metrics = metrics && metrics.length > 0 ? metrics : [];

  let metricsQuery = metrics
    .map((m) => {
      const alias = m.alias ? ` ` + m.alias.replace(/ /g, '_') : '';
      return `${m.aggregation}(${m.field})${alias}`;
    })
    .join(', ');
  if (metricsQuery !== '') {
    const group = groupBy.length > 0 ? `${groupBy.join(', ')},` : '';
    metricsQuery = `${timeField}, ${group} ${metricsQuery}`;
  } else if (groupBy.length > 0) {
    metricsQuery = `${timeField}, ${groupBy.join(', ')}`;
  } else {
    metricsQuery = `${timeField}`;
  }

  const sep = database === '' || table === '' ? '' : '.';
  return `SELECT ${metricsQuery} FROM ${database}${sep}${table}`;
};

const getFilters = (filters: Filter[]): string => {
  return filters.reduce((previousValue, currentFilter, currentIndex) => {
    const prefixCondition = currentIndex === 0 ? '' : currentFilter.condition;
    let filter = '';
    let field = currentFilter.key;
    let operator = '';
    let notOperator = false;
    if (currentFilter.operator === FilterOperator.NotLike) {
      operator = 'LIKE';
      notOperator = true;
    } else if (currentFilter.operator === FilterOperator.OutsideGrafanaTimeRange) {
      operator = '';
      notOperator = true;
    } else {
      if ([FilterOperator.WithInGrafanaTimeRange].includes(currentFilter.operator)) {
        operator = '';
      } else {
        operator = currentFilter.operator;
      }
    }
    filter = `${field} ${operator}`;
    if (isNullFilter(currentFilter)) {
    } else if (isBooleanFilter(currentFilter)) {
      filter += ` ${currentFilter.value}`;
    } else if (isNumberFilter(currentFilter)) {
      filter += ` ${currentFilter.value || '0'}`;
    } else if (isDateFilter(currentFilter)) {
      if (isDateFilterWithOutValue(currentFilter)) {
        if (currentFilter.type === 'datetime') {
          filter += ` >= \${__from:date} AND ${currentFilter.key} <= \${__to:date}`;
        } else if (currentFilter.type === 'date') {
          filter += ` >= \${__from:date:YYYY-MM-DD} AND ${currentFilter.key} <= \${__to:date:YYYY-MM-DD}`;
        }
      } else {
        switch (currentFilter.value) {
          case 'GRAFANA_START_TIME':
            if (currentFilter.type === 'datetime') {
              filter += ` \${__from:date}`;
            } else if (currentFilter.type === 'date') {
              filter += ` \${__from:date:YYYY-MM-DD}`;
            }
            break;
          case 'GRAFANA_END_TIME':
            if (currentFilter.type === 'datetime') {
              filter += ` \${__to:date}`;
            } else if (currentFilter.type === 'date') {
              filter += ` \${__to:date:YYYY-MM-DD}`;
            }
            break;
          default:
            filter += ` ${currentFilter.value || 'TODAY'}`;
        }
      }
    } else if (isStringFilter(currentFilter)) {
      if (currentFilter.operator === FilterOperator.Like || currentFilter.operator === FilterOperator.NotLike) {
        filter += ` '%${currentFilter.value || ''}%'`;
      } else {
        filter += ` '${currentFilter.value || ''}'`;
      }
    } else if (isMultiFilter(currentFilter)) {
      let values = currentFilter.value;
      filter += ` (${values.map((v) => `'${v.trim()}'`).join(', ')} )`;
    }
    if (notOperator) {
      filter = ` NOT ( ${filter} )`;
    }
    return filter ? `${previousValue} ${prefixCondition} ( ${filter} )` : previousValue;
  }, '');
};

const getGroupBy = (groupBy: string[] = [], timeField?: string): string => {
  const clause = groupBy.length > 0 ? ` GROUP BY ` + groupBy.map((g) => g).join(', ') : '';
  if (timeField === undefined) {
    return clause;
  }
  if (groupBy.length === 0) {
    return `${clause} ${timeField}`;
  }
  return `${clause}, ${timeField}`;
};

const getOrderBy = (orderBy?: OrderBy[]): string => {
  return orderBy && orderBy.filter((o) => o.name).length > 0
    ? ` ORDER BY ` +
        orderBy
          .filter((o) => o.name)
          .map((o) => {
            return `${o.name} ${o.dir}`;
          })
          .join(', ')
    : '';
};

const getLimit = (limit?: number): string => {
  return ` LIMIT ` + (limit || 100);
};

export const getSQLFromQueryOptions = (options: SqlBuilderOptions): string => {
  const limit = options.limit ? getLimit(options.limit) : '';
  let query = ``;
  switch (options.mode) {
    case BuilderMode.Aggregate:
      query += getAggregationQuery(options.database, options.table, options.fields, options.metrics, options.groupBy);
      let aggregateFilters = getFilters(options.filters || []);
      if (aggregateFilters) {
        query += ` WHERE ${aggregateFilters}`;
      }
      query += getGroupBy(options.groupBy);
      break;
    case BuilderMode.Trend:
      query += getTrendByQuery(
        options.database,
        options.table,
        options.metrics,
        options.groupBy,
        options.timeField,
        options.timeFieldType
      );
      if (options.timeFieldType === 'datetime') {
        query += ` WHERE ${options.timeField} >= \${__from:date} AND ${options.timeField} <= \${__to:date}`;
      } else if (options.timeFieldType === 'date') {
        query += ` WHERE ${options.timeField} >= \${__from:date:YYYY-MM-DD} AND ${options.timeField} <= \${__to:date:YYYY-MM-DD}`;
      }
      const trendFilters = getFilters(options.filters || []);
      query += trendFilters ? ` AND ${trendFilters}` : '';
      query += getGroupBy(options.groupBy, options.timeField);
      break;
    case BuilderMode.List:
    default:
      query += getListQuery(options.database, options.table, options.fields);
      const filters = getFilters(options.filters || []);
      if (filters) {
        query += ` WHERE ${filters}`;
      }
  }
  if (options.mode === BuilderMode.Trend) {
    query += ` ORDER BY ${options.timeField} ASC`;
    query += limit;
  } else {
    query += getOrderBy(options.orderBy);
    query += limit;
  }
  return query;
};

export const operMap = new Map<string, FilterOperator>([
  ['equals', FilterOperator.Equals],
  ['contains', FilterOperator.Like],
]);

export function getOper(v: string): FilterOperator {
  return operMap.get(v) || FilterOperator.Equals;
}
