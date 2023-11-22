import {MDCTopAppBar, TopAppBarProps} from '@wfh/material-components-react/client/TopAppBar';
import * as rx from 'rxjs';
import React from 'react';
import {ReactorComposite, ActionTableDataType} from '@wfh/reactivizer';
import {Size} from './layout/MediaMatch';

export const Ctx = React.createContext<ReactorComposite<InputActions, OutputEvents, typeof inputTableFor, typeof outputTableFor> | null | undefined>(null);
export function useAppLayout() {
  const composite = React.useContext(Ctx);
  return composite;
}

export type InputActions = {
  updateBarTitle(title: string | null): void;
  updateFooter(content: React.ReactNode): void;
  setLoadingVisible(visible: boolean): void;
  scrollTo(...args: [left: number, top: number] | [ScrollToOptions]): void;
  setLoadingBarRef(dom: HTMLDivElement | null): void;
  setTopAppBarRef(mdc: Promise<MDCTopAppBar> | null): void;
  setTopAppBarDomRef(dom: HTMLHeadElement): void;
  setFrontLayerRef(div: HTMLDivElement | null): void;
  setDeviceSize(size: Size): void;
  setHeaderVisibilityDetectDom(dom: HTMLDivElement | null): void;
  onScroll(event: React.UIEvent<HTMLDivElement, UIEvent> | null): void;
};

export const inputTableFor = ['setFrontLayerRef', 'setLoadingVisible', 'updateBarTitle', 'updateFooter',
  'setLoadingBarRef', 'setTopAppBarRef', 'setTopAppBarDomRef', 'setDeviceSize', 'setHeaderVisibilityDetectDom'] as const;

export type OutputEvents = {
  showTopLoadingReqsCount(count: number): void;
  topBarRef(): void;
  frontLayerClassName(className: string): void;
  topLoadingBarRef(dom: HTMLDivElement | null): void;
  topbarType(type: TopAppBarProps['type']): void;
  loadingVisible(visible: boolean): void;
  onTopAppBarScrollChange(outOfViewPort: boolean): void;
};

export const outputTableFor = ['frontLayerClassName', 'showTopLoadingReqsCount', 'topLoadingBarRef',
  'topbarType', 'loadingVisible', 'onTopAppBarScrollChange'] as const;

export function createControl(setUiState: (s: ActionTableDataType<InputActions, typeof inputTableFor> & ActionTableDataType<OutputEvents, typeof outputTableFor>) => void) {
  const comp = new ReactorComposite<InputActions, OutputEvents, typeof inputTableFor, typeof outputTableFor>({
    name: 'AppLayout',
    debug: process.env.NODE_ENV === 'development',
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
      o.dpf.showTopLoadingReqsCount([m1, m2], count);
    })
  ));

  r('onScroll -> frontLayerClassName', i.pt.onScroll.pipe(
    rx.switchMap(([m, event]) => rx.combineLatest([
      inputTable.l.setTopAppBarDomRef,
      inputTable.l.setFrontLayerRef.pipe(rx.filter(([, dom]) => dom != null))
    ]).pipe(
      rx.take(1),
      rx.tap(([[, topAppBarDomRef], [, frontLayerRef]]) => {
        if (frontLayerRef!.scrollTop + topAppBarDomRef.getBoundingClientRect().top > 1) {
          o.dpf.frontLayerClassName(m, 'withShadow');
        } else {
          o.dpf.frontLayerClassName(m, '');
        }
      })
    ))
  ));

  r('setDeviceSize -> topbarType', i.pt.setDeviceSize.pipe(
    rx.tap(([m, size]) => {
      o.dp.topbarType(size === 'desktop' ? 'standard' : 'dense');
    })
  ));

  r('When scrollTo', i.pt.scrollTo.pipe(
    rx.concatMap(([m, ...opts]) => inputTable.l.setFrontLayerRef.pipe(
      rx.filter(([, v]) => v != null),
      rx.take(1),
      rx.tap(([, dom]) => {
        dom!.scrollTo(...(opts as [ScrollOptions]));
        i.dpf.onScroll(m, null);
      })
    ))
  ));

  r('showTopLoadingReqsCount -> loadingVisible',
    outputTable.l.showTopLoadingReqsCount.pipe(
      rx.tap(([m, count]) => {
        if (count > 0) {
          o.dpf.loadingVisible(m, true);
        } else if (count <= 0) {
          o.dpf.loadingVisible(m, false);
        }
      })
    ));

  r('mdc setScrollTarget', rx.combineLatest([
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
    })
  ));

  r('setTopAppBarDomRef -> onTopAppBarScrollChange', i.pt.setHeaderVisibilityDetectDom.pipe(
    rx.filter(([, dom]) => dom != null),
    rx.switchMap(([, dom]) => new rx.Observable(_sub => {
      const ob = new IntersectionObserver(entries => {
        o.dp.onTopAppBarScrollChange(!entries[0].isIntersecting);
      }, {
        threshold: 0
      });
      ob.observe(dom!);
      return () => ob.unobserve(dom!);
    }))
  ));

  r('Update UI state', rx.combineLatest([inputTable.dataChange$, outputTable.dataChange$]).pipe(
    rx.map(([input, output]) => {
      setUiState(Object.assign({}, input, output));
    })
  ));

  i.dp.setLoadingVisible(false);
  o.dp.showTopLoadingReqsCount(0);
  o.dp.frontLayerClassName('');
  i.dp.setDeviceSize('phone');

  return comp;
}
