import { ofPayloadAction} from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {EpicFactory, createReducers} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import React from 'react';

export interface DemoPageObservableProps {
  // define component properties
}
export interface DemoPageState {
  componentProps?: DemoPageObservableProps;
}

const reducers = createReducers({
  onClick(s: DemoPageState, payload: React.MouseEvent) {},
  clickDone(s: DemoPageState) {},

  _syncComponentProps(s: DemoPageState, payload: DemoPageObservableProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
});

export function sliceOptionFactory() {
  const initialState: DemoPageState = {
  };
  return {
    name: 'DemoPage',
    initialState,
    reducers
  };
}

export const epicFactory: EpicFactory<DemoPageState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.filter(props => props != null),
        op.switchMap(props => { // Consider other ooperators like, concatMap(), mergeMap(), tap(), exhaustMap()
          return rx.from('some cancellable async reactions on component property changes and');
        }),
        op.tap(() => {
          // slice.actionDispatcher....
        })
      ),
      // Observe incoming action 'onClick' and dispatch new change action
      action$.pipe(ofPayloadAction(slice.actionDispatcher.onClick),
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


