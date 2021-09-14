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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsNENBTTBCO0FBQzFCLHFEQUFzRTtBQUN0RSw2QkFBNkY7QUFDN0YsNENBQThHO0FBbUI5RyxTQUFnQixlQUFlO0lBQXNCLHdCQUFtRDtTQUFuRCxVQUFtRCxFQUFuRCxxQkFBbUQsRUFBbkQsSUFBbUQ7UUFBbkQsbUNBQW1EOztJQUV0RyxPQUFPLHlCQUFNLGVBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEVBQU4sQ0FBTSxDQUFDLENBQStDLENBQUM7QUFDbEcsQ0FBQztBQUhELDBDQUdDO0FBTUQsSUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0YsQ0FBQztBQWVGO0lBd0JFLHNCQUFvQixjQUF1RDtRQUEzRSxpQkFnQkM7UUFoQm1CLG1CQUFjLEdBQWQsY0FBYyxDQUF5QztRQWpCM0UsV0FBTSxHQUFHLElBQUksc0JBQWUsQ0FBcUQsU0FBUyxDQUFDLENBQUM7UUFJNUY7O1dBRUc7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBR3RELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUFnUHhDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMsSUFBSTtnQkFDVixPQUFPLFVB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QUFDLENBQUMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFZLENBQUM7UUFDckQsQ0FBUSxDQUFDOztJQUxYLEtBQXdDLFVBQStCLEVBQS9CLEtBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBL0IsY0FBK0IsRUFBL0IsSUFBK0I7UUFBNUQsSUFBQSxXQUF5QixFQUF4QixRQUFRLFFBQUEsRUFBRSxhQUFhLFFBQUE7Z0JBQXZCLFFBQVEsRUFBRSxhQUFhO0tBTWxDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQVhELDhDQVdDO0FBRUQsSUFBTSxhQUFhLEdBQUc7SUFDcEIsWUFBWSxFQUFFLEVBQWdCO0lBQzlCLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBUSxFQUFFO1FBQ1IsaUJBQWlCLEVBQWpCLFVBQWtCLENBQWEsRUFBRSxFQUErQjtnQkFBOUIsT0FBTyxhQUFBO1lBQ3ZDLENBQUMsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQzFCLENBQUM7S0FDRjtDQUNGLENBQUM7QUFFRixJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUU7SUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0NBQ3RCIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgbGliPVwiZXMyMDE3XCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2htci1tb2R1bGUuZC50c1wiIC8+XG4vLyBlc2xpbnQtZGlzYWJsZSAgbWF4LWxpbmUtbGVuZ3RoIG1lbWJlci1vcmRlcmluZ1xuLyoqXG4gKiBBIGNvbWJvIHNldCBmb3IgdXNpbmcgUmVkdXgtdG9vbGtpdCBhbG9uZyB3aXRoIHJlZHV4LW9ic2VydmFibGVcbiAqL1xuaW1wb3J0IHtcbiAgQ2FzZVJlZHVjZXIsIGNvbWJpbmVSZWR1Y2VycywgY29uZmlndXJlU3RvcmUsXG4gIENvbmZpZ3VyZVN0b3JlT3B0aW9ucywgY3JlYXRlU2xpY2UgYXMgcmVkdXhDcmVhdGVTbGljZSwgQ3JlYXRlU2xpY2VPcHRpb25zLFxuICBEcmFmdCwgRW5oYW5jZWRTdG9yZSwgUGF5bG9hZEFjdGlvbiwgUmVkdWNlcnNNYXBPYmplY3QsXG4gIFNsaWNlLCBTbGljZUNhc2VSZWR1Y2VycywgUmVkdWNlciwgUGF5bG9hZEFjdGlvbkNyZWF0b3IsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmUsIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZFxufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IGNyZWF0ZUVwaWNNaWRkbGV3YXJlLCBFcGljLCBvZlR5cGUgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgUmVwbGF5U3ViamVjdCwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZVVudGlsLCB0YXAsIGNhdGNoRXJyb3J9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHtQYXlsb2FkQWN0aW9uLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2V9O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4ge1xuICBfaW5pdDogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248e2lzTGF6eTogYm9vbGVhbn0+PjtcbiAgX2NoYW5nZTogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLFxuICBBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4+ID0gVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VyczxTUywgQUNSPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz47XG5cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFQxIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFAxIGV4dGVuZHMgdW5kZWZpbmVkID8ge3R5cGU6IFQxfSA6IFBheWxvYWRBY3Rpb248UDEsIFQxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMiwgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UDEgfCBQMiwgVDEgfCBUMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFAzLCBUMSBleHRlbmRzIHN0cmluZywgVDIgZXh0ZW5kcyBzdHJpbmcsIFQzIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LFxuICBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+LCBhY3Rpb25DcmVhdG9yczM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMywgVDM+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UDEgfCBQMiB8IFAzLCBUMSB8IFQyIHwgVDM+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UCwgVCBleHRlbmRzIHN0cmluZz4oLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPltdKTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UCwgVD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKSBhcyBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQLCBUPj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4pICZcbiAgICBFeHRyYVNsaWNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4sXG4gIHN0cmluZz47XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPlsnYWN0aW9ucyddO1xuXG5leHBvcnQgY2xhc3MgU3RhdGVGYWN0b3J5IHtcbiAgLyoqXG4gICAqIFdoeSBJIGRvbid0IHVzZSBFcGljJ3Mgc3RhdGUkIHBhcmFtZXRlcjpcbiAgICogXG4gICAqIFJlZHV4LW9ic2VydmFibGUncyBzdGF0ZSQgZG9lcyBub3Qgbm90aWZ5IHN0YXRlIGNoYW5nZSBldmVudCB3aGVuIGEgbGF6eSBsb2FkZWQgKHJlcGxhY2VkKSBzbGljZSBpbml0aWFsaXplIHN0YXRlIFxuICAgKi9cbiAgcmVhbHRpbWVTdGF0ZSQ6IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPjtcbiAgc3RvcmUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgbG9nJDogT2JzZXJ2YWJsZTxhbnlbXT47XG5cbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICAvKipcbiAgICogc2FtZSBhcyBzdG9yZS5kaXNwYXRjaChhY3Rpb24pLCBidXQgdGhpcyBvbmUgZ29lcyB0aHJvdWdoIFJlZHV4LW9ic2VydmFibGUncyBlcGljIG1pZGRsZXdhcmVcbiAgICovXG4gIGFjdGlvbnNUb0Rpc3BhdGNoID0gbmV3IFJlcGxheVN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnk+PigyMCk7XG4gIHJlcG9ydEFjdGlvbkVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcbiAgcHJpdmF0ZSBkZWJ1Z0xvZyA9IG5ldyBSZXBsYXlTdWJqZWN0PGFueVtdPigxNSk7XG4gIHByaXZhdGUgcmVkdWNlck1hcDogUmVkdWNlcnNNYXBPYmplY3Q8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+O1xuICBwcml2YXRlIGVwaWNXaXRoVW5zdWIkOiBTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+O1xuICBwcml2YXRlIGVycm9yU2xpY2U6IEluZmVyU2xpY2VUeXBlPHR5cGVvZiBlcnJvclNsaWNlT3B0PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ10pIHtcbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyKHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCkgYXMgUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbj4+O1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuICB9XG5cbiAgLy8gY29uZmlndXJlU3RvcmUobWlkZGxld2FyZXM/OiBNaWRkbGV3YXJlW10pOiB0aGlzO1xuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBvcHQgQmUgYXdhcmUsIHR1cm4gb2ZmIG9wdGlvbiBcInNlcmlhbGl6YWJsZUNoZWNrXCIgYW5kIFwiaW1tdXRhYmxlQ2hlY2tcIiBmcm9tIFJlZHV4IGRlZmF1bHQgbWlkZGxld2FyZXNcbiAgICovXG4gIGNvbmZpZ3VyZVN0b3JlKG9wdD86IHtba2V5IGluIEV4Y2x1ZGU8J3JlZHVjZXInLCBrZXlvZiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj4+XTogQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+W2tleV19KSB7XG4gICAgaWYgKHRoaXMuc3RvcmUkLmdldFZhbHVlKCkpXG4gICAgICByZXR1cm4gdGhpcztcbiAgICBjb25zdCByb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICBjb25zdCBlcGljTWlkZGxld2FyZSA9IGNyZWF0ZUVwaWNNaWRkbGV3YXJlPFBheWxvYWRBY3Rpb248YW55Pj4oKTtcblxuICAgIGxldCBjZmdPcHQgPSBvcHQgYXMgQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+O1xuICAgIGNvbnN0IG91ck1pZGRsd2FyZXMgPSBbdGhpcy5lcnJvckhhbmRsZU1pZGRsZXdhcmUsIGVwaWNNaWRkbGV3YXJlXTtcbiAgICBpZiAoY2ZnT3B0KSB7XG4gICAgICBjZmdPcHQucmVkdWNlciA9IHJvb3RSZWR1Y2VyO1xuICAgICAgY2ZnT3B0LmRldlRvb2xzID0gZmFsc2U7XG4gICAgICBpZiAoY2ZnT3B0Lm1pZGRsZXdhcmUpIHtcbiAgICAgICAgY29uc3QgZXhpdGluZ01pZCA9IGNmZ09wdC5taWRkbGV3YXJlO1xuICAgICAgICBpZiAodHlwZW9mIGV4aXRpbmdNaWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IChnZXREZWZhdWx0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLmV4aXRpbmdNaWQoZ2V0RGVmYXVsdCksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSBbLi4uZXhpdGluZ01pZCwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICByZXR1cm4gWy4uLmdldERlZmF1bHQoe3NlcmlhbGl6YWJsZUNoZWNrOiBmYWxzZSwgaW1tdXRhYmxlQ2hlY2s6IGZhbHNlfSksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjZmdPcHQgPSB7XG4gICAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgICBtaWRkbGV3YXJlKGdldERlZmF1bHQpIHtcbiAgICAgICAgICByZXR1cm4gWy4uLmdldERlZmF1bHQoe3NlcmlhbGl6YWJsZUNoZWNrOiBmYWxzZSwgaW1tdXRhYmxlQ2hlY2s6IGZhbHNlfSksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9LFxuICAgICAgICBkZXZUb29sczogZmFsc2VcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3Qgc3RvcmUgPSBjb25maWd1cmVTdG9yZShjZmdPcHQpO1xuICAgIHRoaXMuc3RvcmUkLm5leHQoc3RvcmUpO1xuXG4gICAgc3RvcmUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQubmV4dChzdGF0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gdGFwKCgpID0+IGNvbnNvbGUubG9nKCdzdGF0ZSBjaGFuZ2VkJykpLFxuICAgICAgdGFwKHN0YXRlID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ3N0YXRlJywgc3RhdGVdKSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZXBpY01pZGRsZXdhcmUucnVuKChhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXBpY1dpdGhVbnN1YiQucGlwZShcbiAgICAgICAgdGFwKChbZXBpYywgZXBpY0lkLCB1bnN1Yl0pID0+IHtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYF0pO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYCk7XG4gICAgICAgIH0pLFxuICAgICAgICBtZXJnZU1hcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykpXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAvLyB0YXAoYWN0aW9uID0+IGNvbnNvbGUubG9nKCdhY3Rpb246ICcsIGFjdGlvbi50eXBlKSksXG4gICAgICAgICAgICB0YWtlVW50aWwodW5zdWIucGlwZShcbiAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgbWFwKGVwaWNJZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGB1bnN1YnNjcmliZSBmcm9tICR7ZXBpY0lkfWBdKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSB1bnN1YnNjcmliZSAke2VwaWNJZH1gKTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgdGFrZVVudGlsKGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlR5cGUoJ1NUT1BfRVBJQycpLFxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ1N0b3AgYWxsIGVwaWNzJ10pKVxuICAgICAgICApKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEVwaWMoKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoO1xuICAgIH0sICdpbnRlcm5hbERpc3BhdGNoZXInKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFMsIF9DYXNlUmVkdWNlciBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KTpcbiAgICBTbGljZTxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+IHtcblxuICAgIGNvbnN0IF9vcHQgPSBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPiwgTmFtZT47XG4gICAgY29uc3QgcmVkdWNlcnMgPSBfb3B0LnJlZHVjZXJzIGFzIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8UywgX0Nhc2VSZWR1Y2VyPjtcblxuICAgIGlmIChyZWR1Y2Vycy5fY2hhbmdlID09IG51bGwpXG4gICAgICBPYmplY3QuYXNzaWduKF9vcHQucmVkdWNlcnMsIGRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPiwgTmFtZT4pO1xuXG4gICAgdGhpcy5hZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXIoc2xpY2UpO1xuXG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcmVtb3ZlU2xpY2Uoc2xpY2U6IHtuYW1lOiBzdHJpbmd9KSB7XG4gICAgZGVsZXRlIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXTtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdyZW1vdmUgc2xpY2UgJysgc2xpY2UubmFtZV0pO1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIGEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgZnJvbSB0aGlzIGVwaWNcbiAgICogQHBhcmFtIGVwaWMgXG4gICAqIEBwYXJhbSBlcGljTmFtZSBhIG5hbWUgZm9yIGRlYnVnIGFuZCBsb2dnaW5nIHB1cnBvc2VcbiAgICovXG4gIGFkZEVwaWM8U0wgPSBTbGljZTxhbnksIGFueSwgc3RyaW5nPj4oXG4gICAgZXBpYzogRXBpYzxcbiAgICAgIFBheWxvYWRBY3Rpb248YW55PiwgYW55LFxuICAgICAge1xuICAgICAgICBba2V5IGluIFNMIGV4dGVuZHMgU2xpY2U8YW55LCBhbnksIGluZmVyIE5hbWU+ID8gTmFtZSA6IHN0cmluZ106XG4gICAgICAgIFNMIGV4dGVuZHMgU2xpY2U8aW5mZXIgUywgYW55LCBhbnk+ID8gUyA6IGFueVxuICAgICAgfVxuICAgICAgPixcbiAgICBlcGljTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyAoZXBpY05hbWUgfHwgKyt0aGlzLmVwaWNTZXEpO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhZGRlZGBdKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIGVwaWNJZCwgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIFN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZ2V0RXJyb3JTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0YXRlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBnZXRFcnJvclN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RvcmUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGRpc3BhdGNoPFQ+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxUPikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdkaXNwYXRjaCcsIGFjdGlvbi50eXBlKTtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPEE+KHNsaWNlOiB7YWN0aW9uczogQX0pXG4gICAgOiBBIHtcblxuICAgIGNvbnN0IGFjdGlvbk1hcCA9IHt9IGFzIEE7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgYWN0aW9uQ3JlYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2xpY2UuYWN0aW9ucykpIHtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYWN0aW9uQ3JlYXRvciguLi5wYXJhbSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbiBhcyB1bmtub3duO1xuICAgICAgfTtcbiAgICAgIChkb0FjdGlvbiBhcyB1bmtub3duIGFzIHt0eXBlOiBzdHJpbmd9KS50eXBlID0gKGFjdGlvbkNyZWF0b3IgYXMgUGF5bG9hZEFjdGlvbkNyZWF0b3IpLnR5cGU7XG4gICAgICBhY3Rpb25NYXBbbmFtZV0gPSBkb0FjdGlvbiBhcyB1bmtub3duO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9uTWFwO1xuICB9XG5cbiAgc3RvcEFsbEVwaWNzKCkge1xuICAgIHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICB0YXAoc3RvcmUgPT4ge1xuICAgICAgICBpZiAoc3RvcmUpXG4gICAgICAgICAgc3RvcmUuZGlzcGF0Y2goe3BheWxvYWQ6IG51bGwsIHR5cGU6ICdTVE9QX0VQSUMnfSk7XG4gICAgICB9KSxcbiAgICAgIHRha2UoMSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZ2V0Um9vdFN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlcnJvckhhbmRsZU1pZGRsZXdhcmU6IE1pZGRsZXdhcmUgPSAoYXBpKSA9PiB7XG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XG4gICAgICByZXR1cm4gKGFjdGlvbjogUGF5bG9hZEFjdGlvbikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdhY3Rpb24gaW4gZXJyb3JIYW5kbGVNaWRkbGV3YXJlJywgYWN0aW9uLnR5cGUpO1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbiAhPSBudWxsID8gYWN0aW9uLnR5cGUgOiBhY3Rpb25dKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIgYXMgRXJyb3IpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9O1xuXG4gIHByaXZhdGUgYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyPFN0YXRlLCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPiB7XG4gICAgY29uc3QgY29tYmluZWQgPSBjb21iaW5lUmVkdWNlcnModGhpcy5yZWR1Y2VyTWFwKTtcbiAgICBjb25zdCByb290UmVkdWNlcjogUmVkdWNlcjxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gPSAoc3RhdGUsIGFjdGlvbikgPT4ge1xuICAgICAgaWYgKGFjdGlvbi50eXBlID09PSAnOjpzeW5jU3RhdGUnKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybixAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkKHN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgICAgICByZXR1cm4gY29tYmluZWQoc3RhdGUsIGFjdGlvbik7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gcm9vdFJlZHVjZXI7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0ge1xuICBbVCBpbiBrZXlvZiBSXTogUltUXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/XG4gICAgKHN0YXRlOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxpbmZlciBQPikgPT4gYW55ID9cbiAgICAgIChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IFApID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOiAoc3RhdGU6IERyYWZ0PFM+LCBwYXlsb2FkOiB1bmtub3duKSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBTaW1wbGlmeSByZWR1Y2VycyBzdHJ1Y3R1cmUgcmVxdWlyZWQgaW4gU2xpY2UgY3JlYXRpb24gb3B0aW9uLlxuICogXG4gKiBOb3JtYWxseSwgdG8gY3JlYXRlIGEgc2xpY2UsIHlvdSBuZWVkIHRvIHByb3ZpZGUgYSBzbGljZSBvcHRpb24gcGFyYW10ZXIgbGlrZTpcbiAqIHtuYW1lOiA8bmFtZT4sIGluaXRpYWxTdGF0ZTogPHZhbHVlPiwgcmVkdWNlcnM6IHtcbiAqICBjYXNlUmVkdWNlcihzdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPikge1xuICogICAgLy8gbWFuaXB1bGF0ZSBzdGF0ZSBkcmFmdCB3aXRoIGRlc3RydWN0b3JlZCBwYXlsb2FkIGRhdGFcbiAqICB9XG4gKiB9fVxuICogXG4gKiBVbmNvbnZlbmllbnQgdGhpbmcgaXMgdGhlIFwiUGF5bG9hZEFjdGlvbjxQYXlsb2FkVHlwZT5cIiBwYXJ0IHdoaWNoIHNwZWNpZmllZCBhcyBzZWNvbmQgcGFyYW1ldGVyIGluIGV2ZXJ5IGNhc2UgcmVkdWNlciBkZWZpbml0aW9uLFxuICogYWN0dWFsbHkgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBQYXlsb2FkIHR5cGUgaW5zdGVhZCBvZiB0aGUgd2hvbGUgUGF5bG9hZEFjdGlvbiBpbiBjYXNlIHJlZHVjZXIuXG4gKiBcbiAqIHRoaXMgZnVuY3Rpb24gYWNjZXB0IGEgc2ltcGxpZmllZCB2ZXJzaW9uIG9mIFwiY2FzZSByZWR1Y2VyXCIgaW4gZm9ybSBvZjogXG4gKiB7XG4gKiAgICBbY2FzZU5hbWVdOiAoRHJhZnQ8U3RhdGU+LCBwYXlsb2FkOiBhbnkpID0+IERyYWZ0PFN0YXRlPiB8IHZvaWQ7XG4gKiB9XG4gKiBcbiAqIHJldHVybiBhIHJlZ3VsYXIgQ2FzZSByZWR1Y2Vycywgbm90IGxvbmdlciBuZWVkcyB0byBcImRlc3RydWN0b3JcIiBhY3Rpb24gcGFyYW10ZXIgdG8gZ2V0IHBheWxvYWQgZGF0YS5cbiAqIFxuICogQHBhcmFtIHBheWxvYWRSZWR1Y2VycyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVBheWxvZFJlZHVjZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihwYXlsb2FkUmVkdWNlcnM6IFBheWxvYWRDYXNlUmVkdWNlcnM8UywgUj4pOlxuICBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ10ge1xuICBjb25zdCByZWR1Y2VycyA9IHt9IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXTtcbiAgZm9yIChjb25zdCBbY2FzZU5hbWUsIHNpbXBsZVJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHBheWxvYWRSZWR1Y2VycykpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgcmVkdWNlcnNbY2FzZU5hbWUgYXMga2V5b2YgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddXSA9IGZ1bmN0aW9uKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248YW55Pikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgcmV0dXJuIHNpbXBsZVJlZHVjZXIocywgYWN0aW9uLnBheWxvYWQpIGFzIHVua25vd247XG4gICAgfSBhcyBhbnk7XG4gIH1cbiAgcmV0dXJuIHJlZHVjZXJzO1xufVxuXG5jb25zdCBlcnJvclNsaWNlT3B0ID0ge1xuICBpbml0aWFsU3RhdGU6IHt9IGFzIEVycm9yU3RhdGUsXG4gIG5hbWU6ICdlcnJvcicsXG4gIHJlZHVjZXJzOiB7XG4gICAgcmVwb3J0QWN0aW9uRXJyb3IoczogRXJyb3JTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEVycm9yPikge1xuICAgICAgcy5hY3Rpb25FcnJvciA9IHBheWxvYWQ7XG4gICAgfVxuICB9XG59O1xuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==