/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// tslint:disable: max-line-length
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import {
  CaseReducer, combineReducers, configureStore,
  ConfigureStoreOptions, createSlice as reduxCreateSlice, CreateSliceOptions,
  Draft, EnhancedStore, PayloadAction, ReducersMapObject,
  Slice, SliceCaseReducers, Reducer,
  ValidateSliceCaseReducers, Middleware
} from '@reduxjs/toolkit';
import { createEpicMiddleware, Epic, ofType } from 'redux-observable';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, take, takeUntil, tap } from 'rxjs/operators';

// export type CallBackActionReducer<SS> = CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;

export interface ExtraSliceReducers<SS> {
  _init: CaseReducer<SS, PayloadAction<{isLazy: boolean}>>;
  _change: CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;
}

export type ReducerWithDefaultActions<SS,
  ACR extends SliceCaseReducers<SS>> = ValidateSliceCaseReducers<SS, ACR> & ExtraSliceReducers<SS>;

type SimpleActionCreator<P> = ((payload?: P) => PayloadAction<P>) & {type: string};
export function ofPayloadAction<P>(...actionCreators: SimpleActionCreator<P>[]):
  (source: Observable<PayloadAction<any>>) => Observable<PayloadAction<P>> {
  return ofType(...actionCreators.map(c => c.type));
}

// export function ofPayloadAction(...actionCreators: any[]):
//   (source: Observable<any>) => Observable<PayloadAction<string>> {
//   return ofType<any>(...actionCreators.map(c => c.type));
// }

// type StateFromReducer<T> = T extends Reducer<CombinedState<infer S>> ? S : unknown;

export interface ReduxStoreWithEpicOptions<State = any, Payload = any, Output extends PayloadAction<Payload> = PayloadAction<Payload>,
CaseReducers extends SliceCaseReducers<any> = SliceCaseReducers<any>, Name extends string = string> {
  preloadedState: ConfigureStoreOptions['preloadedState'];
  slices: Slice<State, CaseReducers, Name>[];
  epics: Epic<PayloadAction<Payload>, Output, State>[];
}

export interface ErrorState {
  actionError?: Error;
}

const defaultSliceReducers: Partial<ExtraSliceReducers<any>> = {
  _change: (state, action) => {
    action.payload(state);
  }
};

export class StateFactory {
  /**
   * Why I don't use Epic's state$ parameter:
   * 
   * Redux-observable's state$ does not notify state change event when a lazy loaded (replaced) slice initialize state 
   */
  realtimeState$: BehaviorSubject<{[key: string]: any}>;
  store$ = new BehaviorSubject<EnhancedStore<any, PayloadAction<any>> | undefined>(undefined);
  log$: Observable<any[]>;
  rootStoreReady: Promise<EnhancedStore<any, PayloadAction<any>>>;
  /**
   * Unlike store.dispatch(action),
   * If you call next() on this subject, it can save action dispatch an action even before store is configured
   */
  actionsToDispatch = new ReplaySubject<PayloadAction<any>>(20);

  private epicSeq = 0;
  // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
  private debugLog = new ReplaySubject<any[]>(15);
  private reducerMap: ReducersMapObject<any, PayloadAction<any>>;
  private epicWithUnsub$: Subject<[Epic, Subject<string>]>;

  private reportActionError: (err: Error) => void;

  private errorSlice: Slice<ErrorState>;

  constructor(private preloadedState: ConfigureStoreOptions['preloadedState']) {
    this.realtimeState$ = new BehaviorSubject<any>(preloadedState);
    this.epicWithUnsub$ = new ReplaySubject(2);
    this.log$ = this.debugLog.asObservable();
    this.reducerMap = {};

    this.rootStoreReady = this.store$.pipe(
      filter<EnhancedStore<any, PayloadAction<any>>>(store => store != null),
      take(1)
    ).toPromise();

    const errorSlice = this.newSlice({
      initialState: {} as ErrorState,
      name: 'error',
      reducers: {
        reportActionError(s, {payload}: PayloadAction<Error>) {
          s.actionError = payload;
        }
      }
    });

    this.errorSlice = errorSlice;

    this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;

  }

  configureStore(middlewares?: Middleware[]) {
    if (this.store$.getValue())
      return this;
    const rootReducer = this.createRootReducer();
    const epicMiddleware = createEpicMiddleware<PayloadAction<any>>();

    const middleware = middlewares ? [epicMiddleware, this.errorHandleMiddleware, ...middlewares] : [epicMiddleware, this.errorHandleMiddleware];
    const store = configureStore<any, PayloadAction<any>, Middleware<any>[]>({
      reducer: rootReducer,
      // preloadedState: this.preloadedState,
      middleware
    });

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
        mergeMap(([epic, unsub]) => (epic(action$, state$, dependencies) as ReturnType<Epic>)
          .pipe(
            takeUntil(unsub.pipe(
              take(1),
              tap(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
              }))
            )
          )
        ),
        // tslint:disable-next-line: no-console
        takeUntil(action$.pipe(
          ofType('STOP_EPIC'),
          tap(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics']))
        ))
      );
    });
    this.addEpic((action$) => {
      return this.actionsToDispatch;
    });

    // this.actionsToDispatch.pipe(
    //   tap(action => store.dispatch(action))
    // ).subscribe();

    return this;
  }

  /**
   * Create our special slice with a default reducer action: 
   * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
   * - initialState is loaded from StateFactory's partial preloadedState
   */
  newSlice<SS, _CaseReducer extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(
    opt: CreateSliceOptions<SS, _CaseReducer, Name>) {

    const _opt = opt as CreateSliceOptions<SS, _CaseReducer & ExtraSliceReducers<SS>, Name>;
    const reducers = _opt.reducers as ReducerWithDefaultActions<SS, _CaseReducer>;

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
      opt as CreateSliceOptions<SS, _CaseReducer & ExtraSliceReducers<SS>, Name>);

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
   */
  addEpic(
    epic: Epic) {
    const epicId = 'Epic-' + ++this.epicSeq;
    const unsubscribeEpic = new Subject<string>();
    this.epicWithUnsub$.next([epic, unsubscribeEpic]);
    this.debugLog.next(['[redux-toolkit-obs]', epicId + ' is added']);
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
    return (this.realtimeState$ as BehaviorSubject<{[key: string]: SS}>).pipe(
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
  bindActionCreators<A, Slice extends {actions: A}>(slice: Slice) {

    const actionMap = {} as typeof slice.actions;
    for (const [sliceName, actionCreator] of Object.entries(slice.actions)) {
      const name = sliceName;
      const doAction = (...param: any[]) => {
        const action = (actionCreator as any)(...param);
        this.dispatch(action);
        return action;
      };
      actionMap[name] = doAction;
    }
    return actionMap as Slice['actions'];
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

  private errorHandleMiddleware: Middleware = (api) => {
    return (next) => {
      return (action: PayloadAction) => {
        try {
          this.debugLog.next(['action', action.type]);

          const ret = next(action);
          return ret;
        } catch (err) {
          // tslint:disable-next-line no-console
          console.error('[redux-toolkit-observable] failed action', action);
          // tslint:disable-next-line no-console
          console.error('[redux-toolkit-observable] action dispatch error', err);
          this.reportActionError(err);
          throw err;
        }
      };
    };
  }

  private addSliceMaybeReplaceReducer<State,
    Name extends string = string>(
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

  private createRootReducer(): Reducer {
    return combineReducers(this.reducerMap);
  }

  private getRootStore() {
    return this.store$.getValue();
  }

}

if (module.hot) {
  module.hot.decline();
}
