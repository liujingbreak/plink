"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromPaylodReducer = exports.StateFactory = exports.ofPayloadAction = void 0;
/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// tslint:disable: max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
var toolkit_1 = require("@reduxjs/toolkit");
var redux_observable_1 = require("redux-observable");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
function ofPayloadAction() {
    var actionCreators = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        actionCreators[_i] = arguments[_i];
    }
    return redux_observable_1.ofType.apply(void 0, actionCreators.map(function (c) { return c.type; }));
}
exports.ofPayloadAction = ofPayloadAction;
var defaultSliceReducers = {
    _change: function (state, action) {
        action.payload(state);
    }
};
var StateFactory = /** @class */ (function () {
    function StateFactory(preloadedState) {
        var _this = this;
        this.preloadedState = preloadedState;
        this.store$ = new rxjs_1.BehaviorSubject(undefined);
        /**
         * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        this.errorHandleMiddleware = function (api) {
            return function (next) {
                return function (action) {
                    try {
                        // console.log('action in errorHandleMiddleware', action.type);
                        _this.debugLog.next(['action', action != null ? action.type : action]);
                        var ret = next(action);
                        return ret;
                    }
                    catch (err) {
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] failed action', action);
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] action dispatch error', err);
                        _this.reportActionError(err);
                        throw err;
                    }
                };
            };
        };
        this.realtimeState$ = new rxjs_1.BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new rxjs_1.ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(operators_1.filter(function (store) { return store != null; }), operators_1.take(1)).toPromise();
        var errorSlice = this.newSlice(errorSliceOpt);
        this.errorSlice = errorSlice;
        this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
    }
    // configureStore(middlewares?: Middleware[]): this;
    /**
     *
     * @param opt Be aware, turn off option "serializableCheck" and "immutableCheck" from Redux default middlewares
     */
    StateFactory.prototype.configureStore = function (opt) {
        var _this = this;
        if (this.store$.getValue())
            return this;
        var rootReducer = this.createRootReducer();
        var epicMiddleware = redux_observable_1.createEpicMiddleware();
        var cfgOpt = opt;
        var ourMiddlwares = [this.errorHandleMiddleware, epicMiddleware];
        if (cfgOpt) {
            cfgOpt.reducer = rootReducer;
            cfgOpt.devTools = false;
            if (cfgOpt.middleware) {
                var exitingMid_1 = cfgOpt.middleware;
                if (typeof exitingMid_1 === 'function') {
                    cfgOpt.middleware = function (getDefault) {
                        return __spreadArrays(exitingMid_1(getDefault), ourMiddlwares);
                    };
                }
                else {
                    cfgOpt.middleware = __spreadArrays(exitingMid_1, ourMiddlwares);
                }
            }
            else {
                cfgOpt.middleware = function (getDefault) {
                    return __spreadArrays(getDefault({ serializableCheck: false, immutableCheck: false }), ourMiddlwares);
                };
            }
        }
        else {
            cfgOpt = {
                reducer: rootReducer,
                middleware: function (getDefault) {
                    return __spreadArrays(getDefault({ serializableCheck: false, immutableCheck: false }), ourMiddlwares);
                },
                devTools: false
            };
        }
        var store = toolkit_1.configureStore(cfgOpt);
        this.store$.next(store);
        store.subscribe(function () {
            var state = store.getState();
            _this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe(operators_1.distinctUntilChanged(), 
        // tap(() => console.log('state changed')),
        operators_1.tap(function (state) { return _this.debugLog.next(['state', state]); })).subscribe();
        epicMiddleware.run(function (action$, state$, dependencies) {
            return _this.epicWithUnsub$.pipe(operators_1.tap(function (_a) {
                var epic = _a[0], epicId = _a[1], unsub = _a[2];
                _this.debugLog.next(["[redux-toolkit-obs] " + epicId + " is about to be subscribed"]);
                // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
            }), operators_1.mergeMap(function (_a) {
                var epic = _a[0], epicId = _a[1], unsub = _a[2];
                return (epic(action$, state$, dependencies))
                    .pipe(
                // tap(action => console.log('action: ', action.type)),
                operators_1.takeUntil(unsub.pipe(operators_1.take(1), operators_1.tap(function (epicId) {
                    _this.debugLog.next(['[redux-toolkit-obs]', "unsubscribe from " + epicId]);
                    // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
                }))), operators_1.catchError(function (err, src) {
                    _this.reportActionError(err);
                    console.error(err);
                    return src;
                }));
            }), operators_1.takeUntil(action$.pipe(redux_observable_1.ofType('STOP_EPIC'), operators_1.tap(function () { return _this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics']); }))));
        });
        this.addEpic(function (action$) {
            return _this.actionsToDispatch;
        }, 'internalDispatcher');
        return this;
    };
    /**
     * Create our special slice with a default reducer action:
     * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
     * - initialState is loaded from StateFactory's partial preloadedState
     */
    StateFactory.prototype.newSlice = function (opt) {
        var _this = this;
        var _opt = opt;
        var reducers = _opt.reducers;
        if (reducers._change == null)
            Object.assign(_opt.reducers, defaultSliceReducers);
        if (reducers._init == null) {
            reducers._init = function (draft, action) {
                _this.debugLog.next(['[redux-toolkit-obs]', "slice \"" + opt.name + "\" is created " + (action.payload.isLazy ? 'lazily' : '')]);
            };
        }
        if (this.preloadedState && this.preloadedState[opt.name]) {
            Object.assign(opt.initialState, this.preloadedState[opt.name]);
        }
        var slice = toolkit_1.createSlice(opt);
        this.addSliceMaybeReplaceReducer(slice);
        return slice;
    };
    StateFactory.prototype.removeSlice = function (slice) {
        delete this.reducerMap[slice.name];
        if (this.getRootStore()) {
            this.debugLog.next(['[redux-toolkit-obs]', 'remove slice ' + slice.name]);
            var newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
        }
    };
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    StateFactory.prototype.addEpic = function (epic, epicName) {
        var epicId = 'Epic-' + (epicName || ++this.epicSeq);
        var unsubscribeEpic = new rxjs_1.Subject();
        this.debugLog.next(["[redux-toolkit-obs] " + epicId + " is added"]);
        this.epicWithUnsub$.next([epic, epicId, unsubscribeEpic]);
        return function () {
            unsubscribeEpic.next(epicId);
            unsubscribeEpic.complete();
        };
    };
    StateFactory.prototype.sliceState = function (slice) {
        var store = this.getRootStore();
        return store ? store.getState()[slice.name] : {};
    };
    StateFactory.prototype.sliceStore = function (slice) {
        return this.realtimeState$.pipe(operators_1.map(function (s) { return s[slice.name]; }), operators_1.filter(function (ss) { return ss != null; }), operators_1.distinctUntilChanged());
    };
    StateFactory.prototype.getErrorState = function () {
        return this.sliceState(this.errorSlice);
    };
    StateFactory.prototype.getErrorStore = function () {
        return this.sliceStore(this.errorSlice);
    };
    StateFactory.prototype.dispatch = function (action) {
        // console.log('dispatch', action.type);
        this.actionsToDispatch.next(action);
    };
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    StateFactory.prototype.bindActionCreators = function (slice) {
        var _this = this;
        var actionMap = {};
        var _loop_1 = function (name_1, actionCreator) {
            var doAction = function () {
                var param = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    param[_i] = arguments[_i];
                }
                var action = actionCreator.apply(void 0, param);
                _this.dispatch(action);
                return action;
            };
            actionMap[name_1] = doAction;
        };
        for (var _i = 0, _a = Object.entries(slice.actions); _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], actionCreator = _b[1];
            _loop_1(name_1, actionCreator);
        }
        return actionMap;
    };
    StateFactory.prototype.stopAllEpics = function () {
        this.store$.pipe(operators_1.tap(function (store) {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), operators_1.take(1)).subscribe();
    };
    StateFactory.prototype.getRootStore = function () {
        return this.store$.getValue();
    };
    StateFactory.prototype.addSliceMaybeReplaceReducer = function (slice) {
        this.reducerMap[slice.name] = slice.reducer;
        if (this.getRootStore()) {
            var newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
            this.dispatch(slice.actions._init({ isLazy: true }));
        }
        else {
            this.dispatch(slice.actions._init({ isLazy: false }));
        }
        return slice;
    };
    StateFactory.prototype.createRootReducer = function () {
        return toolkit_1.combineReducers(this.reducerMap);
    };
    return StateFactory;
}());
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
    var reducers = {};
    var _loop_2 = function (caseName, simpleReducer) {
        reducers[caseName] = function (s, action) {
            return simpleReducer(s, action.payload);
        };
    };
    for (var _i = 0, _a = Object.entries(payloadReducers); _i < _a.length; _i++) {
        var _b = _a[_i], caseName = _b[0], simpleReducer = _b[1];
        _loop_2(caseName, simpleReducer);
    }
    return reducers;
}
exports.fromPaylodReducer = fromPaylodReducer;
var errorSliceOpt = {
    initialState: {},
    name: 'error',
    reducers: {
        reportActionError: function (s, _a) {
            var payload = _a.payload;
            s.actionError = payload;
        }
    }
};
if (module.hot) {
    module.hot.decline();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRDs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixxREFBc0U7QUFDdEUsNkJBQTJFO0FBQzNFLDRDQUErRztBQW1CL0csU0FBZ0IsZUFBZTtJQUFzQix3QkFBbUQ7U0FBbkQsVUFBbUQsRUFBbkQscUJBQW1ELEVBQW5ELElBQW1EO1FBQW5ELG1DQUFtRDs7SUFFdEcsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxDQUFRLENBQUM7QUFDM0QsQ0FBQztBQUhELDBDQUdDO0FBc0JELElBQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxNQUFNO1FBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNGLENBQUM7QUFlRjtJQXdCRSxzQkFBb0IsY0FBdUQ7UUFBM0UsaUJBaUJDO1FBakJtQixtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFqQjNFLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSTVGOztXQUVHO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxvQkFBYSxDQUFxQixFQUFFLENBQUMsQ0FBQztRQUd0RCxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUNqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBdU94QywwQkFBcUIsR0FBZSxVQUFDLEdBQUc7WUFDOUMsT0FBTyxVQUFDLElBQUk7Z0JBQ1YsT0FBTyxVQUFD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QUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmUsIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZFxufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IGNyZWF0ZUVwaWNNaWRkbGV3YXJlLCBFcGljLCBvZlR5cGUgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgUmVwbGF5U3ViamVjdCwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZVVudGlsLCB0YXAsIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB7UGF5bG9hZEFjdGlvbiwgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlfTtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBUMSBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPik6XG4gIChzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFAxLCBUMT4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFQxIGV4dGVuZHMgc3RyaW5nLCBUMiBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPiwgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPik6XG4oc291cmNlOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxQMSB8IFAyLCBUMSB8IFQyPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMiwgUDMsIFQxIGV4dGVuZHMgc3RyaW5nLCBUMiBleHRlbmRzIHN0cmluZywgVDMgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4sXG4gIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAyLCBUMj4sIGFjdGlvbkNyZWF0b3JzMzogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAzLCBUMz4pOlxuKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UDEgfCBQMiB8IFAzLCBUMSB8IFQyIHwgVDM+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UCwgVCBleHRlbmRzIHN0cmluZz4oLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPltdKTpcbiAgKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UCwgVD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKSBhcyBhbnk7XG59XG5cbi8vIHR5cGUgQWN0aW9uVHlwZTxBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+LCBUIGV4dGVuZHMga2V5b2YgQUNSPiA9IEFDUltUXSBleHRlbmRzIChzdGF0ZTogYW55LCBhY3Rpb246IGluZmVyIEFjdGlvbikgPT4gYW55ID8gQWN0aW9uIDogdm9pZDtcbi8vIC8qKlxuLy8gICogVW5saW5rIFJlZHV4LW9ic2VydmFibGUgb2ZmaWNpYWwncyBvZlR5cGUoKSBmdW5jdGlvbiwgaXQgb2ZmZXJzIGJldHRlciB0eXBlIGludGVyZW5jZSBvblxuLy8gICogcGF5bG9hZCB0eXBlXG4vLyAgKi9cbi8vIGV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48QUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8YW55Pj4ge1xuLy8gICA8VDEgZXh0ZW5kcyBrZXlvZiBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPGFueSwgQUNSPj4oYWN0aW9uVHlwZTogVDEpOlxuLy8gICAgIChzcmM6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlPEFDUiwgVDE+Pjtcbi8vICAgPFQxIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4sIFQyIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4+KFxuLy8gICAgIGFjdGlvblR5cGU6IFQxLCBhY3Rpb25UeXBlMjogVDIpOlxuLy8gICAoc3JjOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZTxBQ1IsIFQxIHwgVDI+Pjtcbi8vICAgPFQxIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4sIFQyIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4sIFQzIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4+KGFjdGlvblR5cGU6IFQxLCBhY3Rpb25UeXBlMjogVDIsIGFjdGlvblR5cGUzOiBUMyk6XG4vLyAgIChzcmM6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlPEFDUiwgVDEgfCBUMiB8IFQzPj47XG4vLyAgIDxUIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4+KC4uLmFjdGlvblR5cGVzOiBUW10pOiBPYnNlcnZhYmxlPEFjdGlvblR5cGU8QUNSLCBUPj47XG4vLyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4pICZcbiAgICBFeHRyYVNsaWNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4sXG4gIHN0cmluZz47XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPlsnYWN0aW9ucyddO1xuXG5leHBvcnQgY2xhc3MgU3RhdGVGYWN0b3J5IHtcbiAgLyoqXG4gICAqIFdoeSBJIGRvbid0IHVzZSBFcGljJ3Mgc3RhdGUkIHBhcmFtZXRlcjpcbiAgICogXG4gICAqIFJlZHV4LW9ic2VydmFibGUncyBzdGF0ZSQgZG9lcyBub3Qgbm90aWZ5IHN0YXRlIGNoYW5nZSBldmVudCB3aGVuIGEgbGF6eSBsb2FkZWQgKHJlcGxhY2VkKSBzbGljZSBpbml0aWFsaXplIHN0YXRlIFxuICAgKi9cbiAgcmVhbHRpbWVTdGF0ZSQ6IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPjtcbiAgc3RvcmUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgbG9nJDogT2JzZXJ2YWJsZTxhbnlbXT47XG5cbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICAvKipcbiAgICogc2FtZSBhcyBzdG9yZS5kaXNwYXRjaChhY3Rpb24pLCBidXQgdGhpcyBvbmUgZ29lcyB0aHJvdWdoIFJlZHV4LW9ic2VydmFibGUncyBlcGljIG1pZGRsZXdhcmVcbiAgICovXG4gIGFjdGlvbnNUb0Rpc3BhdGNoID0gbmV3IFJlcGxheVN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnk+PigyMCk7XG4gIHJlcG9ydEFjdGlvbkVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcbiAgcHJpdmF0ZSBkZWJ1Z0xvZyA9IG5ldyBSZXBsYXlTdWJqZWN0PGFueVtdPigxNSk7XG4gIHByaXZhdGUgcmVkdWNlck1hcDogUmVkdWNlcnNNYXBPYmplY3Q8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+O1xuICBwcml2YXRlIGVwaWNXaXRoVW5zdWIkOiBTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+O1xuICBwcml2YXRlIGVycm9yU2xpY2U6IEluZmVyU2xpY2VUeXBlPHR5cGVvZiBlcnJvclNsaWNlT3B0PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ10pIHtcbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyKHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCkgYXMgUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbj4+O1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuXG4gIH1cblxuICAvLyBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSk6IHRoaXM7XG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIG9wdCBCZSBhd2FyZSwgdHVybiBvZmYgb3B0aW9uIFwic2VyaWFsaXphYmxlQ2hlY2tcIiBhbmQgXCJpbW11dGFibGVDaGVja1wiIGZyb20gUmVkdXggZGVmYXVsdCBtaWRkbGV3YXJlc1xuICAgKi9cbiAgY29uZmlndXJlU3RvcmUob3B0Pzoge1trZXkgaW4gRXhjbHVkZTwncmVkdWNlcicsIGtleW9mIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+Pj5dOiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj5ba2V5XX0pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgbGV0IGNmZ09wdCA9IG9wdCBhcyBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj47XG4gICAgY29uc3Qgb3VyTWlkZGx3YXJlcyA9IFt0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgZXBpY01pZGRsZXdhcmVdO1xuICAgIGlmIChjZmdPcHQpIHtcbiAgICAgIGNmZ09wdC5yZWR1Y2VyID0gcm9vdFJlZHVjZXI7XG4gICAgICBjZmdPcHQuZGV2VG9vbHMgPSBmYWxzZTtcbiAgICAgIGlmIChjZmdPcHQubWlkZGxld2FyZSkge1xuICAgICAgICBjb25zdCBleGl0aW5nTWlkID0gY2ZnT3B0Lm1pZGRsZXdhcmU7XG4gICAgICAgIGlmICh0eXBlb2YgZXhpdGluZ01pZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBbLi4uZXhpdGluZ01pZChnZXREZWZhdWx0KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IFsuLi5leGl0aW5nTWlkLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNmZ09wdCA9IHtcbiAgICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAgIG1pZGRsZXdhcmUoZ2V0RGVmYXVsdCkge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH0sXG4gICAgICAgIGRldlRvb2xzOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlKGNmZ09wdCk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIHRhcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGBdKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgLy8gdGFwKGFjdGlvbiA9PiBjb25zb2xlLmxvZygnYWN0aW9uOiAnLCBhY3Rpb24udHlwZSkpLFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIHRhcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gdW5zdWJzY3JpYmUgJHtlcGljSWR9YCk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9LCAnaW50ZXJuYWxEaXNwYXRjaGVyJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPiB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFMsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCBkZWZhdWx0U2xpY2VSZWR1Y2Vycyk7XG5cbiAgICBpZiAocmVkdWNlcnMuX2luaXQgPT0gbnVsbCkge1xuICAgICAgcmVkdWNlcnMuX2luaXQgPSAoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFMgPSBhbnk+KGVwaWM6IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIFM+LCBlcGljTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyAoZXBpY05hbWUgfHwgKyt0aGlzLmVwaWNTZXEpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhZGRlZGBdKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIGVwaWNJZCwgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIFN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZ2V0RXJyb3JTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0YXRlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBnZXRFcnJvclN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RvcmUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGRpc3BhdGNoPFQ+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxUPikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdkaXNwYXRjaCcsIGFjdGlvbi50eXBlKTtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPEEsIFNsaWNlIGV4dGVuZHMge2FjdGlvbnM6IEF9PihzbGljZTogU2xpY2UpOiBTbGljZVsnYWN0aW9ucyddIHtcblxuICAgIGNvbnN0IGFjdGlvbk1hcCA9IHt9IGFzIHR5cGVvZiBzbGljZS5hY3Rpb25zO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBkb0FjdGlvbiA9ICguLi5wYXJhbTogYW55W10pID0+IHtcbiAgICAgICAgY29uc3QgYWN0aW9uID0gKGFjdGlvbkNyZWF0b3IgYXMgYW55KSguLi5wYXJhbSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICAgIH07XG4gICAgICBhY3Rpb25NYXBbbmFtZV0gPSBkb0FjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbk1hcCBhcyBTbGljZVsnYWN0aW9ucyddO1xuICB9XG5cbiAgc3RvcEFsbEVwaWNzKCkge1xuICAgIHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICB0YXAoc3RvcmUgPT4ge1xuICAgICAgICBpZiAoc3RvcmUpXG4gICAgICAgICAgc3RvcmUuZGlzcGF0Y2goe3BheWxvYWQ6IG51bGwsIHR5cGU6ICdTVE9QX0VQSUMnfSk7XG4gICAgICB9KSxcbiAgICAgIHRha2UoMSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZ2V0Um9vdFN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlcnJvckhhbmRsZU1pZGRsZXdhcmU6IE1pZGRsZXdhcmUgPSAoYXBpKSA9PiB7XG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XG4gICAgICByZXR1cm4gKGFjdGlvbjogUGF5bG9hZEFjdGlvbikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdhY3Rpb24gaW4gZXJyb3JIYW5kbGVNaWRkbGV3YXJlJywgYWN0aW9uLnR5cGUpO1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbiAhPSBudWxsID8gYWN0aW9uLnR5cGUgOiBhY3Rpb25dKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXI8U3RhdGUsXG4gICAgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICAgICkge1xuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IHRydWV9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiBmYWxzZX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSb290UmVkdWNlcigpOiBSZWR1Y2VyPGFueSwgUGF5bG9hZEFjdGlvbj4ge1xuICAgIHJldHVybiBjb21iaW5lUmVkdWNlcnModGhpcy5yZWR1Y2VyTWFwKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXlsb2FkQ2FzZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSB7XG4gIFtUIGluIGtleW9mIFJdOiBSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID9cbiAgICAoc3RhdGU6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGluZmVyIFA+KSA9PiBhbnkgP1xuICAgICAgKHN0YXRlOiBEcmFmdDxTPiwgcGF5bG9hZDogUCkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6IChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IHVua25vd24pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIFNpbXBsaWZ5IHJlZHVjZXJzIHN0cnVjdHVyZSByZXF1aXJlZCBpbiBTbGljZSBjcmVhdGlvbiBvcHRpb24uXG4gKiBcbiAqIE5vcm1hbGx5LCB0byBjcmVhdGUgYSBzbGljZSwgeW91IG5lZWQgdG8gcHJvdmlkZSBhIHNsaWNlIG9wdGlvbiBwYXJhbXRlciBsaWtlOlxuICoge25hbWU6IDxuYW1lPiwgaW5pdGlhbFN0YXRlOiA8dmFsdWU+LCByZWR1Y2Vyczoge1xuICogIGNhc2VSZWR1Y2VyKHN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGF5bG9hZFR5cGU+KSB7XG4gKiAgICAvLyBtYW5pcHVsYXRlIHN0YXRlIGRyYWZ0IHdpdGggZGVzdHJ1Y3RvcmVkIHBheWxvYWQgZGF0YVxuICogIH1cbiAqIH19XG4gKiBcbiAqIFVuY29udmVuaWVudCB0aGluZyBpcyB0aGUgXCJQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPlwiIHBhcnQgd2hpY2ggc3BlY2lmaWVkIGFzIHNlY29uZCBwYXJhbWV0ZXIgaW4gZXZlcnkgY2FzZSByZWR1Y2VyIGRlZmluaXRpb24sXG4gKiBhY3R1YWxseSB3ZSBvbmx5IGNhcmUgYWJvdXQgdGhlIFBheWxvYWQgdHlwZSBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBQYXlsb2FkQWN0aW9uIGluIGNhc2UgcmVkdWNlci5cbiAqIFxuICogdGhpcyBmdW5jdGlvbiBhY2NlcHQgYSBzaW1wbGlmaWVkIHZlcnNpb24gb2YgXCJjYXNlIHJlZHVjZXJcIiBpbiBmb3JtIG9mOiBcbiAqIHtcbiAqICAgIFtjYXNlTmFtZV06IChEcmFmdDxTdGF0ZT4sIHBheWxvYWQ6IGFueSkgPT4gRHJhZnQ8U3RhdGU+IHwgdm9pZDtcbiAqIH1cbiAqIFxuICogcmV0dXJuIGEgcmVndWxhciBDYXNlIHJlZHVjZXJzLCBub3QgbG9uZ2VyIG5lZWRzIHRvIFwiZGVzdHJ1Y3RvclwiIGFjdGlvbiBwYXJhbXRlciB0byBnZXQgcGF5bG9hZCBkYXRhLlxuICogXG4gKiBAcGFyYW0gcGF5bG9hZFJlZHVjZXJzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tUGF5bG9kUmVkdWNlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHBheWxvYWRSZWR1Y2VyczogUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSPik6XG4gIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXSB7XG4gIGNvbnN0IHJlZHVjZXJzID0ge30gYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddO1xuICBmb3IgKGNvbnN0IFtjYXNlTmFtZSwgc2ltcGxlUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMocGF5bG9hZFJlZHVjZXJzKSkge1xuICAgIHJlZHVjZXJzW2Nhc2VOYW1lIGFzIGtleW9mIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXV0gPSBmdW5jdGlvbihzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueT4pIHtcbiAgICAgIHJldHVybiBzaW1wbGVSZWR1Y2VyKHMsIGFjdGlvbi5wYXlsb2FkKTtcbiAgICB9IGFzIGFueTtcbiAgfVxuICByZXR1cm4gcmVkdWNlcnM7XG59XG5cbmNvbnN0IGVycm9yU2xpY2VPcHQgPSB7XG4gIGluaXRpYWxTdGF0ZToge30gYXMgRXJyb3JTdGF0ZSxcbiAgbmFtZTogJ2Vycm9yJyxcbiAgcmVkdWNlcnM6IHtcbiAgICByZXBvcnRBY3Rpb25FcnJvcihzOiBFcnJvclN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248RXJyb3I+KSB7XG4gICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICB9XG4gIH1cbn07XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGVjbGluZSgpO1xufVxuIl19