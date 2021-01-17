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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtEQUFrRDtBQUNsRDs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixnQ0FBZ0M7QUFDaEMscURBQXNFO0FBQ3RFLDZCQUFrRjtBQUNsRiw0Q0FBK0c7QUFhL0csU0FBZ0IsZUFBZTtJQUFJLHdCQUFnRDtTQUFoRCxVQUFnRCxFQUFoRCxxQkFBZ0QsRUFBaEQsSUFBZ0Q7UUFBaEQsbUNBQWdEOztJQUVqRixPQUFPLHlCQUFNLGVBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEVBQU4sQ0FBTSxDQUFDLEVBQUU7QUFDcEQsQ0FBQztBQUhELDBDQUdDO0FBb0JELElBQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxNQUFNO1FBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNGLENBQUM7QUFZRjtJQTJCRSxzQkFBb0IsY0FBdUQ7UUFBM0UsaUJBaUJDO1FBakJtQixtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFwQm5FLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSXBHOzs7V0FHRztRQUNILHNCQUFpQixHQUFHLElBQUksb0JBQWEsQ0FBcUIsRUFBRSxDQUFDLENBQUM7UUFFdEQsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNwQix5R0FBeUc7UUFDakcsYUFBUSxHQUFHLElBQUksb0JBQWEsQ0FBUSxFQUFFLENBQUMsQ0FBQztRQTZNeEMsMEJBQXFCLEdBQWUsVUFBQyxHQUFHO1lBQzlDLE9BQU8sVUFBQyxJQUFJO2dCQUNWLE9B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RDthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyx3Q0FBaUIsR0FBekI7UUFDRSxPQUFPLHlCQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUF0UUQsSUFzUUM7QUF0UVksb0NBQVk7QUF3UXpCLElBQU0sYUFBYSxHQUFHO0lBQ3BCLFlBQVksRUFBRSxFQUFnQjtJQUM5QixJQUFJLEVBQUUsT0FBTztJQUNiLFFBQVEsRUFBRTtRQUNSLGlCQUFpQixFQUFqQixVQUFrQixDQUFhLEVBQUUsRUFBK0I7Z0JBQTlCLE9BQU8sYUFBQTtZQUN2QyxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBR0YsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmUsIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZFxufSBmcm9tICdAcmVkdXhqcy90b29sa2l0Jztcbi8vIGltcG9ydCB7QWN0aW9ufSBmcm9tICdyZWR1eCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIEVNUFRZIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIG1lcmdlTWFwLCB0YWtlLCB0YWtlVW50aWwsIHRhcCwgY2F0Y2hFcnJvciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHtQYXlsb2FkQWN0aW9uLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2V9O1xuLy8gZXhwb3J0IHR5cGUgQ2FsbEJhY2tBY3Rpb25SZWR1Y2VyPFNTPiA9IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+PjtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFA+KC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UD5bXSk6XG4gIChzb3VyY2U6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFA+PiB7XG4gIHJldHVybiBvZlR5cGUoLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb24oLi4uYWN0aW9uQ3JlYXRvcnM6IGFueVtdKTpcbi8vICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxhbnk+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248c3RyaW5nPj4ge1xuLy8gICByZXR1cm4gb2ZUeXBlPGFueT4oLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSk7XG4vLyB9XG5cbi8vIHR5cGUgU3RhdGVGcm9tUmVkdWNlcjxUPiA9IFQgZXh0ZW5kcyBSZWR1Y2VyPENvbWJpbmVkU3RhdGU8aW5mZXIgUz4+ID8gUyA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdXhTdG9yZVdpdGhFcGljT3B0aW9uczxTdGF0ZSA9IGFueSwgUGF5bG9hZCA9IGFueSwgT3V0cHV0IGV4dGVuZHMgUGF5bG9hZEFjdGlvbjxQYXlsb2FkPiA9IFBheWxvYWRBY3Rpb248UGF5bG9hZD4sXG5DYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+ID0gU2xpY2VDYXNlUmVkdWNlcnM8YW55PiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ge1xuICBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddO1xuICBzbGljZXM6IFNsaWNlPFN0YXRlLCBDYXNlUmVkdWNlcnMsIE5hbWU+W107XG4gIGVwaWNzOiBFcGljPFBheWxvYWRBY3Rpb248UGF5bG9hZD4sIE91dHB1dCwgU3RhdGU+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuZXhwb3J0IHR5cGUgSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9XG4gIFNsaWNlPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4sXG4gIChNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8YW55LCBpbmZlciBfQ2FzZVJlZHVjZXIsIHN0cmluZz4gPyBfQ2FzZVJlZHVjZXIgOiBTbGljZUNhc2VSZWR1Y2VyczxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+PikgJlxuICAgIEV4dHJhU2xpY2VSZWR1Y2VyczxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+PixcbiAgc3RyaW5nPjtcblxuZXhwb3J0IHR5cGUgSW5mZXJBY3Rpb25zVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbkluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT5bJ2FjdGlvbnMnXTtcbmV4cG9ydCBjbGFzcyBTdGF0ZUZhY3Rvcnkge1xuICAvKipcbiAgICogV2h5IEkgZG9uJ3QgdXNlIEVwaWMncyBzdGF0ZSQgcGFyYW1ldGVyOlxuICAgKiBcbiAgICogUmVkdXgtb2JzZXJ2YWJsZSdzIHN0YXRlJCBkb2VzIG5vdCBub3RpZnkgc3RhdGUgY2hhbmdlIGV2ZW50IHdoZW4gYSBsYXp5IGxvYWRlZCAocmVwbGFjZWQpIHNsaWNlIGluaXRpYWxpemUgc3RhdGUgXG4gICAqL1xuICByZWFsdGltZVN0YXRlJDogQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBhbnl9PjtcbiAgcHJpdmF0ZSBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcblxuICByb290U3RvcmVSZWFkeTogUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj47XG4gIC8qKlxuICAgKiBVbmxpa2Ugc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSxcbiAgICogSWYgeW91IGNhbGwgbmV4dCgpIG9uIHRoaXMgc3ViamVjdCwgaXQgY2FuIHNhdmUgYWN0aW9uIGRpc3BhdGNoIGFuIGFjdGlvbiBldmVuIGJlZm9yZSBzdG9yZSBpcyBjb25maWd1cmVkXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuXG4gIHByaXZhdGUgZXBpY1NlcSA9IDA7XG4gIC8vIHByaXZhdGUgZ2xvYmFsQ2hhbmdlQWN0aW9uQ3JlYXRvciA9IGNyZWF0ZUFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8YW55PikgPT4gdm9pZD4oJ19fZ2xvYmFsX2NoYW5nZScpO1xuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IFN1YmplY3Q8W0VwaWMsIFN1YmplY3Q8c3RyaW5nPl0+O1xuXG4gIHByaXZhdGUgcmVwb3J0QWN0aW9uRXJyb3I6IChlcnI6IEVycm9yKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgZXJyb3JTbGljZTogSW5mZXJTbGljZVR5cGU8dHlwZW9mIGVycm9yU2xpY2VPcHQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXSkge1xuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PGFueT4ocHJlbG9hZGVkU3RhdGUpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQgPSBuZXcgUmVwbGF5U3ViamVjdCgpO1xuICAgIHRoaXMubG9nJCA9IHRoaXMuZGVidWdMb2cuYXNPYnNlcnZhYmxlKCk7XG4gICAgdGhpcy5yZWR1Y2VyTWFwID0ge307XG5cbiAgICB0aGlzLnJvb3RTdG9yZVJlYWR5ID0gdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIGZpbHRlcihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpIGFzIFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb24+PjtcblxuICAgIGNvbnN0IGVycm9yU2xpY2UgPSB0aGlzLm5ld1NsaWNlKGVycm9yU2xpY2VPcHQpO1xuXG4gICAgdGhpcy5lcnJvclNsaWNlID0gZXJyb3JTbGljZTtcblxuICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IgPSB0aGlzLmJpbmRBY3Rpb25DcmVhdG9ycyhlcnJvclNsaWNlKS5yZXBvcnRBY3Rpb25FcnJvcjtcblxuICB9XG5cbiAgY29uZmlndXJlU3RvcmUobWlkZGxld2FyZXM/OiBNaWRkbGV3YXJlW10pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgY29uc3QgbWlkZGxld2FyZSA9IG1pZGRsZXdhcmVzID8gW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgLi4ubWlkZGxld2FyZXNdIDogW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZV07XG4gICAgY29uc3Qgc3RvcmUgPSBjb25maWd1cmVTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55PiwgTWlkZGxld2FyZTxhbnk+W10+KHtcbiAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgLy8gcHJlbG9hZGVkU3RhdGU6IHRoaXMucHJlbG9hZGVkU3RhdGUsXG4gICAgICBtaWRkbGV3YXJlXG4gICAgfSk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKChbZXBpYywgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgYXMgUmV0dXJuVHlwZTxFcGljPilcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHRha2VVbnRpbCh1bnN1Yi5waXBlKFxuICAgICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgICB0YXAoZXBpY0lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHVuc3Vic2NyaWJlIGZyb20gJHtlcGljSWR9YF0pO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9KTtcblxuICAgIC8vIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gucGlwZShcbiAgICAvLyAgIHRhcChhY3Rpb24gPT4gc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSlcbiAgICAvLyApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIG91ciBzcGVjaWFsIHNsaWNlIHdpdGggYSBkZWZhdWx0IHJlZHVjZXIgYWN0aW9uOiBcbiAgICogLSBgY2hhbmdlKHN0YXRlOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+KWBcbiAgICogLSBpbml0aWFsU3RhdGUgaXMgbG9hZGVkIGZyb20gU3RhdGVGYWN0b3J5J3MgcGFydGlhbCBwcmVsb2FkZWRTdGF0ZVxuICAgKi9cbiAgbmV3U2xpY2U8U1MsIF9DYXNlUmVkdWNlciBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciwgTmFtZT4pOlxuICAgIFNsaWNlPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPiB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT47XG4gICAgY29uc3QgcmVkdWNlcnMgPSBfb3B0LnJlZHVjZXJzIGFzIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCBkZWZhdWx0U2xpY2VSZWR1Y2Vycyk7XG5cbiAgICBpZiAocmVkdWNlcnMuX2luaXQgPT0gbnVsbCkge1xuICAgICAgcmVkdWNlcnMuX2luaXQgPSAoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT4pO1xuXG4gICAgdGhpcy5hZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXIoc2xpY2UpO1xuXG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcmVtb3ZlU2xpY2Uoc2xpY2U6IHtuYW1lOiBzdHJpbmd9KSB7XG4gICAgZGVsZXRlIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXTtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdyZW1vdmUgc2xpY2UgJysgc2xpY2UubmFtZV0pO1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIGEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgZnJvbSB0aGlzIGVwaWNcbiAgICogQHBhcmFtIGVwaWMgXG4gICAqL1xuICBhZGRFcGljPFMgPSBhbnk+KFxuICAgIGVwaWM6IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIFM+KSB7XG4gICAgY29uc3QgZXBpY0lkID0gJ0VwaWMtJyArICsrdGhpcy5lcGljU2VxO1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkLm5leHQoW2VwaWMsIHVuc3Vic2NyaWJlRXBpY10pO1xuICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBlcGljSWQgKyAnIGlzIGFkZGVkJ10pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZUVwaWMubmV4dChlcGljSWQpO1xuICAgICAgdW5zdWJzY3JpYmVFcGljLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgfVxuXG4gIHNsaWNlU3RhdGU8U1MsIENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFNTLCBDYXNlUmVkdWNlcnMsIE5hbWU+KTogU1Mge1xuICAgIGNvbnN0IHN0b3JlID0gdGhpcy5nZXRSb290U3RvcmUoKTtcbiAgICByZXR1cm4gc3RvcmUgPyBzdG9yZS5nZXRTdGF0ZSgpW3NsaWNlLm5hbWVdIGFzIFNTIDoge30gYXMgU1M7XG4gIH1cblxuICBzbGljZVN0b3JlPFNTPihzbGljZTogU2xpY2U8U1M+KTogT2JzZXJ2YWJsZTxTUz4ge1xuICAgIHJldHVybiAodGhpcy5yZWFsdGltZVN0YXRlJCBhcyBCZWhhdmlvclN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZ2V0RXJyb3JTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0YXRlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBnZXRFcnJvclN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RvcmUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGRpc3BhdGNoPFQ+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxUPikge1xuICAgIC8vIGNvbnNvbGUubG9nKCdkaXNwYXRjaCcsIGFjdGlvbi50eXBlKTtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPEEsIFNsaWNlIGV4dGVuZHMge2FjdGlvbnM6IEF9PihzbGljZTogU2xpY2UpOiBTbGljZVsnYWN0aW9ucyddIHtcblxuICAgIGNvbnN0IGFjdGlvbk1hcCA9IHt9IGFzIHR5cGVvZiBzbGljZS5hY3Rpb25zO1xuICAgIGZvciAoY29uc3QgW3NsaWNlTmFtZSwgYWN0aW9uQ3JlYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2xpY2UuYWN0aW9ucykpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBzbGljZU5hbWU7XG4gICAgICBjb25zdCBkb0FjdGlvbiA9ICguLi5wYXJhbTogYW55W10pID0+IHtcbiAgICAgICAgY29uc3QgYWN0aW9uID0gKGFjdGlvbkNyZWF0b3IgYXMgYW55KSguLi5wYXJhbSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICAgIH07XG4gICAgICBhY3Rpb25NYXBbbmFtZV0gPSBkb0FjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbk1hcCBhcyBTbGljZVsnYWN0aW9ucyddO1xuICB9XG5cbiAgc3RvcEFsbEVwaWNzKCkge1xuICAgIHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICB0YXAoc3RvcmUgPT4ge1xuICAgICAgICBpZiAoc3RvcmUpXG4gICAgICAgICAgc3RvcmUuZGlzcGF0Y2goe3BheWxvYWQ6IG51bGwsIHR5cGU6ICdTVE9QX0VQSUMnfSk7XG4gICAgICB9KSxcbiAgICAgIHRha2UoMSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZ2V0Um9vdFN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlcnJvckhhbmRsZU1pZGRsZXdhcmU6IE1pZGRsZXdhcmUgPSAoYXBpKSA9PiB7XG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XG4gICAgICByZXR1cm4gKGFjdGlvbjogUGF5bG9hZEFjdGlvbikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbiAhPSBudWxsID8gYWN0aW9uLnR5cGUgOiBhY3Rpb25dKTtcblxuICAgICAgICAgIGNvbnN0IHJldCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGZhaWxlZCBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gYWN0aW9uIGRpc3BhdGNoIGVycm9yJywgZXJyKTtcbiAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVycik7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSxcbiAgICBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPiB7XG4gICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICB9XG59XG5cbmNvbnN0IGVycm9yU2xpY2VPcHQgPSB7XG4gIGluaXRpYWxTdGF0ZToge30gYXMgRXJyb3JTdGF0ZSxcbiAgbmFtZTogJ2Vycm9yJyxcbiAgcmVkdWNlcnM6IHtcbiAgICByZXBvcnRBY3Rpb25FcnJvcihzOiBFcnJvclN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248RXJyb3I+KSB7XG4gICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICB9XG4gIH1cbn07XG5cblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=