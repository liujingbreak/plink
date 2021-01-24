import { PayloadAction } from '@reduxjs/toolkit';
import { ofPayloadAction, stateFactory } from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {map, distinctUntilChanged, catchError, ignoreElements, switchMap} from 'rxjs/operators';
import {from, merge} from 'rxjs';

/**
 * In case you are compile this package to a library with typescript definition file '.d.ts',
 * We have to explicityly export Observable, for exporting getStore() function, otherwise Typescript will report 
 * "This is likely not portable, a type annotation is necessary" 
 * https://github.com/microsoft/TypeScript/issues/30858
 */
// export * as immerInternal from 'immer/dist/internal';
// import * as reduxTook from '@reduxjs/toolkit';
// export * as rxjs from 'rxjs';
// export {reduxTook};

export interface TestState {
  foo: boolean;
  _computed: {
    bar: string;
  };
}

const initialState: TestState = {
  foo: true,
  _computed: {
    bar: ''
  }
};

const testSlice = stateFactory.newSlice({
  name: 'test',
  initialState,
  reducers: {
    exampleAction(s, {payload}: PayloadAction<boolean>) {
      // modify state draft
      s.foo = payload;
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(testSlice);

const releaseEpic = stateFactory.addEpic<{Test: TestState}>((action$, state$) => {

  return merge(
    action$.pipe(ofPayloadAction(testSlice.actions.exampleAction),
      switchMap(({payload}) => {
        return from(Promise.resolve('mock async HTTP request call'));
      })
    ),
    getStore().pipe(
      map(s => s.foo),
      distinctUntilChanged(),
      map(changedFoo => {
        dispatcher._change(s => {
          s._computed.bar = 'changed ' + changedFoo;
        });
      })
    )
  ).pipe(
    catchError((ex, src) => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return src;
    }),
    ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(testSlice);
}

export function getStore() {
  return stateFactory.sliceStore(testSlice);
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(testSlice);
    releaseEpic();
  });
}
