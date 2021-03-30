"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateFactory = exports.ofPayloadAction = void 0;
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
        var _loop_1 = function (sliceName, actionCreator) {
            var name_1 = sliceName;
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
            var _b = _a[_i], sliceName = _b[0], actionCreator = _b[1];
            _loop_1(sliceName, actionCreator);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRDs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixxREFBc0U7QUFDdEUsNkJBQTJFO0FBQzNFLDRDQUErRztBQW1CL0csU0FBZ0IsZUFBZTtJQUFJLHdCQUFnRDtTQUFoRCxVQUFnRCxFQUFoRCxxQkFBZ0QsRUFBaEQsSUFBZ0Q7UUFBaEQsbUNBQWdEOztJQUVqRixPQUFPLHlCQUFNLGVBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEVBQU4sQ0FBTSxDQUFDLEVBQUU7QUFDcEQsQ0FBQztBQUhELDBDQUdDO0FBYUQsSUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0YsQ0FBQztBQWNGO0lBMEJFLHNCQUFvQixjQUF1RDtRQUEzRSxpQkFpQkM7UUFqQm1CLG1CQUFjLEdBQWQsY0FBYyxDQUF5QztRQW5CM0UsV0FBTSxHQUFHLElBQUksc0JBQWUsQ0FBcUQsU0FBUyxDQUFDLENBQUM7UUFJNUY7O1dBRUc7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBR3RELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUEwT3hDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMsSUFBSTtnQkFDVixPQUFPLFVBQUMsTUFBcUI7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Q0FBQyxDQUFDO1NBQ3BEO2FBQU07WUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQztTQUNyRDtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLHdDQUFpQixHQUF6QjtRQUNFLE9BQU8seUJBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQW5TRCxJQW1TQztBQW5TWSxvQ0FBWTtBQXFTekIsSUFBTSxhQUFhLEdBQUc7SUFDcEIsWUFBWSxFQUFFLEVBQWdCO0lBQzlCLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBUSxFQUFFO1FBQ1IsaUJBQWlCLEVBQWpCLFVBQWtCLENBQWEsRUFBRSxFQUErQjtnQkFBOUIsT0FBTyxhQUFBO1lBQ3ZDLENBQUMsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQzFCLENBQUM7S0FDRjtDQUNGLENBQUM7QUFFRixJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUU7SUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0NBQ3RCIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgbGliPVwiZXMyMDE3XCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2htci1tb2R1bGUuZC50c1wiIC8+XG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoIG1lbWJlci1vcmRlcmluZ1xuLyoqXG4gKiBBIGNvbWJvIHNldCBmb3IgdXNpbmcgUmVkdXgtdG9vbGtpdCBhbG9uZyB3aXRoIHJlZHV4LW9ic2VydmFibGVcbiAqL1xuaW1wb3J0IHtcbiAgQ2FzZVJlZHVjZXIsIGNvbWJpbmVSZWR1Y2VycywgY29uZmlndXJlU3RvcmUsXG4gIENvbmZpZ3VyZVN0b3JlT3B0aW9ucywgY3JlYXRlU2xpY2UgYXMgcmVkdXhDcmVhdGVTbGljZSwgQ3JlYXRlU2xpY2VPcHRpb25zLFxuICBEcmFmdCwgRW5oYW5jZWRTdG9yZSwgUGF5bG9hZEFjdGlvbiwgUmVkdWNlcnNNYXBPYmplY3QsXG4gIFNsaWNlLCBTbGljZUNhc2VSZWR1Y2VycywgUmVkdWNlcixcbiAgVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VycywgTWlkZGxld2FyZSwgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkXG59IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgY3JlYXRlRXBpY01pZGRsZXdhcmUsIEVwaWMsIG9mVHlwZSB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBSZXBsYXlTdWJqZWN0LCBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIG1lcmdlTWFwLCB0YWtlLCB0YWtlVW50aWwsIHRhcCwgY2F0Y2hFcnJvciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHtQYXlsb2FkQWN0aW9uLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2V9O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4ge1xuICBfaW5pdDogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248e2lzTGF6eTogYm9vbGVhbn0+PjtcbiAgX2NoYW5nZTogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLFxuICBBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4+ID0gVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VyczxTUywgQUNSPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz47XG5cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDE+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxPik6XG4gIChzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFAxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMj4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMj4pOlxuKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UDEgfCBQMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFAzPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMT4sXG4gIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAyPiwgYWN0aW9uQ3JlYXRvcnMzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDM+KTpcbihzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFAxIHwgUDIgfCBQMz4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQPiguLi5hY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFA+W10pOlxuICAoc291cmNlOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxQPj4ge1xuICByZXR1cm4gb2ZUeXBlKC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpO1xufVxuXG4vLyBpbnRlcmZhY2UgUmVkdXhTdG9yZVdpdGhFcGljT3B0aW9uczxTdGF0ZSA9IGFueSwgUGF5bG9hZCA9IGFueSwgT3V0cHV0IGV4dGVuZHMgUGF5bG9hZEFjdGlvbjxQYXlsb2FkPiA9IFBheWxvYWRBY3Rpb248UGF5bG9hZD4sXG4vLyBDYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+ID0gU2xpY2VDYXNlUmVkdWNlcnM8YW55PiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ge1xuLy8gICBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddO1xuLy8gICBzbGljZXM6IFNsaWNlPFN0YXRlLCBDYXNlUmVkdWNlcnMsIE5hbWU+W107XG4vLyAgIGVwaWNzOiBFcGljPFBheWxvYWRBY3Rpb248UGF5bG9hZD4sIE91dHB1dCwgU3RhdGU+W107XG4vLyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4pICZcbiAgICBFeHRyYVNsaWNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4sXG4gIHN0cmluZz47XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPlsnYWN0aW9ucyddO1xuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj47XG4gIHN0b3JlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gIGxvZyQ6IE9ic2VydmFibGU8YW55W10+O1xuXG4gIHJvb3RTdG9yZVJlYWR5OiBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PjtcbiAgLyoqXG4gICAqIHNhbWUgYXMgc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSwgYnV0IHRoaXMgb25lIGdvZXMgdGhyb3VnaCBSZWR1eC1vYnNlcnZhYmxlJ3MgZXBpYyBtaWRkbGV3YXJlXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuICByZXBvcnRBY3Rpb25FcnJvcjogKGVycjogRXJyb3IpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBlcGljU2VxID0gMDtcbiAgLy8gcHJpdmF0ZSBnbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yID0gY3JlYXRlQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxhbnk+KSA9PiB2b2lkPignX19nbG9iYWxfY2hhbmdlJyk7XG4gIHByaXZhdGUgZGVidWdMb2cgPSBuZXcgUmVwbGF5U3ViamVjdDxhbnlbXT4oMTUpO1xuICBwcml2YXRlIHJlZHVjZXJNYXA6IFJlZHVjZXJzTWFwT2JqZWN0PGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PjtcbiAgcHJpdmF0ZSBlcGljV2l0aFVuc3ViJDogU3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPjtcblxuXG4gIHByaXZhdGUgZXJyb3JTbGljZTogSW5mZXJTbGljZVR5cGU8dHlwZW9mIGVycm9yU2xpY2VPcHQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXSkge1xuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHVua25vd24+KHByZWxvYWRlZFN0YXRlKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkID0gbmV3IFJlcGxheVN1YmplY3Q8W0VwaWM8UGF5bG9hZEFjdGlvbjx1bmtub3duPj4sIHN0cmluZywgU3ViamVjdDxzdHJpbmc+XT4oKTtcbiAgICB0aGlzLmxvZyQgPSB0aGlzLmRlYnVnTG9nLmFzT2JzZXJ2YWJsZSgpO1xuICAgIHRoaXMucmVkdWNlck1hcCA9IHt9O1xuXG4gICAgdGhpcy5yb290U3RvcmVSZWFkeSA9IHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICBmaWx0ZXIoc3RvcmUgPT4gc3RvcmUgIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKSBhcyBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPj47XG5cbiAgICBjb25zdCBlcnJvclNsaWNlID0gdGhpcy5uZXdTbGljZShlcnJvclNsaWNlT3B0KTtcblxuICAgIHRoaXMuZXJyb3JTbGljZSA9IGVycm9yU2xpY2U7XG5cbiAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yID0gdGhpcy5iaW5kQWN0aW9uQ3JlYXRvcnMoZXJyb3JTbGljZSkucmVwb3J0QWN0aW9uRXJyb3I7XG5cbiAgfVxuXG4gIC8vIGNvbmZpZ3VyZVN0b3JlKG1pZGRsZXdhcmVzPzogTWlkZGxld2FyZVtdKTogdGhpcztcbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gb3B0IEJlIGF3YXJlLCB0dXJuIG9mZiBvcHRpb24gXCJzZXJpYWxpemFibGVDaGVja1wiIGFuZCBcImltbXV0YWJsZUNoZWNrXCIgZnJvbSBSZWR1eCBkZWZhdWx0IG1pZGRsZXdhcmVzXG4gICAqL1xuICBjb25maWd1cmVTdG9yZShvcHQ/OiB7W2tleSBpbiBFeGNsdWRlPCdyZWR1Y2VyJywga2V5b2YgQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+Pl06IENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PltrZXldfSkge1xuICAgIGlmICh0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpKVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgY29uc3QgZXBpY01pZGRsZXdhcmUgPSBjcmVhdGVFcGljTWlkZGxld2FyZTxQYXlsb2FkQWN0aW9uPGFueT4+KCk7XG5cbiAgICBsZXQgY2ZnT3B0ID0gb3B0IGFzIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PjtcbiAgICBjb25zdCBvdXJNaWRkbHdhcmVzID0gW3RoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlLCBlcGljTWlkZGxld2FyZV07XG4gICAgaWYgKGNmZ09wdCkge1xuICAgICAgY2ZnT3B0LnJlZHVjZXIgPSByb290UmVkdWNlcjtcbiAgICAgIGNmZ09wdC5kZXZUb29scyA9IGZhbHNlO1xuICAgICAgaWYgKGNmZ09wdC5taWRkbGV3YXJlKSB7XG4gICAgICAgIGNvbnN0IGV4aXRpbmdNaWQgPSBjZmdPcHQubWlkZGxld2FyZTtcbiAgICAgICAgaWYgKHR5cGVvZiBleGl0aW5nTWlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi5leGl0aW5nTWlkKGdldERlZmF1bHQpLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gWy4uLmV4aXRpbmdNaWQsIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IChnZXREZWZhdWx0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY2ZnT3B0ID0ge1xuICAgICAgICByZWR1Y2VyOiByb290UmVkdWNlcixcbiAgICAgICAgbWlkZGxld2FyZShnZXREZWZhdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfSxcbiAgICAgICAgZGV2VG9vbHM6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0b3JlID0gY29uZmlndXJlU3RvcmUoY2ZnT3B0KTtcblxuICAgIHRoaXMuc3RvcmUkLm5leHQoc3RvcmUpO1xuXG4gICAgc3RvcmUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQubmV4dChzdGF0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gdGFwKCgpID0+IGNvbnNvbGUubG9nKCdzdGF0ZSBjaGFuZ2VkJykpLFxuICAgICAgdGFwKHN0YXRlID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ3N0YXRlJywgc3RhdGVdKSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZXBpY01pZGRsZXdhcmUucnVuKChhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXBpY1dpdGhVbnN1YiQucGlwZShcbiAgICAgICAgdGFwKChbZXBpYywgZXBpY0lkLCB1bnN1Yl0pID0+IHtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYF0pO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYCk7XG4gICAgICAgIH0pLFxuICAgICAgICBtZXJnZU1hcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykpXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAvLyB0YXAoYWN0aW9uID0+IGNvbnNvbGUubG9nKCdhY3Rpb246ICcsIGFjdGlvbi50eXBlKSksXG4gICAgICAgICAgICB0YWtlVW50aWwodW5zdWIucGlwZShcbiAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgdGFwKGVwaWNJZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGB1bnN1YnNjcmliZSBmcm9tICR7ZXBpY0lkfWBdKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSB1bnN1YnNjcmliZSAke2VwaWNJZH1gKTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgdGFrZVVudGlsKGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlR5cGUoJ1NUT1BfRVBJQycpLFxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ1N0b3AgYWxsIGVwaWNzJ10pKVxuICAgICAgICApKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEVwaWMoKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoO1xuICAgIH0sICdpbnRlcm5hbERpc3BhdGNoZXInKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFNTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIG9wdDogQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KTpcbiAgICBTbGljZTxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT4ge1xuXG4gICAgY29uc3QgX29wdCA9IG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLCBfQ2FzZVJlZHVjZXI+O1xuXG4gICAgaWYgKHJlZHVjZXJzLl9jaGFuZ2UgPT0gbnVsbClcbiAgICAgIE9iamVjdC5hc3NpZ24oX29wdC5yZWR1Y2VycywgZGVmYXVsdFNsaWNlUmVkdWNlcnMpO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9pbml0ID09IG51bGwpIHtcbiAgICAgIHJlZHVjZXJzLl9pbml0ID0gKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGBzbGljZSBcIiR7b3B0Lm5hbWV9XCIgaXMgY3JlYXRlZCAke2FjdGlvbi5wYXlsb2FkLmlzTGF6eSA/ICdsYXppbHknIDogJyd9YF0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcmVsb2FkZWRTdGF0ZSAmJiB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHQuaW5pdGlhbFN0YXRlLCB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSk7XG4gICAgfVxuICAgIGNvbnN0IHNsaWNlID0gcmVkdXhDcmVhdGVTbGljZShcbiAgICAgIG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFMgPSBhbnk+KGVwaWM6IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIFM+LCBlcGljTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyAoZXBpY05hbWUgfHwgKyt0aGlzLmVwaWNTZXEpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhZGRlZGBdKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIGVwaWNJZCwgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIEJlaGF2aW9yU3ViamVjdDx7W2tleTogc3RyaW5nXTogU1N9PikucGlwZShcbiAgICAgIG1hcChzID0+IHNbc2xpY2UubmFtZV0pLFxuICAgICAgZmlsdGVyKHNzID0+IHNzICE9IG51bGwpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICAgICk7XG4gIH1cblxuICBnZXRFcnJvclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RhdGUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGdldEVycm9yU3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdG9yZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZGlzcGF0Y2g8VD4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFQ+KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2Rpc3BhdGNoJywgYWN0aW9uLnR5cGUpO1xuICAgIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVubGluayBSZWR1eCdzIGJpbmRBY3Rpb25DcmVhdG9ycywgb3VyIHN0b3JlIGlzIGxhemlseSBjcmVhdGVkLCBkaXNwYXRjaCBpcyBub3QgYXZhaWxhYmxlIGF0IGJlZ2lubmluZy5cbiAgICogUGFyYW1ldGVyIGlzIGEgU2xpY2UgaW5zdGVhZCBvZiBhY3Rpb24gbWFwXG4gICAqL1xuICBiaW5kQWN0aW9uQ3JlYXRvcnM8QSwgU2xpY2UgZXh0ZW5kcyB7YWN0aW9uczogQX0+KHNsaWNlOiBTbGljZSk6IFNsaWNlWydhY3Rpb25zJ10ge1xuXG4gICAgY29uc3QgYWN0aW9uTWFwID0ge30gYXMgdHlwZW9mIHNsaWNlLmFjdGlvbnM7XG4gICAgZm9yIChjb25zdCBbc2xpY2VOYW1lLCBhY3Rpb25DcmVhdG9yXSBvZiBPYmplY3QuZW50cmllcyhzbGljZS5hY3Rpb25zKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHNsaWNlTmFtZTtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSAoYWN0aW9uQ3JlYXRvciBhcyBhbnkpKC4uLnBhcmFtKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xuICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgfTtcbiAgICAgIGFjdGlvbk1hcFtuYW1lXSA9IGRvQWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9uTWFwIGFzIFNsaWNlWydhY3Rpb25zJ107XG4gIH1cblxuICBzdG9wQWxsRXBpY3MoKSB7XG4gICAgdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIHRhcChzdG9yZSA9PiB7XG4gICAgICAgIGlmIChzdG9yZSlcbiAgICAgICAgICBzdG9yZS5kaXNwYXRjaCh7cGF5bG9hZDogbnVsbCwgdHlwZTogJ1NUT1BfRVBJQyd9KTtcbiAgICAgIH0pLFxuICAgICAgdGFrZSgxKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBnZXRSb290U3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RvcmUkLmdldFZhbHVlKCk7XG4gIH1cblxuICBwcml2YXRlIGVycm9ySGFuZGxlTWlkZGxld2FyZTogTWlkZGxld2FyZSA9IChhcGkpID0+IHtcbiAgICByZXR1cm4gKG5leHQpID0+IHtcbiAgICAgIHJldHVybiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2FjdGlvbiBpbiBlcnJvckhhbmRsZU1pZGRsZXdhcmUnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uICE9IG51bGwgPyBhY3Rpb24udHlwZSA6IGFjdGlvbl0pO1xuICAgICAgICAgIGNvbnN0IHJldCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGZhaWxlZCBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gYWN0aW9uIGRpc3BhdGNoIGVycm9yJywgZXJyKTtcbiAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVycik7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSxcbiAgICBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPiB7XG4gICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICB9XG59XG5cbmNvbnN0IGVycm9yU2xpY2VPcHQgPSB7XG4gIGluaXRpYWxTdGF0ZToge30gYXMgRXJyb3JTdGF0ZSxcbiAgbmFtZTogJ2Vycm9yJyxcbiAgcmVkdWNlcnM6IHtcbiAgICByZXBvcnRBY3Rpb25FcnJvcihzOiBFcnJvclN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248RXJyb3I+KSB7XG4gICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICB9XG4gIH1cbn07XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGVjbGluZSgpO1xufVxuIl19