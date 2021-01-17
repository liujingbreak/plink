import { PayloadAction } from '@reduxjs/toolkit';
import { /* getModuleInjector, */ ofPayloadAction, stateFactory } from './state-factory';
import {map, distinctUntilChanged, catchError, ignoreElements, switchMap} from 'rxjs/operators';
import {of, from, merge} from 'rxjs';

/**
 * In case you are compile this package to a library with typescript definition file '.d.ts',
 * We have to explicityly export Observable, for exporting getStore() function, otherwise Typescript will report 
 * "This is likely not portable, a type annotation is necessary" 
 * https://github.com/microsoft/TypeScript/issues/30858
 */
export * as immerInternal from 'immer/dist/internal';
import * as reduxTook from '@reduxjs/toolkit';
export * as rxjs from 'rxjs';
export {reduxTook};

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
  // const gService = getModuleInjector().get(GlobalStateStore);

  return merge(
    action$.pipe(ofPayloadAction(exampleSlice.actions.exampleAction),
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
    catchError(ex => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return of<PayloadAction>();
    }),
    ignoreElements()
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
