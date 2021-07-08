import {EpicFactory, ofPayloadAction as ofa, createReducers, SliceHelper} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';

export type $__MyComponent__$Props = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: $__MyComponent__$SliceHelper): void;
}>;
export interface $__MyComponent__$State {
  componentProps?: $__MyComponent__$Props;
  yourStateProp?: string;
}

const simpleReducers = {
  onClick(s: $__MyComponent__$State, payload: React.MouseEvent) {},
  clickDone(s: $__MyComponent__$State) {},

  _syncComponentProps(s: $__MyComponent__$State, payload: $__MyComponent__$Props) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<$__MyComponent__$State, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: $__MyComponent__$State = {};
  return {
    name: '$__MyComponent__$',
    initialState,
    reducers
  };
}

export type $__MyComponent__$SliceHelper = SliceHelper<$__MyComponent__$State, typeof reducers>;

export const epicFactory: EpicFactory<$__MyComponent__$State, typeof reducers> = function(slice) {
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
import {sliceOptionFactory, epicFactory, $__MyComponent__$Props as Props} from './$__sliceName__$Slice';

// CRA's babel plugin will remove statement "export {$__MyComponent__$Props}" in case there is only type definition, have to reassign and export it.
export type $__MyComponent__$Props = Props;

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {$__MyComponent__$};

 */

