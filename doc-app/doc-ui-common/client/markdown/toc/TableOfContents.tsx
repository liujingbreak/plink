import React from 'react';
import cln from 'classnames';
import {useAppLayout} from '../../components/appLayout.state';
import styles from './TableOfContents.module.scss';
// import {TOC} from '../../../isom/md-types';
import {createControl, ItemState} from './TableOfContents.control';

export const TableOfContents = React.memo<{markdownKey: string; className?: string}>(props => {
  const [, touchUIState] = React.useState<any>({});
  const [control, state$] = React.useMemo(() => createControl(touchUIState), []);

  const uiState = state$.getValue();

  React.useEffect(() => {
    control.dispatcher.setDataKey(props.markdownKey);
  }, [control.dispatcher, props.markdownKey]);

  React.useEffect(() => () => control.dispatcher.unmount(), [control.dispatcher]);

  const layout = useAppLayout();
  React.useMemo(() => {
    if (layout)
      control.dispatcher.setLayoutControl(layout);
  }, [control.dispatcher, layout]);

  return uiState.itemByHash && uiState.topLevelItems.length > 0 ?
    <div className={cln(props.className ?? '', styles.tocBody, {[styles.fixed]: uiState.positionFixed})}>
      <div ref={control.dispatcher.onPlaceHolderRef}></div>
      <div className={styles.tocContent} ref={control.dispatcher.onContentDomRef}>
        <h3>Contents</h3>
        {
          renderItems(uiState.itemByHash, uiState.topLevelItems)
        }
      </div>
    </div> :
    null;
});

function renderItems(itemByHash: Map<string, ItemState>, itemIds: string[]) {
  return itemIds.map(it => {
    const item = itemByHash.get(it);
    return <div key={it} className={cln(styles['toc-item'], {hl: item?.highlighted})} >
      <div className={cln(styles['toc-title'])}>{item?.text}</div>
      {item?.children != null && item?.children?.length > 0 ?
        <div className={cln(styles['toc-children'])}>
          { renderItems(itemByHash, item.children)}
        </div>
        : null
      }
    </div>;
  });
}
