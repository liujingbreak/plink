/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// eslint-disable  max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import { combineReducers, configureStore, createSlice as reduxCreateSlice } from '@reduxjs/toolkit';
import { createEpicMiddleware, ofType } from 'redux-observable';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, take, takeUntil, tap, catchError } from 'rxjs/operators';
export function ofPayloadAction(...actionCreators) {
    return ofType(...actionCreators.map(c => c.type));
}
const defaultSliceReducers = {
    _change: (state, action) => {
        action.payload(state);
    }
};
export class StateFactory {
    constructor(preloadedState) {
        this.preloadedState = preloadedState;
        this.store$ = new BehaviorSubject(undefined);
        /**
         * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
         */
        this.actionsToDispatch = new ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new ReplaySubject(15);
        this.errorHandleMiddleware = (api) => {
            return (next) => {
                return (action) => {
                    try {
                        // console.log('action in errorHandleMiddleware', action.type);
                        this.debugLog.next(['action', action != null ? action.type : action]);
                        const ret = next(action);
                        return ret;
                    }
                    catch (err) {
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] failed action', action);
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] action dispatch error', err);
                        this.reportActionError(err);
                        throw err;
                    }
                };
            };
        };
        this.realtimeState$ = new BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(filter(store => store != null), take(1)).toPromise();
        const errorSlice = this.newSlice(errorSliceOpt);
        this.errorSlice = errorSlice;
        this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
    }
    // configureStore(middlewares?: Middleware[]): this;
    /**
     *
     * @param opt Be aware, turn off option "serializableCheck" and "immutableCheck" from Redux default middlewares
     */
    configureStore(opt) {
        if (this.store$.getValue())
            return this;
        const rootReducer = this.createRootReducer();
        const epicMiddleware = createEpicMiddleware();
        let cfgOpt = opt;
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
                }
                else {
                    cfgOpt.middleware = [...exitingMid, ...ourMiddlwares];
                }
            }
            else {
                cfgOpt.middleware = (getDefault) => {
                    return [...getDefault({ serializableCheck: false, immutableCheck: false }), ...ourMiddlwares];
                };
            }
        }
        else {
            cfgOpt = {
                reducer: rootReducer,
                middleware(getDefault) {
                    return [...getDefault({ serializableCheck: false, immutableCheck: false }), ...ourMiddlwares];
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
        this.realtimeState$.pipe(distinctUntilChanged(), 
        // tap(() => console.log('state changed')),
        tap(state => this.debugLog.next(['state', state]))).subscribe();
        epicMiddleware.run((action$, state$, dependencies) => {
            return this.epicWithUnsub$.pipe(tap(([epic, epicId, unsub]) => {
                this.debugLog.next([`[redux-toolkit-obs] ${epicId} is about to be subscribed`]);
                // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
            }), mergeMap(([epic, epicId, unsub]) => (epic(action$, state$, dependencies))
                .pipe(
            // tap(action => console.log('action: ', action.type)),
            takeUntil(unsub.pipe(take(1), map(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
                // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
            }))), catchError((err, src) => {
                this.reportActionError(err);
                console.error(err);
                return src;
            }))), takeUntil(action$.pipe(ofType('STOP_EPIC'), tap(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics'])))));
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
    newSlice(opt) {
        const _opt = opt;
        const reducers = _opt.reducers;
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
        const slice = reduxCreateSlice(opt);
        this.addSliceMaybeReplaceReducer(slice);
        return slice;
    }
    removeSlice(slice) {
        delete this.reducerMap[slice.name];
        if (this.getRootStore()) {
            this.debugLog.next(['[redux-toolkit-obs]', 'remove slice ' + slice.name]);
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
        }
    }
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    addEpic(epic, epicName) {
        const epicId = 'Epic-' + (epicName || ++this.epicSeq);
        const unsubscribeEpic = new Subject();
        this.debugLog.next([`[redux-toolkit-obs] ${epicId} is added`]);
        this.epicWithUnsub$.next([epic, epicId, unsubscribeEpic]);
        return () => {
            unsubscribeEpic.next(epicId);
            unsubscribeEpic.complete();
        };
    }
    sliceState(slice) {
        const store = this.getRootStore();
        return store ? store.getState()[slice.name] : {};
    }
    sliceStore(slice) {
        return this.realtimeState$.pipe(map(s => s[slice.name]), filter(ss => ss != null), distinctUntilChanged());
    }
    getErrorState() {
        return this.sliceState(this.errorSlice);
    }
    getErrorStore() {
        return this.sliceStore(this.errorSlice);
    }
    dispatch(action) {
        // console.log('dispatch', action.type);
        this.actionsToDispatch.next(action);
    }
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    bindActionCreators(slice) {
        const actionMap = {};
        for (const [name, actionCreator] of Object.entries(slice.actions)) {
            const doAction = (...param) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const action = actionCreator(...param);
                this.dispatch(action);
                return action;
            };
            doAction.type = actionCreator.type;
            actionMap[name] = doAction;
        }
        return actionMap;
    }
    stopAllEpics() {
        this.store$.pipe(tap(store => {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), take(1)).subscribe();
    }
    getRootStore() {
        return this.store$.getValue();
    }
    addSliceMaybeReplaceReducer(slice) {
        this.reducerMap[slice.name] = slice.reducer;
        if (this.getRootStore()) {
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
            this.dispatch(slice.actions._init({ isLazy: true }));
        }
        else {
            this.dispatch(slice.actions._init({ isLazy: false }));
        }
        return slice;
    }
    createRootReducer() {
        const combined = combineReducers(this.reducerMap);
        const rootReducer = (state, action) => {
            if (action.type === '::syncState') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
                return action.payload(state);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return combined(state, action);
            }
        };
        return rootReducer;
    }
}
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
export function fromPaylodReducer(payloadReducers) {
    const reducers = {};
    for (const [caseName, simpleReducer] of Object.entries(payloadReducers)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reducers[caseName] = function (s, action) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return simpleReducer(s, action.payload);
        };
    }
    return reducers;
}
const errorSliceOpt = {
    initialState: {},
    name: 'error',
    reducers: {
        reportActionError(s, { payload }) {
            s.actionError = payload;
        }
    }
};
if (module.hot) {
    module.hot.decline();
}
