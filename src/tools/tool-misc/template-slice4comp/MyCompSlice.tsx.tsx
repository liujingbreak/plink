import {EpicFactory, ofPayloadAction, createReducers} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';

export type $__MyComponent__$Props = React.PropsWithChildren<{
  // define component properties
}>;
export interface $__MyComponent__$State {
  componentProps?: $__MyComponent__$Props;
  yourStateProp?: string;
}

const reducers = createReducers({
  onClick(s: $__MyComponent__$State, payload: React.MouseEvent) {},
  clickDone(s: $__MyComponent__$State) {},

  _syncComponentProps(s: $__MyComponent__$State, payload: $__MyComponent__$Props) {
    s.componentProps = {...payload};
  }
  // define more reducers...
});

export function sliceOptionFactory() {
  const initialState: $__MyComponent__$State = {};
  return {
    name: '$__MyComponent__$',
    initialState,
    reducers
  };
}

export const epicFactory: EpicFactory<$__MyComponent__$State, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.tap(() => {
          // slice.actionDispatcher....
        })
      ),
      // Observe incoming action 'onClick' and dispatch new change action
      action$.pipe(ofPayloadAction(slice.actions.onClick),
        op.switchMap((action) => {
          // mock async job
          return Promise.resolve(action.payload.target); // Promise is not cancellable, the better we use observables instead promise here
        }),
        op.tap(dom => slice.actionDispatcher.clickDone())
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

/**
 * Below is how you use slice inside your component:

import React from 'react';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, $__MyComponent__$Props} from './$__sliceName__$Slice';
export {$__MyComponent__$Props};

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
  }, [...Object.values(props)]);
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state}</div>;
};

export {$__MyComponent__$};

 */

