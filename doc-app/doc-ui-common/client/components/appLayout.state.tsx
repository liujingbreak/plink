/**
 * For those components which has complicated "state" or a lot async "actions",
 * leverage a Redux (Redux-toolkit, Redux-observable) like internal store to manage
 * your component.
 * 
 * It's more powerful than React's useReducer() (https://reactjs.org/docs/hooks-reference.html#usereducer)
 * 
 * You should be familiar with concept of "slice" (Redux-toolkit) and "Epic" (Redux-observable) first.
 * 
 * Unlike real Redux-toolkit, we does not use ImmerJs inside, its your job to take care of
 * immutabilities of state, but also as perks, you can use any ImmerJS unfriendly object in state,
 * e.g. DOM object, React Component, functions
 */
import {EpicFactory, Slice, castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import { MDCTopAppBar } from '@wfh/doc-ui-common/client/material/TopAppBar';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import {Size} from './layout/MediaMatch';
import {TopAppBarProps} from '../material/TopAppBar';

export const Ctx = React.createContext<Slice<AppLayoutState, typeof reducers> | null | undefined>(null);
export function useAppLayout() {
  const ctx = React.useContext(Ctx);
  return ctx;
}

export interface AppLayoutState {
  barTitle?: string | null;
  deviceSize: Size;
  footer?: React.ReactNode;
  /** top progress bar */
  showTopLoading: boolean;
  /** scrollable area */
  frontLayer?: HTMLDivElement;
  frontLayerClassName: string;
  topAppBarType?: TopAppBarProps['type'];
  topAppBarRef?: Promise<MDCTopAppBar> | null;
  /** actually show loadin when showTopLoadingCount > 0, turning off loading when showTopLoadingCount <= 0 */
  showTopLoadingReqsCount: number;
  // lastScrollEvent?: React.UIEvent<HTMLDivElement, UIEvent>;
  topLoadingBarRef?: HTMLDivElement;
  topAppBarDomRef?: HTMLHeadElement;
  error?: Error;
}

export const reducers = {
  updateBarTitle(s: AppLayoutState, title: string | null) {
    s.barTitle = title ? title.toUpperCase() : '';
  },
  updateFooter(s: AppLayoutState, content: React.ReactNode) {
    s.footer = content;
  },
  setLoadingVisible(s: AppLayoutState, visible: boolean) {
    // s.showTopLoading = visible;
    if (visible)
      s.showTopLoadingReqsCount++;
    else if (!visible && s.showTopLoadingReqsCount > 0)
      s.showTopLoadingReqsCount--;
  },
  scrollTo(s: AppLayoutState, pos: [left: number, top: number]) {},
  _setLoadingVisible(s: AppLayoutState, visible: boolean) {
    s.showTopLoading = visible;
  },
  _setFrontLayerRef(s: AppLayoutState, div: HTMLDivElement | null) {
    if (div) {
      s.frontLayer = div;
    }
  },
  _setTopBarRef(s: AppLayoutState, mdc: Promise<MDCTopAppBar> | null) {
    s.topAppBarRef = mdc;
  },
  _onScroll(s: AppLayoutState, _event: React.UIEvent<HTMLDivElement, UIEvent> | null) {
    // s.lastScrollEvent = event;
    if (s.frontLayer && s.topAppBarDomRef && s.frontLayer.scrollTop + s.topAppBarDomRef.getBoundingClientRect().top > 1) {
      s.frontLayerClassName = 'withShadow';
    } else {
      s.frontLayerClassName = '';
    }
  },
  _setLoadingBarRef(s: AppLayoutState, dom: HTMLDivElement | null) {
    if (dom)
      s.topLoadingBarRef = dom;
  },
  _setDeviceSize(s: AppLayoutState, size: Size) {
    s.deviceSize = size;
  },
  _setTopbarType(s: AppLayoutState, type: TopAppBarProps['type']) {
    s.topAppBarType = type;
  },
  _setTopAppBarDomRef(s: AppLayoutState, dom: HTMLHeadElement) {
    s.topAppBarDomRef = dom;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: AppLayoutState = {
    showTopLoading: false,
    frontLayerClassName: '',
    showTopLoadingReqsCount: 0,
    deviceSize: 'phone'
  };
  return {
    name: 'AppLayout',
    initialState,
    reducers,
    debug: false // process.env.NODE_ENV !== 'production'
  };
}

export const epicFactory: EpicFactory<AppLayoutState, typeof reducers> = function(slice, ofType) {
  return (action$, state$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    return rx.merge(
      actionStreams._setDeviceSize.pipe(
        op.tap(({payload: size}) => {
          slice.actionDispatcher._setTopbarType(size === 'desktop' ? 'standard' : 'dense');
        })),
      actionStreams.scrollTo.pipe(
        op.switchMap(({payload}) => {
          slice.getState().frontLayer?.scrollTo(payload[0], payload[1]);
          return rx.timer(0);
        }),
        // eslint-disable-next-line array-callback-return
        op.map(() => {
          slice.actionDispatcher._onScroll(null);
        })
      ),
      state$.pipe(
        op.map(s => s.showTopLoadingReqsCount), op.distinctUntilChanged(),
        op.tap(showTopLoadingReqsCount => {
          if (showTopLoadingReqsCount > 0) {
            slice.actionDispatcher._setLoadingVisible(true);
          } else if (showTopLoadingReqsCount <= 0) {
            slice.actionDispatcher._setLoadingVisible(false);
          }
        })
      ),
      state$.pipe(
        op.distinctUntilChanged((s1, s2) => s1.topAppBarRef === s2.topAppBarRef && s1.frontLayer === s2.frontLayer),
        op.filter(state => state.frontLayer != null && state.topAppBarRef != null),
        op.mergeMap(async state => {
          const mdc = await state.topAppBarRef!;
          mdc.setScrollTarget(state.frontLayer!);
        })
      )
    ).pipe(op.ignoreElements());
  };
};
