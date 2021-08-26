import {EpicFactory, castByActionType, createReducers, SliceHelper, Refrigerator} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {Immutable} from 'immer';
import React from 'react';
import {MDCDialog} from '@material/dialog';

export type DialogProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: DialogSliceHelper): void;
}>;
export interface DialogState {
  componentProps?: DialogProps;
  domRef?: Immutable<Refrigerator<HTMLDivElement>> | null;
  dialog?: Immutable<Refrigerator<MDCDialog>>;
}

const simpleReducers = {
  onDomRef(s: DialogState, payload: HTMLDivElement | null) {
    s.domRef = payload ? new Refrigerator(payload) : null;
    if (s.domRef)
      s.dialog = new Refrigerator(new MDCDialog(s.domRef.getRef()));
    else if (s.dialog)
      s.dialog.getRef().destroy();
  },
  clickDone(s: DialogState) {},

  _syncComponentProps(s: DialogState, payload: DialogProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<DialogState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: DialogState = {};
  return {
    name: 'Dialog',
    initialState,
    reducers
  };
}

export type DialogSliceHelper = SliceHelper<DialogState, typeof reducers>;

export const epicFactory: EpicFactory<DialogState, typeof reducers> = function(slice) {
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
      )
      // Observe incoming action 'onClick' and dispatch new change action
      // actionStreams.onDomRef.pipe(
      //   op.switchMap((action) => {
      //     // mock async job
      //     return Promise.resolve(action.payload.target); // Promise is not cancellable, the better we use observables instead promise here
      //   }),
      //   op.map(dom => slice.actionDispatcher.clickDone())
      // )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

/*
 * Below is how you use slice inside your component:

import React from 'react';
import {useReduxTookit} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {sliceOptionFactory, epicFactory, DialogProps as Props} from './dialogSlice';

// CRA's babel plugin will remove statement "export {DialogProps}" in case there is only type definition, have to reassign and export it.
export type DialogProps = Props;

const Dialog: React.FC<DialogProps> = function(props) {
  const [state, slice] = useReduxTookit(sliceOptionFactory, epicFactory);

  React.useEffect(() => {
    slice.actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));
  // dispatch action: slice.actionDispatcher.onClick(evt)
  return <div onClick={slice.actionDispatcher.onClick}>{state.yourStateProp}</div>;
};

export {Dialog};

 */

