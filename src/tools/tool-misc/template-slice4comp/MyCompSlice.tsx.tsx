import {EpicFactory4Comp, castByActionType, createReducers, SliceHelper, BaseComponentState} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';

// Define component properties
export type $__MyComponent__$Props = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: $__MyComponent__$SliceHelper | null): void;
}>;

// Define internal state
export interface $__MyComponent__$State extends BaseComponentState<$__MyComponent__$Props> {
  yourStateProp?: string;
}

// Define RTK Action reducers
const simpleReducers = {
  onClick(s: $__MyComponent__$State, payload: React.MouseEvent) {},
  clickDone(s: $__MyComponent__$State) {}
  // define more reducers...
};
const reducers = createReducers<$__MyComponent__$State, typeof simpleReducers>(simpleReducers);

// Define initial state value
export function sliceOptionFactory() {
  const initialState: $__MyComponent__$State = {};
  return {
    name: '$__MyComponent__$',
    initialState,
    reducers
  };
}

export type $__MyComponent__$SliceHelper = SliceHelper<$__MyComponent__$State, typeof reducers>;

// Define Redux-observable epic (asyn action reactor)
// To fold code by "action streams" in Visual Studio Code, press ctrl + k, ctrl + 4
export const epicFactory: EpicFactory4Comp<$__MyComponent__$Props, $__MyComponent__$State, typeof reducers> = function(slice) {
  return (action$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(op.map(s => s.componentProps), // watch component property changes
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
      actionStreams._willUnmount.pipe(
        op.map(() => {
          const cb = slice.getState().componentProps?.sliceRef;
          if (cb) {
            cb(null);
          }
        })
      ),
      // Observe incoming action 'onClick' and dispatch new change action
      actionStreams.onClick.pipe(
        op.switchMap((action) => {
          // mock async job
          return Promise.resolve(action.payload.target); // Promise is not cancellable, the better we use observables instead promise here
        }),
        op.map(dom => slice.actionDispatcher.clickDone())
      )
      // ... more action async reactors
    ).pipe(op.ignoreElements());
  };
};

/*
 * Below is how you use slice inside your component:

import React from 'react';
import {useRtk} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, $__MyComponent__$Props as Props} from './$__sliceName__$Slice';

// CRA's babel plugin will remove statement "export {$__MyComponent__$Props}" in case there is only type definition, have to reassign and export it.
export type $__MyComponent__$Props = Props;

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  const [state, slice] = useRtk(sliceOptionFactory, props, epicFactory);

  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {$__MyComponent__$};

 */

