import { EpicFactory, ofPayloadAction as ofa, createReducers, SliceHelper } from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import { immerable } from 'immer';

class AutoFrozen<T> {
  ref: unknown;
  constructor(originRef: T) {
    this.ref = originRef;
    Object.freeze(this);
  }
  getRef(): T {
    return this.ref as T;
  }
}
AutoFrozen[immerable] = false;

export type SurfaceBackgroundDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: SurfaceBackgroundDemoSliceHelper): void;
}>;
export interface SurfaceBackgroundDemoState {
  componentProps?: SurfaceBackgroundDemoProps;
  surfaceDom?: AutoFrozen<HTMLElement>;
}

const simpleReducers = {
  onClick(s: SurfaceBackgroundDemoState, payload: React.MouseEvent) {},
  clickDone(s: SurfaceBackgroundDemoState) {},

  _syncComponentProps(s: SurfaceBackgroundDemoState, payload: SurfaceBackgroundDemoProps) {
    s.componentProps = {...payload};
  },

  onSurfaceDomRef(s: SurfaceBackgroundDemoState, payload: HTMLElement | null) {
    if (payload) {
      s.surfaceDom = new AutoFrozen(payload);
    } else {
      s.surfaceDom = undefined;
    }
  }
  // define more reducers...
};
const reducers = createReducers<SurfaceBackgroundDemoState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: SurfaceBackgroundDemoState = {};
  return {
    name: 'SurfaceBackgroundDemo',
    initialState,
    reducers
  };
}

export type SurfaceBackgroundDemoSliceHelper = SliceHelper<SurfaceBackgroundDemoState, typeof reducers>;

export const epicFactory: EpicFactory<SurfaceBackgroundDemoState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef),
        op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
          return null;
        })
      ),
      // Observe incoming action 'onClick' and dispatch new change action
      action$.pipe(ofa(slice.actions.onClick),
        op.switchMap((action) => {
          // mock async job
          return Promise.resolve(action.payload.target); // Promise is not cancellable, the better we use observables instead promise here
        }),
        op.map(dom => slice.actionDispatcher.clickDone())
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

