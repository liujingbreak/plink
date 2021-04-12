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
import {EpicFactory, ofPayloadAction} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export interface $__MyComponent__$State {
  yourStateProp?: React.MouseEvent['target'];
  error?: Error;
}

export const reducers = {
  onClick(s: $__MyComponent__$State, event: React.MouseEvent) {},

  changeYourStateProp(s: $__MyComponent__$State, value: React.MouseEvent['target']) {
    s.yourStateProp = value;
  }
  // define more reducers...
};

export const epicFactory: EpicFactory<$__MyComponent__$State, typeof reducers> = function(slice, ofType) {
  return (action$, state$) => {
    return rx.merge(
      // Observe incoming action 'onClick' and dispatch new change action
      action$.pipe(ofPayloadAction(slice.actions.onClick),
        op.switchMap((action) => {
          // mock async job
          return Promise.resolve(action.payload.target);
        }),
        op.tap(dom => slice.actionDispatcher.changeYourStateProp(dom))
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

/**
 * Below is how you use slice inside your component:

import React from 'react';
import {useTinyReduxTookit} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {reducers, $__MyComponent__$State} from './$__MyComponent__$.state';

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  const [state, slice] = useTinyReduxTookit({
    name: '$__MyComponent__$',
    initialState: {} as $__MyComponent__$State,
    reducers,
    debug: process.env.NODE_ENV !== 'production',
    epicFactory
  });
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state}</div>;
};
 */
