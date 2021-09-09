"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromPaylodReducer = exports.StateFactory = exports.ofPayloadAction = void 0;
/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// eslint-disable  max-line-length member-ordering
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
        this.rootStoreReady = this.store$.pipe((0, operators_1.filter)(function (store) { return store != null; }), (0, operators_1.take)(1)).toPromise();
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
        var epicMiddleware = (0, redux_observable_1.createEpicMiddleware)();
        var cfgOpt = opt;
        var ourMiddlwares = [this.errorHandleMiddleware, epicMiddleware];
        if (cfgOpt) {
            cfgOpt.reducer = rootReducer;
            cfgOpt.devTools = false;
            if (cfgOpt.middleware) {
                var exitingMid_1 = cfgOpt.middleware;
                if (typeof exitingMid_1 === 'function') {
                    cfgOpt.middleware = function (getDefault) {
                        return __spreadArray(__spreadArray([], exitingMid_1(getDefault), true), ourMiddlwares, true);
                    };
                }
                else {
                    cfgOpt.middleware = __spreadArray(__spreadArray([], exitingMid_1, true), ourMiddlwares, true);
                }
            }
            else {
                cfgOpt.middleware = function (getDefault) {
                    return __spreadArray(__spreadArray([], getDefault({ serializableCheck: false, immutableCheck: false }), true), ourMiddlwares, true);
                };
            }
        }
        else {
            cfgOpt = {
                reducer: rootReducer,
                middleware: function (getDefault) {
                    return __spreadArray(__spreadArray([], getDefault({ serializableCheck: false, immutableCheck: false }), true), ourMiddlwares, true);
                },
                devTools: false
            };
        }
        var store = (0, toolkit_1.configureStore)(cfgOpt);
        this.store$.next(store);
        store.subscribe(function () {
            var state = store.getState();
            _this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe((0, operators_1.distinctUntilChanged)(), 
        // tap(() => console.log('state changed')),
        (0, operators_1.tap)(function (state) { return _this.debugLog.next(['state', state]); })).subscribe();
        epicMiddleware.run(function (action$, state$, dependencies) {
            return _this.epicWithUnsub$.pipe((0, operators_1.tap)(function (_a) {
                var epic = _a[0], epicId = _a[1], unsub = _a[2];
                _this.debugLog.next(["[redux-toolkit-obs] " + epicId + " is about to be subscribed"]);
                // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
            }), (0, operators_1.mergeMap)(function (_a) {
                var epic = _a[0], epicId = _a[1], unsub = _a[2];
                return (epic(action$, state$, dependencies))
                    .pipe(
                // tap(action => console.log('action: ', action.type)),
                (0, operators_1.takeUntil)(unsub.pipe((0, operators_1.take)(1), (0, operators_1.map)(function (epicId) {
                    _this.debugLog.next(['[redux-toolkit-obs]', "unsubscribe from " + epicId]);
                    // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
                }))), (0, operators_1.catchError)(function (err, src) {
                    _this.reportActionError(err);
                    console.error(err);
                    return src;
                }));
            }), (0, operators_1.takeUntil)(action$.pipe((0, redux_observable_1.ofType)('STOP_EPIC'), (0, operators_1.tap)(function () { return _this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics']); }))));
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
        var slice = (0, toolkit_1.createSlice)(opt);
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
        return this.realtimeState$.pipe((0, operators_1.map)(function (s) { return s[slice.name]; }), (0, operators_1.filter)(function (ss) { return ss != null; }), (0, operators_1.distinctUntilChanged)());
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
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
        this.store$.pipe((0, operators_1.tap)(function (store) {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), (0, operators_1.take)(1)).subscribe();
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
        var combined = (0, toolkit_1.combineReducers)(this.reducerMap);
        var rootReducer = function (state, action) {
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reducers[caseName] = function (s, action) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsNENBTTBCO0FBQzFCLHFEQUFzRTtBQUN0RSw2QkFBNkY7QUFDN0YsNENBQThHO0FBbUI5RyxTQUFnQixlQUFlO0lBQXNCLHdCQUFtRDtTQUFuRCxVQUFtRCxFQUFuRCxxQkFBbUQsRUFBbkQsSUFBbUQ7UUFBbkQsbUNBQW1EOztJQUV0RyxPQUFPLHlCQUFNLGVBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEVBQU4sQ0FBTSxDQUFDLENBQStDLENBQUM7QUFDbEcsQ0FBQztBQUhELDBDQUdDO0FBTUQsSUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0YsQ0FBQztBQWVGO0lBd0JFLHNCQUFvQixjQUF1RDtRQUEzRSxpQkFnQkM7UUFoQm1CLG1CQUFjLEdBQWQsY0FBYyxDQUF5QztRQWpCM0UsV0FBTSxHQUFHLElBQUksc0JBQWUsQ0FBcUQsU0FBUyxDQUFDLENBQUM7UUFJNUY7O1dBRUc7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBR3RELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUF5T3hDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMsSUFBSTtnQkFDVixPQUFPLFVB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Q0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBWSxDQUFDO1FBQ3JELENBQVEsQ0FBQzs7SUFMWCxLQUF3QyxVQUErQixFQUEvQixLQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQS9CLGNBQStCLEVBQS9CLElBQStCO1FBQTVELElBQUEsV0FBeUIsRUFBeEIsUUFBUSxRQUFBLEVBQUUsYUFBYSxRQUFBO2dCQUF2QixRQUFRLEVBQUUsYUFBYTtLQU1sQztJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFYRCw4Q0FXQztBQUVELElBQU0sYUFBYSxHQUFHO0lBQ3BCLFlBQVksRUFBRSxFQUFnQjtJQUM5QixJQUFJLEVBQUUsT0FBTztJQUNiLFFBQVEsRUFBRTtRQUNSLGlCQUFpQixFQUFqQixVQUFrQixDQUFhLEVBQUUsRUFBK0I7Z0JBQTlCLE9BQU8sYUFBQTtZQUN2QyxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gZXNsaW50LWRpc2FibGUgIG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsIFBheWxvYWRBY3Rpb25DcmVhdG9yLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlLCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWRcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VVbnRpbCwgdGFwLCBjYXRjaEVycm9yfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB7UGF5bG9hZEFjdGlvbiwgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlfTtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBUMSBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQMSBleHRlbmRzIHVuZGVmaW5lZCA/IHt0eXBlOiBUMX0gOiBQYXlsb2FkQWN0aW9uPFAxLCBUMT4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFQxIGV4dGVuZHMgc3RyaW5nLCBUMiBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPiwgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAxIHwgUDIsIFQxIHwgVDI+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFAyLCBQMywgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nLCBUMyBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPixcbiAgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPiwgYWN0aW9uQ3JlYXRvcnMzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDMsIFQzPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAxIHwgUDIgfCBQMywgVDEgfCBUMiB8IFQzPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD5bXSk6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAsIFQ+PiB7XG4gIHJldHVybiBvZlR5cGUoLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSkgYXMgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UCwgVD4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3RhdGUge1xuICBhY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5jb25zdCBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj4gPSB7XG4gIF9jaGFuZ2U6IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICB9XG59O1xuXG50eXBlIEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPSBNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8aW5mZXIgUywgYW55LCBzdHJpbmc+ID8gUyA6IHVua25vd247XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbiAgU2xpY2U8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPixcbiAgKE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxhbnksIGluZmVyIF9DYXNlUmVkdWNlciwgc3RyaW5nPiA/IF9DYXNlUmVkdWNlciA6IFNsaWNlQ2FzZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+KSAmXG4gICAgRXh0cmFTbGljZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+LFxuICBzdHJpbmc+O1xuXG4vKiogQSBIZWxwZXIgaW5mZXIgdHlwZSAqL1xuZXhwb3J0IHR5cGUgSW5mZXJBY3Rpb25zVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbkluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT5bJ2FjdGlvbnMnXTtcblxuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj47XG4gIHN0b3JlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gIGxvZyQ6IE9ic2VydmFibGU8YW55W10+O1xuXG4gIHJvb3RTdG9yZVJlYWR5OiBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PjtcbiAgLyoqXG4gICAqIHNhbWUgYXMgc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSwgYnV0IHRoaXMgb25lIGdvZXMgdGhyb3VnaCBSZWR1eC1vYnNlcnZhYmxlJ3MgZXBpYyBtaWRkbGV3YXJlXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuICByZXBvcnRBY3Rpb25FcnJvcjogKGVycjogRXJyb3IpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBlcGljU2VxID0gMDtcbiAgLy8gcHJpdmF0ZSBnbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yID0gY3JlYXRlQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxhbnk+KSA9PiB2b2lkPignX19nbG9iYWxfY2hhbmdlJyk7XG4gIHByaXZhdGUgZGVidWdMb2cgPSBuZXcgUmVwbGF5U3ViamVjdDxhbnlbXT4oMTUpO1xuICBwcml2YXRlIHJlZHVjZXJNYXA6IFJlZHVjZXJzTWFwT2JqZWN0PGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PjtcbiAgcHJpdmF0ZSBlcGljV2l0aFVuc3ViJDogU3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPjtcbiAgcHJpdmF0ZSBlcnJvclNsaWNlOiBJbmZlclNsaWNlVHlwZTx0eXBlb2YgZXJyb3JTbGljZU9wdD47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj4ocHJlbG9hZGVkU3RhdGUpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQgPSBuZXcgUmVwbGF5U3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPigpO1xuICAgIHRoaXMubG9nJCA9IHRoaXMuZGVidWdMb2cuYXNPYnNlcnZhYmxlKCk7XG4gICAgdGhpcy5yZWR1Y2VyTWFwID0ge307XG5cbiAgICB0aGlzLnJvb3RTdG9yZVJlYWR5ID0gdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIGZpbHRlcihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpIGFzIFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb24+PjtcblxuICAgIGNvbnN0IGVycm9yU2xpY2UgPSB0aGlzLm5ld1NsaWNlKGVycm9yU2xpY2VPcHQpO1xuXG4gICAgdGhpcy5lcnJvclNsaWNlID0gZXJyb3JTbGljZTtcblxuICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IgPSB0aGlzLmJpbmRBY3Rpb25DcmVhdG9ycyhlcnJvclNsaWNlKS5yZXBvcnRBY3Rpb25FcnJvcjtcbiAgfVxuXG4gIC8vIGNvbmZpZ3VyZVN0b3JlKG1pZGRsZXdhcmVzPzogTWlkZGxld2FyZVtdKTogdGhpcztcbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gb3B0IEJlIGF3YXJlLCB0dXJuIG9mZiBvcHRpb24gXCJzZXJpYWxpemFibGVDaGVja1wiIGFuZCBcImltbXV0YWJsZUNoZWNrXCIgZnJvbSBSZWR1eCBkZWZhdWx0IG1pZGRsZXdhcmVzXG4gICAqL1xuICBjb25maWd1cmVTdG9yZShvcHQ/OiB7W2tleSBpbiBFeGNsdWRlPCdyZWR1Y2VyJywga2V5b2YgQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+Pl06IENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PltrZXldfSkge1xuICAgIGlmICh0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpKVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgY29uc3QgZXBpY01pZGRsZXdhcmUgPSBjcmVhdGVFcGljTWlkZGxld2FyZTxQYXlsb2FkQWN0aW9uPGFueT4+KCk7XG5cbiAgICBsZXQgY2ZnT3B0ID0gb3B0IGFzIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PjtcbiAgICBjb25zdCBvdXJNaWRkbHdhcmVzID0gW3RoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlLCBlcGljTWlkZGxld2FyZV07XG4gICAgaWYgKGNmZ09wdCkge1xuICAgICAgY2ZnT3B0LnJlZHVjZXIgPSByb290UmVkdWNlcjtcbiAgICAgIGNmZ09wdC5kZXZUb29scyA9IGZhbHNlO1xuICAgICAgaWYgKGNmZ09wdC5taWRkbGV3YXJlKSB7XG4gICAgICAgIGNvbnN0IGV4aXRpbmdNaWQgPSBjZmdPcHQubWlkZGxld2FyZTtcbiAgICAgICAgaWYgKHR5cGVvZiBleGl0aW5nTWlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi5leGl0aW5nTWlkKGdldERlZmF1bHQpLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gWy4uLmV4aXRpbmdNaWQsIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IChnZXREZWZhdWx0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY2ZnT3B0ID0ge1xuICAgICAgICByZWR1Y2VyOiByb290UmVkdWNlcixcbiAgICAgICAgbWlkZGxld2FyZShnZXREZWZhdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfSxcbiAgICAgICAgZGV2VG9vbHM6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0b3JlID0gY29uZmlndXJlU3RvcmUoY2ZnT3B0KTtcbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIHRhcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGBdKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgLy8gdGFwKGFjdGlvbiA9PiBjb25zb2xlLmxvZygnYWN0aW9uOiAnLCBhY3Rpb24udHlwZSkpLFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIG1hcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gdW5zdWJzY3JpYmUgJHtlcGljSWR9YCk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9LCAnaW50ZXJuYWxEaXNwYXRjaGVyJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPiB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFMsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCBkZWZhdWx0U2xpY2VSZWR1Y2Vycyk7XG5cbiAgICBpZiAocmVkdWNlcnMuX2luaXQgPT0gbnVsbCkge1xuICAgICAgcmVkdWNlcnMuX2luaXQgPSAoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFNMID0gU2xpY2U8YW55LCBhbnksIHN0cmluZz4+KFxuICAgIGVwaWM6IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHtba2V5IGluIFNMIGV4dGVuZHMgU2xpY2U8YW55LCBhbnksIGluZmVyIE5hbWU+ID8gTmFtZSA6IHN0cmluZ106IFNMIGV4dGVuZHMgU2xpY2U8aW5mZXIgUywgYW55LCBhbnk+ID8gUyA6IGFueX0+LCBlcGljTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyAoZXBpY05hbWUgfHwgKyt0aGlzLmVwaWNTZXEpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhZGRlZGBdKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIGVwaWNJZCwgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIFN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZ2V0RXJyb3JTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0YXRlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBnZXRFcnJvclN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RvcmUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGRpc3BhdGNoPFQ+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxUPikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdkaXNwYXRjaCcsIGFjdGlvbi50eXBlKTtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPEE+KHNsaWNlOiB7YWN0aW9uczogQX0pXG4gICAgOiBBIHtcblxuICAgIGNvbnN0IGFjdGlvbk1hcCA9IHt9IGFzIEE7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgYWN0aW9uQ3JlYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2xpY2UuYWN0aW9ucykpIHtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYWN0aW9uQ3JlYXRvciguLi5wYXJhbSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbiBhcyB1bmtub3duO1xuICAgICAgfTtcbiAgICAgIChkb0FjdGlvbiBhcyB1bmtub3duIGFzIHt0eXBlOiBzdHJpbmd9KS50eXBlID0gKGFjdGlvbkNyZWF0b3IgYXMgUGF5bG9hZEFjdGlvbkNyZWF0b3IpLnR5cGU7XG4gICAgICBhY3Rpb25NYXBbbmFtZV0gPSBkb0FjdGlvbiBhcyB1bmtub3duO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9uTWFwO1xuICB9XG5cbiAgc3RvcEFsbEVwaWNzKCkge1xuICAgIHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICB0YXAoc3RvcmUgPT4ge1xuICAgICAgICBpZiAoc3RvcmUpXG4gICAgICAgICAgc3RvcmUuZGlzcGF0Y2goe3BheWxvYWQ6IG51bGwsIHR5cGU6ICdTVE9QX0VQSUMnfSk7XG4gICAgICB9KSxcbiAgICAgIHRha2UoMSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZ2V0Um9vdFN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlcnJvckhhbmRsZU1pZGRsZXdhcmU6IE1pZGRsZXdhcmUgPSAoYXBpKSA9PiB7XG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XG4gICAgICByZXR1cm4gKGFjdGlvbjogUGF5bG9hZEFjdGlvbikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdhY3Rpb24gaW4gZXJyb3JIYW5kbGVNaWRkbGV3YXJlJywgYWN0aW9uLnR5cGUpO1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbiAhPSBudWxsID8gYWN0aW9uLnR5cGUgOiBhY3Rpb25dKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIgYXMgRXJyb3IpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9O1xuXG4gIHByaXZhdGUgYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyPFN0YXRlLCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPiB7XG4gICAgY29uc3QgY29tYmluZWQgPSBjb21iaW5lUmVkdWNlcnModGhpcy5yZWR1Y2VyTWFwKTtcbiAgICBjb25zdCByb290UmVkdWNlcjogUmVkdWNlcjxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gPSAoc3RhdGUsIGFjdGlvbikgPT4ge1xuICAgICAgaWYgKGFjdGlvbi50eXBlID09PSAnOjpzeW5jU3RhdGUnKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybixAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkKHN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgICAgICByZXR1cm4gY29tYmluZWQoc3RhdGUsIGFjdGlvbik7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcm9vdFJlZHVjZXI7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0ge1xuICBbVCBpbiBrZXlvZiBSXTogUltUXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/XG4gICAgKHN0YXRlOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxpbmZlciBQPikgPT4gYW55ID9cbiAgICAgIChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IFApID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOiAoc3RhdGU6IERyYWZ0PFM+LCBwYXlsb2FkOiB1bmtub3duKSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBTaW1wbGlmeSByZWR1Y2VycyBzdHJ1Y3R1cmUgcmVxdWlyZWQgaW4gU2xpY2UgY3JlYXRpb24gb3B0aW9uLlxuICogXG4gKiBOb3JtYWxseSwgdG8gY3JlYXRlIGEgc2xpY2UsIHlvdSBuZWVkIHRvIHByb3ZpZGUgYSBzbGljZSBvcHRpb24gcGFyYW10ZXIgbGlrZTpcbiAqIHtuYW1lOiA8bmFtZT4sIGluaXRpYWxTdGF0ZTogPHZhbHVlPiwgcmVkdWNlcnM6IHtcbiAqICBjYXNlUmVkdWNlcihzdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPikge1xuICogICAgLy8gbWFuaXB1bGF0ZSBzdGF0ZSBkcmFmdCB3aXRoIGRlc3RydWN0b3JlZCBwYXlsb2FkIGRhdGFcbiAqICB9XG4gKiB9fVxuICogXG4gKiBVbmNvbnZlbmllbnQgdGhpbmcgaXMgdGhlIFwiUGF5bG9hZEFjdGlvbjxQYXlsb2FkVHlwZT5cIiBwYXJ0IHdoaWNoIHNwZWNpZmllZCBhcyBzZWNvbmQgcGFyYW1ldGVyIGluIGV2ZXJ5IGNhc2UgcmVkdWNlciBkZWZpbml0aW9uLFxuICogYWN0dWFsbHkgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBQYXlsb2FkIHR5cGUgaW5zdGVhZCBvZiB0aGUgd2hvbGUgUGF5bG9hZEFjdGlvbiBpbiBjYXNlIHJlZHVjZXIuXG4gKiBcbiAqIHRoaXMgZnVuY3Rpb24gYWNjZXB0IGEgc2ltcGxpZmllZCB2ZXJzaW9uIG9mIFwiY2FzZSByZWR1Y2VyXCIgaW4gZm9ybSBvZjogXG4gKiB7XG4gKiAgICBbY2FzZU5hbWVdOiAoRHJhZnQ8U3RhdGU+LCBwYXlsb2FkOiBhbnkpID0+IERyYWZ0PFN0YXRlPiB8IHZvaWQ7XG4gKiB9XG4gKiBcbiAqIHJldHVybiBhIHJlZ3VsYXIgQ2FzZSByZWR1Y2Vycywgbm90IGxvbmdlciBuZWVkcyB0byBcImRlc3RydWN0b3JcIiBhY3Rpb24gcGFyYW10ZXIgdG8gZ2V0IHBheWxvYWQgZGF0YS5cbiAqIFxuICogQHBhcmFtIHBheWxvYWRSZWR1Y2VycyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVBheWxvZFJlZHVjZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihwYXlsb2FkUmVkdWNlcnM6IFBheWxvYWRDYXNlUmVkdWNlcnM8UywgUj4pOlxuICBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ10ge1xuICBjb25zdCByZWR1Y2VycyA9IHt9IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXTtcbiAgZm9yIChjb25zdCBbY2FzZU5hbWUsIHNpbXBsZVJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHBheWxvYWRSZWR1Y2VycykpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgcmVkdWNlcnNbY2FzZU5hbWUgYXMga2V5b2YgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddXSA9IGZ1bmN0aW9uKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248YW55Pikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgcmV0dXJuIHNpbXBsZVJlZHVjZXIocywgYWN0aW9uLnBheWxvYWQpIGFzIHVua25vd247XG4gICAgfSBhcyBhbnk7XG4gIH1cbiAgcmV0dXJuIHJlZHVjZXJzO1xufVxuXG5jb25zdCBlcnJvclNsaWNlT3B0ID0ge1xuICBpbml0aWFsU3RhdGU6IHt9IGFzIEVycm9yU3RhdGUsXG4gIG5hbWU6ICdlcnJvcicsXG4gIHJlZHVjZXJzOiB7XG4gICAgcmVwb3J0QWN0aW9uRXJyb3IoczogRXJyb3JTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEVycm9yPikge1xuICAgICAgcy5hY3Rpb25FcnJvciA9IHBheWxvYWQ7XG4gICAgfVxuICB9XG59O1xuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==