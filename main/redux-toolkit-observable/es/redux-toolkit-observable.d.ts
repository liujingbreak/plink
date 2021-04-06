/// <reference path="../hmr-module.d.ts" />
/// <reference lib="es2017" />
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import { CaseReducer, ConfigureStoreOptions, CreateSliceOptions, Draft, EnhancedStore, PayloadAction, Slice, SliceCaseReducers, ValidateSliceCaseReducers, Middleware, ActionCreatorWithPayload } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
export { PayloadAction, SliceCaseReducers, Slice };
export interface ExtraSliceReducers<SS> {
    _init: CaseReducer<SS, PayloadAction<{
        isLazy: boolean;
    }>>;
    _change: CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;
}
export declare type ReducerWithDefaultActions<SS, ACR extends SliceCaseReducers<SS>> = ValidateSliceCaseReducers<SS, ACR> & ExtraSliceReducers<SS>;
export declare function ofPayloadAction<P1, T1 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>): (source: Observable<PayloadAction<any>>) => Observable<PayloadAction<P1, T1>>;
export declare function ofPayloadAction<P1, P2, T1 extends string, T2 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>, actionCreators2: ActionCreatorWithPayload<P2, T2>): (source: Observable<PayloadAction<any>>) => Observable<PayloadAction<P1 | P2, T1 | T2>>;
export declare function ofPayloadAction<P1, P2, P3, T1 extends string, T2 extends string, T3 extends string>(actionCreators1: ActionCreatorWithPayload<P1, T1>, actionCreators2: ActionCreatorWithPayload<P2, T2>, actionCreators3: ActionCreatorWithPayload<P3, T3>): (source: Observable<PayloadAction<any>>) => Observable<PayloadAction<P1 | P2 | P3, T1 | T2 | T3>>;
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
    newSlice<SS, _CaseReducer extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(opt: CreateSliceOptions<SS, _CaseReducer, Name>): Slice<SS, _CaseReducer & ExtraSliceReducers<SS>, Name>;
    removeSlice(slice: {
        name: string;
    }): void;
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    addEpic<S = any>(epic: Epic<PayloadAction<any>, any, S>, epicName?: string): () => void;
    sliceState<SS, CaseReducers extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(slice: Slice<SS, CaseReducers, Name>): SS;
    sliceStore<SS>(slice: Slice<SS>): Observable<SS>;
    getErrorState(): ErrorState;
    getErrorStore(): Observable<ErrorState>;
    dispatch<T>(action: PayloadAction<T>): void;
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    bindActionCreators<A, Slice extends {
        actions: A;
    }>(slice: Slice): Slice['actions'];
    stopAllEpics(): void;
    getRootStore(): EnhancedStore<any, {
        payload: any;
        type: string;
    }, readonly Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
    private errorHandleMiddleware;
    private addSliceMaybeReplaceReducer;
    private createRootReducer;
}
