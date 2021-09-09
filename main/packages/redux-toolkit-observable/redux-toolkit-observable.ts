/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// eslint-disable  max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import {
  CaseReducer, combineReducers, configureStore,
  ConfigureStoreOptions, createSlice as reduxCreateSlice, CreateSliceOptions,
  Draft, EnhancedStore, PayloadAction, ReducersMapObject,
  Slice, SliceCaseReducers, Reducer, PayloadActionCreator,
  ValidateSliceCaseReducers, Middleware, ActionCreatorWithPayload
} from '@reduxjs/toolkit';
import { createEpicMiddleware, Epic, ofType } from 'redux-observable';
import { BehaviorSubject, Observable, ReplaySubject, Subject, OperatorFunction } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, take, takeUntil, tap, catchError} from 'rxjs/operators';

export {PayloadAction, SliceCaseReducers, Slice};

export interface ExtraSliceReducers<SS> {
  _init: CaseReducer<SS, PayloadAction<{isLazy: boolean}>>;
  _change: CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;
}

export type ReducerWithDefaultActions<SS,
  ACR extends SliceCaseReducers<SS>> = ValidateSliceCaseReducers<SS, ACR> & ExtraSliceReducers<SS>;

export function ofPayloadAction<P1, T1 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>):
  OperatorFunction<any, P1 extends undefined ? {type: T1} : PayloadAction<P1, T1>>;
export function ofPayloadAction<P1, P2, T1 extends string, T2 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>, actionCreators2: ActionCreatorWithPayload<P2, T2>):
  OperatorFunction<any, PayloadAction<P1 | P2, T1 | T2>>;
export function ofPayloadAction<P1, P2, P3, T1 extends string, T2 extends string, T3 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>,
  actionCreators2: ActionCreatorWithPayload<P2, T2>, actionCreators3: ActionCreatorWithPayload<P3, T3>):
  OperatorFunction<any, PayloadAction<P1 | P2 | P3, T1 | T2 | T3>>;
export function ofPayloadAction<P, T extends string>(...actionCreators: ActionCreatorWithPayload<P, T>[]):
  OperatorFunction<any, PayloadAction<P, T>> {
  return ofType(...actionCreators.map(c => c.type)) as OperatorFunction<any, PayloadAction<P, T>>;
}

export interface ErrorState {
  actionError?: Error;
}

const defaultSliceReducers: Partial<ExtraSliceReducers<any>> = {
  _change: (state, action) => {
    action.payload(state);
  }
};

type InferStateType<MyCreateSliceOptionsType> = MyCreateSliceOptionsType extends CreateSliceOptions<infer S, any, string> ? S : unknown;

/** A Helper infer type */
export type InferSliceType<MyCreateSliceOptionsType> =
  Slice<InferStateType<MyCreateSliceOptionsType>,
  (MyCreateSliceOptionsType extends CreateSliceOptions<any, infer _CaseReducer, string> ? _CaseReducer : SliceCaseReducers<InferStateType<MyCreateSliceOptionsType>>) &
    ExtraSliceReducers<InferStateType<MyCreateSliceOptionsType>>,
  string>;

/** A Helper infer type */
export type InferActionsType<MyCreateSliceOptionsType> =
InferSliceType<MyCreateSliceOptionsType>['actions'];

export class StateFactory {
  /**
   * Why I don't use Epic's state$ parameter:
   * 
   * Redux-observable's state$ does not notify state change event when a lazy loaded (replaced) slice initialize state 
   */
  realtimeState$: BehaviorSubject<unknown>;
  store$ = new BehaviorSubject<EnhancedStore<any, PayloadAction<any>> | undefined>(undefined);
  log$: Observable<any[]>;

  rootStoreReady: Promise<EnhancedStore<any, PayloadAction<any>>>;
  /**
   * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
   */
  actionsToDispatch = new ReplaySubject<PayloadAction<any>>(20);
  reportActionError: (err: Error) => void;

  private epicSeq = 0;
  // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
  private debugLog = new ReplaySubject<any[]>(15);
  private reducerMap: ReducersMapObject<any, PayloadAction<any>>;
  private epicWithUnsub$: Subject<[Epic<PayloadAction<unknown>>, string, Subject<string>]>;
  private errorSlice: InferSliceType<typeof errorSliceOpt>;

  constructor(private preloadedState: ConfigureStoreOptions['preloadedState']) {
    this.realtimeState$ = new BehaviorSubject<unknown>(preloadedState);
    this.epicWithUnsub$ = new ReplaySubject<[Epic<PayloadAction<unknown>>, string, Subject<string>]>();
    this.log$ = this.debugLog.asObservable();
    this.reducerMap = {};

    this.rootStoreReady = this.store$.pipe(
      filter(store => store != null),
      take(1)
    ).toPromise() as Promise<EnhancedStore<any, PayloadAction>>;

    const errorSlice = this.newSlice(errorSliceOpt);

    this.errorSlice = errorSlice;

    this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
  }

  // configureStore(middlewares?: Middleware[]): this;
  /**
   * 
   * @param opt Be aware, turn off option "serializableCheck" and "immutableCheck" from Redux default middlewares
   */
  configureStore(opt?: {[key in Exclude<'reducer', keyof ConfigureStoreOptions<unknown, PayloadAction<unknown>>>]: ConfigureStoreOptions<unknown, PayloadAction<unknown>>[key]}) {
    if (this.store$.getValue())
      return this;
    const rootReducer = this.createRootReducer();
    const epicMiddleware = createEpicMiddleware<PayloadAction<any>>();

    let cfgOpt = opt as ConfigureStoreOptions<unknown, PayloadAction<unknown>>;
    const ourMiddlwares = [this.errorHandleMiddleware, epicMiddleware];
    if (cfgOpt) {
      cfgOpt.reducer = rootReducer;
      cfgOpt.devTools = false;
      if (cfgOpt.middleware) {
        const exitingMid = cfgOpt.middleware;
        if (typeof exitingMid === 'function') {
          cfgOpt.middleware = (getDefault) => {
            return [...exitingMid(getDefault), ...ourMiddlwares];
          };
        } else {
          cfgOpt.middleware = [...exitingMid, ...ourMiddlwares];
        }
      } else {
        cfgOpt.middleware = (getDefault) => {
          return [...getDefault({serializableCheck: false, immutableCheck: false}), ...ourMiddlwares];
        };
      }
    } else {
      cfgOpt = {
        reducer: rootReducer,
        middleware(getDefault) {
          return [...getDefault({serializableCheck: false, immutableCheck: false}), ...ourMiddlwares];
        },
        devTools: false
      };
    }

    const store = configureStore(cfgOpt);
    this.store$.next(store);

    store.subscribe(() => {
      const state = store.getState();
      this.realtimeState$.next(state);
    });

    this.realtimeState$.pipe(
      distinctUntilChanged(),
      // tap(() => console.log('state changed')),
      tap(state => this.debugLog.next(['state', state]))
    ).subscribe();

    epicMiddleware.run((action$, state$, dependencies) => {
      return this.epicWithUnsub$.pipe(
        tap(([epic, epicId, unsub]) => {
          this.debugLog.next([`[redux-toolkit-obs] ${epicId} is about to be subscribed`]);
          // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
        }),
        mergeMap(([epic, epicId, unsub]) => (epic(action$, state$, dependencies))
          .pipe(
            // tap(action => console.log('action: ', action.type)),
            takeUntil(unsub.pipe(
              take(1),
              map(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
                // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
              }))
            ),
            catchError((err, src) => {
              this.reportActionError(err);
              console.error(err);
              return src;
            })
          )
        ),
        takeUntil(action$.pipe(
          ofType('STOP_EPIC'),
          tap(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics']))
        ))
      );
    });
    this.addEpic((action$) => {
      return this.actionsToDispatch;
    }, 'internalDispatcher');

    return this;
  }

  /**
   * Create our special slice with a default reducer action: 
   * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
   * - initialState is loaded from StateFactory's partial preloadedState
   */
  newSlice<S, _CaseReducer extends SliceCaseReducers<S>, Name extends string = string>(
    opt: CreateSliceOptions<S, _CaseReducer, Name>):
    Slice<S, _CaseReducer & ExtraSliceReducers<S>, Name> {

    const _opt = opt as CreateSliceOptions<S, _CaseReducer & ExtraSliceReducers<S>, Name>;
    const reducers = _opt.reducers as ReducerWithDefaultActions<S, _CaseReducer>;

    if (reducers._change == null)
      Object.assign(_opt.reducers, defaultSliceReducers);

    if (reducers._init == null) {
      reducers._init = (draft, action) => {
        this.debugLog.next(['[redux-toolkit-obs]', `slice "${opt.name}" is created ${action.payload.isLazy ? 'lazily' : ''}`]);
      };
    }

    if (this.preloadedState && this.preloadedState[opt.name]) {
      Object.assign(opt.initialState, this.preloadedState[opt.name]);
    }
    const slice = reduxCreateSlice(
      opt as CreateSliceOptions<S, _CaseReducer & ExtraSliceReducers<S>, Name>);

    this.addSliceMaybeReplaceReducer(slice);

    return slice;
  }

  removeSlice(slice: {name: string}) {
    delete this.reducerMap[slice.name];
    if (this.getRootStore()) {
      this.debugLog.next(['[redux-toolkit-obs]', 'remove slice '+ slice.name]);
      const newRootReducer = this.createRootReducer();
      this.getRootStore()!.replaceReducer(newRootReducer);
    }
  }

  /**
   * @returns a function to unsubscribe from this epic
   * @param epic 
   * @param epicName a name for debug and logging purpose
   */
  addEpic<SL = Slice<any, any, string>>(
    epic: Epic<PayloadAction<any>, any, {[key in SL extends Slice<any, any, infer Name> ? Name : string]: SL extends Slice<infer S, any, any> ? S : any}>, epicName?: string) {
    const epicId = 'Epic-' + (epicName || ++this.epicSeq);
    const unsubscribeEpic = new Subject<string>();
    this.debugLog.next([`[redux-toolkit-obs] ${epicId} is added`]);
    this.epicWithUnsub$.next([epic, epicId, unsubscribeEpic]);
    return () => {
      unsubscribeEpic.next(epicId);
      unsubscribeEpic.complete();
    };
  }

  sliceState<SS, CaseReducers extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(
    slice: Slice<SS, CaseReducers, Name>): SS {
    const store = this.getRootStore();
    return store ? store.getState()[slice.name] as SS : {} as SS;
  }

  sliceStore<SS>(slice: Slice<SS>): Observable<SS> {
    return (this.realtimeState$ as Subject<{[key: string]: SS}>).pipe(
      map(s => s[slice.name]),
      filter(ss => ss != null),
      distinctUntilChanged()
    );
  }

  getErrorState() {
    return this.sliceState(this.errorSlice);
  }

  getErrorStore() {
    return this.sliceStore(this.errorSlice);
  }

  dispatch<T>(action: PayloadAction<T>) {
    // console.log('dispatch', action.type);
    this.actionsToDispatch.next(action);
  }

  /**
   * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
   * Parameter is a Slice instead of action map
   */
  bindActionCreators<A>(slice: {actions: A})
    : A {

    const actionMap = {} as A;
    for (const [name, actionCreator] of Object.entries(slice.actions)) {
      const doAction = (...param: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const action = actionCreator(...param);
        this.dispatch(action);
        return action as unknown;
      };
      (doAction as unknown as {type: string}).type = (actionCreator as PayloadActionCreator).type;
      actionMap[name] = doAction as unknown;
    }
    return actionMap;
  }

  stopAllEpics() {
    this.store$.pipe(
      tap(store => {
        if (store)
          store.dispatch({payload: null, type: 'STOP_EPIC'});
      }),
      take(1)
    ).subscribe();
  }

  getRootStore() {
    return this.store$.getValue();
  }

  private errorHandleMiddleware: Middleware = (api) => {
    return (next) => {
      return (action: PayloadAction) => {
        try {
          // console.log('action in errorHandleMiddleware', action.type);
          this.debugLog.next(['action', action != null ? action.type : action]);
          const ret = next(action);
          return ret;
        } catch (err) {
          // tslint:disable-next-line no-console
          console.error('[redux-toolkit-observable] failed action', action);
          // tslint:disable-next-line no-console
          console.error('[redux-toolkit-observable] action dispatch error', err);
          this.reportActionError(err as Error);
          throw err;
        }
      };
    };
  };

  private addSliceMaybeReplaceReducer<State, Name extends string = string>(
    slice: Slice<State, SliceCaseReducers<State> & ExtraSliceReducers<State>, Name>
    ) {
    this.reducerMap[slice.name] = slice.reducer;
    if (this.getRootStore()) {
      const newRootReducer = this.createRootReducer();
      this.getRootStore()!.replaceReducer(newRootReducer);
      this.dispatch(slice.actions._init({isLazy: true}));
    } else {
      this.dispatch(slice.actions._init({isLazy: false}));
    }
    return slice;
  }

  private createRootReducer(): Reducer<any, PayloadAction> {
    const combined = combineReducers(this.reducerMap);
    const rootReducer: Reducer<any, PayloadAction<any>> = (state, action) => {
      if (action.type === '::syncState') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
        return action.payload(state);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return combined(state, action);
      }
    };
    return rootReducer;
  }
}

export type PayloadCaseReducers<S, R extends SliceCaseReducers<S>> = {
  [T in keyof R]: R[T] extends (s: any) => any ?
    (state: Draft<S>) => S | void | Draft<S> :
    R[T] extends (s: any, action: PayloadAction<infer P>) => any ?
      (state: Draft<S>, payload: P) => S | void | Draft<S> : (state: Draft<S>, payload: unknown) => S | void | Draft<S>;
};

/**
 * Simplify reducers structure required in Slice creation option.
 * 
 * Normally, to create a slice, you need to provide a slice option paramter like:
 * {name: <name>, initialState: <value>, reducers: {
 *  caseReducer(state, {payload}: PayloadAction<PayloadType>) {
 *    // manipulate state draft with destructored payload data
 *  }
 * }}
 * 
 * Unconvenient thing is the "PayloadAction<PayloadType>" part which specified as second parameter in every case reducer definition,
 * actually we only care about the Payload type instead of the whole PayloadAction in case reducer.
 * 
 * this function accept a simplified version of "case reducer" in form of: 
 * {
 *    [caseName]: (Draft<State>, payload: any) => Draft<State> | void;
 * }
 * 
 * return a regular Case reducers, not longer needs to "destructor" action paramter to get payload data.
 * 
 * @param payloadReducers 
 * @returns 
 */
export function fromPaylodReducer<S, R extends SliceCaseReducers<S>>(payloadReducers: PayloadCaseReducers<S, R>):
  CreateSliceOptions<S, R>['reducers'] {
  const reducers = {} as CreateSliceOptions<S, R>['reducers'];
  for (const [caseName, simpleReducer] of Object.entries(payloadReducers)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    reducers[caseName as keyof CreateSliceOptions<S, R>['reducers']] = function(s: Draft<S>, action: PayloadAction<any>) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return simpleReducer(s, action.payload) as unknown;
    } as any;
  }
  return reducers;
}

const errorSliceOpt = {
  initialState: {} as ErrorState,
  name: 'error',
  reducers: {
    reportActionError(s: ErrorState, {payload}: PayloadAction<Error>) {
      s.actionError = payload;
    }
  }
};

if (module.hot) {
  module.hot.decline();
}
