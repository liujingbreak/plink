/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has 
 * complicated async state change logic.
 * 
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export interface Action<S> {
  type: string;
  reducer?(old: S): S | void;
}

export interface PayloadAction<S, P = any[]> {
  type: string;
  payload: P;
  reducer?(old: S, ...payload: P extends Array<infer I> ? I[] : [P]): S | void;
}

export type Reducers<S, R = any> = {
  /** Returning `undefined / void` has same effect of returning old state reference,
   * Returning a brand new state object for immutability in normal case.
   */
  [K in keyof R]: (state: S, ...payload: any[]) => S | void;
};

export type Actions<S, R> = {
  [K in keyof R]:
    R[K] extends (s: S) => any ? {
      (): ActionTypes<S, R>[K];
      type: string;
    } :
    R[K] extends (s: S, payload: infer P) => any ? {
      (payload: P): ActionTypes<S, R>[K];
      type: string;
    } :
    R[K] extends (s: S, ...payload: infer M) => any ? {
      (...payload: M): ActionTypes<S, R>[K];
      type: string;
    } : {
      (): ActionTypes<S, R>[K];
      type: string;
    };
};

type ActionTypes<S, R> = {
  [K in keyof R]:
    R[K] extends (s: S) => any ? Action<S>:
    R[K] extends (s: S, payload: infer P) => any ? PayloadAction<S, P> :
    R[K] extends (s: S, ...payload: infer M) => any ? PayloadAction<S, M> :
    PayloadAction<S, unknown>;
};

type OutputActionObs<S, R extends Reducers<any>, K extends keyof R> =
  rx.Observable<R[K] extends (s: S) => any ? Action<S> : R[K] extends (s: S, payload: infer P) => any ? PayloadAction<S, P> : PayloadAction<S, unknown>>;
  // rx.Observable<PayloadAction<any, Parameters<R[K]>[1] extends undefined ? void : Parameters<R[K]>[1], K>>;

type OfTypePipeOp<S, R extends Reducers<S>, K extends keyof R> = (src: rx.Observable<PayloadAction<S> | Action<S>>) => OutputActionObs<S, R, K>;

/** same as ofPayloadAction() , to filter action stream by type, unlike ofPayloadAction(), parameter is a string instead of actionCreator */
export interface OfTypeFn<S, R extends Reducers<S>> {
  <K1 extends keyof R>(actionType: K1): OfTypePipeOp<S, R, K1>;
  <K1 extends keyof R, K2 extends keyof R>(actionType: K1, actionType2: K2): OfTypePipeOp<S, R, K1 | K2>;
  <K1 extends keyof R, K2 extends keyof R, K3 extends keyof R>(actionType: K1, actionType2: K2, actionType3: K3): OfTypePipeOp<S, R, K1 | K2 | K3>;
  <K extends keyof R>(...actionTypes: K[]): OfTypePipeOp<S, R, K>;
}

export type EpicFactory<S, R extends Reducers<S>> = (slice: Slice<S, R>, ofType: OfTypeFn<S, R>) => Epic<S> | void;

export interface Slice<S, R extends Reducers<S>> {
  name: string | number;
  state$: rx.BehaviorSubject<S>;
  /** Action creator functions */
  action$: rx.Observable<PayloadAction<any> | Action<S>>;
  action$ByType: ActionByType<S, R>;
  dispatch: (action: PayloadAction<S> | Action<S>) => void;
  /** Action creators bound with dispatcher */
  actionDispatcher: Actions<S, R>;
  /** Action creators */
  actions: Actions<S, R>;
  destroy: () => void;
  destroy$: rx.Observable<any>;
  /**
   * 
   * @param epic the "Epic" stream of actions-in, actions-out, refer to https://redux-observable.js.org/docs/basics/Epics.html
   * @returns a function to destory (subscribe from) epic
   */
  epic(epic: Epic<S>): void;
  /**
   * epic(epic) is recommended to be used instead of addEpic(), it has conciser method signature.
   * @param epicFactory a factory function which creates the "Epic" (stream of actions-in and actions-out,
   *  refer to https://redux-observable.js.org/docs/basics/Epics.html)
   * @returns a function to remove/unsubscribe this epic
   */
  addEpic(epicFactory: EpicFactory<S, R>): () => void;
  /**
   * Most of the time you just need epic(epic), this method is convenient in case of constantly "adding"
   * new epic after "unsubscribe" from preceding old epic
   * @param epicFactory$ this observable will be "switchMap()"ed in a pipeline
   */
  addEpic$(epicFactory$: rx.Observable<EpicFactory<S, R> | null | undefined>): () => void;
  getStore(): rx.Observable<S>;
  getState(): S;
  /** un-processed actions go through this operator */
  setActionInterceptor(intec: rx.OperatorFunction<PayloadAction<S, any> | Action<S>, PayloadAction<S, any> | Action<S>>): void;
}

export type Epic<S, A$ = rx.Observable<PayloadAction<S, any> | Action<S>>> = (actions: A$, states: rx.BehaviorSubject<S>) => A$;

type ActionOfCreator<C> = C extends {
  (): any;
  type: string;
} ? { type: string; payload: undefined } :
  C extends {
    (payload: infer P): any;
    type: string;
  } ? {type: string; payload: P} :
  C extends {
    (...args: infer M): any;
    type: string;
  } ? {type: string; payload: M} : unknown;

export interface OfPayloadActionFn {
  <C>(actionCreators: C): rx.OperatorFunction<any, ActionOfCreator<C>>;
  <C1, C2>(actionCreators: C1, actionCreators1: C2):
    rx.OperatorFunction<any , ActionOfCreator<C1> | ActionOfCreator<C2>>;
  <C1, C2, C3>(actionCreators: C1, actionCreators1: C2, actionCreators2: C3):
    rx.OperatorFunction<any, ActionOfCreator<C1> | ActionOfCreator<C2> | ActionOfCreator<C3>>;
  (...actionCreators: {type: string}[]): rx.OperatorFunction<any, {type: string; payload?: unknown}>;
}

export const ofPayloadAction: OfPayloadActionFn = (
  ...actionCreators: {type: string}[]) => {
  return function(src: rx.Observable<{type: string}>) {
    return src.pipe(
      op.filter(action => actionCreators.some(ac => action.type === ac.type))
    );
  };
};

type ActionByType<S, R> = {[K in keyof R]: rx.Observable<ActionTypes<S, R>[K]>};
/**
 * Map action stream to multiple action streams by theire action type.
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
export function castByActionType<S, R extends Reducers<S>>(actionCreators: Actions<S, R>,
  action$: rx.Observable<PayloadAction<any> | Action<S>>): ActionByType<S, R> {

    const source = action$.pipe(op.share());
    const splitActions = {} as ActionByType<S, R>;

    for (const reducerName of Object.keys(actionCreators) as (keyof R)[]) {
      Object.defineProperty(splitActions, reducerName, {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          return source.pipe(ofPayloadAction(actionCreators[reducerName]));
        }
      });
    }

    return splitActions;
}

export function isActionOfCreator<C extends {type: string}>(action: any, actionCreator: C):
  action is ActionOfCreator<C> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return action.type === actionCreator.type;
}

const sliceCount4Name: {[name: string]: number} = {};

export interface SliceOptions<RS, R extends Reducers<RS>, S extends RS = RS> {
  name: string;
  initialState: S;
  reducers: R;
  /** Generate unique ID as part of slice's name, default: true */
  generateId?: boolean;
  debug?: boolean;
  debugActionOnly?: boolean;
  rootStore?: rx.BehaviorSubject<{[k: string]: S}>;
}

/**
 * Reducers and initialState are reused cross multiple component
 * 
 *  Slice --- Component instance (state, actions)
 */
export function createSlice<S extends {error?: Error}, R extends Reducers<S>>(opt: SliceOptions<S, R>): Slice<S, R> {
  let name = opt.name;
  if (opt.generateId === undefined || opt.generateId === true) {
    if (sliceCount4Name[name] == null) {
      sliceCount4Name[name] = 0;
    }
    opt.name = name = name + '.' + (++sliceCount4Name[name]);
  }
  const actionCreators = {} as Actions<S, R>;
  const actionDispatcher = {} as Actions<S, R>;

  for (const [key, reducer] of Object.entries(opt.reducers)) {
    const type = name + '/' + key;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const creator = ((payload: unknown[]) => {
      const action = {
        type,
        payload: payload.length === 0 ? undefined :
          payload.length === 1 ? payload[0] :
          payload,
        reducer
      };
      return action;
    }) as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    creator.type = type;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    actionCreators[key as keyof R] = creator;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    actionDispatcher[key as keyof R] = ((...payload: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const action = creator(payload);
      dispatch(action);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return action;
    }) as any;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    actionDispatcher[key as keyof R].type = creator.type;
  }

  const state$ = new rx.BehaviorSubject<S>(opt.initialState);
  const unprocessedAction$ = new rx.Subject<PayloadAction<S> | Action<S>>();
  const action$ = new rx.Subject<PayloadAction<S> | Action<S>>();

  function ofType<T extends keyof R>(
    ...actionTypes: T[]) {
    return function(src: rx.Observable<PayloadAction<any>>) {
      return src.pipe(
        op.filter(action => actionTypes.some(ac => action.type === name + '/' + ac))
      );
    };
  }

  function dispatch(action: PayloadAction<S> | Action<S>) {
    unprocessedAction$.next(action);
  }

  let actionCount = 0;
  let executingReducer = false;
  // To warn developer that no action dispatching shoud be called inside a reducer, this is side-effects and 
  // will leads to recursive reducer
  let inReducer = false;
  const interceptor$ = new rx.BehaviorSubject<rx.OperatorFunction<PayloadAction<S, any> | Action<S>, PayloadAction<S, any> | Action<S>>>(
    input => input
  );

  const sub = rx.merge(
    interceptor$.pipe(
      op.switchMap(interceptor => unprocessedAction$.pipe(
        // op.observeOn(rx.queueScheduler), // Avoid recursively dispatching action inside an reducer, but normally recursively dispatching should be warned and forbidden
        op.tap(action => {
          if (opt.debug || opt.debugActionOnly) {
            // eslint-disable-next-line no-console
            console.log(`%c ${name} internal:action `, 'color: black; background: #fae4fc;', action.type);
          }
        }),
        interceptor,
        op.tap(action => {
          if (action.reducer) {
            const currState = state$.getValue();
            const shallowCopied = {...currState, __ac: ++actionCount};
            executingReducer = true;
            if (inReducer) {
              throw new Error(`Do not dispatch action inside a reducer! (action: ${action.type})`);
            }
            inReducer = true;
            let newState: S | void;
            try {
              const payload = (action as PayloadAction<S>).payload;
              const params = Array.isArray(payload) ? payload : [payload];
              newState = action.reducer(shallowCopied, ...params);
            } finally {
              inReducer = false;
              executingReducer = false;
            }
            // inReducer = false;
            // executingReducer = false;
            const changed = newState ? newState : shallowCopied;
            state$.next(changed);
          }
          action$.next(action);
        }),
        op.catchError((err, caught) => {
          console.error(err);
          dispatch({type: 'reducer error',
            reducer(s: S) {
              return {...s, error: err as unknown};
            }
          });
          return caught;
        })
      ))
    ),

    state$.pipe(
      op.tap(state => {
        if (opt.debug) {
          // eslint-disable-next-line no-console
          console.log(`%c ${name} internal:state `, 'color: black; background: #e98df5;', state);
        }
      })
    ),
    opt.rootStore ? state$.pipe(
      op.tap(state => opt.rootStore!.next({...opt.rootStore?.getValue(), [opt.name]: state}))
     ) : rx.EMPTY
  ).subscribe();

  function destroy() {
    dispatch({
      type: '__OnDestroy'
    });
    sub.unsubscribe();
  }

  function addEpic$(epicFactory$: rx.Observable<EpicFactory<S, R> | null | undefined>) {
    const sub = epicFactory$.pipe(
      op.distinctUntilChanged(),
      op.switchMap(fac => {
        if (fac) {
          const epic = fac(slice, ofType as OfTypeFn<S, R>);
          if (epic)
            return epic(action$, state$).pipe(
              op.catchError((err, src) => {
                console.error(err);
                dispatch({type: 'Epic error',
                  reducer(s: S) {
                    return {...s, error: err as unknown};
                  }
                });
                return src;
              })
            );
        }
        return rx.EMPTY;
      }),
      op.takeUntil(unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))),
      op.tap(action => dispatch(action)),
      op.catchError((err, caught) => {
        console.error(err);
        dispatch({type: 'Epics error',
          reducer(s: S) {
            return {...s, error: err as unknown};
          }
        });
        return caught;
      })
    ).subscribe();
    return () => sub.unsubscribe();
  }

  const slice: Slice<S, R> = {
    name,
    state$,
    action$,
    action$ByType: castByActionType(actionCreators, action$),
    actions: actionCreators,
    dispatch,
    actionDispatcher,
    destroy,
    destroy$: unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1)),
    epic(epic: Epic<S>) {
      const epicFactory: EpicFactory<S, R> = () => {
        return epic;
      };
      addEpic$(rx.of(epicFactory));
    },
    setActionInterceptor(intec: rx.OperatorFunction<PayloadAction<S, any> | Action<S>, PayloadAction<S, any> | Action<S>>) {
      interceptor$.next(intec);
    },
    addEpic(epicFactory: EpicFactory<S, R>) {
      return addEpic$(rx.of(epicFactory));
    },
    addEpic$,
    getStore() {
      return state$;
    },
    getState() {
      if (executingReducer) {
        throw new Error('To be consistent with Redux\'s behaviour, slice.getState() is not allowed to be invoked inside a reducer');
      }
      return state$.getValue();
    }
  };
  return slice;
}

export function action$OfSlice<S, R extends Reducers<S>,
  T extends keyof R>(
  slice: Slice<S, R>,
  actionType: T) {

  return new rx.Observable<R[T] extends (s: any) => any ? {type: T} :
    R[T] extends (s: any, p: infer P) => any ? {payload: P; type: T} : never>(sub => {
    slice.addEpic(slice => (action$) => {
      return action$.pipe(
        ofPayloadAction(slice.actions[actionType]),
        op.map(action => sub.next(action as any)),
        op.ignoreElements()
      );
    });
  });
}

/**
 * @deprecated use Slice['action$ByType'] instead
 */
export function action$ByType<S, R extends Reducers<S>>(slice: Slice<S, R>) {
  return castByActionType(slice.actions, slice.action$);
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
 export function sliceRefActionOp<S, R extends Reducers<S>>(epicFactory: EpicFactory<S, R>):
  rx.OperatorFunction<PayloadAction<any, Slice<S, R>>, PayloadAction<any, any>> {
  return function(in$: rx.Observable<PayloadAction<any, Slice<S, R>>>) {
    return in$.pipe(
      op.switchMap(({payload}) => {
        const release = payload.addEpic(epicFactory);
        return new rx.Observable<PayloadAction<never>>(sub => release);
      })
    );
  };
}

const demoSlice = createSlice({
  name: 'demo',
  initialState: {} as {ok?: boolean; error?: Error},
  reducers: {
    hellow(s, greeting: {data: string}) {},
    world(s) {},
    multiPayloadReducer(s, arg1: string, arg2: number) {}
  }
});
demoSlice.addEpic((slice, ofType) => {
  return (action$, state$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    // slice.actionDispatcher.abc();
    return rx.merge(
      actionStreams.hellow.pipe(),
      actionStreams.multiPayloadReducer.pipe(),
      action$.pipe(
        ofType('hellow', 'hellow'),
        op.map(action => slice.actions.world())
      ),
      action$.pipe(
        ofType('world'),
        op.tap(action => slice.actionDispatcher.hellow({data: 'yes'}))
      ),
      action$.pipe(
        ofPayloadAction(slice.actions.hellow),
        op.tap(action => typeof action.payload.data === 'string')
      ),
      action$.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ofPayloadAction(slice.actions.world),
        op.tap(action => slice.actionDispatcher.hellow({data: 'yes'}))
      ),
      action$.pipe(
        ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world),
        op.tap(action => action.payload )
      ),
      action$.pipe(
        ofPayloadAction(slice.actions.multiPayloadReducer),
        op.tap(({payload: [a1, a2]}) => alert(a1))
      )
    ).pipe(op.ignoreElements());
  };
});
action$OfSlice(demoSlice, 'hellow').pipe(op.tap(action => action));
action$OfSlice(demoSlice, 'world').pipe(op.tap(action => action));
