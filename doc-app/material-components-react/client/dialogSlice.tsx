import {EpicFactory4Comp, BaseComponentState, castByActionType, createReducers, SliceHelper, Refrigerator,
  isActionOfCreator} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {Immutable} from 'immer';
import React from 'react';
import {MDCDialog} from '@material/dialog';
import {Button, ButtonProps} from './Button';
import styles from './Dialog.module.scss';
import cls from 'classnames';

export type DialogProps = React.PropsWithChildren<{
  title: string;
  buttonsRenderer?: (btnClassName: string) => React.ReactElement<ButtonProps, typeof Button>[];
  contentRenderer?: () => React.ReactNode;
  sliceRef?(sliceHelper: DialogSliceHelper | null): void;
  modal?: boolean;
  getMdcRef?: (ref: MDCDialog) => void;
}>;
export interface DialogState extends BaseComponentState<DialogProps> {
  domRef?: Immutable<Refrigerator<HTMLDivElement>> | null;
  dialog?: Immutable<Refrigerator<MDCDialog>>;
  buttonsRenderer: () => React.ReactElement<ButtonProps, typeof Button>[];
  isOpened: boolean;
  fullscreen: boolean;
}

const simpleReducers = {
  onDomRef(s: DialogState, payload: HTMLDivElement | null) {
    s.domRef = payload ? s.domRef ? s.domRef.creatNewIfNoEqual(payload) : new Refrigerator(payload) : null;
  },
  open(s: DialogState) {},
  close(s: DialogState) {},
  switchFullScreen(s: DialogState, fullscreen: boolean) {
    s.fullscreen = fullscreen;
  },
  // _onDefaulBtnRef(s: DialogState, ref: )
  _layout(s: DialogState) {}
  // define more reducers...
};
const reducers = createReducers<DialogState, typeof simpleReducers>(simpleReducers);

export function sliceOptionFactory() {
  const initialState: DialogState = {
    isOpened: false,
    buttonsRenderer: () => [<Button dialogAction='close' className={cls('mdc-dialog__button', styles.defaultBtn)} key='ok'>OK</Button>],
    fullscreen: false
  };
  return {
    name: 'Dialog',
    initialState,
    reducers
  };
}

export type DialogSliceHelper = SliceHelper<DialogState, typeof reducers>;

export const epicFactory: EpicFactory4Comp<DialogProps, DialogState, typeof reducers> = function(slice) {
  return (action$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    let defaultScrimAction: string;
    function waitForDialog() {
      return slice.getStore().pipe(
        op.map(s => s.dialog), op.distinctUntilChanged(),
        op.filter(dialog => dialog != null),
        op.take(1)
      );
    }
    return rx.merge(
      slice.getStore().pipe(op.map(s => s.domRef),
        op.distinctUntilChanged(),
        op.map(domRef => {
          slice.actionDispatcher._change(s => {
            if (s.dialog)
              s.dialog.getRef().destroy();
            if (domRef)
              s.dialog = new Refrigerator(new MDCDialog(domRef.getRef()));
          });
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps?.buttonsRenderer),
        op.distinctUntilChanged(),
        op.map(renderer => {
          if (renderer) {
            slice.actionDispatcher._change(s => {
              s.buttonsRenderer = () => renderer('mdc-dialog__button');
            });
          }
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef),
        op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef) {
            sliceRef(slice);
          }
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
        op.filter(dialog => dialog != null),
        op.tap(dialog => {
          defaultScrimAction = dialog!.getRef().scrimClickAction;
          dialog!.getRef().listen('MDCDialog:opened', () => {
            slice.actionDispatcher._change(s => s.isOpened = true);
          });
          dialog!.getRef().listen('MDCDialog:closed', () => {
            slice.actionDispatcher._change(s => s.isOpened = false);
          });
        }),
        // when dialog is available, watch buttonsRenderer
        op.switchMap(dialog => rx.merge(
          // slice.getStore().pipe(
          //   op.map(s => s.componentProps?.buttonsRenderer),
          //   op.distinctUntilChanged(),
          //   op.tap(() => {
          //     slice.actionDispatcher._layout();
          //   })
          // ),
          slice.getStore().pipe(op.map(s => s.fullscreen),
            op.distinctUntilChanged(),
            op.map(() => slice.actionDispatcher._layout())
          )
        ))
      ),
      slice.getStore().pipe(op.distinctUntilChanged((a, b) => a.componentProps?.modal === b.componentProps?.modal &&
        a.dialog === b.dialog),
        op.filter(s => s.dialog != null),
        op.map(s => {
          if (s.componentProps?.modal) {
            s.dialog!.getRef().scrimClickAction = '';
          } else if (defaultScrimAction) {
            s.dialog!.getRef().scrimClickAction = defaultScrimAction;
          }
        })
      ),
      actionStreams._layout.pipe(
        op.debounceTime(300),
        op.map(() => {
          const dialog = slice.getState().dialog;
          if (dialog) {
            dialog.getRef().layout();
            return slice.getState().isOpened;
          }
          return false;
        }),
        op.filter(needReopen => needReopen),
        // dialog will close itsself after layout()
        op.map(() => {
          slice.actionDispatcher._change(s => s.isOpened = false);
          slice.actionDispatcher.open();
        })
      ),
      rx.merge(actionStreams.open, actionStreams.close).pipe(
        op.mergeMap(action => waitForDialog().pipe(
          op.map(dialog => ({action, dialog: dialog!.getRef()}))
          )),
        op.concatMap(({action, dialog}) => {
          if (isActionOfCreator(action, slice.actions.open)) {
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
