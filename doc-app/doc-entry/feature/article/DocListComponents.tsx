import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { mdFiles } from './docListConfig';
import {List} from '@wfh/doc-ui-common/client/material/List';


interface DocListComponentsProps {
  currentKey?: string;
}
const DocListComponents = ({ currentKey }: DocListComponentsProps) => {
  const history = useHistory();
  const listItems = mdFiles.map(item => ({
    key: item.key,
    title: item.name,
    subTitle: item.filename
  }));
  const onRouteChange = useCallback((key: string) => {
    if (key === currentKey) return;
    history.push(`/doc/${key}`);
  }, [history, currentKey]);

  return mdFiles && mdFiles.length > 0 ? (
    <List
      twoLine
      activatedKey={currentKey}
      items={listItems}
      onItemClick={(item: any) => onRouteChange(item.key)}
    />
  ) : null;
};

export {DocListComponents};
