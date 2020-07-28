/// <reference lib="es2017" />
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import { CaseReducer, ConfigureStoreOptions, CreateSliceOptions, Draft, EnhancedStore, PayloadAction, PayloadActionCreator, Slice, SliceCaseReducers, ValidateSliceCaseReducers } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { BehaviorSubject, Observable } from 'rxjs';
export interface ExtraSliceReducers<SS> {
    _init: CaseReducer<SS, PayloadAction<{
        isLazy: boolean;
    }>>;
    _change: CaseReducer<SS, PayloadAction<(draftState: Draft<SS>) => void>>;
}
export declare type ReducerWithDefaultActions<SS, ACR extends SliceCaseReducers<SS>> = ValidateSliceCaseReducers<SS, ACR> & ExtraSliceReducers<SS>;
export declare function ofPayloadAction<P, T extends string = string, A extends ReturnType<PayloadActionCreator<P, T>> = ReturnType<PayloadActionCreator<P, T>>>(...actionCreators: PayloadActionCreator<P, T>[]): (source: Observable<A>) => Observable<A>;
export interface ReduxStoreWithEpicOptions<State = any, Payload = any, Output extends PayloadAction<Payload> = PayloadAction<Payload>, CaseReducers extends SliceCaseReducers<any> = SliceCaseReducers<any>, Name extends string = string> {
    preloadedState: ConfigureStoreOptions['preloadedState'];
    slices: Slice<State, CaseReducers, Name>[];
    epics: Epic<PayloadAction<Payload>, Output, State>[];
}
export declare class StateFactory {
    private preloadedState;
    /**
     * Why I don't use Epic's state$ parameter:
     *
     * Redux-observable's state$ does not notify state change event when a lazy loaded (replaced) slice initialize state
     */
    realtimeState$: BehaviorSubject<{
        [key: string]: any;
    }>;
    store$: BehaviorSubject<EnhancedStore<any, {
        payload: any;
        type: string;
    }, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined>;
    log$: Observable<any[]>;
    rootStoreReady: Promise<EnhancedStore<any, PayloadAction<any>>>;
    private debugLog;
    private reducerMap;
    private epic$;
    private defaultSliceReducers;
    /**
     * Unlike store.dispatch(action),
     * If you call next() on this subject, it can save action dispatch an action even before store is configured
     */
    private actionsToDispatch;
    constructor(preloadedState: ConfigureStoreOptions['preloadedState']);
    configureStore(): this;
    /**
     * Create our special slice with a default reducer action:
     * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
     * - initialState is loaded from StateFactory's partial preloadedState
     */
    newSlice<SS, _CaseReducer extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(opt: CreateSliceOptions<SS, _CaseReducer, Name>): Slice<SS, _CaseReducer & ExtraSliceReducers<SS>, Name>;
    addEpic<Payload, Output extends PayloadAction<Payload> = PayloadAction<Payload>>(epic: Epic<PayloadAction<Payload>, Output>): void;
    sliceState<SS, CaseReducers extends SliceCaseReducers<SS> = SliceCaseReducers<SS>, Name extends string = string>(slice: Slice<SS, CaseReducers, Name>): SS;
    sliceStore<SS>(slice: Slice<SS>): Observable<SS>;
    dispatch<T>(action: PayloadAction<T>): void;
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    bindActionCreators<A, Slice extends {
        actions: A;
    }>(slice: Slice): Slice["actions"];
    private addSliceMaybeReplaceReducer;
    private createRootReducer;
    private getRootStore;
    private createRootEpic;
}
