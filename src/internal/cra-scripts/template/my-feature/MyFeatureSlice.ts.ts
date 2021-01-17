import { PayloadAction } from '@reduxjs/toolkit';
import { ofPayloadAction, stateFactory } from '../state-factory';
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

  return merge(
    action$.pipe(ofPayloadAction($__sliceName__$Slice.actions.exampleAction),
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
