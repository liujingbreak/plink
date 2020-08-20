import { PayloadAction } from '@reduxjs/toolkit';
import { /* getModuleInjector, */ ofPayloadAction, stateFactory } from '@bk/module-shared/redux-toolkit-abservable/state-factory';
import {map, distinctUntilChanged, catchError, ignoreElements, switchMap} from 'rxjs/operators';
import {of, from, merge} from 'rxjs';

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
  name: 'leadList',
  initialState,
  reducers: {
    exampleAction(draft, {payload}: PayloadAction<boolean>) {
      // modify state draft
      draft.foo = payload;
    }
  }
});

export const exampleActionDispatcher = stateFactory.bindActionCreators(exampleSlice);

const releaseEpic = stateFactory.addEpic((action$) => {
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
        exampleActionDispatcher._change(draft => {
          draft._computed.bar = 'changed ' + changedFoo;
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
