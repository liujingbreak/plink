import {EpicFactory, castByActionType, createReducers, SliceHelper, Refrigerator} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {Immutable} from 'immer';
import React from 'react';
import {MDCDialog} from '@material/dialog';

export type DialogProps = React.PropsWithChildren<{
  // define component properties
  sliceRef?(sliceHelper: DialogSliceHelper): void;
  getMdcRef?: (ref: MDCDialog) => void;
}>;
export interface DialogState {
  componentProps?: DialogProps;
  domRef?: Immutable<Refrigerator<HTMLDivElement>> | null;
  dialog?: Immutable<Refrigerator<MDCDialog>>;
  isOpened: boolean;
}

const simpleReducers = {
  onDomRef(s: DialogState, payload: HTMLDivElement | null) {
    s.domRef = payload ? new Refrigerator(payload) : null;
    if (s.domRef)
      s.dialog = new Refrigerator(new MDCDialog(s.domRef.getRef()));
    else if (s.dialog)
      s.dialog.getRef().destroy();
  },
  open(s: DialogState) {},
  close(s: DialogState) {},
  _syncComponentProps(s: DialogState, payload: DialogProps) {
    s.componentProps = {...payload};
  }
  // define more reducers...
};
const reducers = createReducers<DialogState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: DialogState = {
    isOpened: false
  };
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
      slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef),
        op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
          return null;
        })
      ),
      slice.getStore().pipe(
        op.distinctUntilChanged((a, b) => a.componentProps?.getMdcRef === b.componentProps?.getMdcRef && a.dialog === b.dialog),
        op.map(s => {
          if (s.componentProps?.getMdcRef && s.dialog) {
            s.componentProps.getMdcRef(s.dialog.getRef());
          }
        })
      ),
      slice.getStore().pipe(op.map(s => s.dialog),
        op.distinctUntilChanged(),
        op.map(dialog => {
          if (dialog) {
            dialog.getRef().listen('MDCDialog:opened', () => {
              slice.actionDispatcher._change(s => s.isOpened = true);
            });
            dialog.getRef().listen('MDCDialog:closing', () => {
              slice.actionDispatcher._change(s => s.isOpened = false);
            });
          }
        })
      ),
      // Observe incoming action 'onClick' and dispatch new change action
      rx.merge(actionStreams.open, actionStreams.close).pipe(
        op.mergeMap(action => slice.getStore().pipe(
          op.map(s => s.dialog), op.distinctUntilChanged(),
          op.filter(dialog => dialog != null),
          op.take(1),
          op.map(dialog => ({action, dialog: dialog!.getRef()}))
          )),
        op.concatMap(({action, dialog}) => {
          if (action.type === 'open') {
            dialog.open();
            return slice.getStore().pipe(
              op.map(s => s.isOpened),
              op.distinctUntilChanged(),
              op.filter(isOpened => isOpened),
              op.take(1)
            );
          } else {
            dialog.close();
            return slice.getStore().pipe(
              op.map(s => s.isOpened),
              op.distinctUntilChanged(),
              op.filter(isOpened => !isOpened),
              op.take(1)
            );
          }
        })
      )
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

