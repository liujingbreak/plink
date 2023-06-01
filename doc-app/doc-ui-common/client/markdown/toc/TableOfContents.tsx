import React from 'react';
import cln from 'classnames/bind';
import styles from './TableOfContents.module.scss';
// import {TOC} from '../../../isom/md-types';
import {createControl, ItemState} from './TableOfContents.control';

const cx = cln.bind(styles);

export const TableOfContents = React.memo<{markdownKey: string; className?: string}>(props => {
  const [, touchUIState] = React.useState<any>({});
  const [control, state$] = React.useMemo(() => createControl(touchUIState), []);

  const uiState = state$.getValue();

  React.useEffect(() => {
    control.dispatcher.setDataKey(props.markdownKey);
  }, [control.dispatcher, props.markdownKey]);

  React.useEffect(() => () => control.dispatcher.unmount(), [control.dispatcher]);

  return uiState.itemByHash ?
    <div className={props.className ?? ''}>{
      renderItems(uiState.itemByHash, uiState.topLevelItems)
    }</div> :
    null;
});

function renderItems(itemByHash: Map<string, ItemState>, itemIds: string[]) {
  return itemIds.map(it => {
    const item = itemByHash.get(it);
    return <div key={it} className={cx('toc-item', {hl: item?.highlighted})} >
      <div className={cx('toc-title')}>{item?.text}</div>
      {item?.children != null && item?.children?.length > 0 ?
        <div className={cx('toc-children')}>
          { renderItems(itemByHash, item.children)}
        </div>
        : null
      }
    </div>;
  });
}
