import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { mdFiles } from './docListConfig';
import {List} from '@wfh/material-components-react/client/List';


interface DocListComponentsProps {
  currentKey?: string;
  onItemClick?: () => any;
}
const DocListComponents = ({ currentKey, onItemClick }: DocListComponentsProps) => {
  const history = useHistory();
  const listItems = mdFiles.map(item => ({
    key: item.key,
    title: item.name,
    subTitle: item.filename
  }));
  const onRouteChange = useCallback((key: string) => {
    if (key === currentKey) return;
    history.push(`/doc/${key}`);
    if (onItemClick) {
      onItemClick();
    }
  }, [history, currentKey, onItemClick]);

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
