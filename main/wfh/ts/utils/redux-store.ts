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
  ValidateSliceCaseReducers
} from '@reduxjs/toolkit';
import { createEpicMiddleware, Epic, ofType } from 'redux-observable';
import { BehaviorSubject, Observable, ReplaySubject, Subject, merge } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, take, takeUntil, tap, ignoreElements } from 'rxjs/operators';

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
  private epicSeq = 0;
  // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');

  private debugLog = new ReplaySubject<any[]>(15);
  private reducerMap: ReducersMapObject<any, PayloadAction<any>>;
  private epicWithUnsub$: BehaviorSubject<[Epic, Subject<string>]>;

  private defaultSliceReducers: Partial<ExtraSliceReducers<any>>;
  /**
   * Unlike store.dispatch(action),
   * If you call next() on this subject, it can save action dispatch an action even before store is configured
   */
  private actionsToDispatch = new ReplaySubject<PayloadAction<any>>(10);

  constructor(private preloadedState: ConfigureStoreOptions['preloadedState']) {
    this.realtimeState$ = new BehaviorSubject<any>(preloadedState);
    this.epicWithUnsub$ = new BehaviorSubject(this.createRootEpic());
    this.log$ = this.debugLog.asObservable();
    this.reducerMap = {};

    this.rootStoreReady = this.store$.pipe(
      filter<EnhancedStore<any, PayloadAction<any>>>(store => store != null),
      take(1)
    ).toPromise();

    this.newSlice({
      initialState: {},
      name: 'debug',
      reducers: {}
    });

    this.defaultSliceReducers = {
      _change: (state, action) => {
        action.payload(state);
      }
    };
  }

  configureStore() {
    if (this.store$.getValue())
      return;
    const rootReducer = this.createRootReducer();
    const epicMiddleware = createEpicMiddleware<PayloadAction<any>>();

    const store = configureStore<any, PayloadAction<any>>({
      reducer: rootReducer,
      // preloadedState: this.preloadedState,
      middleware: [epicMiddleware]
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
            takeUntil(unsub.pipe(tap((epicId) => {
              this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
            })))
          )
        )
      );
    });
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
      Object.assign(_opt.reducers, this.defaultSliceReducers);

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
    return () => unsubscribeEpic.next(epicId);
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

  dispatch<T>(action: PayloadAction<T>) {
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

  private addSliceMaybeReplaceReducer<State,
    Name extends string = string>(
    slice: Slice<State, SliceCaseReducers<State> & ExtraSliceReducers<State>, Name>
    ) {

    this.reducerMap[slice.name] = slice.reducer;
    if (this.getRootStore()) {
      this.dispatch(slice.actions._init({isLazy: true}));
      // store has been configured, in this case we do replaceReducer()
      const newRootReducer = this.createRootReducer();
      this.getRootStore()!.replaceReducer(newRootReducer);
    } else {
      this.dispatch(slice.actions._init({isLazy: false}));
    }
    // return slices.map(slice => typedBindActionCreaters(slice.actions, store.dispatch));
    return slice;
  }

  private createRootReducer(): Reducer {
    // createReducer({}, builder => {
    //   builder.addCase(this.globalChangeActionCreator,(draft, action) => {
    //     action.payload(draft);
    //   })
    //   .addDefaultCase((draft, action) => {
    //     return combineReducers(this.reducerMap)(draft, action);
    //   });
    // });
    return combineReducers(this.reducerMap);
  }

  private getRootStore() {
    return this.store$.getValue();
  }

  private createRootEpic(): [Epic, Subject<string>] {
    const unsubscribeEpic = new Subject<string>();
    const logEpic: Epic<PayloadAction<any>> = (action$, state$) => {
      return merge(
        // state$.pipe(
        //   tap(state => this.debugLog.next(['state', state])),
        //   ignoreElements()
        // ),
        action$.pipe(
          tap(action => {
            this.debugLog.next(['action', action.type]);
          }),
          ignoreElements()
        ),
        this.actionsToDispatch
      );
    };

    return [logEpic, unsubscribeEpic];
  }
}

if (module.hot) {
  module.hot.decline();
}
