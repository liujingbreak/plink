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
import {EpicFactory4Comp, BaseComponentState, Slice, castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export type $__MyComponent__$Props = React.PropsWithChildren<{
  // define component properties
  sliceRef?(slice: $__MyComponent__$Slice | null): void;
}>;
export interface $__MyComponent__$State extends BaseComponentState<$__MyComponent__$Props> {
  yourStateProp?: React.MouseEvent['target'];
}

const reducers = {
  onClick(s: $__MyComponent__$State, event: React.MouseEvent) {},

  changeYourStateProp(s: $__MyComponent__$State, value: React.MouseEvent['target']) {
    s.yourStateProp = value;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: $__MyComponent__$State = {};
  return {
    name: '$__MyComponent__$',
    initialState,
    reducers,
    debug: process.env.NODE_ENV !== 'production'
  };
}

export type $__MyComponent__$Slice = Slice<$__MyComponent__$State, typeof reducers>;

export const epicFactory: EpicFactory4Comp<$__MyComponent__$Props, $__MyComponent__$State, typeof reducers> = function(slice) {
  return (action$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    // Observe incoming action 'onClick' and dispatch new change action
    const handleClick = actionStreams.onClick.pipe(
      op.switchMap((action) => {
        // mock async job
        return Promise.resolve(action.payload.target); // Promise is not cancellable, the better we use observables instead promise here
      }),
      op.map(dom => slice.actionDispatcher.changeYourStateProp(dom))
    );
    const emitSliceRef = slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef), op.distinctUntilChanged(),
      op.map(sliceRef => {
        if (sliceRef) {
          sliceRef(slice);
        }
      })
    );
    const onUnmout = actionStreams._willUnmount.pipe(
      op.map(() => {
        const cb = slice.getState().componentProps?.sliceRef;
        if (cb) {
          cb(null);
        }
      })
    );
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(op.map(s => s.componentProps), // watch component property changes
        op.filter(props => props != null),
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.map(() => {
          // slice.actionDispatcher....
        })
      ),
      emitSliceRef,
      onUnmout,
      handleClick
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

/*
 * Below is how you use slice inside your component:

import React from 'react';
import {useTinyRtk} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import {sliceOptionFactory, epicFactory, $__MyComponent__$Props as Props} from './$__sliceName__$.state';

// CRA's babel plugin will remove statement "export {$__MyComponent__$Props}" in case there is only type definition, have to reassign and export it.
export type $__MyComponent__$Props = Props;

const $__MyComponent__$: React.FC<$__MyComponent__$Props> = function(props) {
  const [state, slice] = useTinyRtk(sliceOptionFactory, props, epicFactory);

  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {$__MyComponent__$};

 */
