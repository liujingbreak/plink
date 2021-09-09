/// <reference path="../hmr-module.d.ts" />
/// <reference lib="es2017" />
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import { CaseReducer, ConfigureStoreOptions, CreateSliceOptions, Draft, EnhancedStore, PayloadAction, Slice, SliceCaseReducers, ValidateSliceCaseReducers, Middleware, ActionCreatorWithPayload } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { BehaviorSubject, Observable, ReplaySubject, OperatorFunction } from 'rxjs';
export { PayloadAction, SliceCaseReducers, Slice };
export interface ExtraSliceReducers<SS> {
    _init: CaseReducer<SS, PayloadAction<{
        isLazy: boolean;
    }>>;
    _change: CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;
}
export declare type ReducerWithDefaultActions<SS, ACR extends SliceCaseReducers<SS>> = ValidateSliceCaseReducers<SS, ACR> & ExtraSliceReducers<SS>;
export declare function ofPayloadAction<P1, T1 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>): OperatorFunction<any, P1 extends undefined ? {
    type: T1;
} : PayloadAction<P1, T1>>;
export declare function ofPayloadAction<P1, P2, T1 extends string, T2 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>, actionCreators2: ActionCreatorWithPayload<P2, T2>): OperatorFunction<any, PayloadAction<P1 | P2, T1 | T2>>;
export declare function ofPayloadAction<P1, P2, P3, T1 extends string, T2 extends string, T3 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>, actionCreators2: ActionCreatorWithPayload<P2, T2>, actionCreators3: ActionCreatorWithPayload<P3, T3>): OperatorFunction<any, PayloadAction<P1 | P2 | P3, T1 | T2 | T3>>;
export interface ErrorState {
    actionError?: Error;
}
declare type InferStateType<MyCreateSliceOptionsType> = MyCreateSliceOptionsType extends CreateSliceOptions<infer S, any, string> ? S : unknown;
/** A Helper infer type */
export declare type InferSliceType<MyCreateSliceOptionsType> = Slice<InferStateType<MyCreateSliceOptionsType>, (MyCreateSliceOptionsType extends CreateSliceOptions<any, infer _CaseReducer, string> ? _CaseReducer : SliceCaseReducers<InferStateType<MyCreateSliceOptionsType>>) & ExtraSliceReducers<InferStateType<MyCreateSliceOptionsType>>, string>;
/** A Helper infer type */
export declare type InferActionsType<MyCreateSliceOptionsType> = InferSliceType<MyCreateSliceOptionsType>['actions'];
export declare class StateFactory {
    private preloadedState;
    /**
     * Why I don't use Epic's state$ parameter:
     *
     * Redux-observable's state$ does not notify state change event when a lazy loaded (replaced) slice initialize state
     */
    realtimeState$: BehaviorSubject<unknown>;
    store$: BehaviorSubject<EnhancedStore<any, {
        payload: any;
        type: string;
    }, readonly Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined>;
    log$: Observable<any[]>;
    rootStoreReady: Promise<EnhancedStore<any, PayloadAction<any>>>;
    /**
     * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
     */
    actionsToDispatch: ReplaySubject<{
        payload: any;
        type: string;
    }>;
    reportActionError: (err: Error) => void;
    private epicSeq;
    private debugLog;
    private reducerMap;
    private epicWithUnsub$;
    private errorSlice;
    constructor(preloadedState: ConfigureStoreOptions['preloadedState']);
    /**
     *
     * @param opt Be aware, turn off option "serializableCheck" and "immutableCheck" from Redux default middlewares
     */
    configureStore(opt?: {
        [key in Exclude<'reducer', keyof ConfigureStoreOptions<unknown, PayloadAction<unknown>>>]: ConfigureStoreOptions<unknown, PayloadAction<unknown>>[key];
    }): this;
    /**
     * Create our special slice with a default reducer action:
     * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
     * - initialState is loaded from StateFactory's partial preloadedState
     */
    newSlice<S, _CaseReducer extends SliceCaseReducers<S>, Name extends string = string>(opt: CreateSliceOptions<S, _CaseReducer, Name>): Slice<S, _CaseReducer & ExtraSliceReducers<S>, Name>;
    removeSlice(slice: {
        name: string;
    }): void;
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    addEpic<SL = Slice<any, any, string>>(epic: Epic<PayloadAction<any>, any, {
        [key in SL extends Slice<any, any, infer Name> ? Name : string]: SL extends Slice<infer S, any, any> ? S : any;
    }>, epicName?: string): () => void;
    sliceState<SS, CaseReducers extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(slice: Slice<SS, CaseReducers, Name>): SS;
    sliceStore<SS>(slice: Slice<SS>): Observable<SS>;
    getErrorState(): ErrorState;
    getErrorStore(): Observable<ErrorState>;
    dispatch<T>(action: PayloadAction<T>): void;
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    bindActionCreators<A>(slice: {
        actions: A;
    }): A;
    stopAllEpics(): void;
    getRootStore(): EnhancedStore<any, {
        payload: any;
        type: string;
    }, readonly Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
    private errorHandleMiddleware;
    private addSliceMaybeReplaceReducer;
    private createRootReducer;
}
export declare type PayloadCaseReducers<S, R extends SliceCaseReducers<S>> = {
    [T in keyof R]: R[T] extends (s: any) => any ? (state: Draft<S>) => S | void | Draft<S> : R[T] extends (s: any, action: PayloadAction<infer P>) => any ? (state: Draft<S>, payload: P) => S | void | Draft<S> : (state: Draft<S>, payload: unknown) => S | void | Draft<S>;
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
export declare function fromPaylodReducer<S, R extends SliceCaseReducers<S>>(payloadReducers: PayloadCaseReducers<S, R>): CreateSliceOptions<S, R>['reducers'];
