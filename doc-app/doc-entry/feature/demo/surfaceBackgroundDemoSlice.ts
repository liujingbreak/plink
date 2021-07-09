import { EpicFactory, createReducers, SliceHelper, Refrigerator } from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';
import {Immutable} from 'immer';

export type SurfaceBackgroundDemoProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: SurfaceBackgroundDemoSliceHelper): void;
}>;
export interface SurfaceBackgroundDemoState {
  componentProps?: SurfaceBackgroundDemoProps;
  surfaceDom?: Immutable<Refrigerator<HTMLElement>>;
}

const simpleReducers = {
  _syncComponentProps(s: SurfaceBackgroundDemoState, payload: SurfaceBackgroundDemoProps) {
    s.componentProps = {...payload};
  },

  onSurfaceDomRef(s: SurfaceBackgroundDemoState, payload: HTMLElement | null) {
    if (payload) {
      s.surfaceDom = new Refrigerator(payload);
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
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

