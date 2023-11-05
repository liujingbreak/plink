import React from 'react';
import cln from 'classnames';
import {RxController} from '@wfh/reactivizer';
import {useAppLayout} from '../../components/appLayout.control';
import styles from './TableOfContents.module.scss';
// import {TOC} from '../../../isom/md-types';
import {createControl, ItemState, TocUIActions} from './TableOfContents.control';

export interface TableOfContentsProps {
  markdownKey: string;
  className?: string;
  getDispatcher?(dispatcher: RxController<TocUIActions>['dp']): void;
}

export const TableOfContents = React.memo<TableOfContentsProps>(props => {
  const [, touchUIState] = React.useState<any>({});
  const [{dp}, destory, uiStateFac] = React.useMemo(() => createControl(touchUIState), []);
  const uiState = uiStateFac();

  React.useEffect(() => {
    dp.setDataKey(props.markdownKey);
  }, [dp, props.markdownKey]);

  React.useEffect(() => {
    if (props.getDispatcher && dp)
      props.getDispatcher(dp);
  }, [dp, props]);

  React.useEffect(() => () => {destory(); }, [destory]);

  const layout = useAppLayout();
  React.useMemo(() => {
    if (layout) {
      dp.setLayoutControl(layout);
    }
  }, [dp, layout]);

  return uiState?.itemById && uiState?.itemById[0] && uiState.topLevelItemIdsUpdated[0] && uiState.topLevelItemIdsUpdated[0].length > 0 ?
    <div className={cln(props.className ?? '', styles.tocBody, {[styles.fixed]: uiState.changeFixPosition[0]})}>
      <div ref={dp.onPlaceHolderRef}>
      </div>
      <div className={styles.tocContent} ref={dp.onContentDomRef}>
        <h3>Contents</h3>
        {
          renderItems(uiState.itemById[0], uiState.topLevelItemIdsUpdated[0])
        }
      </div>
    </div> :
    null;
});

function renderItems(itemByHash: Map<string, ItemState>, itemIds: string[]) {
  return itemIds.map(id => {
    const item = itemByHash.get(id);
    return <div key={id} className={cln(styles['toc-item'], {hl: item?.highlighted})} >
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
