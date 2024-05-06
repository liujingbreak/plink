# Redux-toolkit And Redux-abservable
- [Redux-toolkit And Redux-abservable](#redux-toolkit-and-redux-abservable)
    - [Author slice store](#author-slice-store)
      - [0. import dependencies and polyfill](#0-import-dependencies-and-polyfill)
      - [1. create a Slice](#1-create-a-slice)
      - [2. create an Epic](#2-create-an-epic)
      - [3. export useful members](#3-export-useful-members)
      - [4. Support Hot module replacement (HMR)](#4-support-hot-module-replacement-hmr)
    - [Use slice store in your component](#use-slice-store-in-your-component)
      - [1. Use reselect](#1-use-reselect)
      - [2. About Normalized state and state structure](#2-about-normalized-state-and-state-structure)
    - [Why we wrapper redux-toolkit + redux-observable](#why-we-wrapper-redux-toolkit--redux-observable)
    - [The most frequently used RxJS operators](#the-most-frequently-used-rxjs-operators)
    - [Typescript compile with compiler option "declaration: true" issue](#typescript-compile-with-compiler-option-declaration-true-issue)

参考文档

https://redux-toolkit.js.org/ 

https://redux-observable.js.org/


### Author slice store
#### 0. import dependencies and polyfill
> Make sure you have polyfill for ES5: `core-js/es/object/index`, if your framework is not using babel loader, like Angular.
```ts
import { PayloadAction } from '@reduxjs/toolkit';
import { getModuleInjector, ofPayloadAction, stateFactory } from '@bk/module-shared/redux-toolkit-abservable/state-factory';
```

#### 1. create a Slice
Define your state type
```ts
export interface ExampleState {
  ...
}
```

create initial state
```ts
const initialState: ExampleState = {
  foo: true,
  _computed: {
    bar: ''
  }
};
```

create slice
```ts
export const exampleSlice = stateFactory.newSlice({
  name: 'example',
  initialState,
  reducers: {
    exampleAction(draft, {payload}: PayloadAction<boolean>) {
      // modify state draft
      draft.foo = payload;
    },
    ...
  }
});
```
"example" is the slice name of state true

`exampleAction` is one of the actions, make sure you tell the TS type `PayloadAction<boolean>` of action parameter.

Now bind actions with dispatcher.
```ts
export const exampleActionDispatcher = stateFactory.bindActionCreators(exampleSlice);
```

#### 2. create an Epic
Create a redux-abservable epic to handle specific actions, do async logic and dispatch new actions .

```ts
const releaseEpic = stateFactory.addEpic((action$) => {
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
    ),
    ...
  ).pipe(
    catchError(ex => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return of<PayloadAction>();
    }),
    ignoreElements()
  );
}
```
`action$.pipe(ofPayloadAction(exampleSlice.actions.exampleAction)` meaning filter actions for only interested action `exampleAction`

`getStore().pipe(map(s => s.foo), distinctUntilChanged())` meaning reacting on specific state change event.
`getStore()` is defined later.

`exampleActionDispatcher._change()` dispatch any new actions.

#### 3. export useful members
```ts
export const exampleActionDispatcher = stateFactory.bindActionCreators(exampleSlice);
export function getState() {
  return stateFactory.sliceState(exampleSlice);
}
export function getStore() {
  return stateFactory.sliceStore(exampleSlice);
}
```

#### 4. Support Hot module replacement (HMR)
```ts
if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(exampleSlice);
    releaseEpic();
  });
}
```

### Use slice store in your component

#### 1. Use reselect

#### 2. About Normalized state and state structure

### Why we wrapper redux-toolkit + redux-observable
What's different from using redux-toolkit and redux-abservable directly, what's new in our encapsulation?

- `newSlice()` vs Redux's `createSlice()`
  `newSlice()` implicitly creates default actions for each slice:
  - `_init()` action\
    Called automatically when each slice is created, since slice can be lazily loaded in web application, you may wonder when a specific slice is initialized, just look up its `_init()` action log.
  - `_change(reducer)` action\
    **Epic** is where we subscribe action stream and output new action stream for async function. 
    
    Originally to change a state, we must defined a **reducer** on slice, and output or dispatch that reducer action inside epic.

    In case you are tired of writing to many reducers on slice which contains very small change logic, `_change` is a shared reducer action for you to call inside epic or component, so that you can directly write reducer logic as an action payload within epic definition.

    > But this shared action might be against best practice of redux, since shared action has no meaningful name to be tracked & logged. Just save us from defining to many small reducers/actions on redux slice.
- Global Error state\
  With a Redux middleware to handle dispatch action error (any error thrown from reducer), automatically update error state.

  ```ts
  export declare class StateFactory {
    getErrorState(): ErrorState;
    getErrorStore(): Observable<ErrorState>;
    ...
  }
  ```

- `bindActionCreators()`\
  our store can be lazily configured, dispatch is not available at beginning, thats why we need a customized `bindActionCreators()`


### The most frequently used RxJS operators
There are 2 scenarios you need to interect directly with RxJS.
- In Redux-observable Epic, to observe incoming **action** stream, and dispatching new actions (or return outgoing **action** stream)

- In Redux-observable Epic, observe **store** changing events and react by dispatching new actions.

1. First you have imports like beblow.
```ts
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
```

2. Return a merge stream from Epic function
```ts

```


### Typescript compile with compiler option "declaration: true" issue

> "This is likely not portable, a type annotation is necessary" 
  https://github.com/microsoft/TypeScript/issues/30858

  It usally happens when you are using a "monorepo", with a resolved symlink pointing to some directory which is not under "node_modules",
  the solution is, **try not to resolve symlinks** in compiler options, and don't use real file path in "file", "include" property in tsconfig.
 

