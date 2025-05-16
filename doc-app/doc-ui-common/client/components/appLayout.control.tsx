import {MDCTopAppBar, TopAppBarProps} from '@wfh/material-components-react/client/TopAppBar';
import * as rx from 'rxjs';
import React from 'react';
import {ReactorComposite2, ActionTableDataType, SingleActionFactory} from '@wfh/reactivizer';
import {Size} from './layout/MediaMatch';

export const Ctx = React.createContext<ReactorComposite2<InputActions, OutputEvents, typeof inputTableFor, typeof outputTableFor> | null | undefined>(null);
export function useAppLayout() {
  const composite = React.useContext(Ctx);
  return composite;
}

export type InputActions = {
  updateBarTitle(title: string | null): SingleActionFactory;
  updateFooter(content: React.ReactNode): SingleActionFactory;
  setLoadingVisible(visible: boolean): SingleActionFactory;
  scrollTo(...args: [left: number, top: number] | [ScrollToOptions]): SingleActionFactory;
  setLoadingBarRef(dom: HTMLDivElement | null): SingleActionFactory;
  setTopAppBarRef(mdc: Promise<MDCTopAppBar> | null): SingleActionFactory;
  // setTopEdgeRef(dom: HTMLDivElement | null): SingleActionFactory;
  setTopAppBarDomRef(dom: HTMLHeadElement): SingleActionFactory;
  setFrontLayerRef(div: HTMLDivElement | null): SingleActionFactory;
  setDeviceSize(size: Size): SingleActionFactory;
  setHeaderVisibilityDetectDom(dom: HTMLDivElement | null): SingleActionFactory;
  onScroll(event: React.UIEvent<HTMLDivElement, UIEvent> | null): SingleActionFactory;
};

export const inputTableFor = [
  'setFrontLayerRef', 'setLoadingVisible', 'updateBarTitle', 'updateFooter',
  'setLoadingBarRef', 'setTopAppBarRef', 'setTopAppBarDomRef', 'setDeviceSize', 'setHeaderVisibilityDetectDom'
] as const;

export type OutputEvents = {
  topBarVisible(isVisible: boolean): SingleActionFactory;
  showTopLoadingReqsCount(count: number): SingleActionFactory;
  /** if className is "withShadow", TopAppBar is shown otherwise it is displayed in transparent (invisible) */
  frontLayerClassName(className: string): SingleActionFactory;
  topLoadingBarRef(dom: HTMLDivElement | null): SingleActionFactory;
  topbarType(type: TopAppBarProps['type']): SingleActionFactory;
  loadingVisible(visible: boolean): SingleActionFactory;
  /** When scrolling, the top bar placeholder area is changed from being visible and invisible */
  // onTopAppBarScrollChange(outOfViewPort: boolean): SingleActionFactory;
  onScrollDirectionChange(isDown: boolean): SingleActionFactory;
  _onScroll(isDown: boolean): SingleActionFactory;
  /** When scrolling up but yet not reaching the top edge of "frontLayer",
  * top bar is shown with "raised (with shawdow)" style */
  onTopAppBarRaisedShown(raised: boolean): SingleActionFactory;
  _repeatOnTopAppBarRaisedShown(raised: boolean): SingleActionFactory;
};

export const outputTableFor = [
  'frontLayerClassName', 'onTopAppBarRaisedShown', 'showTopLoadingReqsCount', 'topLoadingBarRef',
  'topbarType', 'loadingVisible', 'onScrollDirectionChange'
] as const;

export function createControl(setUiState: (s: ActionTableDataType<InputActions, typeof inputTableFor> & ActionTableDataType<OutputEvents, typeof outputTableFor>) => void) {
  const comp = new ReactorComposite2<InputActions, OutputEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'AppLayout',
    debug: process.env.NODE_ENV === 'development',
    debugExcludeTypes: ['onScroll', '_onScroll', '_repeatOnTopAppBarRaisedShown'],
    inputTableFor,
    outputTableFor
  });
  const {i, o, r, outputTable, inputTable} = comp;

  r('setLoadingVisible -> setShowTopLoadingReqsCount', i.pt.setLoadingVisible.pipe(
    rx.withLatestFrom(outputTable.l.showTopLoadingReqsCount),
    rx.tap(([[m1, visible], [m2, count]]) => {
      if (visible)
        count++;
      else if (!visible && count > 0)
        count--;
      o.ft.showTopLoadingReqsCount(count).dp(m1, m2);
    })
  ));

  let frontLayerScrollTop = 0;

  // TODO: replace with IntersectionObserver
  r('onScroll -> frontLayerClassName, onTopAppBarRaisedShown', i.pt.onScroll.pipe(
    rx.switchMap(([m]) => inputTable.l.setFrontLayerRef.pipe(rx.filter(([, dom]) => dom != null)
    ).pipe(
      rx.take(1),
      rx.tap(([, frontLayerRef]) => {
        const currScrollTop = frontLayerRef!.scrollTop;
        const isScrollDown = currScrollTop > frontLayerScrollTop;
        o.ft._onScroll(isScrollDown).dp();
        frontLayerScrollTop = currScrollTop;

        if (currScrollTop === 0) {
          o.ft.frontLayerClassName('').dp(m);
          o.ft._repeatOnTopAppBarRaisedShown(false).dp();
        } else if (!isScrollDown) {
          o.ft.frontLayerClassName('withShadow').dp(m);
          o.ft._repeatOnTopAppBarRaisedShown(true).dp();
        }
      })
    ))
  ));

  r('_repeatOnTopAppBarRaisedShown -> onTopAppBarRaisedShown', o.pt._repeatOnTopAppBarRaisedShown.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([, raised]) => o.ft.onTopAppBarRaisedShown(raised).dp())
  ));

  r('_onScroll -> onScrollDirectionChange', o.pt._onScroll.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.tap(([m, isDown]) => o.ft.onScrollDirectionChange(isDown).dp(m))
  ));

  r('setDeviceSize -> topbarType', i.pt.setDeviceSize.pipe(
    rx.tap(([m, size]) => {
      o.ft.topbarType(size === 'desktop' ? 'standard' : 'dense').dp(m);
    })
  ));

  r('When scrollTo', i.pt.scrollTo.pipe(
    rx.concatMap(([m, ...opts]) => inputTable.l.setFrontLayerRef.pipe(
      rx.filter(([, v]) => v != null),
      rx.take(1),
      rx.tap(([, dom]) => {
        dom!.scrollTo(...(opts as [ScrollOptions]));
        i.ft.onScroll(null).dp(m);
      })
    ))
  ));

  r('showTopLoadingReqsCount -> loadingVisible',
    outputTable.l.showTopLoadingReqsCount.pipe(
      rx.tap(([m, count]) => {
        if (count > 0) {
          o.ft.loadingVisible(true).dp(m);
        } else if (count <= 0) {
          o.ft.loadingVisible(false).dp(m);
        }
      })
    ));

  r('- > mdc setScrollTarget, topBarVisible', rx.combineLatest([
    inputTable.l.setFrontLayerRef.pipe(
      rx.map(([, v]) => v),
      rx.distinctUntilChanged(),
      rx.filter(v => v != null)
    ),
    inputTable.l.setTopAppBarRef.pipe(
      rx.map(([, v]) => v),
      rx.distinctUntilChanged(),
      rx.filter(v => v != null)
    )
  ]).pipe(
    rx.switchMap(async ([dom, ref]) => {
      const mdc = await ref!;
      mdc.setScrollTarget(dom!);
      const ob = new IntersectionObserver(entries => {
        o.ft.topBarVisible(entries[0].isIntersecting).dp();
      }, {threshold: 0});
      ob.observe(mdc.root);
      return () => ob.unobserve(mdc.root);
    }),
    rx.switchMap(unsub => new rx.Observable<never>(() => unsub))
  ));

  // r('setTopAppBarDomRef -> onTopAppBarScrollChange', i.pt.setHeaderVisibilityDetectDom.pipe(
  //   rx.filter(([, dom]) => dom != null),
  //   rx.switchMap(([, dom]) => new rx.Observable(_sub => {
  //     const ob = new IntersectionObserver(entries => {
  //       o.dp.onTopAppBarScrollChange(!entries[0].isIntersecting);
  //     }, {
  //       threshold: 0
  //     });
  //     ob.observe(dom!);
  //     return () => ob.unobserve(dom!);
  //   }))
  // ));

  r('Update UI state', rx.combineLatest([inputTable.dataChange$, outputTable.dataChange$]).pipe(
    rx.map(([input, output]) => {
      setUiState(Object.assign({}, input, output));
    })
  ));

  i.ft.setLoadingVisible(false).dp();
  o.ft.onTopAppBarRaisedShown(false).dp();
  o.ft.showTopLoadingReqsCount(0).dp();
  o.ft.frontLayerClassName('').dp();
  i.ft.setDeviceSize('phone').dp();

  return comp;
}
