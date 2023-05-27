import React from 'react';
// import {TOC} from '../../../isom/md-types';
import {getStore} from '../markdownSlice';

export const TableOfContents = React.memo<{markdownKey: string}>(props => {
  const markdownState$ = getStore();

  React.useEffect(() => {
    const data = markdownState$.getValue().contents[props.markdownKey];
  }, [markdownState$, props.markdownKey]);

  return <></>;
});

