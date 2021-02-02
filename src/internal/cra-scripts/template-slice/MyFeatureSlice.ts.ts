import { PayloadAction } from '@reduxjs/toolkit';
import { ofPayloadAction, stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export interface $__SliceName__$State {
  foo: boolean;
  _computed: {
    bar: string;
  };
}

const initialState: $__SliceName__$State = {
  foo: true,
  _computed: {
    bar: ''
  }
};

const $__sliceName__$Slice = stateFactory.newSlice({
  name: '$__sliceName__$',
  initialState,
  reducers: {
    exampleAction(s, {payload}: PayloadAction<boolean>) {
      // modify state draft
      s.foo = payload;
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators($__sliceName__$Slice);

const releaseEpic = stateFactory.addEpic<{$__SliceName__$: $__SliceName__$State}>((action$, state$) => {

  return rx.merge(
    action$.pipe(ofPayloadAction($__sliceName__$Slice.actions.exampleAction),
      op.switchMap(({payload}) => {
        return rx.from(Promise.resolve('mock async HTTP request call'));
      })
    ),
    getStore().pipe(
      op.map(s => s.foo),
      op.distinctUntilChanged(),
      op.map(changedFoo => {
        dispatcher._change(s => {
          s._computed.bar = 'changed ' + changedFoo;
        });
      })
    )
  ).pipe(
    op.catchError((ex, src) => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return src;
    }),
    op.ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState($__sliceName__$Slice);
}

export function getStore() {
  return stateFactory.sliceStore($__sliceName__$Slice);
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice($__sliceName__$Slice);
    releaseEpic();
  });
}
