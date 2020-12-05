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
        this.epicWithUnsub$ = new rxjs_1.ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(operators_1.filter(function (store) { return store != null; }), operators_1.take(1)).toPromise();
        var errorSlice = this.newSlice(errorSliceOpt);
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
                }))), operators_1.catchError(function (err) {
                    _this.reportActionError(err);
                    console.error(err);
                    return rxjs_1.EMPTY;
                }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQyxrQ0FBa0M7QUFDbEM7O0dBRUc7QUFDSCw0Q0FNMEI7QUFDMUIsZ0NBQWdDO0FBQ2hDLHFEQUFzRTtBQUN0RSw2QkFBa0Y7QUFDbEYsNENBQStHO0FBZS9HLFNBQWdCLGVBQWU7SUFBSSx3QkFBMkM7U0FBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO1FBQTNDLG1DQUEyQzs7SUFFNUUsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxFQUFFO0FBQ3BELENBQUM7QUFIRCwwQ0FHQztBQW9CRCxJQUFNLG9CQUFvQixHQUFxQztJQUM3RCxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtRQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBWUY7SUEyQkUsc0JBQW9CLGNBQXVEO1FBQTNFLGlCQWlCQztRQWpCbUIsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBcEJuRSxXQUFNLEdBQUcsSUFBSSxzQkFBZSxDQUFxRCxTQUFTLENBQUMsQ0FBQztRQUlwRzs7O1dBR0c7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBRXRELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUF5TXhDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMs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QyxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyx3Q0FBaUIsR0FBekI7UUFDRSxPQUFPLHlCQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxtQ0FBWSxHQUFwQjtRQUNFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBQ0gsbUJBQUM7QUFBRCxDQUFDLEFBdFFELElBc1FDO0FBdFFZLG9DQUFZO0FBd1F6QixJQUFNLGFBQWEsR0FBRztJQUNwQixZQUFZLEVBQUUsRUFBZ0I7SUFDOUIsSUFBSSxFQUFFLE9BQU87SUFDYixRQUFRLEVBQUU7UUFDUixpQkFBaUIsRUFBakIsVUFBa0IsQ0FBYSxFQUFFLEVBQStCO2dCQUE5QixPQUFPLGFBQUE7WUFDdkMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDMUIsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUdGLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Q0FDdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBsaWI9XCJlczIwMTdcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaG1yLW1vZHVsZS5kLnRzXCIgLz5cbi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbi8vIHRzbGludDpkaXNhYmxlOiBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmVcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG4vLyBpbXBvcnQge0FjdGlvbn0gZnJvbSAncmVkdXgnO1xuaW1wb3J0IHsgY3JlYXRlRXBpY01pZGRsZXdhcmUsIEVwaWMsIG9mVHlwZSB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBSZXBsYXlTdWJqZWN0LCBTdWJqZWN0LCBFTVBUWSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZVVudGlsLCB0YXAsIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB7UGF5bG9hZEFjdGlvbixcbiAgQ3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2V9O1xuLy8gZXhwb3J0IHR5cGUgQ2FsbEJhY2tBY3Rpb25SZWR1Y2VyPFNTPiA9IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+PjtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG50eXBlIFNpbXBsZUFjdGlvbkNyZWF0b3I8UD4gPSAoKHBheWxvYWQ/OiBQKSA9PiBQYXlsb2FkQWN0aW9uPFA+KSAmIHt0eXBlOiBzdHJpbmd9O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQPiguLi5hY3Rpb25DcmVhdG9yczogU2ltcGxlQWN0aW9uQ3JlYXRvcjxQPltdKTpcbiAgKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbiguLi5hY3Rpb25DcmVhdG9yczogYW55W10pOlxuLy8gICAoc291cmNlOiBPYnNlcnZhYmxlPGFueT4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxzdHJpbmc+PiB7XG4vLyAgIHJldHVybiBvZlR5cGU8YW55PiguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbi8vIH1cblxuLy8gdHlwZSBTdGF0ZUZyb21SZWR1Y2VyPFQ+ID0gVCBleHRlbmRzIFJlZHVjZXI8Q29tYmluZWRTdGF0ZTxpbmZlciBTPj4gPyBTIDogdW5rbm93bjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWR1eFN0b3JlV2l0aEVwaWNPcHRpb25zPFN0YXRlID0gYW55LCBQYXlsb2FkID0gYW55LCBPdXRwdXQgZXh0ZW5kcyBQYXlsb2FkQWN0aW9uPFBheWxvYWQ+ID0gUGF5bG9hZEFjdGlvbjxQYXlsb2FkPixcbkNhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4gPSBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiB7XG4gIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ107XG4gIHNsaWNlczogU2xpY2U8U3RhdGUsIENhc2VSZWR1Y2VycywgTmFtZT5bXTtcbiAgZXBpY3M6IEVwaWM8UGF5bG9hZEFjdGlvbjxQYXlsb2FkPiwgT3V0cHV0LCBTdGF0ZT5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN0YXRlIHtcbiAgYWN0aW9uRXJyb3I/OiBFcnJvcjtcbn1cblxuY29uc3QgZGVmYXVsdFNsaWNlUmVkdWNlcnM6IFBhcnRpYWw8RXh0cmFTbGljZVJlZHVjZXJzPGFueT4+ID0ge1xuICBfY2hhbmdlOiAoc3RhdGUsIGFjdGlvbikgPT4ge1xuICAgIGFjdGlvbi5wYXlsb2FkKHN0YXRlKTtcbiAgfVxufTtcblxudHlwZSBJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID0gTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGluZmVyIFMsIGFueSwgc3RyaW5nPiA/IFMgOiB1bmtub3duO1xuXG5leHBvcnQgdHlwZSBJbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbiAgU2xpY2U8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPixcbiAgKE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxhbnksIGluZmVyIF9DYXNlUmVkdWNlciwgc3RyaW5nPiA/IF9DYXNlUmVkdWNlciA6IFNsaWNlQ2FzZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+KSAmXG4gICAgRXh0cmFTbGljZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+LFxuICBzdHJpbmc+O1xuXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPlsnYWN0aW9ucyddO1xuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8e1trZXk6IHN0cmluZ106IGFueX0+O1xuICBwcml2YXRlIHN0b3JlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gIGxvZyQ6IE9ic2VydmFibGU8YW55W10+O1xuXG4gIHJvb3RTdG9yZVJlYWR5OiBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PjtcbiAgLyoqXG4gICAqIFVubGlrZSBzdG9yZS5kaXNwYXRjaChhY3Rpb24pLFxuICAgKiBJZiB5b3UgY2FsbCBuZXh0KCkgb24gdGhpcyBzdWJqZWN0LCBpdCBjYW4gc2F2ZSBhY3Rpb24gZGlzcGF0Y2ggYW4gYWN0aW9uIGV2ZW4gYmVmb3JlIHN0b3JlIGlzIGNvbmZpZ3VyZWRcbiAgICovXG4gIGFjdGlvbnNUb0Rpc3BhdGNoID0gbmV3IFJlcGxheVN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnk+PigyMCk7XG5cbiAgcHJpdmF0ZSBlcGljU2VxID0gMDtcbiAgLy8gcHJpdmF0ZSBnbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yID0gY3JlYXRlQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxhbnk+KSA9PiB2b2lkPignX19nbG9iYWxfY2hhbmdlJyk7XG4gIHByaXZhdGUgZGVidWdMb2cgPSBuZXcgUmVwbGF5U3ViamVjdDxhbnlbXT4oMTUpO1xuICBwcml2YXRlIHJlZHVjZXJNYXA6IFJlZHVjZXJzTWFwT2JqZWN0PGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PjtcbiAgcHJpdmF0ZSBlcGljV2l0aFVuc3ViJDogU3ViamVjdDxbRXBpYywgU3ViamVjdDxzdHJpbmc+XT47XG5cbiAgcHJpdmF0ZSByZXBvcnRBY3Rpb25FcnJvcjogKGVycjogRXJyb3IpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBlcnJvclNsaWNlOiBJbmZlclNsaWNlVHlwZTx0eXBlb2YgZXJyb3JTbGljZU9wdD47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8YW55PihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuXG4gIH1cblxuICBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSkge1xuICAgIGlmICh0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpKVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgY29uc3QgZXBpY01pZGRsZXdhcmUgPSBjcmVhdGVFcGljTWlkZGxld2FyZTxQYXlsb2FkQWN0aW9uPGFueT4+KCk7XG5cbiAgICBjb25zdCBtaWRkbGV3YXJlID0gbWlkZGxld2FyZXMgPyBbZXBpY01pZGRsZXdhcmUsIHRoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlLCAuLi5taWRkbGV3YXJlc10gOiBbZXBpY01pZGRsZXdhcmUsIHRoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlXTtcbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+LCBNaWRkbGV3YXJlPGFueT5bXT4oe1xuICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAvLyBwcmVsb2FkZWRTdGF0ZTogdGhpcy5wcmVsb2FkZWRTdGF0ZSxcbiAgICAgIG1pZGRsZXdhcmVcbiAgICB9KTtcblxuICAgIHRoaXMuc3RvcmUkLm5leHQoc3RvcmUpO1xuXG4gICAgc3RvcmUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQubmV4dChzdGF0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gdGFwKCgpID0+IGNvbnNvbGUubG9nKCdzdGF0ZSBjaGFuZ2VkJykpLFxuICAgICAgdGFwKHN0YXRlID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ3N0YXRlJywgc3RhdGVdKSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZXBpY01pZGRsZXdhcmUucnVuKChhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXBpY1dpdGhVbnN1YiQucGlwZShcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCB1bnN1Yl0pID0+IChlcGljKGFjdGlvbiQsIHN0YXRlJCwgZGVwZW5kZW5jaWVzKSBhcyBSZXR1cm5UeXBlPEVwaWM+KVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIHRhcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApLFxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgdGFrZVVudGlsKGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlR5cGUoJ1NUT1BfRVBJQycpLFxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ1N0b3AgYWxsIGVwaWNzJ10pKVxuICAgICAgICApKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEVwaWMoKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoO1xuICAgIH0pO1xuXG4gICAgLy8gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICAgIC8vICAgdGFwKGFjdGlvbiA9PiBzdG9yZS5kaXNwYXRjaChhY3Rpb24pKVxuICAgIC8vICkuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTUywgX0Nhc2VSZWR1Y2VyIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+IHtcblxuICAgIGNvbnN0IF9vcHQgPSBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPjtcbiAgICBjb25zdCByZWR1Y2VycyA9IF9vcHQucmVkdWNlcnMgYXMgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUywgX0Nhc2VSZWR1Y2VyPjtcblxuICAgIGlmIChyZWR1Y2Vycy5fY2hhbmdlID09IG51bGwpXG4gICAgICBPYmplY3QuYXNzaWduKF9vcHQucmVkdWNlcnMsIGRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPik7XG5cbiAgICB0aGlzLmFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcihzbGljZSk7XG5cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICByZW1vdmVTbGljZShzbGljZToge25hbWU6IHN0cmluZ30pIHtcbiAgICBkZWxldGUgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ3JlbW92ZSBzbGljZSAnKyBzbGljZS5uYW1lXSk7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSBmcm9tIHRoaXMgZXBpY1xuICAgKiBAcGFyYW0gZXBpYyBcbiAgICovXG4gIGFkZEVwaWM8UyA9IGFueT4oXG4gICAgZXBpYzogRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgUz4pIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKyt0aGlzLmVwaWNTZXE7XG4gICAgY29uc3QgdW5zdWJzY3JpYmVFcGljID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQubmV4dChbZXBpYywgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGVwaWNJZCArICcgaXMgYWRkZWQnXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIEJlaGF2aW9yU3ViamVjdDx7W2tleTogc3RyaW5nXTogU1N9PikucGlwZShcbiAgICAgIG1hcChzID0+IHNbc2xpY2UubmFtZV0pLFxuICAgICAgZmlsdGVyKHNzID0+IHNzICE9IG51bGwpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICAgICk7XG4gIH1cblxuICBnZXRFcnJvclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RhdGUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGdldEVycm9yU3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdG9yZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZGlzcGF0Y2g8VD4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFQ+KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2Rpc3BhdGNoJywgYWN0aW9uLnR5cGUpO1xuICAgIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVubGluayBSZWR1eCdzIGJpbmRBY3Rpb25DcmVhdG9ycywgb3VyIHN0b3JlIGlzIGxhemlseSBjcmVhdGVkLCBkaXNwYXRjaCBpcyBub3QgYXZhaWxhYmxlIGF0IGJlZ2lubmluZy5cbiAgICogUGFyYW1ldGVyIGlzIGEgU2xpY2UgaW5zdGVhZCBvZiBhY3Rpb24gbWFwXG4gICAqL1xuICBiaW5kQWN0aW9uQ3JlYXRvcnM8QSwgU2xpY2UgZXh0ZW5kcyB7YWN0aW9uczogQX0+KHNsaWNlOiBTbGljZSk6IFNsaWNlWydhY3Rpb25zJ10ge1xuXG4gICAgY29uc3QgYWN0aW9uTWFwID0ge30gYXMgdHlwZW9mIHNsaWNlLmFjdGlvbnM7XG4gICAgZm9yIChjb25zdCBbc2xpY2VOYW1lLCBhY3Rpb25DcmVhdG9yXSBvZiBPYmplY3QuZW50cmllcyhzbGljZS5hY3Rpb25zKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHNsaWNlTmFtZTtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSAoYWN0aW9uQ3JlYXRvciBhcyBhbnkpKC4uLnBhcmFtKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xuICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgfTtcbiAgICAgIGFjdGlvbk1hcFtuYW1lXSA9IGRvQWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9uTWFwIGFzIFNsaWNlWydhY3Rpb25zJ107XG4gIH1cblxuICBzdG9wQWxsRXBpY3MoKSB7XG4gICAgdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIHRhcChzdG9yZSA9PiB7XG4gICAgICAgIGlmIChzdG9yZSlcbiAgICAgICAgICBzdG9yZS5kaXNwYXRjaCh7cGF5bG9hZDogbnVsbCwgdHlwZTogJ1NUT1BfRVBJQyd9KTtcbiAgICAgIH0pLFxuICAgICAgdGFrZSgxKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIGVycm9ySGFuZGxlTWlkZGxld2FyZTogTWlkZGxld2FyZSA9IChhcGkpID0+IHtcbiAgICByZXR1cm4gKG5leHQpID0+IHtcbiAgICAgIHJldHVybiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uICE9IG51bGwgPyBhY3Rpb24udHlwZSA6IGFjdGlvbl0pO1xuXG4gICAgICAgICAgY29uc3QgcmV0ID0gbmV4dChhY3Rpb24pO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gZmFpbGVkIGFjdGlvbicsIGFjdGlvbik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBhY3Rpb24gZGlzcGF0Y2ggZXJyb3InLCBlcnIpO1xuICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyPFN0YXRlLFxuICAgIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTdGF0ZSwgU2xpY2VDYXNlUmVkdWNlcnM8U3RhdGU+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFN0YXRlPiwgTmFtZT5cbiAgICApIHtcbiAgICB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV0gPSBzbGljZS5yZWR1Y2VyO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogZmFsc2V9KSk7XG4gICAgfVxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdFJlZHVjZXIoKTogUmVkdWNlciB7XG4gICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290U3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RvcmUkLmdldFZhbHVlKCk7XG4gIH1cbn1cblxuY29uc3QgZXJyb3JTbGljZU9wdCA9IHtcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyBFcnJvclN0YXRlLFxuICBuYW1lOiAnZXJyb3InLFxuICByZWR1Y2Vyczoge1xuICAgIHJlcG9ydEFjdGlvbkVycm9yKHM6IEVycm9yU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxFcnJvcj4pIHtcbiAgICAgIHMuYWN0aW9uRXJyb3IgPSBwYXlsb2FkO1xuICAgIH1cbiAgfVxufTtcblxuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==