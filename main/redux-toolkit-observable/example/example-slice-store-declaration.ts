import {PayloadAction, InferActionsType} from './redux-toolkit-observable';
import { /* getModuleInjector, */ ofPayloadAction, stateFactory } from './example/state-factory';
import {map, distinctUntilChanged, catchError, ignoreElements, switchMap} from 'rxjs/operators';
import {of, from, merge, Observable} from 'rxjs';

/** We have to explicityly export Observable, for exporting getStore() function, otherwise Typescript will report 
 * "This is likely not portable, a type annotation is necessary" 
 * https://github.com/microsoft/TypeScript/issues/30858
 */
export {Observable};

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

const sliceOpt = {
  name: 'example',
  initialState,
  reducers: {
    exampleAction(s: ExampleState, {payload}: PayloadAction<boolean>) {
      // modify state draft
      s.foo = payload;
    }
  }
};

const exampleSlice = stateFactory.newSlice(sliceOpt);

export const actionDispatcher: InferActionsType<typeof sliceOpt> = stateFactory.bindActionCreators(exampleSlice);

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
        actionDispatcher._change(s => {
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
