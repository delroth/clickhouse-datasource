import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Datasource } from '../data/CHDatasource';
import { CHConfig, CHQuery, SqlBuilderOptions, QueryType, defaultCHBuilderQuery } from '../types';
import { SQLEditor } from 'components/SQLEditor';
import { getSQLFromQueryOptions } from 'components/queryBuilder/utils';
import { QueryBuilder } from 'components/queryBuilder/QueryBuilder';
import { Preview } from 'components/queryBuilder/Preview';
import { QueryTypeSwitcher } from 'components/QueryTypeSwitcher';

export type CHQueryEditorProps = QueryEditorProps<Datasource, CHQuery, CHConfig>;

const CHEditorByType = (props: CHQueryEditorProps) => {
  const { query, onRunQuery, onChange } = props;
  const onBuilderOptionsChange = (builderOptions: SqlBuilderOptions) => {
    const sql = getSQLFromQueryOptions(builderOptions);
    onChange({ ...query, queryType: QueryType.Builder, rawSql: sql, builderOptions });
    onRunQuery();
  };

  switch (query.queryType) {
    case QueryType.SQL:
      return (
        <div data-testid="query-editor-section-sql">
          <SQLEditor {...props} />
        </div>
      );
    case QueryType.Builder:
    default:
      let newQuery = { ...query };
      if (query.rawSql && !query.builderOptions) {
        return (
          <div data-testid="query-editor-section-sql">
            <SQLEditor {...props} />
          </div>
        );
      }
      if (!query.rawSql || !query.builderOptions) {
        let { rawSql, builderOptions } = defaultCHBuilderQuery;
        newQuery = { ...newQuery, rawSql, builderOptions };
        onChange({ ...newQuery });
        onRunQuery();
      }
      return (
        <div data-testid="query-editor-section-builder">
          <QueryBuilder
            datasource={props.datasource}
            builderOptions={newQuery.builderOptions}
            onBuilderOptionsChange={onBuilderOptionsChange}
          />
          <Preview sql={newQuery.rawSql} />
        </div>
      );
  }
};

export const CHQueryEditor = (props: CHQueryEditorProps) => {
  return (
    <>
      <QueryTypeSwitcher {...props} />
      <CHEditorByType {...props} />
    </>
  );
};
