import React from 'react';

import classnames from 'classnames/bind';
import cls from 'classnames';
import clsDdp from 'classnames/dedupe';
import {TopAppBar} from '@wfh/material-components-react/client/TopAppBar';
import {LinearProgress} from '@wfh/material-components-react/client/LinearProgress';
import {SwitchAnim} from '@wfh/doc-ui-common/client/animation/SwitchAnim';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ActionTableDataType} from '@wfh/reactivizer';
import {MediaMatch} from './layout/MediaMatch';
import {Ctx, createControl, OutputEvents, outputTableFor, InputActions, inputTableFor} from './appLayout.control';
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

  const [uiState, setUiState] = React.useState<ActionTableDataType<InputActions, typeof inputTableFor> & ActionTableDataType<OutputEvents, typeof outputTableFor>>();
  const controller = React.useMemo(() => createControl(setUiState), []);
  const {inputControl} = controller;

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

  const title = React.useMemo(() => <SwitchAnim type="opacity"
    innerClassName={styles.titleSwitchBox}
    contentHash={uiState?.updateBarTitle[0]}>{uiState?.updateBarTitle[0]}</SwitchAnim>,
  [uiState?.updateBarTitle]);


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
      op.throttleTime(150, undefined, {trailing: true}),
      op.tap(event => inputControl.dp.onScroll(event))
    ).subscribe();

    return () => sub.unsubscribe();
  }, [inputControl.dp, scrollEvent$]);

  function renderMain(mainClasName: string) {
    // eslint-disable-next-line multiline-ternary
    return uiState ? <>
      {/* Backdrop style UI https://material.io/components/backdrop#usage */}
      <div className={cls(styles.backLayer, 'mdc-layout-size-' + uiState.setDeviceSize[0])}>
        <div className={styles.progressBarContainer} ref={inputControl.dp.setLoadingBarRef}>
          <LinearProgress className={styles.routeProgressBar} determinate={false} open={uiState.loadingVisible[0]}/>
        </div>
        <div ref={inputControl.dp.setFrontLayerRef} className={cls(styles.frontLayer, mainClasName)}
          onScroll={onScrollRaw}>
          <div ref={inputControl.dp.setHeaderVisibilityDetectDom} className={styles.headerVisDetect}></div>
          {props.children}
          {uiState.updateFooter[0]
            ? <footer className={styles.footer}>
              {uiState.updateFooter[0]}
            </footer>
            : null}
        </div>
      </div></> : null;
  }

  const content = uiState ?
    <TopAppBar ref={inputControl.dp.setTopAppBarRef} classNameHeader={cx('app-bar-header', uiState.frontLayerClassName[0])}
      classNameMain={cx('app-bar-main')} title={title} type={uiState.topbarType[0]}
      renderMain={renderMain}
      _onHeaderRef={inputControl.dp.setTopAppBarDomRef}
    />
    :
    null;

  return <Ctx.Provider value={controller}>
    <MediaMatch onChange={inputControl.dp.setDeviceSize}/>
    {props.parentDom == null ? <div className={props.className || undefined} ref={containerRef}>{content}</div> : content}
  </Ctx.Provider>;
};


export {AppLayout};



