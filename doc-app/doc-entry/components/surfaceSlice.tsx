import {EpicFactory, ofPayloadAction as ofa, createReducers, SliceHelper} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';

export type SurfaceProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: SurfaceSliceHelper): void;
}>;
export interface SurfaceState {
  componentProps?: SurfaceProps;
  yourStateProp?: string;
}

const simpleReducers = {
  onClick(s: SurfaceState, payload: React.MouseEvent) {},
  clickDone(s: SurfaceState) {},

  _syncComponentProps(s: SurfaceState, payload: SurfaceProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<SurfaceState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: SurfaceState = {};
  return {
    name: 'Surface',
    initialState,
    reducers
  };
}

export type SurfaceSliceHelper = SliceHelper<SurfaceState, typeof reducers>;

export const epicFactory: EpicFactory<SurfaceState, typeof reducers> = function(slice) {
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

/*
 * Below is how you use slice inside your component:

import React from 'react';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, SurfaceProps as Props} from './surfaceSlice';

// CRA's babel plugin will remove statement "export {SurfaceProps}" in case there is only type definition, have to reassign and export it.
export type SurfaceProps = Props;

const Surface: React.FC<SurfaceProps> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {Surface};

 */

