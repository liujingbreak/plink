import {StateFactory, ExtraSliceReducers, ofPayloadAction} from './redux-toolkit-observable';
import {CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, PayloadActionCreator, Action, Draft,
  ActionCreatorWithPayload} from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import {Observable, EMPTY, of, Subject, OperatorFunction, defer, Subscription} from 'rxjs';
import * as op from 'rxjs/operators';
import { immerable, Immutable } from 'immer';

export type EpicFactory<S, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R>) => Epic<PayloadAction<any>, any, unknown> | void;

export type SliceHelper<S, R extends SliceCaseReducers<S>> = Slice<S, R> & {
  /** You don't have to create en Epic for subscribing action stream, you subscribe this property
   * to react on 'done' reducer action, and you may call actionDispatcher to emit a new action
   */
  action$: Observable<PayloadAction | Action>;
  actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>>;
  destroy$: Observable<any>;
  addEpic(epicFactory: EpicFactory<S, R>): () => void;
  addEpic$(epicFactory: Observable<EpicFactory<S, R> | null | undefined>): () => void;
  destroy(): void;
  getStore(): Observable<S>;
  getState(): S;
};

export function createSliceHelper<S, R extends SliceCaseReducers<S>>(
  stateFactory: StateFactory, opts: CreateSliceOptions<S, R>): SliceHelper<S, R> {

  const slice = stateFactory.newSlice(opts);
  const actionDispatcher = stateFactory.bindActionCreators(slice);
  const destory$ = new Subject();
  let action$ = new Subject<PayloadAction | Action>();

  new Observable(() => {
    // Release epic
    return stateFactory.addEpic(_action$ => {
      return _action$.pipe(
        op.tap(action => action$.next(action)),
        op.ignoreElements()
      );
    }, opts.name);
  }).subscribe();

  function addEpic$(epicFactory$: Observable<EpicFactory<S, R> | null | undefined>) {
    const sub = epicFactory$.pipe(
      op.distinctUntilChanged(),
      op.switchMap(fac => {
        if (fac) {
          const epic = fac(helper);
          if (epic) {
            return new Observable(() => {
              // Release epic
              return stateFactory.addEpic(epic, opts.name);
            });
          }
        }
        return EMPTY;
      }),
      op.takeUntil(destory$)
    ).subscribe();
    // releaseEpic.push(() => sub.unsubscribe());
    return () => sub.unsubscribe();
  }

  // let releaseEpic: Array<() => void> = [];
  const helper = {
    ...slice,
    action$: action$.asObservable(),
    actionDispatcher,
    addEpic(epicFactory: EpicFactory<S, R>) {
      return addEpic$(of(epicFactory));
    },
    addEpic$,
    destroy$: destory$.asObservable(),
    destroy() {
      destory$.next();
      destory$.complete();
      stateFactory.removeSlice(slice);
    },
    getStore() {
      return stateFactory.sliceStore(slice);
    },
    getState() {
      return stateFactory.sliceState(slice);
    }
  };
  return helper;
}

type SimpleReducers<S> = {
  [K: string]: (draft: S | Draft<S>, payload?: any) => S | void | Draft<S>;
};

export type RegularReducers<S, R extends SimpleReducers<S>> = {
  [K in keyof R]: R[K] extends (s: any) => any ? (s: Draft<S>) => S | void | Draft<S> :
    R[K] extends (s: any, payload: infer P) => any ? (s: Draft<S>, action: PayloadAction<P>) => void | Draft<S> :
      (s: Draft<S>, action: PayloadAction<unknown>) => void | Draft<S>;
};

/**
 * createReducers helps to simplify how we writing definition of SliceCaseReducers,
 * e.g. A regular SliceCaseReducers takes PayloadAction as parameter, like: 
 * ```ts
 * const reducers = {
 *   reducerName(state: State, {payload}: PayloadAction<number>) {
 *      // update state with payload data
 *    }
 * };
 * ```
 * Normally reducer's logic only care about `payload` instead of `PayloadAction`,
 * createReducers accepts a simpler format:
 * ```ts
 * const reducers = createReducers({
 *   reducerName(draft: State, payload: number) {
 *   }
 * });
 * ```
 * You can declare payload as reducer's parameter instead of a PayloadAction
 * @param simpleReducers
 * @returns SliceCaseReducers which can be part of parameter of createSliceHelper
 */
export function createReducers<S, R extends SimpleReducers<S>>(simpleReducers: R): RegularReducers<S, R> {
  const rReducers = {} as {[key: string]: any};
  for (const [key, sReducer] of Object.entries(simpleReducers)) {
    rReducers[key] = (s: Draft<S>, {payload}: PayloadAction<any>) => {
      return sReducer(s, payload);
    };
  }
  return rReducers as RegularReducers<S, R>;
}


/**
 * Map action stream to multiple action streams by their action type.
 * This is an alternative way to categorize action stream, compare to "ofPayloadAction()"
 * Usage:
```
slice.addEpic(slice => action$ => {
  const actionsByType = castByActionType(slice.actions, action$);
  return merge(
    actionsByType.REDUCER_NAME_A.pipe(
      ...
    ),
    actionsByType.REDUCER_NAME_B.pipe(
      ...
    ),
  )
})
```
 * @param actionCreators 
 * @param action$ 
 */
export function castByActionType<R extends CaseReducerActions<SliceCaseReducers<any>>>(actionCreators: R,
  action$: Observable<PayloadAction | Action>):
  {
    [K in keyof R]:
      Observable<
        R[K] extends PayloadActionCreator<infer P> ?
          PayloadAction<P> : PayloadAction<unknown>
      >
  } {

    let sourceSub: Subscription | undefined;
    let subscriberCnt = 0;
    const dispatcherByType: {[K: string]: Subject<PayloadAction<any, any> | Action> | undefined} = {};
    const splitActions: {[K in keyof R]?: Observable<PayloadAction<any, any>>} = {};
    for (const reducerName of Object.keys(actionCreators)) {
      const subject = dispatcherByType[(actionCreators[reducerName] as PayloadActionCreator).type] = new Subject<PayloadAction<any, any>  | Action>();
      // eslint-disable-next-line no-loop-func
      splitActions[reducerName as keyof R] = defer(() => {
        if (subscriberCnt++ === 0)
          sourceSub = source.subscribe();
        return subject.asObservable() as Observable<any>;
      }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(() => {
          if (--subscriberCnt === 0 && sourceSub) {
            sourceSub.unsubscribe();
            sourceSub = undefined;
          }
        })
      );
    }
    const source = action$.pipe(
      // op.share(), we don't need share(), we have implemented same logic
      op.map(action => {
        const match = dispatcherByType[action.type as string];
        if (match) {
          match.next(action);
        }
      })
    );
    return splitActions as {
      [K in keyof R]: Observable<R[K] extends PayloadActionCreator<infer P> ?
        PayloadAction<P> : PayloadAction<unknown>>
    };
}

export function isActionOfCreator<P, T extends string>(action: PayloadAction<any, any>, actionCreator: ActionCreatorWithPayload<P, T>):
  action is PayloadAction<P, T> {
  return action.type === actionCreator.type;
}

/**
 * Add an epicFactory to another component's sliceHelper
 * e.g.
 * ```
 * action$.pipe(ofPayloadAction(slice.actionDispatcher._onChildSliceRef),
 *  childSliceOp((childSlice) => {
 *    return childAction$ => {
 *      return childAction$.pipe(...);
 *    };
 *  })
 * ```
 * @param epicFactory 
 */
export function sliceRefActionOp<S, R extends SliceCaseReducers<S>>(epicFactory: EpicFactory<S, R>):
  OperatorFunction<PayloadAction<SliceHelper<S, R>>, PayloadAction<any>> {
  return function(in$: Observable<PayloadAction<SliceHelper<S, R>>>) {
    return in$.pipe(
      op.switchMap(({payload}) => {
        const release = payload.addEpic(epicFactory);
        return new Observable<PayloadAction<never>>(sub => release);
      })
    );
  };
}

type ActionOfReducer<S, R extends SliceCaseReducers<S>, T extends keyof R> = R[T] extends (s: any, action: infer A) => any ?
(A extends {payload: infer P} ? {payload: P; type: T} : {type: T}) : never;

export function action$Of<P, T extends string>(
  stateFactory: StateFactory,
  actionCreator: ActionCreatorWithPayload<P, T>) {

  return new Observable<P extends undefined ? {type: T} : PayloadAction<P, T>>(sub => {
    stateFactory.addEpic<unknown>((action$) => {
      return action$.pipe(
        ofPayloadAction(actionCreator),
        op.map(action => sub.next(action as any)),
        op.ignoreElements()
      );
    });
  });
}

export function action$OfSlice<S, R extends SliceCaseReducers<S>,
  T extends keyof R>(
  sliceHelper: SliceHelper<S, R>,
  actionType: T) {

  return new Observable<ActionOfReducer<S, R, T>>(sub => {
    sliceHelper.addEpic(slice => (action$) => {
      return action$.pipe(
        ofPayloadAction(slice.actions[actionType]!),
        op.map(action => sub.next(action as any)),
        op.ignoreElements()
      );
    });
  });
}

/**
 * ImmerJS does not work with some large object (like HTMLElement), meaning you can not directly defined a
 * Redux-toolkit state to contain such a large object, this class provides a wrapper to those
 * "large object", and avoid ImmerJs to recursively freeze it by pre-freeze itself. 
 * 
 * Use it with `Immutable` to inform Redux-toolkit and ImmerJS that this type should be ignored from `drafting`
 * Usage:
 * ```
    import {Immutable} from 'immer';

    interface YourState {
      someDom: Immutable<Refrigerator<HTMLElement>>;
    }
 * ```
 */
export class Refrigerator<T> {
  private ref: Immutable<T>;
  [immerable]: false;

  constructor(originRef: T) {
    this.ref = originRef as Immutable<T>;
    Object.freeze(this);
  }

  creatNewIfNoEqual(ref: T) {
    if (this.ref !== ref) {
      return new Refrigerator(ref);
    } else {
      return this;
    }
  }
  getRef(): T {
    return this.ref as T;
  }
}
Refrigerator[immerable] = false;
