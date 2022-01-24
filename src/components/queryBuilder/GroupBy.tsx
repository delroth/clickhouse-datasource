import React, { useState } from 'react';
import { InlineFormLabel, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { FullField } from './../../types';
import { selectors } from './../../selectors';
import { styles } from '../../styles';

interface GroupByEditorProps {
  fieldsList: FullField[];
  groupBy: string[];
  onGroupByChange: (groupBy: string[]) => void;
  // getReferenceFieldSchema: (field: FullField) => void;
}
export const GroupByEditor = (props: GroupByEditorProps) => {
  const columns: SelectableValue[] = (props.fieldsList || [])
    .filter((f) => f.groupable)
    .map((f) => ({ label: f.label, value: f.name }));
  const [isOpen, setIsOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<string[]>(props.groupBy || []);
  const { label, tooltip } = selectors.components.QueryEditor.QueryBuilder.GROUP_BY;
  const onChange = (e: Array<SelectableValue<string>>) => {
    // let action = 'UNKNOWN';
    // let matchingField: FullField | undefined;
    // if (e.length > groupBy.length) {
    //   matchingField = props.fieldsList.find((f) => f.name === e[e.length - 1].value);
    //   if (matchingField && matchingField.type === 'reference' && matchingField.referenceTo.length > 0) {
    //     action = 'CLICKED_REFERENCE_FIELD';
    //   }
    // }
    // if (action === 'CLICKED_REFERENCE_FIELD') {
    //   if (matchingField) {
    //     setIsOpen(true);
    //     props.getReferenceFieldSchema(matchingField);
    //   }
    // } else {
      setIsOpen(false);
      setGroupBy(e.map((item) => item.value!));
    // }
  };
  return (
    <div className="gf-form">
      <InlineFormLabel width={8} className="query-keyword" tooltip={tooltip}>
        {label}
      </InlineFormLabel>
      <div data-testid="query-builder-group-by-multi-select-container" className={styles.Common.selectWrapper}>
        <MultiSelect
          options={columns}
          placeholder="(Optional) Click here to choose"
          isOpen={isOpen}
          onOpenMenu={() => setIsOpen(true)}
          onCloseMenu={() => setIsOpen(false)}
          onChange={onChange}
          onBlur={() => props.onGroupByChange(groupBy)}
          value={groupBy}
        />
      </div>
    </div>
  );
};
