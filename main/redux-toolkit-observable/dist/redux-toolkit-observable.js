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
// tslint:disable: max-line-length
// tslint:disable: member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
var toolkit_1 = require("@reduxjs/toolkit");
// import {Action} from 'redux';
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
         * Unlike store.dispatch(action),
         * If you call next() on this subject, it can save action dispatch an action even before store is configured
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        this.errorHandleMiddleware = function (api) {
            return function (next) {
                return function (action) {
                    try {
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
        this.epicWithUnsub$ = new rxjs_1.ReplaySubject(2);
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(operators_1.filter(function (store) { return store != null; }), operators_1.take(1)).toPromise();
        var errorSlice = this.newSlice({
            initialState: {},
            name: 'error',
            reducers: {
                reportActionError: function (s, _a) {
                    var payload = _a.payload;
                    s.actionError = payload;
                }
            }
        });
        this.errorSlice = errorSlice;
        this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
    }
    StateFactory.prototype.configureStore = function (middlewares) {
        var _this = this;
        if (this.store$.getValue())
            return this;
        var rootReducer = this.createRootReducer();
        var epicMiddleware = redux_observable_1.createEpicMiddleware();
        var middleware = middlewares ? __spreadArrays([epicMiddleware, this.errorHandleMiddleware], middlewares) : [epicMiddleware, this.errorHandleMiddleware];
        var store = toolkit_1.configureStore({
            reducer: rootReducer,
            // preloadedState: this.preloadedState,
            middleware: middleware
        });
        this.store$.next(store);
        store.subscribe(function () {
            var state = store.getState();
            _this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe(operators_1.distinctUntilChanged(), 
        // tap(() => console.log('state changed')),
        operators_1.tap(function (state) { return _this.debugLog.next(['state', state]); })).subscribe();
        epicMiddleware.run(function (action$, state$, dependencies) {
            return _this.epicWithUnsub$.pipe(operators_1.mergeMap(function (_a) {
                var epic = _a[0], unsub = _a[1];
                return epic(action$, state$, dependencies)
                    .pipe(operators_1.takeUntil(unsub.pipe(operators_1.take(1), operators_1.tap(function (epicId) {
                    _this.debugLog.next(['[redux-toolkit-obs]', "unsubscribe from " + epicId]);
                }))));
            }), 
            // tslint:disable-next-line: no-console
            operators_1.takeUntil(action$.pipe(redux_observable_1.ofType('STOP_EPIC'), operators_1.tap(function () { return _this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics']); }))));
        });
        this.addEpic(function (action$) {
            return _this.actionsToDispatch;
        });
        // this.actionsToDispatch.pipe(
        //   tap(action => store.dispatch(action))
        // ).subscribe();
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
     */
    StateFactory.prototype.addEpic = function (epic) {
        var epicId = 'Epic-' + ++this.epicSeq;
        var unsubscribeEpic = new rxjs_1.Subject();
        this.epicWithUnsub$.next([epic, unsubscribeEpic]);
        this.debugLog.next(['[redux-toolkit-obs]', epicId + ' is added']);
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
    StateFactory.prototype.getRootStore = function () {
        return this.store$.getValue();
    };
    return StateFactory;
}());
exports.StateFactory = StateFactory;
if (module.hot) {
    module.hot.decline();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQyxrQ0FBa0M7QUFDbEM7O0dBRUc7QUFDSCw0Q0FNMEI7QUFDMUIsZ0NBQWdDO0FBQ2hDLHFEQUFzRTtBQUN0RSw2QkFBMkU7QUFDM0UsNENBQW1HO0FBYW5HLFNBQWdCLGVBQWU7SUFBSSx3QkFBMkM7U0FBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO1FBQTNDLG1DQUEyQzs7SUFFNUUsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxFQUFFO0FBQ3BELENBQUM7QUFIRCwwQ0FHQztBQW9CRCxJQUFNLG9CQUFvQixHQUFxQztJQUM3RCxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtRQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBRUY7SUEyQkUsc0JBQW9CLGNBQXVEO1FBQTNFLGlCQXlCQztRQXpCbUIsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBcEJuRSxXQUFNLEdBQUcsSUFBSSxzQkFBZSxDQUFxRCxTQUFTLENBQUMsQ0FBQztRQUlwRzs7O1dBR0c7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBRXRELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUEyTXhDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMs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QyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyx3Q0FBaUIsR0FBekI7UUFDRSxPQUFPLHlCQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxtQ0FBWSxHQUFwQjtRQUNFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUgsbUJBQUM7QUFBRCxDQUFDLEFBelFELElBeVFDO0FBelFZLG9DQUFZO0FBMlF6QixJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUU7SUFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0NBQ3RCIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgbGliPVwiZXMyMDE3XCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2htci1tb2R1bGUuZC50c1wiIC8+XG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWVtYmVyLW9yZGVyaW5nXG4vKipcbiAqIEEgY29tYm8gc2V0IGZvciB1c2luZyBSZWR1eC10b29sa2l0IGFsb25nIHdpdGggcmVkdXgtb2JzZXJ2YWJsZVxuICovXG5pbXBvcnQge1xuICBDYXNlUmVkdWNlciwgY29tYmluZVJlZHVjZXJzLCBjb25maWd1cmVTdG9yZSxcbiAgQ29uZmlndXJlU3RvcmVPcHRpb25zLCBjcmVhdGVTbGljZSBhcyByZWR1eENyZWF0ZVNsaWNlLCBDcmVhdGVTbGljZU9wdGlvbnMsXG4gIERyYWZ0LCBFbmhhbmNlZFN0b3JlLCBQYXlsb2FkQWN0aW9uLCBSZWR1Y2Vyc01hcE9iamVjdCxcbiAgU2xpY2UsIFNsaWNlQ2FzZVJlZHVjZXJzLCBSZWR1Y2VyLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlXG59IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuLy8gaW1wb3J0IHtBY3Rpb259IGZyb20gJ3JlZHV4JztcbmltcG9ydCB7IGNyZWF0ZUVwaWNNaWRkbGV3YXJlLCBFcGljLCBvZlR5cGUgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgUmVwbGF5U3ViamVjdCwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZVVudGlsLCB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbi8vIGV4cG9ydCB0eXBlIENhbGxCYWNrQWN0aW9uUmVkdWNlcjxTUz4gPSBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiB7XG4gIF9pbml0OiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjx7aXNMYXp5OiBib29sZWFufT4+O1xuICBfY2hhbmdlOiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPj47XG59XG5cbmV4cG9ydCB0eXBlIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsXG4gIEFDUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPj4gPSBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzPFNTLCBBQ1I+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPjtcblxudHlwZSBTaW1wbGVBY3Rpb25DcmVhdG9yPFA+ID0gKChwYXlsb2FkPzogUCkgPT4gUGF5bG9hZEFjdGlvbjxQPikgJiB7dHlwZTogc3RyaW5nfTtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UD4oLi4uYWN0aW9uQ3JlYXRvcnM6IFNpbXBsZUFjdGlvbkNyZWF0b3I8UD5bXSk6XG4gIChzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFA+PiB7XG4gIHJldHVybiBvZlR5cGUoLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb24oLi4uYWN0aW9uQ3JlYXRvcnM6IGFueVtdKTpcbi8vICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxhbnk+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248c3RyaW5nPj4ge1xuLy8gICByZXR1cm4gb2ZUeXBlPGFueT4oLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSk7XG4vLyB9XG5cbi8vIHR5cGUgU3RhdGVGcm9tUmVkdWNlcjxUPiA9IFQgZXh0ZW5kcyBSZWR1Y2VyPENvbWJpbmVkU3RhdGU8aW5mZXIgUz4+ID8gUyA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdXhTdG9yZVdpdGhFcGljT3B0aW9uczxTdGF0ZSA9IGFueSwgUGF5bG9hZCA9IGFueSwgT3V0cHV0IGV4dGVuZHMgUGF5bG9hZEFjdGlvbjxQYXlsb2FkPiA9IFBheWxvYWRBY3Rpb248UGF5bG9hZD4sXG5DYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+ID0gU2xpY2VDYXNlUmVkdWNlcnM8YW55PiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ge1xuICBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddO1xuICBzbGljZXM6IFNsaWNlPFN0YXRlLCBDYXNlUmVkdWNlcnMsIE5hbWU+W107XG4gIGVwaWNzOiBFcGljPFBheWxvYWRBY3Rpb248UGF5bG9hZD4sIE91dHB1dCwgU3RhdGU+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZUZhY3Rvcnkge1xuICAvKipcbiAgICogV2h5IEkgZG9uJ3QgdXNlIEVwaWMncyBzdGF0ZSQgcGFyYW1ldGVyOlxuICAgKiBcbiAgICogUmVkdXgtb2JzZXJ2YWJsZSdzIHN0YXRlJCBkb2VzIG5vdCBub3RpZnkgc3RhdGUgY2hhbmdlIGV2ZW50IHdoZW4gYSBsYXp5IGxvYWRlZCAocmVwbGFjZWQpIHNsaWNlIGluaXRpYWxpemUgc3RhdGUgXG4gICAqL1xuICByZWFsdGltZVN0YXRlJDogQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBhbnl9PjtcbiAgcHJpdmF0ZSBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcblxuICByb290U3RvcmVSZWFkeTogUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj47XG4gIC8qKlxuICAgKiBVbmxpa2Ugc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSxcbiAgICogSWYgeW91IGNhbGwgbmV4dCgpIG9uIHRoaXMgc3ViamVjdCwgaXQgY2FuIHNhdmUgYWN0aW9uIGRpc3BhdGNoIGFuIGFjdGlvbiBldmVuIGJlZm9yZSBzdG9yZSBpcyBjb25maWd1cmVkXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuXG4gIHByaXZhdGUgZXBpY1NlcSA9IDA7XG4gIC8vIHByaXZhdGUgZ2xvYmFsQ2hhbmdlQWN0aW9uQ3JlYXRvciA9IGNyZWF0ZUFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8YW55PikgPT4gdm9pZD4oJ19fZ2xvYmFsX2NoYW5nZScpO1xuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IFN1YmplY3Q8W0VwaWMsIFN1YmplY3Q8c3RyaW5nPl0+O1xuXG4gIHByaXZhdGUgcmVwb3J0QWN0aW9uRXJyb3I6IChlcnI6IEVycm9yKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgZXJyb3JTbGljZTogU2xpY2U8RXJyb3JTdGF0ZT47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8YW55PihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0KDIpO1xuICAgIHRoaXMubG9nJCA9IHRoaXMuZGVidWdMb2cuYXNPYnNlcnZhYmxlKCk7XG4gICAgdGhpcy5yZWR1Y2VyTWFwID0ge307XG5cbiAgICB0aGlzLnJvb3RTdG9yZVJlYWR5ID0gdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIGZpbHRlcjxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj4oc3RvcmUgPT4gc3RvcmUgIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICAgIGNvbnN0IGVycm9yU2xpY2UgPSB0aGlzLm5ld1NsaWNlKHtcbiAgICAgIGluaXRpYWxTdGF0ZToge30gYXMgRXJyb3JTdGF0ZSxcbiAgICAgIG5hbWU6ICdlcnJvcicsXG4gICAgICByZWR1Y2Vyczoge1xuICAgICAgICByZXBvcnRBY3Rpb25FcnJvcihzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248RXJyb3I+KSB7XG4gICAgICAgICAgcy5hY3Rpb25FcnJvciA9IHBheWxvYWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuZXJyb3JTbGljZSA9IGVycm9yU2xpY2U7XG5cbiAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yID0gdGhpcy5iaW5kQWN0aW9uQ3JlYXRvcnMoZXJyb3JTbGljZSkucmVwb3J0QWN0aW9uRXJyb3I7XG5cbiAgfVxuXG4gIGNvbmZpZ3VyZVN0b3JlKG1pZGRsZXdhcmVzPzogTWlkZGxld2FyZVtdKSB7XG4gICAgaWYgKHRoaXMuc3RvcmUkLmdldFZhbHVlKCkpXG4gICAgICByZXR1cm4gdGhpcztcbiAgICBjb25zdCByb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICBjb25zdCBlcGljTWlkZGxld2FyZSA9IGNyZWF0ZUVwaWNNaWRkbGV3YXJlPFBheWxvYWRBY3Rpb248YW55Pj4oKTtcblxuICAgIGNvbnN0IG1pZGRsZXdhcmUgPSBtaWRkbGV3YXJlcyA/IFtlcGljTWlkZGxld2FyZSwgdGhpcy5lcnJvckhhbmRsZU1pZGRsZXdhcmUsIC4uLm1pZGRsZXdhcmVzXSA6IFtlcGljTWlkZGxld2FyZSwgdGhpcy5lcnJvckhhbmRsZU1pZGRsZXdhcmVdO1xuICAgIGNvbnN0IHN0b3JlID0gY29uZmlndXJlU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4sIE1pZGRsZXdhcmU8YW55PltdPih7XG4gICAgICByZWR1Y2VyOiByb290UmVkdWNlcixcbiAgICAgIC8vIHByZWxvYWRlZFN0YXRlOiB0aGlzLnByZWxvYWRlZFN0YXRlLFxuICAgICAgbWlkZGxld2FyZVxuICAgIH0pO1xuXG4gICAgdGhpcy5zdG9yZSQubmV4dChzdG9yZSk7XG5cbiAgICBzdG9yZS5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgY29uc3Qgc3RhdGUgPSBzdG9yZS5nZXRTdGF0ZSgpO1xuICAgICAgdGhpcy5yZWFsdGltZVN0YXRlJC5uZXh0KHN0YXRlKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAvLyB0YXAoKCkgPT4gY29uc29sZS5sb2coJ3N0YXRlIGNoYW5nZWQnKSksXG4gICAgICB0YXAoc3RhdGUgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnc3RhdGUnLCBzdGF0ZV0pKVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICBlcGljTWlkZGxld2FyZS5ydW4oKGFjdGlvbiQsIHN0YXRlJCwgZGVwZW5kZW5jaWVzKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5lcGljV2l0aFVuc3ViJC5waXBlKFxuICAgICAgICBtZXJnZU1hcCgoW2VwaWMsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpIGFzIFJldHVyblR5cGU8RXBpYz4pXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICB0YWtlVW50aWwodW5zdWIucGlwZShcbiAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgdGFwKGVwaWNJZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGB1bnN1YnNjcmliZSBmcm9tICR7ZXBpY0lkfWBdKTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICApLFxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgdGFrZVVudGlsKGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlR5cGUoJ1NUT1BfRVBJQycpLFxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ1N0b3AgYWxsIGVwaWNzJ10pKVxuICAgICAgICApKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEVwaWMoKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoO1xuICAgIH0pO1xuXG4gICAgLy8gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICAgIC8vICAgdGFwKGFjdGlvbiA9PiBzdG9yZS5kaXNwYXRjaChhY3Rpb24pKVxuICAgIC8vICkuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTUywgX0Nhc2VSZWR1Y2VyIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyLCBOYW1lPikge1xuXG4gICAgY29uc3QgX29wdCA9IG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLCBfQ2FzZVJlZHVjZXI+O1xuXG4gICAgaWYgKHJlZHVjZXJzLl9jaGFuZ2UgPT0gbnVsbClcbiAgICAgIE9iamVjdC5hc3NpZ24oX29wdC5yZWR1Y2VycywgZGVmYXVsdFNsaWNlUmVkdWNlcnMpO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9pbml0ID09IG51bGwpIHtcbiAgICAgIHJlZHVjZXJzLl9pbml0ID0gKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGBzbGljZSBcIiR7b3B0Lm5hbWV9XCIgaXMgY3JlYXRlZCAke2FjdGlvbi5wYXlsb2FkLmlzTGF6eSA/ICdsYXppbHknIDogJyd9YF0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcmVsb2FkZWRTdGF0ZSAmJiB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHQuaW5pdGlhbFN0YXRlLCB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSk7XG4gICAgfVxuICAgIGNvbnN0IHNsaWNlID0gcmVkdXhDcmVhdGVTbGljZShcbiAgICAgIG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKi9cbiAgYWRkRXBpYzxTID0gYW55PihcbiAgICBlcGljOiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCBTPikge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyArK3RoaXMuZXBpY1NlcTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCB1bnN1YnNjcmliZUVwaWNdKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgZXBpY0lkICsgJyBpcyBhZGRlZCddKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVFcGljLm5leHQoZXBpY0lkKTtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5jb21wbGV0ZSgpO1xuICAgIH07XG4gIH1cblxuICBzbGljZVN0YXRlPFNTLCBDYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTUywgQ2FzZVJlZHVjZXJzLCBOYW1lPik6IFNTIHtcbiAgICBjb25zdCBzdG9yZSA9IHRoaXMuZ2V0Um9vdFN0b3JlKCk7XG4gICAgcmV0dXJuIHN0b3JlID8gc3RvcmUuZ2V0U3RhdGUoKVtzbGljZS5uYW1lXSBhcyBTUyA6IHt9IGFzIFNTO1xuICB9XG5cbiAgc2xpY2VTdG9yZTxTUz4oc2xpY2U6IFNsaWNlPFNTPik6IE9ic2VydmFibGU8U1M+IHtcbiAgICByZXR1cm4gKHRoaXMucmVhbHRpbWVTdGF0ZSQgYXMgQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBTU30+KS5waXBlKFxuICAgICAgbWFwKHMgPT4gc1tzbGljZS5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICAgKTtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZGlzcGF0Y2gnLCBhY3Rpb24udHlwZSk7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBLCBTbGljZSBleHRlbmRzIHthY3Rpb25zOiBBfT4oc2xpY2U6IFNsaWNlKSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyB0eXBlb2Ygc2xpY2UuYWN0aW9ucztcbiAgICBmb3IgKGNvbnN0IFtzbGljZU5hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBuYW1lID0gc2xpY2VOYW1lO1xuICAgICAgY29uc3QgZG9BY3Rpb24gPSAoLi4ucGFyYW06IGFueVtdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IChhY3Rpb25DcmVhdG9yIGFzIGFueSkoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgICB9O1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXAgYXMgU2xpY2VbJ2FjdGlvbnMnXTtcbiAgfVxuXG4gIHN0b3BBbGxFcGljcygpIHtcbiAgICB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgdGFwKHN0b3JlID0+IHtcbiAgICAgICAgaWYgKHN0b3JlKVxuICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHtwYXlsb2FkOiBudWxsLCB0eXBlOiAnU1RPUF9FUElDJ30pO1xuICAgICAgfSksXG4gICAgICB0YWtlKDEpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVNaWRkbGV3YXJlOiBNaWRkbGV3YXJlID0gKGFwaSkgPT4ge1xuICAgIHJldHVybiAobmV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChhY3Rpb246IFBheWxvYWRBY3Rpb24pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydhY3Rpb24nLCBhY3Rpb24gIT0gbnVsbCA/IGFjdGlvbi50eXBlIDogYWN0aW9uXSk7XG5cbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXI8U3RhdGUsXG4gICAgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICAgICkge1xuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IHRydWV9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiBmYWxzZX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSb290UmVkdWNlcigpOiBSZWR1Y2VyIHtcbiAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCk7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG59XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGVjbGluZSgpO1xufVxuIl19