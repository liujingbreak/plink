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
                        _this.debugLog.next(['action', action.type]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQyxrQ0FBa0M7QUFDbEM7O0dBRUc7QUFDSCw0Q0FNMEI7QUFDMUIsZ0NBQWdDO0FBQ2hDLHFEQUFzRTtBQUN0RSw2QkFBMkU7QUFDM0UsNENBQW1HO0FBYW5HLFNBQWdCLGVBQWU7SUFBSSx3QkFBMkM7U0FBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO1FBQTNDLG1DQUEyQzs7SUFFNUUsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxFQUFFO0FBQ3BELENBQUM7QUFIRCwwQ0FHQztBQW9CRCxJQUFNLG9CQUFvQixHQUFxQztJQUM3RCxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtRQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBRUY7SUEyQkUsc0JBQW9CLGNBQXVEO1FBQTNFLGlCQXlCQztRQXpCbUIsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBcEJuRSxXQUFNLEdBQUcsSUFBSSxzQkFBZSxDQUFxRCxTQUFTLENBQUMsQ0FBQztRQUlwRzs7O1dBR0c7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBRXRELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUEyTXhDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMs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SyxFQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU8sd0NBQWlCLEdBQXpCO1FBQ0UsT0FBTyx5QkFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8sbUNBQVksR0FBcEI7UUFDRSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVILG1CQUFDO0FBQUQsQ0FBQyxBQXpRRCxJQXlRQztBQXpRWSxvQ0FBWTtBQTJRekIsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuLy8gdHNsaW50OmRpc2FibGU6IG1lbWJlci1vcmRlcmluZ1xuLyoqXG4gKiBBIGNvbWJvIHNldCBmb3IgdXNpbmcgUmVkdXgtdG9vbGtpdCBhbG9uZyB3aXRoIHJlZHV4LW9ic2VydmFibGVcbiAqL1xuaW1wb3J0IHtcbiAgQ2FzZVJlZHVjZXIsIGNvbWJpbmVSZWR1Y2VycywgY29uZmlndXJlU3RvcmUsXG4gIENvbmZpZ3VyZVN0b3JlT3B0aW9ucywgY3JlYXRlU2xpY2UgYXMgcmVkdXhDcmVhdGVTbGljZSwgQ3JlYXRlU2xpY2VPcHRpb25zLFxuICBEcmFmdCwgRW5oYW5jZWRTdG9yZSwgUGF5bG9hZEFjdGlvbiwgUmVkdWNlcnNNYXBPYmplY3QsXG4gIFNsaWNlLCBTbGljZUNhc2VSZWR1Y2VycywgUmVkdWNlcixcbiAgVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VycywgTWlkZGxld2FyZVxufSBmcm9tICdAcmVkdXhqcy90b29sa2l0Jztcbi8vIGltcG9ydCB7QWN0aW9ufSBmcm9tICdyZWR1eCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VVbnRpbCwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vLyBleHBvcnQgdHlwZSBDYWxsQmFja0FjdGlvblJlZHVjZXI8U1M+ID0gQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4ge1xuICBfaW5pdDogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248e2lzTGF6eTogYm9vbGVhbn0+PjtcbiAgX2NoYW5nZTogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLFxuICBBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4+ID0gVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VyczxTUywgQUNSPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz47XG5cbnR5cGUgU2ltcGxlQWN0aW9uQ3JlYXRvcjxQPiA9ICgocGF5bG9hZD86IFApID0+IFBheWxvYWRBY3Rpb248UD4pICYge3R5cGU6IHN0cmluZ307XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFA+KC4uLmFjdGlvbkNyZWF0b3JzOiBTaW1wbGVBY3Rpb25DcmVhdG9yPFA+W10pOlxuICAoc291cmNlOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxQPj4ge1xuICByZXR1cm4gb2ZUeXBlKC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uKC4uLmFjdGlvbkNyZWF0b3JzOiBhbnlbXSk6XG4vLyAgIChzb3VyY2U6IE9ic2VydmFibGU8YW55PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPHN0cmluZz4+IHtcbi8vICAgcmV0dXJuIG9mVHlwZTxhbnk+KC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpO1xuLy8gfVxuXG4vLyB0eXBlIFN0YXRlRnJvbVJlZHVjZXI8VD4gPSBUIGV4dGVuZHMgUmVkdWNlcjxDb21iaW5lZFN0YXRlPGluZmVyIFM+PiA/IFMgOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlZHV4U3RvcmVXaXRoRXBpY09wdGlvbnM8U3RhdGUgPSBhbnksIFBheWxvYWQgPSBhbnksIE91dHB1dCBleHRlbmRzIFBheWxvYWRBY3Rpb248UGF5bG9hZD4gPSBQYXlsb2FkQWN0aW9uPFBheWxvYWQ+LFxuQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8YW55PiA9IFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+IHtcbiAgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXTtcbiAgc2xpY2VzOiBTbGljZTxTdGF0ZSwgQ2FzZVJlZHVjZXJzLCBOYW1lPltdO1xuICBlcGljczogRXBpYzxQYXlsb2FkQWN0aW9uPFBheWxvYWQ+LCBPdXRwdXQsIFN0YXRlPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3RhdGUge1xuICBhY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5jb25zdCBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj4gPSB7XG4gIF9jaGFuZ2U6IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICB9XG59O1xuXG5leHBvcnQgY2xhc3MgU3RhdGVGYWN0b3J5IHtcbiAgLyoqXG4gICAqIFdoeSBJIGRvbid0IHVzZSBFcGljJ3Mgc3RhdGUkIHBhcmFtZXRlcjpcbiAgICogXG4gICAqIFJlZHV4LW9ic2VydmFibGUncyBzdGF0ZSQgZG9lcyBub3Qgbm90aWZ5IHN0YXRlIGNoYW5nZSBldmVudCB3aGVuIGEgbGF6eSBsb2FkZWQgKHJlcGxhY2VkKSBzbGljZSBpbml0aWFsaXplIHN0YXRlIFxuICAgKi9cbiAgcmVhbHRpbWVTdGF0ZSQ6IEJlaGF2aW9yU3ViamVjdDx7W2tleTogc3RyaW5nXTogYW55fT47XG4gIHByaXZhdGUgc3RvcmUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgbG9nJDogT2JzZXJ2YWJsZTxhbnlbXT47XG5cbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICAvKipcbiAgICogVW5saWtlIHN0b3JlLmRpc3BhdGNoKGFjdGlvbiksXG4gICAqIElmIHlvdSBjYWxsIG5leHQoKSBvbiB0aGlzIHN1YmplY3QsIGl0IGNhbiBzYXZlIGFjdGlvbiBkaXNwYXRjaCBhbiBhY3Rpb24gZXZlbiBiZWZvcmUgc3RvcmUgaXMgY29uZmlndXJlZFxuICAgKi9cbiAgYWN0aW9uc1RvRGlzcGF0Y2ggPSBuZXcgUmVwbGF5U3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueT4+KDIwKTtcblxuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcbiAgcHJpdmF0ZSBkZWJ1Z0xvZyA9IG5ldyBSZXBsYXlTdWJqZWN0PGFueVtdPigxNSk7XG4gIHByaXZhdGUgcmVkdWNlck1hcDogUmVkdWNlcnNNYXBPYmplY3Q8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+O1xuICBwcml2YXRlIGVwaWNXaXRoVW5zdWIkOiBTdWJqZWN0PFtFcGljLCBTdWJqZWN0PHN0cmluZz5dPjtcblxuICBwcml2YXRlIHJlcG9ydEFjdGlvbkVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICBwcml2YXRlIGVycm9yU2xpY2U6IFNsaWNlPEVycm9yU3RhdGU+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXSkge1xuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PGFueT4ocHJlbG9hZGVkU3RhdGUpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQgPSBuZXcgUmVwbGF5U3ViamVjdCgyKTtcbiAgICB0aGlzLmxvZyQgPSB0aGlzLmRlYnVnTG9nLmFzT2JzZXJ2YWJsZSgpO1xuICAgIHRoaXMucmVkdWNlck1hcCA9IHt9O1xuXG4gICAgdGhpcy5yb290U3RvcmVSZWFkeSA9IHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICBmaWx0ZXI8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+KHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICBjb25zdCBlcnJvclNsaWNlID0gdGhpcy5uZXdTbGljZSh7XG4gICAgICBpbml0aWFsU3RhdGU6IHt9IGFzIEVycm9yU3RhdGUsXG4gICAgICBuYW1lOiAnZXJyb3InLFxuICAgICAgcmVkdWNlcnM6IHtcbiAgICAgICAgcmVwb3J0QWN0aW9uRXJyb3Iocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEVycm9yPikge1xuICAgICAgICAgIHMuYWN0aW9uRXJyb3IgPSBwYXlsb2FkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuXG4gIH1cblxuICBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSkge1xuICAgIGlmICh0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpKVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgY29uc3QgZXBpY01pZGRsZXdhcmUgPSBjcmVhdGVFcGljTWlkZGxld2FyZTxQYXlsb2FkQWN0aW9uPGFueT4+KCk7XG5cbiAgICBjb25zdCBtaWRkbGV3YXJlID0gbWlkZGxld2FyZXMgPyBbZXBpY01pZGRsZXdhcmUsIHRoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlLCAuLi5taWRkbGV3YXJlc10gOiBbZXBpY01pZGRsZXdhcmUsIHRoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlXTtcbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+LCBNaWRkbGV3YXJlPGFueT5bXT4oe1xuICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAvLyBwcmVsb2FkZWRTdGF0ZTogdGhpcy5wcmVsb2FkZWRTdGF0ZSxcbiAgICAgIG1pZGRsZXdhcmVcbiAgICB9KTtcblxuICAgIHRoaXMuc3RvcmUkLm5leHQoc3RvcmUpO1xuXG4gICAgc3RvcmUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQubmV4dChzdGF0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gdGFwKCgpID0+IGNvbnNvbGUubG9nKCdzdGF0ZSBjaGFuZ2VkJykpLFxuICAgICAgdGFwKHN0YXRlID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ3N0YXRlJywgc3RhdGVdKSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZXBpY01pZGRsZXdhcmUucnVuKChhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXBpY1dpdGhVbnN1YiQucGlwZShcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCB1bnN1Yl0pID0+IChlcGljKGFjdGlvbiQsIHN0YXRlJCwgZGVwZW5kZW5jaWVzKSBhcyBSZXR1cm5UeXBlPEVwaWM+KVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIHRhcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKVxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9KTtcblxuICAgIC8vIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gucGlwZShcbiAgICAvLyAgIHRhcChhY3Rpb24gPT4gc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSlcbiAgICAvLyApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIG91ciBzcGVjaWFsIHNsaWNlIHdpdGggYSBkZWZhdWx0IHJlZHVjZXIgYWN0aW9uOiBcbiAgICogLSBgY2hhbmdlKHN0YXRlOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+KWBcbiAgICogLSBpbml0aWFsU3RhdGUgaXMgbG9hZGVkIGZyb20gU3RhdGVGYWN0b3J5J3MgcGFydGlhbCBwcmVsb2FkZWRTdGF0ZVxuICAgKi9cbiAgbmV3U2xpY2U8U1MsIF9DYXNlUmVkdWNlciBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciwgTmFtZT4pIHtcblxuICAgIGNvbnN0IF9vcHQgPSBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPjtcbiAgICBjb25zdCByZWR1Y2VycyA9IF9vcHQucmVkdWNlcnMgYXMgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUywgX0Nhc2VSZWR1Y2VyPjtcblxuICAgIGlmIChyZWR1Y2Vycy5fY2hhbmdlID09IG51bGwpXG4gICAgICBPYmplY3QuYXNzaWduKF9vcHQucmVkdWNlcnMsIGRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPik7XG5cbiAgICB0aGlzLmFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcihzbGljZSk7XG5cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICByZW1vdmVTbGljZShzbGljZToge25hbWU6IHN0cmluZ30pIHtcbiAgICBkZWxldGUgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ3JlbW92ZSBzbGljZSAnKyBzbGljZS5uYW1lXSk7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSBmcm9tIHRoaXMgZXBpY1xuICAgKiBAcGFyYW0gZXBpYyBcbiAgICovXG4gIGFkZEVwaWM8UyA9IGFueT4oXG4gICAgZXBpYzogRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgUz4pIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKyt0aGlzLmVwaWNTZXE7XG4gICAgY29uc3QgdW5zdWJzY3JpYmVFcGljID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQubmV4dChbZXBpYywgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGVwaWNJZCArICcgaXMgYWRkZWQnXSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gICAgICB1bnN1YnNjcmliZUVwaWMuY29tcGxldGUoKTtcbiAgICB9O1xuICB9XG5cbiAgc2xpY2VTdGF0ZTxTUywgQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+ID0gU2xpY2VDYXNlUmVkdWNlcnM8U1M+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U1MsIENhc2VSZWR1Y2VycywgTmFtZT4pOiBTUyB7XG4gICAgY29uc3Qgc3RvcmUgPSB0aGlzLmdldFJvb3RTdG9yZSgpO1xuICAgIHJldHVybiBzdG9yZSA/IHN0b3JlLmdldFN0YXRlKClbc2xpY2UubmFtZV0gYXMgU1MgOiB7fSBhcyBTUztcbiAgfVxuXG4gIHNsaWNlU3RvcmU8U1M+KHNsaWNlOiBTbGljZTxTUz4pOiBPYnNlcnZhYmxlPFNTPiB7XG4gICAgcmV0dXJuICh0aGlzLnJlYWx0aW1lU3RhdGUkIGFzIEJlaGF2aW9yU3ViamVjdDx7W2tleTogc3RyaW5nXTogU1N9PikucGlwZShcbiAgICAgIG1hcChzID0+IHNbc2xpY2UubmFtZV0pLFxuICAgICAgZmlsdGVyKHNzID0+IHNzICE9IG51bGwpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKVxuICAgICk7XG4gIH1cblxuICBnZXRFcnJvclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RhdGUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGdldEVycm9yU3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdG9yZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZGlzcGF0Y2g8VD4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFQ+KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2Rpc3BhdGNoJywgYWN0aW9uLnR5cGUpO1xuICAgIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVubGluayBSZWR1eCdzIGJpbmRBY3Rpb25DcmVhdG9ycywgb3VyIHN0b3JlIGlzIGxhemlseSBjcmVhdGVkLCBkaXNwYXRjaCBpcyBub3QgYXZhaWxhYmxlIGF0IGJlZ2lubmluZy5cbiAgICogUGFyYW1ldGVyIGlzIGEgU2xpY2UgaW5zdGVhZCBvZiBhY3Rpb24gbWFwXG4gICAqL1xuICBiaW5kQWN0aW9uQ3JlYXRvcnM8QSwgU2xpY2UgZXh0ZW5kcyB7YWN0aW9uczogQX0+KHNsaWNlOiBTbGljZSkge1xuXG4gICAgY29uc3QgYWN0aW9uTWFwID0ge30gYXMgdHlwZW9mIHNsaWNlLmFjdGlvbnM7XG4gICAgZm9yIChjb25zdCBbc2xpY2VOYW1lLCBhY3Rpb25DcmVhdG9yXSBvZiBPYmplY3QuZW50cmllcyhzbGljZS5hY3Rpb25zKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHNsaWNlTmFtZTtcbiAgICAgIGNvbnN0IGRvQWN0aW9uID0gKC4uLnBhcmFtOiBhbnlbXSkgPT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSAoYWN0aW9uQ3JlYXRvciBhcyBhbnkpKC4uLnBhcmFtKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xuICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgICAgfTtcbiAgICAgIGFjdGlvbk1hcFtuYW1lXSA9IGRvQWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9uTWFwIGFzIFNsaWNlWydhY3Rpb25zJ107XG4gIH1cblxuICBzdG9wQWxsRXBpY3MoKSB7XG4gICAgdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIHRhcChzdG9yZSA9PiB7XG4gICAgICAgIGlmIChzdG9yZSlcbiAgICAgICAgICBzdG9yZS5kaXNwYXRjaCh7cGF5bG9hZDogbnVsbCwgdHlwZTogJ1NUT1BfRVBJQyd9KTtcbiAgICAgIH0pLFxuICAgICAgdGFrZSgxKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIGVycm9ySGFuZGxlTWlkZGxld2FyZTogTWlkZGxld2FyZSA9IChhcGkpID0+IHtcbiAgICByZXR1cm4gKG5leHQpID0+IHtcbiAgICAgIHJldHVybiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uLnR5cGVdKTtcblxuICAgICAgICAgIGNvbnN0IHJldCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGZhaWxlZCBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gYWN0aW9uIGRpc3BhdGNoIGVycm9yJywgZXJyKTtcbiAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVycik7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSxcbiAgICBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBzbGljZTogU2xpY2U8U3RhdGUsIFNsaWNlQ2FzZVJlZHVjZXJzPFN0YXRlPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTdGF0ZT4sIE5hbWU+XG4gICAgKSB7XG4gICAgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdID0gc2xpY2UucmVkdWNlcjtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogdHJ1ZX0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RSZWR1Y2VyKCk6IFJlZHVjZXIge1xuICAgIHJldHVybiBjb21iaW5lUmVkdWNlcnModGhpcy5yZWR1Y2VyTWFwKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Um9vdFN0b3JlKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpO1xuICB9XG5cbn1cblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=