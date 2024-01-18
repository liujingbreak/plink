import React from 'react';
import cln from 'classnames';
import {RxController} from '@wfh/reactivizer';
import {Ripple} from '@wfh/material-components-react/client/Ripple';
import {useAppLayout} from '../../components/appLayout.control';
import {useRouter} from '../../animation/AnimatableRoutes.hooks';
import {createMarkdownViewControl} from '../markdownViewComp.control';
import styles from './TableOfContents.module.scss';
// import {TOC} from '../../../isom/md-types';
import {createControl, TocUIActions, TocUIEventTable} from './TableOfContents.control';

export interface TableOfContentsProps {
  markdownKey: string;
  className?: string;
  markdownViewCtl: ReturnType<typeof createMarkdownViewControl>;
}

export type TocInputDispatcher = RxController<TocUIActions>['dp'];

export const TableOfContents = React.memo<TableOfContentsProps>(props => {
  const [, touchUIState] = React.useState<any>({});
  const [{dp}, destory, uiStateFac] = React.useMemo(() => createControl(touchUIState), []);
  const uiState = uiStateFac();

  const router = useRouter();
  React.useEffect(() => {
    if (router) {
      dp.setRouter(router);
    }
  }, [dp, router]);

  React.useEffect(() => {
    dp.setMarkdownViewCtl(props.markdownViewCtl);
  }, [dp, props.markdownViewCtl]);

  React.useEffect(() => {
    dp.setDataKey(props.markdownKey);
  }, [dp, props.markdownKey]);

  const itemById = uiState?.itemById[0];
  const itemIds = uiState?.itemsIdUpdated[1];
  const clickHandlers = React.useMemo(() => {
    const handlers = new Map<string, React.MouseEventHandler<HTMLDivElement>>();
    if (itemById) {
      for (const key of itemById.keys()) {
        handlers.set(key, () => {
          dp.clicked(key);
        });
      }
    }
    return handlers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dp, itemById, itemIds]); // itemIds is the only reliable field for change detection, it is immutable, `itemById` is mutable

  const titleRefHandlers = React.useMemo(() => {
    const handlers = new Map<string, React.RefCallback<HTMLDivElement>>();
    if (itemById) {
      for (const key of itemById.keys()) {
        handlers.set(key, ref => {
          if (ref)
            dp.setItemTitleElement(key, ref as HTMLElement);
        });
      }
    }
    return handlers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dp, itemById, itemIds]); // itemIds is the only reliable field for change detection, it is immutable, `itemById` is mutable

  React.useEffect(() => () => {destory(); }, [destory]);

  const layout = useAppLayout();
  React.useMemo(() => {
    if (layout) {
      dp.setLayoutControl(layout);
    }
  }, [dp, layout]);

  const togglePopupClassName = uiState?.togglePopupClassName ?? [''];

  return uiState?.itemById && uiState?.itemById[0] && uiState.itemsIdUpdated[0] && uiState.itemsIdUpdated[0].length > 0 ?
    <div className={cln(
      props.className ?? '',
      styles.tocBody,
      {[styles.fixed]: uiState.changeFixedPosition[0]},
      togglePopupClassName[0] ? styles[togglePopupClassName[0]] : ''
    )}>
      <div className={styles.tocScrollDetector} ref={dp.onScrollDetectorRef}></div> { /* IntersectionObserver detector */ }
      <div className={styles.tocContent} ref={dp.onContentDomRef}>
        <div className={styles.tocContentInner}>
          <h3>ON THIS PAGE</h3>
          {
            uiState.itemsIdUpdated[1] ? renderItems(uiState.itemsIdUpdated[1], clickHandlers, titleRefHandlers, uiState) : null
          }
        </div>
        <div ref={dp.onPosIndicatorRef} className={styles.posIndicator}></div>
      </div>
    </div> :
    null;
});

function renderItems(
  itemIds: string[],
  clickHandlers: Map<string, React.MouseEventHandler<HTMLDivElement>>,
  titleRefHandlers: Map<string, React.RefCallback<HTMLDivElement>>,
  uiState: TocUIEventTable
) {
  return itemIds.map(id => {
    const item = uiState.itemById[0]?.get(id);
    if (item == null)
      return null;

    return <div key={id} className={cln(styles['toc-item'], {[styles.hl]: item.highlighted})} >
      <div className={cln(styles['toc-title'], styles['level-' + item.level])}
        ref={titleRefHandlers.get(id)}
        onClick={clickHandlers.get(item.id)}>{item?.text}<Ripple/>
      </div>
    </div>;
  });
}
