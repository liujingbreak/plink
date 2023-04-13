"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromPaylodReducer = exports.StateFactory = exports.ofPayloadAction = void 0;
/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// eslint-disable  max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
const toolkit_1 = require("@reduxjs/toolkit");
const redux_observable_1 = require("redux-observable");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function ofPayloadAction(...actionCreators) {
    return (0, redux_observable_1.ofType)(...actionCreators.map(c => c.type));
}
exports.ofPayloadAction = ofPayloadAction;
const defaultSliceReducers = {
    _change: (state, action) => {
        action.payload(state);
    }
};
class StateFactory {
    constructor(preloadedState) {
        this.preloadedState = preloadedState;
        this.store$ = new rxjs_1.BehaviorSubject(undefined);
        /**
         * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        this.sliceStoreMap = new Map();
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
        this.realtimeState$ = new rxjs_1.BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new rxjs_1.ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe((0, operators_1.filter)(store => store != null), (0, operators_1.take)(1)).toPromise();
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
        const epicMiddleware = (0, redux_observable_1.createEpicMiddleware)();
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
        const store = (0, toolkit_1.configureStore)(cfgOpt);
        this.store$.next(store);
        store.subscribe(() => {
            const state = store.getState();
            this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe((0, operators_1.distinctUntilChanged)(), 
        // tap(() => console.log('state changed')),
        (0, operators_1.tap)(state => this.debugLog.next(['state', state]))).subscribe();
        epicMiddleware.run((action$, state$, dependencies) => {
            return this.epicWithUnsub$.pipe((0, operators_1.tap)(([epic, epicId, unsub]) => {
                this.debugLog.next([`[redux-toolkit-obs] ${epicId} is about to be subscribed`]);
                // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
            }), (0, operators_1.mergeMap)(([epic, epicId, unsub]) => (epic(action$, state$, dependencies))
                .pipe(
            // tap(action => console.log('action: ', action.type)),
            (0, operators_1.takeUntil)(unsub.pipe((0, operators_1.take)(1), (0, operators_1.map)(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
                // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
            }))), (0, operators_1.catchError)((err, src) => {
                this.reportActionError(err);
                console.error(err);
                return src;
            }))), (0, operators_1.takeUntil)(action$.pipe((0, redux_observable_1.ofType)('STOP_EPIC'), (0, operators_1.tap)(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics'])))));
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
    // eslint-disable-next-line @typescript-eslint/ban-types
    newSlice(opt) {
        var _a;
        const _opt = opt;
        const reducers = _opt.reducers;
        if (reducers._change == null)
            Object.assign(_opt.reducers, defaultSliceReducers);
        if (reducers._init == null) {
            reducers._init = (draft, action) => {
                this.debugLog.next(['[redux-toolkit-obs]', `slice "${opt.name}" is created ${action.payload.isLazy ? 'lazily' : ''}`]);
            };
        }
        if ((_a = this.preloadedState) === null || _a === void 0 ? void 0 : _a[opt.name]) {
            Object.assign(opt.initialState, this.preloadedState[opt.name]);
        }
        const slice = (0, toolkit_1.createSlice)(opt);
        this.addSliceMaybeReplaceReducer(slice);
        const slicedStore = this.realtimeState$.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        (0, operators_1.map)(s => s[opt.name]), (0, operators_1.filter)(ss => ss != null), (0, operators_1.distinctUntilChanged)());
        this.sliceStoreMap.set(opt.name, slicedStore);
        return slice;
    }
    removeSlice(slice) {
        delete this.reducerMap[slice.name];
        if (this.getRootStore()) {
            this.debugLog.next(['[redux-toolkit-obs]', 'remove slice ' + slice.name]);
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
            this.sliceStoreMap.delete(slice.name);
        }
    }
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    addEpic(epic, epicName) {
        const epicId = 'Epic-' + (epicName || ++this.epicSeq);
        const unsubscribeEpic = new rxjs_1.Subject();
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
        return this.sliceStoreMap.get(slice.name);
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
        this.store$.pipe((0, operators_1.tap)(store => {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), (0, operators_1.take)(1)).subscribe();
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
        const combined = (0, toolkit_1.combineReducers)(this.reducerMap);
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
exports.StateFactory = StateFactory;
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
function fromPaylodReducer(payloadReducers) {
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
exports.fromPaylodReducer = fromPaylodReducer;
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
//# sourceMappingURL=redux-toolkit-observable.js.map