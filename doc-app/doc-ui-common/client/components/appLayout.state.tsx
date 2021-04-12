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
import {EpicFactory, Slice} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import { MDCTopAppBar } from '@wfh/doc-ui-common/client/material/TopAppBar';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
// import { ofPayloadAction } from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit';

export const Ctx = React.createContext<Slice<AppLayoutState, typeof reducers> | null | undefined>(null);
export function useAppLayout() {
  const ctx = React.useContext(Ctx);
  return ctx;
}

export interface AppLayoutState {
  barTitle?: string | null;
  /** top progress bar */
  showTopLoading: boolean;
  /** scrollable area */
  frontLayer?: HTMLDivElement;
  topAppBarRef?: Promise<MDCTopAppBar> | null;
  lastScrollEvent?: React.UIEvent<HTMLDivElement, UIEvent>;
  error?: Error;
}

export const reducers = {
  updateBarTitle(s: AppLayoutState, title: string | null) {
    s.barTitle = title ? title.toUpperCase() : '';
  },
  setLoadingVisible(s: AppLayoutState, visible: boolean) {
    s.showTopLoading = visible;
  },
  setFrontLayerRef(s: AppLayoutState, div: HTMLDivElement | null) {
    if (div) {
      s.frontLayer = div;
    }
  },
  setTopBarRef(s: AppLayoutState, mdc: Promise<MDCTopAppBar> | null) {
    s.topAppBarRef = mdc;
  },
  onScroll(s: AppLayoutState, event: React.UIEvent<HTMLDivElement, UIEvent>) {
    s.lastScrollEvent = event;
  }
  // define more reducers...
};

export const epicFactory: EpicFactory<AppLayoutState, typeof reducers> = function(slice, ofType) {
  return (action$, state$) => {
    return rx.merge(
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

/**
 * Below is how you use slice inside your component:

import React from 'react';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {reducers, AppLayoutState} from './AppLayout.state';

const AppLayout: React.FC<AppLayoutProps> = function(props) {
  const [state, slice] = useTinyReduxTookit({
    name: 'AppLayout',
    initialState: {} as AppLayoutState,
    reducers,
    debug: process.env.NODE_ENV !== 'production',
    epicFactory
  });
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state}</div>;
};
 */




