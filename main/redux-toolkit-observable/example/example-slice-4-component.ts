import { PayloadAction } from '@reduxjs/toolkit';
import { ofPayloadAction, stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export interface ExampleState {
  foo: boolean;
  _computed: {
    bar: string;
  };
}

const initialState: ExampleState = {
  foo: true,
  _computed: {
    bar: ''
  }
};

export const exampleSlice = stateFactory.newSlice({
  name: 'example',
  initialState,
  reducers: {
    exampleAction(s, {payload}: PayloadAction<boolean>) {
      // modify state draft
      s.foo = payload;
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(exampleSlice);

const releaseEpic = stateFactory.addEpic<{example: ExampleState}>((action$, state$) => {
  return rx.merge(
    action$.pipe(ofPayloadAction(exampleSlice.actions.exampleAction),
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
  return stateFactory.sliceState(exampleSlice);
}

export function getStore() {
  return stateFactory.sliceStore(exampleSlice);
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(exampleSlice);
    releaseEpic();
  });
}
