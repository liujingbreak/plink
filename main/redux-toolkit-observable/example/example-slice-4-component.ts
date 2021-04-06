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

/**
 * When we design state structure, remember immerJS does not perform well on complicated object,
 * ideally we only put "data" in Redux store, including string, number, boolean, Map, Set, and array/object of them,
 * ImmerJS does recursively freezing and proxying job on them. 
 * 
 * Things which are not suggested to be put in Redux stores are: Complex Object, DOM objects, browser window related objects,
 * framework's component object.
 * 
 * In that case, I suggest we leave those in a Map "mutableObjects", only store "key" of items in Redux Store.
 * When component is destroied, clear mutableObjects
 */
export function forComponent(nameAndId: string) {
  const mutableObjects: {[key: string]: any} = {};

  const slice = stateFactory.newSlice({
    name: nameAndId,
    initialState,
    reducers: {
      exampleAction(s, {payload}: PayloadAction<boolean>) {
        // modify state draft
        s.foo = payload;
      }
    }
  });

  const dispatcher = stateFactory.bindActionCreators(slice);

  const releaseEpic = stateFactory.addEpic<{example: ExampleState}>((action$, state$) => {
    return rx.merge(
      action$.pipe(ofPayloadAction(slice.actions.exampleAction),
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

  function getState() {
    return stateFactory.sliceState(slice);
  }

  function getStore() {
    return stateFactory.sliceStore(slice);
  }

  return {
    slice, dispatcher, getState, getStore, mutableObjects,
    destory() {
      stateFactory.removeSlice(slice);
      releaseEpic();
    }
  };
}

