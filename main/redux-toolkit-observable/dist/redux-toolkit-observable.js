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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRDs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixxREFBc0U7QUFDdEUsNkJBQTJFO0FBQzNFLDRDQUErRztBQW1CL0csU0FBZ0IsZUFBZTtJQUFzQix3QkFBbUQ7U0FBbkQsVUFBbUQsRUFBbkQscUJBQW1ELEVBQW5ELElBQW1EO1FBQW5ELG1DQUFtRDs7SUFFdEcsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxDQUFRLENBQUM7QUFDM0QsQ0FBQztBQUhELDBDQUdDO0FBc0JELElBQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxNQUFNO1FBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNGLENBQUM7QUFjRjtJQTBCRSxzQkFBb0IsY0FBdUQ7UUFBM0UsaUJBaUJDO1FBakJtQixtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFuQjNFLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSTVGOztXQUVHO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxvQkFBYSxDQUFxQixFQUFFLENBQUMsQ0FBQztRQUd0RCxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUNqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBME94QywwQkFBcUIsR0FBZSxVQUFDLEdBQUc7WUFDOUMsT0FBTyxVQUFDLElBQUk7Z0JBQ1YsT0FBTyxVQUFDLE1BQXFCO29CQUMzQixJQUFJO3dCQUNGLCtEQUErRDt3QkFDL0QsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDdEUsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUN6QixPQUFPLEdBQUcsQ0FBQztxQkFDWjtvQkFBQyxPQUFPLEdBQUcsRUFBRTt3QkFDWixzQ0FBc0M7d0JBQ3RDLE9BQU8sQ0FBQyxLQUFLLENBQUMsMENBQTBDLEVBQUUsTUFBTSxDQUFDLENBQUM7d0JBQ2xFLHNDQUFzQzt3QkFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxrREFBa0QsRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDdkUsS0FBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUM1QixNQUFNLEdBQUcsQ0FBQztxQkFDWDtnQkFDSCxDQUFDLENBQUM7WUFDSixDQUFDLENBQUM7UUFDSixDQUFDLENBQUE7UUFwUEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLHNCQUFlLENBQVUsY0FBYyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLG9CQUFhLEVBQTJELENBQUM7UUFDbkcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBRXJCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ3BDLGtCQUFNLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLElBQUksSUFBSSxFQUFiLENBQWEsQ0FBQyxFQUM5QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxDQUNSLENBQUMsU0FBUyxFQUFnRCxDQUFDO1FBRTVELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFFN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztJQUVqRixDQUFDO0lBRUQsb0RBQW9EO0lBQ3BEOzs7T0FHRztJQUNILHFDQUFjLEdBQWQsVUFBZSxHQUE4SjtRQUE3SyxpQkFvRkM7UUFuRkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUN4QixPQUFPLElBQUksQ0FBQztRQUNkLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzdDLElBQU0sY0FBYyxHQUFHLHVDQUFvQixFQUFzQixDQUFDO1FBRWxFLElBQUksTUFBTSxHQUFHLEdBQTZELENBQUM7UUFDM0UsSUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkUsSUFBSSxNQUFNLEVBQUU7WUFDVixNQUFNLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztZQUM3QixNQUFNLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUN4QixJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3JCLElBQU0sWUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7Z0JBQ3JDLElBQUksT0FBTyxZQUFVLEtBQUssVUFBVSxFQUFFO29CQUNwQyxNQUFNLENBQUMsVUFBVSxHQUFHLFVBQUMsVUFBVTt3QkFDN0Isc0JBQVcsWUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFLLGFBQWEsRUFBRTtvQkFDdkQsQ0FBQyxDQUFDO2lCQUNIO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxVQUFVLGtCQUFPLFlBQVUsRUFBSyxhQUFhLENBQUMsQ0FBQztpQkFDdkQ7YUFDRjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsVUFBVSxHQUFHLFVBQUMsVUFBVTtvQkFDN0Isc0JBQVcsVUFBVSxDQUFDLEVBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxFQUFLLGFBQWEsRUFBRTtnQkFDOUYsQ0FBQyxDQUFDO2FBQ0g7U0FDRjthQUFNO1lBQ0wsTUFBTSxHQUFHO2dCQUNQLE9BQU8sRUFBRSxXQUFXO2dCQUNwQixVQUFVLFlBQUMsVUFBVTtvQkFDbkIsc0JBQVcsVUFBVSxDQUFDLEVBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxFQUFLLGFBQWEsRUFBRTtnQkFDOUYsQ0FBQztnQkFDRCxRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDO1NBQ0g7UUFFRCxJQUFNLEtBQUssR0FBRyx3QkFBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhCLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDZCxJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0IsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDdEIsZ0NBQW9CLEVBQUU7UUFDdEIsMkNBQTJDO1FBQzNDLGVBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQXBDLENBQW9DLENBQUMsQ0FDbkQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVk7WUFDL0MsT0FBTyxLQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDN0IsZUFBRyxDQUFDLFVBQUMsRUFBcUI7b0JBQXBCLElBQUksUUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLEtBQUssUUFBQTtnQkFDdkIsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyx5QkFBdUIsTUFBTSwrQkFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hGLDBFQUEwRTtZQUM1RSxDQUFDLENBQUMsRUFDRixvQkFBUSxDQUFDLFVBQUMsRUFBcUI7b0JBQXBCLElBQUksUUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLEtBQUssUUFBQTtnQkFBTSxPQUFBLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7cUJBQ3RFLElBQUk7Z0JBQ0gsdURBQXVEO2dCQUN2RCxxQkFBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ2xCLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsZUFBRyxDQUFDLFVBQUEsTUFBTTtvQkFDUixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLHNCQUFvQixNQUFRLENBQUMsQ0FBQyxDQUFDO29CQUMxRSw0REFBNEQ7Z0JBQzlELENBQUMsQ0FBQyxDQUFDLENBQ0osRUFDRCxzQkFBVSxDQUFDLFVBQUMsR0FBRyxFQUFFLEdBQUc7b0JBQ2xCLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbkIsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQ0g7WUFmaUMsQ0FlakMsQ0FDRixFQUNELHFCQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDcEIseUJBQU0sQ0FBQyxXQUFXLENBQUMsRUFDbkIsZUFBRyxDQUFDLGNBQU0sT0FBQSxLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBN0QsQ0FBNkQsQ0FBQyxDQUN6RSxDQUFDLENBQ0gsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFDLE9BQU87WUFDbkIsT0FBTyxLQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDaEMsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFekIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILCtCQUFRLEdBQVIsVUFDRSxHQUErQztRQURqRCxpQkF5QkM7UUFyQkMsSUFBTSxJQUFJLEdBQUcsR0FBMEUsQ0FBQztRQUN4RixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBdUQsQ0FBQztRQUU5RSxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksSUFBSTtZQUMxQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUVyRCxJQUFJLFFBQVEsQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1lBQzFCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsVUFBQyxLQUFLLEVBQUUsTUFBTTtnQkFDN0IsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxhQUFVLEdBQUcsQ0FBQyxJQUFJLHVCQUFnQixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekgsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEU7UUFDRCxJQUFNLEtBQUssR0FBRyxxQkFBZ0IsQ0FDNUIsR0FBMEUsQ0FBQyxDQUFDO1FBRTlFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV4QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxrQ0FBVyxHQUFYLFVBQVksS0FBcUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRTtZQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLGVBQWUsR0FBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMsWUFBWSxFQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCw4QkFBTyxHQUFQLFVBQWlCLElBQXNDLEVBQUUsUUFBaUI7UUFDeEUsSUFBTSxNQUFNLEdBQUcsT0FBTyxHQUFHLENBQUMsUUFBUSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELElBQU0sZUFBZSxHQUFHLElBQUksY0FBTyxFQUFVLENBQUM7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyx5QkFBdUIsTUFBTSxjQUFXLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzFELE9BQU87WUFDTCxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsaUNBQVUsR0FBVixVQUNFLEtBQW9DO1FBQ3BDLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQU8sQ0FBQyxDQUFDLENBQUMsRUFBUSxDQUFDO0lBQy9ELENBQUM7SUFFRCxpQ0FBVSxHQUFWLFVBQWUsS0FBZ0I7UUFDN0IsT0FBUSxJQUFJLENBQUMsY0FBK0MsQ0FBQyxJQUFJLENBQy9ELGVBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQWIsQ0FBYSxDQUFDLEVBQ3ZCLGtCQUFNLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxFQUFFLElBQUksSUFBSSxFQUFWLENBQVUsQ0FBQyxFQUN4QixnQ0FBb0IsRUFBRSxDQUN2QixDQUFDO0lBQ0osQ0FBQztJQUVELG9DQUFhLEdBQWI7UUFDRSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxvQ0FBYSxHQUFiO1FBQ0UsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsK0JBQVEsR0FBUixVQUFZLE1BQXdCO1FBQ2xDLHdDQUF3QztRQUN4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7O09BR0c7SUFDSCx5Q0FBa0IsR0FBbEIsVUFBa0QsS0FBWTtRQUE5RCxpQkFhQztRQVhDLElBQU0sU0FBUyxHQUFHLEVBQTBCLENBQUM7Z0NBQ2pDLFNBQVMsRUFBRSxhQUFhO1lBQ2xDLElBQU0sTUFBSSxHQUFHLFNBQVMsQ0FBQztZQUN2QixJQUFNLFFBQVEsR0FBRztnQkFBQyxlQUFlO3FCQUFmLFVBQWUsRUFBZixxQkFBZSxFQUFmLElBQWU7b0JBQWYsMEJBQWU7O2dCQUMvQixJQUFNLE1BQU0sR0FBSSxhQUFxQixlQUFJLEtBQUssQ0FBQyxDQUFDO2dCQUNoRCxLQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QixPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUM7WUFDRixTQUFTLENBQUMsTUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDOztRQVA3QixLQUF5QyxVQUE2QixFQUE3QixLQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUE3QixjQUE2QixFQUE3QixJQUE2QjtZQUEzRCxJQUFBLFdBQTBCLEVBQXpCLFNBQVMsUUFBQSxFQUFFLGFBQWEsUUFBQTtvQkFBeEIsU0FBUyxFQUFFLGFBQWE7U0FRbkM7UUFDRCxPQUFPLFNBQTZCLENBQUM7SUFDdkMsQ0FBQztJQUVELG1DQUFZLEdBQVo7UUFDRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxlQUFHLENBQUMsVUFBQSxLQUFLO1lBQ1AsSUFBSSxLQUFLO2dCQUNQLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxFQUNGLGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRUQsbUNBQVksR0FBWjtRQUNFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBc0JPLGtEQUEyQixHQUFuQyxVQUVFLEtBQStFO1FBRS9FLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDdkIsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLFlBQVksRUFBRyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztTQUNwRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyx3Q0FBaUIsR0FBekI7UUFDRSxPQUFPLHlCQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUFuU0QsSUFtU0M7QUFuU1ksb0NBQVk7QUE0U3pCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0JHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQW9DLGVBQTBDO0lBRTdHLElBQU0sUUFBUSxHQUFHLEVBQTBDLENBQUM7NEJBQ2hELFFBQVEsRUFBRSxhQUFhO1FBQ2pDLFFBQVEsQ0FBQyxRQUFzRCxDQUFDLEdBQUcsVUFBUyxDQUFXLEVBQUUsTUFBMEI7WUFDakgsT0FBTyxhQUFhLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxDQUFRLENBQUM7O0lBSFgsS0FBd0MsVUFBK0IsRUFBL0IsS0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUEvQixjQUErQixFQUEvQixJQUErQjtRQUE1RCxJQUFBLFdBQXlCLEVBQXhCLFFBQVEsUUFBQSxFQUFFLGFBQWEsUUFBQTtnQkFBdkIsUUFBUSxFQUFFLGFBQWE7S0FJbEM7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBVEQsOENBU0M7QUFFRCxJQUFNLGFBQWEsR0FBRztJQUNwQixZQUFZLEVBQUUsRUFBZ0I7SUFDOUIsSUFBSSxFQUFFLE9BQU87SUFDYixRQUFRLEVBQUU7UUFDUixpQkFBaUIsRUFBakIsVUFBa0IsQ0FBYSxFQUFFLEVBQStCO2dCQUE5QixPQUFPLGFBQUE7WUFDdkMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDMUIsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUVGLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Q0FDdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBsaWI9XCJlczIwMTdcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaG1yLW1vZHVsZS5kLnRzXCIgLz5cbi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGggbWVtYmVyLW9yZGVyaW5nXG4vKipcbiAqIEEgY29tYm8gc2V0IGZvciB1c2luZyBSZWR1eC10b29sa2l0IGFsb25nIHdpdGggcmVkdXgtb2JzZXJ2YWJsZVxuICovXG5pbXBvcnQge1xuICBDYXNlUmVkdWNlciwgY29tYmluZVJlZHVjZXJzLCBjb25maWd1cmVTdG9yZSxcbiAgQ29uZmlndXJlU3RvcmVPcHRpb25zLCBjcmVhdGVTbGljZSBhcyByZWR1eENyZWF0ZVNsaWNlLCBDcmVhdGVTbGljZU9wdGlvbnMsXG4gIERyYWZ0LCBFbmhhbmNlZFN0b3JlLCBQYXlsb2FkQWN0aW9uLCBSZWR1Y2Vyc01hcE9iamVjdCxcbiAgU2xpY2UsIFNsaWNlQ2FzZVJlZHVjZXJzLCBSZWR1Y2VyLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlLCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWRcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VVbnRpbCwgdGFwLCBjYXRjaEVycm9yIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQge1BheWxvYWRBY3Rpb24sIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZX07XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiB7XG4gIF9pbml0OiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjx7aXNMYXp5OiBib29sZWFufT4+O1xuICBfY2hhbmdlOiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPj47XG59XG5cbmV4cG9ydCB0eXBlIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsXG4gIEFDUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPj4gPSBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzPFNTLCBBQ1I+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPjtcblxuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgVDEgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4pOlxuICAoc291cmNlOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxQMSwgVDE+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFAyLCBUMSBleHRlbmRzIHN0cmluZywgVDIgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAyLCBUMj4pOlxuKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UDEgfCBQMiwgVDEgfCBUMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFAzLCBUMSBleHRlbmRzIHN0cmluZywgVDIgZXh0ZW5kcyBzdHJpbmcsIFQzIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LFxuICBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+LCBhY3Rpb25DcmVhdG9yczM6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMywgVDM+KTpcbihzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFAxIHwgUDIgfCBQMywgVDEgfCBUMiB8IFQzPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD5bXSk6XG4gIChzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFAsIFQ+PiB7XG4gIHJldHVybiBvZlR5cGUoLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSkgYXMgYW55O1xufVxuXG4vLyB0eXBlIEFjdGlvblR5cGU8QUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8YW55PiwgVCBleHRlbmRzIGtleW9mIEFDUj4gPSBBQ1JbVF0gZXh0ZW5kcyAoc3RhdGU6IGFueSwgYWN0aW9uOiBpbmZlciBBY3Rpb24pID0+IGFueSA/IEFjdGlvbiA6IHZvaWQ7XG4vLyAvKipcbi8vICAqIFVubGluayBSZWR1eC1vYnNlcnZhYmxlIG9mZmljaWFsJ3Mgb2ZUeXBlKCkgZnVuY3Rpb24sIGl0IG9mZmVycyBiZXR0ZXIgdHlwZSBpbnRlcmVuY2Ugb25cbi8vICAqIHBheWxvYWQgdHlwZVxuLy8gICovXG4vLyBleHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPEFDUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+IHtcbi8vICAgPFQxIGV4dGVuZHMga2V5b2YgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxhbnksIEFDUj4+KGFjdGlvblR5cGU6IFQxKTpcbi8vICAgICAoc3JjOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZTxBQ1IsIFQxPj47XG4vLyAgIDxUMSBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+LCBUMiBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+Pihcbi8vICAgICBhY3Rpb25UeXBlOiBUMSwgYWN0aW9uVHlwZTI6IFQyKTpcbi8vICAgKHNyYzogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPEFjdGlvblR5cGU8QUNSLCBUMSB8IFQyPj47XG4vLyAgIDxUMSBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+LCBUMiBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+LCBUMyBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+PihhY3Rpb25UeXBlOiBUMSwgYWN0aW9uVHlwZTI6IFQyLCBhY3Rpb25UeXBlMzogVDMpOlxuLy8gICAoc3JjOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZTxBQ1IsIFQxIHwgVDIgfCBUMz4+O1xuLy8gICA8VCBleHRlbmRzIGtleW9mIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8YW55LCBBQ1I+PiguLi5hY3Rpb25UeXBlczogVFtdKTogT2JzZXJ2YWJsZTxBY3Rpb25UeXBlPEFDUiwgVD4+O1xuLy8gfVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3RhdGUge1xuICBhY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5jb25zdCBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj4gPSB7XG4gIF9jaGFuZ2U6IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICB9XG59O1xuXG50eXBlIEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPSBNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8aW5mZXIgUywgYW55LCBzdHJpbmc+ID8gUyA6IHVua25vd247XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbiAgU2xpY2U8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPixcbiAgKE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxhbnksIGluZmVyIF9DYXNlUmVkdWNlciwgc3RyaW5nPiA/IF9DYXNlUmVkdWNlciA6IFNsaWNlQ2FzZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+KSAmXG4gICAgRXh0cmFTbGljZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+LFxuICBzdHJpbmc+O1xuXG4vKiogQSBIZWxwZXIgaW5mZXIgdHlwZSAqL1xuZXhwb3J0IHR5cGUgSW5mZXJBY3Rpb25zVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbkluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT5bJ2FjdGlvbnMnXTtcbmV4cG9ydCBjbGFzcyBTdGF0ZUZhY3Rvcnkge1xuICAvKipcbiAgICogV2h5IEkgZG9uJ3QgdXNlIEVwaWMncyBzdGF0ZSQgcGFyYW1ldGVyOlxuICAgKiBcbiAgICogUmVkdXgtb2JzZXJ2YWJsZSdzIHN0YXRlJCBkb2VzIG5vdCBub3RpZnkgc3RhdGUgY2hhbmdlIGV2ZW50IHdoZW4gYSBsYXp5IGxvYWRlZCAocmVwbGFjZWQpIHNsaWNlIGluaXRpYWxpemUgc3RhdGUgXG4gICAqL1xuICByZWFsdGltZVN0YXRlJDogQmVoYXZpb3JTdWJqZWN0PHVua25vd24+O1xuICBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcblxuICByb290U3RvcmVSZWFkeTogUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj47XG4gIC8qKlxuICAgKiBzYW1lIGFzIHN0b3JlLmRpc3BhdGNoKGFjdGlvbiksIGJ1dCB0aGlzIG9uZSBnb2VzIHRocm91Z2ggUmVkdXgtb2JzZXJ2YWJsZSdzIGVwaWMgbWlkZGxld2FyZVxuICAgKi9cbiAgYWN0aW9uc1RvRGlzcGF0Y2ggPSBuZXcgUmVwbGF5U3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueT4+KDIwKTtcbiAgcmVwb3J0QWN0aW9uRXJyb3I6IChlcnI6IEVycm9yKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgZXBpY1NlcSA9IDA7XG4gIC8vIHByaXZhdGUgZ2xvYmFsQ2hhbmdlQWN0aW9uQ3JlYXRvciA9IGNyZWF0ZUFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8YW55PikgPT4gdm9pZD4oJ19fZ2xvYmFsX2NoYW5nZScpO1xuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IFN1YmplY3Q8W0VwaWM8UGF5bG9hZEFjdGlvbjx1bmtub3duPj4sIHN0cmluZywgU3ViamVjdDxzdHJpbmc+XT47XG5cblxuICBwcml2YXRlIGVycm9yU2xpY2U6IEluZmVyU2xpY2VUeXBlPHR5cGVvZiBlcnJvclNsaWNlT3B0PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ10pIHtcbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyKHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCkgYXMgUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbj4+O1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuXG4gIH1cblxuICAvLyBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSk6IHRoaXM7XG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIG9wdCBCZSBhd2FyZSwgdHVybiBvZmYgb3B0aW9uIFwic2VyaWFsaXphYmxlQ2hlY2tcIiBhbmQgXCJpbW11dGFibGVDaGVja1wiIGZyb20gUmVkdXggZGVmYXVsdCBtaWRkbGV3YXJlc1xuICAgKi9cbiAgY29uZmlndXJlU3RvcmUob3B0Pzoge1trZXkgaW4gRXhjbHVkZTwncmVkdWNlcicsIGtleW9mIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+Pj5dOiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj5ba2V5XX0pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgbGV0IGNmZ09wdCA9IG9wdCBhcyBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj47XG4gICAgY29uc3Qgb3VyTWlkZGx3YXJlcyA9IFt0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgZXBpY01pZGRsZXdhcmVdO1xuICAgIGlmIChjZmdPcHQpIHtcbiAgICAgIGNmZ09wdC5yZWR1Y2VyID0gcm9vdFJlZHVjZXI7XG4gICAgICBjZmdPcHQuZGV2VG9vbHMgPSBmYWxzZTtcbiAgICAgIGlmIChjZmdPcHQubWlkZGxld2FyZSkge1xuICAgICAgICBjb25zdCBleGl0aW5nTWlkID0gY2ZnT3B0Lm1pZGRsZXdhcmU7XG4gICAgICAgIGlmICh0eXBlb2YgZXhpdGluZ01pZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBbLi4uZXhpdGluZ01pZChnZXREZWZhdWx0KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IFsuLi5leGl0aW5nTWlkLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNmZ09wdCA9IHtcbiAgICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAgIG1pZGRsZXdhcmUoZ2V0RGVmYXVsdCkge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH0sXG4gICAgICAgIGRldlRvb2xzOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlKGNmZ09wdCk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIHRhcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGBdKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgLy8gdGFwKGFjdGlvbiA9PiBjb25zb2xlLmxvZygnYWN0aW9uOiAnLCBhY3Rpb24udHlwZSkpLFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIHRhcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gdW5zdWJzY3JpYmUgJHtlcGljSWR9YCk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9LCAnaW50ZXJuYWxEaXNwYXRjaGVyJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTUywgX0Nhc2VSZWR1Y2VyIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+IHtcblxuICAgIGNvbnN0IF9vcHQgPSBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPjtcbiAgICBjb25zdCByZWR1Y2VycyA9IF9vcHQucmVkdWNlcnMgYXMgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUywgX0Nhc2VSZWR1Y2VyPjtcblxuICAgIGlmIChyZWR1Y2Vycy5fY2hhbmdlID09IG51bGwpXG4gICAgICBPYmplY3QuYXNzaWduKF9vcHQucmVkdWNlcnMsIGRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPik7XG5cbiAgICB0aGlzLmFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcihzbGljZSk7XG5cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICByZW1vdmVTbGljZShzbGljZToge25hbWU6IHN0cmluZ30pIHtcbiAgICBkZWxldGUgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ3JlbW92ZSBzbGljZSAnKyBzbGljZS5uYW1lXSk7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSBmcm9tIHRoaXMgZXBpY1xuICAgKiBAcGFyYW0gZXBpYyBcbiAgICogQHBhcmFtIGVwaWNOYW1lIGEgbmFtZSBmb3IgZGVidWcgYW5kIGxvZ2dpbmcgcHVycG9zZVxuICAgKi9cbiAgYWRkRXBpYzxTID0gYW55PihlcGljOiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCBTPiwgZXBpY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKGVwaWNOYW1lIHx8ICsrdGhpcy5lcGljU2VxKTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWRkZWRgXSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCBlcGljSWQsIHVuc3Vic2NyaWJlRXBpY10pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZUVwaWMubmV4dChlcGljSWQpO1xuICAgICAgdW5zdWJzY3JpYmVFcGljLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgfVxuXG4gIHNsaWNlU3RhdGU8U1MsIENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFNTLCBDYXNlUmVkdWNlcnMsIE5hbWU+KTogU1Mge1xuICAgIGNvbnN0IHN0b3JlID0gdGhpcy5nZXRSb290U3RvcmUoKTtcbiAgICByZXR1cm4gc3RvcmUgPyBzdG9yZS5nZXRTdGF0ZSgpW3NsaWNlLm5hbWVdIGFzIFNTIDoge30gYXMgU1M7XG4gIH1cblxuICBzbGljZVN0b3JlPFNTPihzbGljZTogU2xpY2U8U1M+KTogT2JzZXJ2YWJsZTxTUz4ge1xuICAgIHJldHVybiAodGhpcy5yZWFsdGltZVN0YXRlJCBhcyBTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBTU30+KS5waXBlKFxuICAgICAgbWFwKHMgPT4gc1tzbGljZS5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICAgKTtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZGlzcGF0Y2gnLCBhY3Rpb24udHlwZSk7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBLCBTbGljZSBleHRlbmRzIHthY3Rpb25zOiBBfT4oc2xpY2U6IFNsaWNlKTogU2xpY2VbJ2FjdGlvbnMnXSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyB0eXBlb2Ygc2xpY2UuYWN0aW9ucztcbiAgICBmb3IgKGNvbnN0IFtzbGljZU5hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBuYW1lID0gc2xpY2VOYW1lO1xuICAgICAgY29uc3QgZG9BY3Rpb24gPSAoLi4ucGFyYW06IGFueVtdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IChhY3Rpb25DcmVhdG9yIGFzIGFueSkoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgICB9O1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXAgYXMgU2xpY2VbJ2FjdGlvbnMnXTtcbiAgfVxuXG4gIHN0b3BBbGxFcGljcygpIHtcbiAgICB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgdGFwKHN0b3JlID0+IHtcbiAgICAgICAgaWYgKHN0b3JlKVxuICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHtwYXlsb2FkOiBudWxsLCB0eXBlOiAnU1RPUF9FUElDJ30pO1xuICAgICAgfSksXG4gICAgICB0YWtlKDEpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVNaWRkbGV3YXJlOiBNaWRkbGV3YXJlID0gKGFwaSkgPT4ge1xuICAgIHJldHVybiAobmV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChhY3Rpb246IFBheWxvYWRBY3Rpb24pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnYWN0aW9uIGluIGVycm9ySGFuZGxlTWlkZGxld2FyZScsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydhY3Rpb24nLCBhY3Rpb24gIT0gbnVsbCA/IGFjdGlvbi50eXBlIDogYWN0aW9uXSk7XG4gICAgICAgICAgY29uc3QgcmV0ID0gbmV4dChhY3Rpb24pO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gZmFpbGVkIGFjdGlvbicsIGFjdGlvbik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBhY3Rpb24gZGlzcGF0Y2ggZXJyb3InLCBlcnIpO1xuICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyPFN0YXRlLFxuICAgIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTdGF0ZSwgU2xpY2VDYXNlUmVkdWNlcnM8U3RhdGU+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFN0YXRlPiwgTmFtZT5cbiAgICApIHtcbiAgICB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV0gPSBzbGljZS5yZWR1Y2VyO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogZmFsc2V9KSk7XG4gICAgfVxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdFJlZHVjZXIoKTogUmVkdWNlcjxhbnksIFBheWxvYWRBY3Rpb24+IHtcbiAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0ge1xuICBbVCBpbiBrZXlvZiBSXTogUltUXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/XG4gICAgKHN0YXRlOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxpbmZlciBQPikgPT4gYW55ID9cbiAgICAgIChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IFApID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOiAoc3RhdGU6IERyYWZ0PFM+LCBwYXlsb2FkOiB1bmtub3duKSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBTaW1wbGlmeSByZWR1Y2VycyBzdHJ1Y3R1cmUgcmVxdWlyZWQgaW4gU2xpY2UgY3JlYXRpb24gb3B0aW9uLlxuICogXG4gKiBOb3JtYWxseSwgdG8gY3JlYXRlIGEgc2xpY2UsIHlvdSBuZWVkIHRvIHByb3ZpZGUgYSBzbGljZSBvcHRpb24gcGFyYW10ZXIgbGlrZTpcbiAqIHtuYW1lOiA8bmFtZT4sIGluaXRpYWxTdGF0ZTogPHZhbHVlPiwgcmVkdWNlcnM6IHtcbiAqICBjYXNlUmVkdWNlcihzdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPikge1xuICogICAgLy8gbWFuaXB1bGF0ZSBzdGF0ZSBkcmFmdCB3aXRoIGRlc3RydWN0b3JlZCBwYXlsb2FkIGRhdGFcbiAqICB9XG4gKiB9fVxuICogXG4gKiBVbmNvbnZlbmllbnQgdGhpbmcgaXMgdGhlIFwiUGF5bG9hZEFjdGlvbjxQYXlsb2FkVHlwZT5cIiBwYXJ0IHdoaWNoIHNwZWNpZmllZCBhcyBzZWNvbmQgcGFyYW1ldGVyIGluIGV2ZXJ5IGNhc2UgcmVkdWNlciBkZWZpbml0aW9uLFxuICogYWN0dWFsbHkgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBQYXlsb2FkIHR5cGUgaW5zdGVhZCBvZiB0aGUgd2hvbGUgUGF5bG9hZEFjdGlvbiBpbiBjYXNlIHJlZHVjZXIuXG4gKiBcbiAqIHRoaXMgZnVuY3Rpb24gYWNjZXB0IGEgc2ltcGxpZmllZCB2ZXJzaW9uIG9mIFwiY2FzZSByZWR1Y2VyXCIgaW4gZm9ybSBvZjogXG4gKiB7XG4gKiAgICBbY2FzZU5hbWVdOiAoRHJhZnQ8U3RhdGU+LCBwYXlsb2FkOiBhbnkpID0+IERyYWZ0PFN0YXRlPiB8IHZvaWQ7XG4gKiB9XG4gKiBcbiAqIHJldHVybiBhIHJlZ3VsYXIgQ2FzZSByZWR1Y2Vycywgbm90IGxvbmdlciBuZWVkcyB0byBcImRlc3RydWN0b3JcIiBhY3Rpb24gcGFyYW10ZXIgdG8gZ2V0IHBheWxvYWQgZGF0YS5cbiAqIFxuICogQHBhcmFtIHBheWxvYWRSZWR1Y2VycyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVBheWxvZFJlZHVjZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihwYXlsb2FkUmVkdWNlcnM6IFBheWxvYWRDYXNlUmVkdWNlcnM8UywgUj4pOlxuICBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ10ge1xuICBjb25zdCByZWR1Y2VycyA9IHt9IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXTtcbiAgZm9yIChjb25zdCBbY2FzZU5hbWUsIHNpbXBsZVJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHBheWxvYWRSZWR1Y2VycykpIHtcbiAgICByZWR1Y2Vyc1tjYXNlTmFtZSBhcyBrZXlvZiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ11dID0gZnVuY3Rpb24oczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxhbnk+KSB7XG4gICAgICByZXR1cm4gc2ltcGxlUmVkdWNlcihzLCBhY3Rpb24ucGF5bG9hZCk7XG4gICAgfSBhcyBhbnk7XG4gIH1cbiAgcmV0dXJuIHJlZHVjZXJzO1xufVxuXG5jb25zdCBlcnJvclNsaWNlT3B0ID0ge1xuICBpbml0aWFsU3RhdGU6IHt9IGFzIEVycm9yU3RhdGUsXG4gIG5hbWU6ICdlcnJvcicsXG4gIHJlZHVjZXJzOiB7XG4gICAgcmVwb3J0QWN0aW9uRXJyb3IoczogRXJyb3JTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEVycm9yPikge1xuICAgICAgcy5hY3Rpb25FcnJvciA9IHBheWxvYWQ7XG4gICAgfVxuICB9XG59O1xuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==