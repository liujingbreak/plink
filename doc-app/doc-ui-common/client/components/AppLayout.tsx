import React from 'react';

import classnames from 'classnames/bind';
import cls from 'classnames';
import clsDdp from 'classnames/dedupe';
import styles from './AppLayout.module.scss';
import { TopAppBar } from '@wfh/doc-ui-common/client/material/TopAppBar';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {reducers, AppLayoutState, epicFactory, Ctx} from './appLayout.state';
import {LinearProgress} from '@wfh/doc-ui-common/client/material/LinearProgress';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

const cx = classnames.bind(styles);

export type AppLayoutProps = React.PropsWithChildren<{
  parentDom?: {className: string} | null;
  className?: string;
}>;

const AppLayout: React.FC<AppLayoutProps> = function(props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollEvent$ = React.useMemo(() => new rx.Subject<React.UIEvent<HTMLDivElement, UIEvent>>(), []);
  const initialState: AppLayoutState = {
    showTopLoading: false
  };
  const [state, slice] = useTinyReduxTookit({
    name: 'AppLayout',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production',
    epicFactory
  });

  React.useEffect(() => {
    if (props.parentDom) {
      props.parentDom.className = clsDdp(props.className || undefined, cx('container'), props.parentDom.className);
    }
  }, [props.parentDom]);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.className = clsDdp(props.className || undefined, cx('container'), containerRef.current.className);
    }
  }, [containerRef.current]);

  const onScrollRaw = React.useCallback((event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    scrollEvent$.next(event);
  }, []);

  React.useEffect(() => {
    const sub = scrollEvent$.pipe(
      op.throttleTime(300),
      op.tap(event => slice.actionDispatcher.onScroll(event))
    ).subscribe();
    return () => sub.unsubscribe();
  }, []);

  function renderMain(mainClasName: string) {
    return <><div className={styles.progressBarContainer}>
      <LinearProgress className={styles.routeProgressBar} determinate={false} open={state.showTopLoading}/>
    </div>
    {/* Backdrop style UI https://material.io/components/backdrop#usage */}
    <div className={styles.backLayer}>
      <div ref={slice.actionDispatcher.setFrontLayerRef} className={cls(styles.frontLayer, mainClasName)}
        onScroll={onScrollRaw}>{props.children}</div>
    </div></>;
  }

  const content = <>
    <TopAppBar ref={slice.actionDispatcher.setTopBarRef} classNameHeader={cx('app-bar-header')}
      classNameMain={cx('app-bar-main')} title={state.barTitle} type='dense'
      renderMain={renderMain}
      >
    </TopAppBar>
  </>;

  return <Ctx.Provider value={slice}>
    {props.parentDom == null ? <div className={props.className || undefined} ref={containerRef}>{content}</div> : content}
    </Ctx.Provider>;
};


export {AppLayout};



