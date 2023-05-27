import React from 'react';

import classnames from 'classnames/bind';
import cls from 'classnames';
import clsDdp from 'classnames/dedupe';
import {TopAppBar} from '@wfh/material-components-react/client/TopAppBar';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {LinearProgress} from '@wfh/material-components-react/client/LinearProgress';
import {SwitchAnim} from '@wfh/doc-ui-common/client/animation/SwitchAnim';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {MediaMatch} from './layout/MediaMatch';
import {sliceOptionFactory, epicFactory, Ctx} from './appLayout.state';
import styles from './AppLayout.module.scss';
import '@material/layout-grid/mdc-layout-grid.scss';

const cx = classnames.bind(styles);

export type AppLayoutProps = React.PropsWithChildren<{
  parentDom?: {className: string} | null;
  className?: string;
}>;

const AppLayout: React.FC<AppLayoutProps> = function(props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollEvent$ = React.useMemo(() => new rx.Subject<React.UIEvent<HTMLDivElement, UIEvent>>(), []);

  const [state, slice] = useTinyReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    if (props.parentDom) {
      props.parentDom.className = clsDdp(props.className || undefined, cx('container'), props.parentDom.className);
    }
  }, [props.parentDom, props.className]);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.className = clsDdp(props.className || undefined, cx('container'), containerRef.current.className);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current, props.className]);

  const title = React.useMemo(() => <SwitchAnim type="opacity" contentHash={state.barTitle}>{state.barTitle}</SwitchAnim>,
    [state.barTitle]);


  const onScrollRaw = React.useCallback((event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    scrollEvent$.next(event);
  }, [scrollEvent$]);

  // const renderBelowHeader: TopAppBarProps['renderBelowHeader'] = (type) => {
  //   return <div className={styles.progressBarContainer} ref={slice.actionDispatcher._setLoadingBarRef}>
  //     <LinearProgress className={styles.routeProgressBar} determinate={false} open={state.showTopLoading}/>
  //   </div>;
  // };

  React.useEffect(() => {
    const sub = scrollEvent$.pipe(
      op.throttleTime(300, undefined, {trailing: true}),
      op.tap(event => slice.actionDispatcher._onScroll(event))
    ).subscribe();
    return () => sub.unsubscribe();
  }, [scrollEvent$, slice.actionDispatcher]);

  function renderMain(mainClasName: string) {
    return <>
      {/* Backdrop style UI https://material.io/components/backdrop#usage */}
      <div className={cls(styles.backLayer, 'mdc-layout-size-' + state.deviceSize)}>
        <div className={styles.progressBarContainer} ref={slice.actionDispatcher._setLoadingBarRef}>
          <LinearProgress className={styles.routeProgressBar} determinate={false} open={state.showTopLoading}/>
        </div>
        <div ref={slice.actionDispatcher._setFrontLayerRef} className={cls(styles.frontLayer, mainClasName)}
          onScroll={onScrollRaw}>
          {props.children}
          {state.footer
            ? <footer className={styles.footer}>
              {state.footer}
            </footer>
            : null}
        </div>
      </div></>;
  }

  const content = (
    <TopAppBar ref={slice.actionDispatcher._setTopBarRef} classNameHeader={cx('app-bar-header', state.frontLayerClassName)}
      classNameMain={cx('app-bar-main')} title={title} type={state.topAppBarType}
      renderMain={renderMain}
      _onHeaderRef={slice.actionDispatcher._setTopAppBarDomRef}
    />
  );

  return <Ctx.Provider value={slice}>
    <MediaMatch onChange={slice.actionDispatcher._setDeviceSize}/>
    {props.parentDom == null ? <div className={props.className || undefined} ref={containerRef}>{content}</div> : content}
  </Ctx.Provider>;
};


export {AppLayout};



