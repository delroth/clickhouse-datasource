import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { CodeEditor } from '@grafana/ui';
import { Datasource } from '../data/CHDatasource';
import { registerSQL, Range, Fetcher } from './sqlProvider';
import { CHQuery, CHConfig, QueryType } from '../types';
import { styles } from '../styles';
import { fetchSuggestions as sugg, Schema } from './suggestions';
import { selectors } from 'selectors';
import { getFormat } from './editor';

type SQLEditorProps = QueryEditorProps<Datasource, CHQuery, CHConfig>;

export const SQLEditor = (props: SQLEditorProps) => {
  const { query, onRunQuery, onChange, datasource } = props;

  const onSqlChange = (sql: string) => {
    const format = getFormat(sql);
    onChange({ ...query, rawSql: sql, format, queryType: QueryType.SQL });
    onRunQuery();
  };

  const schema: Schema = {
    databases: () => datasource.fetchDatabases(),
    tables: (db?: string) => datasource.fetchTables(db),
    fields: (db: string, table: string) => datasource.fetchFields(db, table),
    defaultDatabase: datasource.getDefaultDatabase(),
  };

  const fetchSuggestions: Fetcher = async (text: string, range: Range) => {
    const suggestions = await sugg(text, schema, range);
    return Promise.resolve({ suggestions });
  };

  const handleMount = (editor: any) => registerSQL('chSql', editor, fetchSuggestions);
  return (
    <div className={styles.Common.wrapper}>
      <a
        onClick={() => onSqlChange(query.rawSql || '')}
        className={styles.Common.run}
        data-testid={selectors.components.QueryEditor.CodeEditor.Run}
      >
        <i className="fa fa-play"></i>
      </a>
      <CodeEditor
        aria-label="SQL"
        height="150px"
        language="sql"
        value={query.rawSql || ''}
        onSave={onSqlChange}
        showMiniMap={false}
        showLineNumbers={true}
        onBlur={(text) => onChange({ ...query, rawSql: text })}
        onEditorDidMount={handleMount}
      />
    </div>
  );
};
