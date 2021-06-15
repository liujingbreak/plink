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
            doAction.type = actionCreator.type;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRDs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixxREFBc0U7QUFDdEUsNkJBQTZGO0FBQzdGLDRDQUE4RztBQW1COUcsU0FBZ0IsZUFBZTtJQUFzQix3QkFBbUQ7U0FBbkQsVUFBbUQsRUFBbkQscUJBQW1ELEVBQW5ELElBQW1EO1FBQW5ELG1DQUFtRDs7SUFFdEcsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxDQUFRLENBQUM7QUFDM0QsQ0FBQztBQUhELDBDQUdDO0FBTUQsSUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0YsQ0FBQztBQWVGO0lBd0JFLHNCQUFvQixjQUF1RDtRQUEzRSxpQkFpQkM7UUFqQm1CLG1CQUFjLEdBQWQsY0FBYyxDQUF5QztRQWpCM0UsV0FBTSxHQUFHLElBQUksc0JBQWUsQ0FBcUQsU0FBUyxDQUFDLENBQUM7UUFJNUY7O1dBRUc7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBR3RELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUF5T3hDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMsSUFBSTtnQkFDVixPQUFPLFVBQUMs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LE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLCBDYXNlUmVkdWNlckFjdGlvbnMsXG4gIENvbmZpZ3VyZVN0b3JlT3B0aW9ucywgY3JlYXRlU2xpY2UgYXMgcmVkdXhDcmVhdGVTbGljZSwgQ3JlYXRlU2xpY2VPcHRpb25zLFxuICBEcmFmdCwgRW5oYW5jZWRTdG9yZSwgUGF5bG9hZEFjdGlvbiwgUmVkdWNlcnNNYXBPYmplY3QsXG4gIFNsaWNlLCBTbGljZUNhc2VSZWR1Y2VycywgUmVkdWNlciwgUGF5bG9hZEFjdGlvbkNyZWF0b3IsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmUsIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZFxufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IGNyZWF0ZUVwaWNNaWRkbGV3YXJlLCBFcGljLCBvZlR5cGUgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgUmVwbGF5U3ViamVjdCwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZVVudGlsLCB0YXAsIGNhdGNoRXJyb3J9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHtQYXlsb2FkQWN0aW9uLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2V9O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4ge1xuICBfaW5pdDogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248e2lzTGF6eTogYm9vbGVhbn0+PjtcbiAgX2NoYW5nZTogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLFxuICBBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4+ID0gVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VyczxTUywgQUNSPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz47XG5cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFQxIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UDEsIFQxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMiwgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UDEgfCBQMiwgVDEgfCBUMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFAzLCBUMSBleHRlbmRzIHN0cmluZywgVDIgZXh0ZW5kcyBzdHJpbmcsIFQzIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LFxuICBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+LCBhY3Rpb25DcmVhdG9yczM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMywgVDM+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UDEgfCBQMiB8IFAzLCBUMSB8IFQyIHwgVDM+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UCwgVCBleHRlbmRzIHN0cmluZz4oLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPltdKTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UCwgVD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKSBhcyBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4pICZcbiAgICBFeHRyYVNsaWNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4sXG4gIHN0cmluZz47XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPlsnYWN0aW9ucyddO1xuXG5leHBvcnQgY2xhc3MgU3RhdGVGYWN0b3J5IHtcbiAgLyoqXG4gICAqIFdoeSBJIGRvbid0IHVzZSBFcGljJ3Mgc3RhdGUkIHBhcmFtZXRlcjpcbiAgICogXG4gICAqIFJlZHV4LW9ic2VydmFibGUncyBzdGF0ZSQgZG9lcyBub3Qgbm90aWZ5IHN0YXRlIGNoYW5nZSBldmVudCB3aGVuIGEgbGF6eSBsb2FkZWQgKHJlcGxhY2VkKSBzbGljZSBpbml0aWFsaXplIHN0YXRlIFxuICAgKi9cbiAgcmVhbHRpbWVTdGF0ZSQ6IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPjtcbiAgc3RvcmUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgbG9nJDogT2JzZXJ2YWJsZTxhbnlbXT47XG5cbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICAvKipcbiAgICogc2FtZSBhcyBzdG9yZS5kaXNwYXRjaChhY3Rpb24pLCBidXQgdGhpcyBvbmUgZ29lcyB0aHJvdWdoIFJlZHV4LW9ic2VydmFibGUncyBlcGljIG1pZGRsZXdhcmVcbiAgICovXG4gIGFjdGlvbnNUb0Rpc3BhdGNoID0gbmV3IFJlcGxheVN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnk+PigyMCk7XG4gIHJlcG9ydEFjdGlvbkVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcbiAgcHJpdmF0ZSBkZWJ1Z0xvZyA9IG5ldyBSZXBsYXlTdWJqZWN0PGFueVtdPigxNSk7XG4gIHByaXZhdGUgcmVkdWNlck1hcDogUmVkdWNlcnNNYXBPYmplY3Q8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+O1xuICBwcml2YXRlIGVwaWNXaXRoVW5zdWIkOiBTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+O1xuICBwcml2YXRlIGVycm9yU2xpY2U6IEluZmVyU2xpY2VUeXBlPHR5cGVvZiBlcnJvclNsaWNlT3B0PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ10pIHtcbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyKHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCkgYXMgUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbj4+O1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuXG4gIH1cblxuICAvLyBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSk6IHRoaXM7XG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIG9wdCBCZSBhd2FyZSwgdHVybiBvZmYgb3B0aW9uIFwic2VyaWFsaXphYmxlQ2hlY2tcIiBhbmQgXCJpbW11dGFibGVDaGVja1wiIGZyb20gUmVkdXggZGVmYXVsdCBtaWRkbGV3YXJlc1xuICAgKi9cbiAgY29uZmlndXJlU3RvcmUob3B0Pzoge1trZXkgaW4gRXhjbHVkZTwncmVkdWNlcicsIGtleW9mIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+Pj5dOiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj5ba2V5XX0pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgbGV0IGNmZ09wdCA9IG9wdCBhcyBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj47XG4gICAgY29uc3Qgb3VyTWlkZGx3YXJlcyA9IFt0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgZXBpY01pZGRsZXdhcmVdO1xuICAgIGlmIChjZmdPcHQpIHtcbiAgICAgIGNmZ09wdC5yZWR1Y2VyID0gcm9vdFJlZHVjZXI7XG4gICAgICBjZmdPcHQuZGV2VG9vbHMgPSBmYWxzZTtcbiAgICAgIGlmIChjZmdPcHQubWlkZGxld2FyZSkge1xuICAgICAgICBjb25zdCBleGl0aW5nTWlkID0gY2ZnT3B0Lm1pZGRsZXdhcmU7XG4gICAgICAgIGlmICh0eXBlb2YgZXhpdGluZ01pZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBbLi4uZXhpdGluZ01pZChnZXREZWZhdWx0KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IFsuLi5leGl0aW5nTWlkLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNmZ09wdCA9IHtcbiAgICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAgIG1pZGRsZXdhcmUoZ2V0RGVmYXVsdCkge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH0sXG4gICAgICAgIGRldlRvb2xzOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlKGNmZ09wdCk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIHRhcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGBdKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgLy8gdGFwKGFjdGlvbiA9PiBjb25zb2xlLmxvZygnYWN0aW9uOiAnLCBhY3Rpb24udHlwZSkpLFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIHRhcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gdW5zdWJzY3JpYmUgJHtlcGljSWR9YCk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9LCAnaW50ZXJuYWxEaXNwYXRjaGVyJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPiB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFMsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCBkZWZhdWx0U2xpY2VSZWR1Y2Vycyk7XG5cbiAgICBpZiAocmVkdWNlcnMuX2luaXQgPT0gbnVsbCkge1xuICAgICAgcmVkdWNlcnMuX2luaXQgPSAoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFMgPSBhbnk+KGVwaWM6IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIFM+LCBlcGljTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyAoZXBpY05hbWUgfHwgKyt0aGlzLmVwaWNTZXEpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhZGRlZGBdKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIGVwaWNJZCwgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIFN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZ2V0RXJyb3JTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0YXRlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBnZXRFcnJvclN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RvcmUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGRpc3BhdGNoPFQ+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxUPikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdkaXNwYXRjaCcsIGFjdGlvbi50eXBlKTtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+KHNsaWNlOiB7YWN0aW9uczogQ2FzZVJlZHVjZXJBY3Rpb25zPENhc2VSZWR1Y2Vycz59KVxuICAgIDogQ2FzZVJlZHVjZXJBY3Rpb25zPENhc2VSZWR1Y2Vycz4ge1xuXG4gICAgY29uc3QgYWN0aW9uTWFwID0ge30gYXMgQ2FzZVJlZHVjZXJBY3Rpb25zPENhc2VSZWR1Y2Vycz47XG4gICAgZm9yIChjb25zdCBbbmFtZSwgYWN0aW9uQ3JlYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2xpY2UuYWN0aW9ucykpIHtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSAoYWN0aW9uQ3JlYXRvciBhcyBhbnkpKC4uLnBhcmFtKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xuICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgfTtcbiAgICAgIChkb0FjdGlvbiBhcyBhbnkpLnR5cGUgPSAoYWN0aW9uQ3JlYXRvciBhcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcikudHlwZTtcbiAgICAgIGFjdGlvbk1hcFtuYW1lIGFzIGtleW9mIENhc2VSZWR1Y2Vyc10gPSBkb0FjdGlvbiBhcyBhbnk7XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXA7XG4gIH1cblxuICBzdG9wQWxsRXBpY3MoKSB7XG4gICAgdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIHRhcChzdG9yZSA9PiB7XG4gICAgICAgIGlmIChzdG9yZSlcbiAgICAgICAgICBzdG9yZS5kaXNwYXRjaCh7cGF5bG9hZDogbnVsbCwgdHlwZTogJ1NUT1BfRVBJQyd9KTtcbiAgICAgIH0pLFxuICAgICAgdGFrZSgxKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBnZXRSb290U3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RvcmUkLmdldFZhbHVlKCk7XG4gIH1cblxuICBwcml2YXRlIGVycm9ySGFuZGxlTWlkZGxld2FyZTogTWlkZGxld2FyZSA9IChhcGkpID0+IHtcbiAgICByZXR1cm4gKG5leHQpID0+IHtcbiAgICAgIHJldHVybiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2FjdGlvbiBpbiBlcnJvckhhbmRsZU1pZGRsZXdhcmUnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uICE9IG51bGwgPyBhY3Rpb24udHlwZSA6IGFjdGlvbl0pO1xuICAgICAgICAgIGNvbnN0IHJldCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGZhaWxlZCBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gYWN0aW9uIGRpc3BhdGNoIGVycm9yJywgZXJyKTtcbiAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVycik7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSxcbiAgICBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPiB7XG4gICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFBheWxvYWRDYXNlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IHtcbiAgW1QgaW4ga2V5b2YgUl06IFJbVF0gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgP1xuICAgIChzdGF0ZTogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbVF0gZXh0ZW5kcyAoczogYW55LCBhY3Rpb246IFBheWxvYWRBY3Rpb248aW5mZXIgUD4pID0+IGFueSA/XG4gICAgICAoc3RhdGU6IERyYWZ0PFM+LCBwYXlsb2FkOiBQKSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDogKHN0YXRlOiBEcmFmdDxTPiwgcGF5bG9hZDogdW5rbm93bikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogU2ltcGxpZnkgcmVkdWNlcnMgc3RydWN0dXJlIHJlcXVpcmVkIGluIFNsaWNlIGNyZWF0aW9uIG9wdGlvbi5cbiAqIFxuICogTm9ybWFsbHksIHRvIGNyZWF0ZSBhIHNsaWNlLCB5b3UgbmVlZCB0byBwcm92aWRlIGEgc2xpY2Ugb3B0aW9uIHBhcmFtdGVyIGxpa2U6XG4gKiB7bmFtZTogPG5hbWU+LCBpbml0aWFsU3RhdGU6IDx2YWx1ZT4sIHJlZHVjZXJzOiB7XG4gKiAgY2FzZVJlZHVjZXIoc3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQYXlsb2FkVHlwZT4pIHtcbiAqICAgIC8vIG1hbmlwdWxhdGUgc3RhdGUgZHJhZnQgd2l0aCBkZXN0cnVjdG9yZWQgcGF5bG9hZCBkYXRhXG4gKiAgfVxuICogfX1cbiAqIFxuICogVW5jb252ZW5pZW50IHRoaW5nIGlzIHRoZSBcIlBheWxvYWRBY3Rpb248UGF5bG9hZFR5cGU+XCIgcGFydCB3aGljaCBzcGVjaWZpZWQgYXMgc2Vjb25kIHBhcmFtZXRlciBpbiBldmVyeSBjYXNlIHJlZHVjZXIgZGVmaW5pdGlvbixcbiAqIGFjdHVhbGx5IHdlIG9ubHkgY2FyZSBhYm91dCB0aGUgUGF5bG9hZCB0eXBlIGluc3RlYWQgb2YgdGhlIHdob2xlIFBheWxvYWRBY3Rpb24gaW4gY2FzZSByZWR1Y2VyLlxuICogXG4gKiB0aGlzIGZ1bmN0aW9uIGFjY2VwdCBhIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBcImNhc2UgcmVkdWNlclwiIGluIGZvcm0gb2Y6IFxuICoge1xuICogICAgW2Nhc2VOYW1lXTogKERyYWZ0PFN0YXRlPiwgcGF5bG9hZDogYW55KSA9PiBEcmFmdDxTdGF0ZT4gfCB2b2lkO1xuICogfVxuICogXG4gKiByZXR1cm4gYSByZWd1bGFyIENhc2UgcmVkdWNlcnMsIG5vdCBsb25nZXIgbmVlZHMgdG8gXCJkZXN0cnVjdG9yXCIgYWN0aW9uIHBhcmFtdGVyIHRvIGdldCBwYXlsb2FkIGRhdGEuXG4gKiBcbiAqIEBwYXJhbSBwYXlsb2FkUmVkdWNlcnMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21QYXlsb2RSZWR1Y2VyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4ocGF5bG9hZFJlZHVjZXJzOiBQYXlsb2FkQ2FzZVJlZHVjZXJzPFMsIFI+KTpcbiAgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddIHtcbiAgY29uc3QgcmVkdWNlcnMgPSB7fSBhcyBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ107XG4gIGZvciAoY29uc3QgW2Nhc2VOYW1lLCBzaW1wbGVSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhwYXlsb2FkUmVkdWNlcnMpKSB7XG4gICAgcmVkdWNlcnNbY2FzZU5hbWUgYXMga2V5b2YgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddXSA9IGZ1bmN0aW9uKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248YW55Pikge1xuICAgICAgcmV0dXJuIHNpbXBsZVJlZHVjZXIocywgYWN0aW9uLnBheWxvYWQpO1xuICAgIH0gYXMgYW55O1xuICB9XG4gIHJldHVybiByZWR1Y2Vycztcbn1cblxuY29uc3QgZXJyb3JTbGljZU9wdCA9IHtcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyBFcnJvclN0YXRlLFxuICBuYW1lOiAnZXJyb3InLFxuICByZWR1Y2Vyczoge1xuICAgIHJlcG9ydEFjdGlvbkVycm9yKHM6IEVycm9yU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxFcnJvcj4pIHtcbiAgICAgIHMuYWN0aW9uRXJyb3IgPSBwYXlsb2FkO1xuICAgIH1cbiAgfVxufTtcblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=