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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQyxrQ0FBa0M7QUFDbEM7O0dBRUc7QUFDSCw0Q0FNMEI7QUFDMUIsZ0NBQWdDO0FBQ2hDLHFEQUFzRTtBQUN0RSw2QkFBMkU7QUFDM0UsNENBQW1HO0FBZW5HLFNBQWdCLGVBQWU7SUFBSSx3QkFBMkM7U0FBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO1FBQTNDLG1DQUEyQzs7SUFFNUUsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxFQUFFO0FBQ3BELENBQUM7QUFIRCwwQ0FHQztBQW9CRCxJQUFNLG9CQUFvQixHQUFxQztJQUM3RCxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtRQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBYUY7SUEyQkUsc0JBQW9CLGNBQXVEO1FBQTNFLGlCQXlCQztRQXpCbUIsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBcEJuRSxXQUFNLEdBQUcsSUFBSSxzQkFBZSxDQUFxRCxTQUFTLENBQUMsQ0FBQztRQUlwRzs7O1dBR0c7UUFDSCxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBRXRELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFDcEIseUdBQXlHO1FBQ2pHLGFBQVEsR0FBRyxJQUFJLG9CQUFhLENBQVEsRUFBRSxDQUFDLENBQUM7UUE0TXhDLDBCQUFxQixHQUFlLFVBQUMsR0FBRztZQUM5QyxPQUFPLFVBQUMs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QyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQztTQUNyRDtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLHdDQUFpQixHQUF6QjtRQUNFLE9BQU8seUJBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVPLG1DQUFZLEdBQXBCO1FBQ0UsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFSCxtQkFBQztBQUFELENBQUMsQUExUUQsSUEwUUM7QUExUVksb0NBQVk7QUE2UXpCLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Q0FDdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBsaWI9XCJlczIwMTdcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaG1yLW1vZHVsZS5kLnRzXCIgLz5cbi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbi8vIHRzbGludDpkaXNhYmxlOiBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmVcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG4vLyBpbXBvcnQge0FjdGlvbn0gZnJvbSAncmVkdXgnO1xuaW1wb3J0IHsgY3JlYXRlRXBpY01pZGRsZXdhcmUsIEVwaWMsIG9mVHlwZSB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBSZXBsYXlTdWJqZWN0LCBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIG1lcmdlTWFwLCB0YWtlLCB0YWtlVW50aWwsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHtQYXlsb2FkQWN0aW9uLFxuICBDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZX07XG4vLyBleHBvcnQgdHlwZSBDYWxsQmFja0FjdGlvblJlZHVjZXI8U1M+ID0gQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4ge1xuICBfaW5pdDogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248e2lzTGF6eTogYm9vbGVhbn0+PjtcbiAgX2NoYW5nZTogQ2FzZVJlZHVjZXI8U1MsIFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4+O1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLFxuICBBQ1IgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4+ID0gVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2VyczxTUywgQUNSPiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz47XG5cbnR5cGUgU2ltcGxlQWN0aW9uQ3JlYXRvcjxQPiA9ICgocGF5bG9hZD86IFApID0+IFBheWxvYWRBY3Rpb248UD4pICYge3R5cGU6IHN0cmluZ307XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFA+KC4uLmFjdGlvbkNyZWF0b3JzOiBTaW1wbGVBY3Rpb25DcmVhdG9yPFA+W10pOlxuICAoc291cmNlOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxQPj4ge1xuICByZXR1cm4gb2ZUeXBlKC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uKC4uLmFjdGlvbkNyZWF0b3JzOiBhbnlbXSk6XG4vLyAgIChzb3VyY2U6IE9ic2VydmFibGU8YW55PikgPT4gT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPHN0cmluZz4+IHtcbi8vICAgcmV0dXJuIG9mVHlwZTxhbnk+KC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpO1xuLy8gfVxuXG4vLyB0eXBlIFN0YXRlRnJvbVJlZHVjZXI8VD4gPSBUIGV4dGVuZHMgUmVkdWNlcjxDb21iaW5lZFN0YXRlPGluZmVyIFM+PiA/IFMgOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlZHV4U3RvcmVXaXRoRXBpY09wdGlvbnM8U3RhdGUgPSBhbnksIFBheWxvYWQgPSBhbnksIE91dHB1dCBleHRlbmRzIFBheWxvYWRBY3Rpb248UGF5bG9hZD4gPSBQYXlsb2FkQWN0aW9uPFBheWxvYWQ+LFxuQ2FzZVJlZHVjZXJzIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8YW55PiA9IFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+IHtcbiAgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXTtcbiAgc2xpY2VzOiBTbGljZTxTdGF0ZSwgQ2FzZVJlZHVjZXJzLCBOYW1lPltdO1xuICBlcGljczogRXBpYzxQYXlsb2FkQWN0aW9uPFBheWxvYWQ+LCBPdXRwdXQsIFN0YXRlPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3RhdGUge1xuICBhY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5jb25zdCBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj4gPSB7XG4gIF9jaGFuZ2U6IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICB9XG59O1xuXG5leHBvcnQgdHlwZSBJbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbiAgU2xpY2U8YW55LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8YW55PikgJlxuICAgIEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+LFxuICBzdHJpbmc+O1xuXG5leHBvcnQgdHlwZSBJbmZlckFjdGlvbnNUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxhbnksXG4gIChNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8YW55LCBpbmZlciBfQ2FzZVJlZHVjZXIsIHN0cmluZz4gPyBfQ2FzZVJlZHVjZXIgOiBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+KSAmXG4gICAgRXh0cmFTbGljZVJlZHVjZXJzPGFueT4sXG4gIHN0cmluZz5bJ2FjdGlvbnMnXTtcbmV4cG9ydCBjbGFzcyBTdGF0ZUZhY3Rvcnkge1xuICAvKipcbiAgICogV2h5IEkgZG9uJ3QgdXNlIEVwaWMncyBzdGF0ZSQgcGFyYW1ldGVyOlxuICAgKiBcbiAgICogUmVkdXgtb2JzZXJ2YWJsZSdzIHN0YXRlJCBkb2VzIG5vdCBub3RpZnkgc3RhdGUgY2hhbmdlIGV2ZW50IHdoZW4gYSBsYXp5IGxvYWRlZCAocmVwbGFjZWQpIHNsaWNlIGluaXRpYWxpemUgc3RhdGUgXG4gICAqL1xuICByZWFsdGltZVN0YXRlJDogQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBhbnl9PjtcbiAgcHJpdmF0ZSBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcblxuICByb290U3RvcmVSZWFkeTogUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj47XG4gIC8qKlxuICAgKiBVbmxpa2Ugc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSxcbiAgICogSWYgeW91IGNhbGwgbmV4dCgpIG9uIHRoaXMgc3ViamVjdCwgaXQgY2FuIHNhdmUgYWN0aW9uIGRpc3BhdGNoIGFuIGFjdGlvbiBldmVuIGJlZm9yZSBzdG9yZSBpcyBjb25maWd1cmVkXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuXG4gIHByaXZhdGUgZXBpY1NlcSA9IDA7XG4gIC8vIHByaXZhdGUgZ2xvYmFsQ2hhbmdlQWN0aW9uQ3JlYXRvciA9IGNyZWF0ZUFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8YW55PikgPT4gdm9pZD4oJ19fZ2xvYmFsX2NoYW5nZScpO1xuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IFN1YmplY3Q8W0VwaWMsIFN1YmplY3Q8c3RyaW5nPl0+O1xuXG4gIHByaXZhdGUgcmVwb3J0QWN0aW9uRXJyb3I6IChlcnI6IEVycm9yKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgZXJyb3JTbGljZTogU2xpY2U8RXJyb3JTdGF0ZT47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8YW55PihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2Uoe1xuICAgICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBFcnJvclN0YXRlLFxuICAgICAgbmFtZTogJ2Vycm9yJyxcbiAgICAgIHJlZHVjZXJzOiB7XG4gICAgICAgIHJlcG9ydEFjdGlvbkVycm9yKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxFcnJvcj4pIHtcbiAgICAgICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5lcnJvclNsaWNlID0gZXJyb3JTbGljZTtcblxuICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IgPSB0aGlzLmJpbmRBY3Rpb25DcmVhdG9ycyhlcnJvclNsaWNlKS5yZXBvcnRBY3Rpb25FcnJvcjtcblxuICB9XG5cbiAgY29uZmlndXJlU3RvcmUobWlkZGxld2FyZXM/OiBNaWRkbGV3YXJlW10pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgY29uc3QgbWlkZGxld2FyZSA9IG1pZGRsZXdhcmVzID8gW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgLi4ubWlkZGxld2FyZXNdIDogW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZV07XG4gICAgY29uc3Qgc3RvcmUgPSBjb25maWd1cmVTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55PiwgTWlkZGxld2FyZTxhbnk+W10+KHtcbiAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgLy8gcHJlbG9hZGVkU3RhdGU6IHRoaXMucHJlbG9hZGVkU3RhdGUsXG4gICAgICBtaWRkbGV3YXJlXG4gICAgfSk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKChbZXBpYywgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgYXMgUmV0dXJuVHlwZTxFcGljPilcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHRha2VVbnRpbCh1bnN1Yi5waXBlKFxuICAgICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgICB0YXAoZXBpY0lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHVuc3Vic2NyaWJlIGZyb20gJHtlcGljSWR9YF0pO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICB0YWtlVW50aWwoYWN0aW9uJC5waXBlKFxuICAgICAgICAgIG9mVHlwZSgnU1RPUF9FUElDJyksXG4gICAgICAgICAgdGFwKCgpID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAnU3RvcCBhbGwgZXBpY3MnXSkpXG4gICAgICAgICkpXG4gICAgICApO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkRXBpYygoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2g7XG4gICAgfSk7XG5cbiAgICAvLyB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gICAgLy8gICB0YXAoYWN0aW9uID0+IHN0b3JlLmRpc3BhdGNoKGFjdGlvbikpXG4gICAgLy8gKS5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFNTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIG9wdDogQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KTpcbiAgICBTbGljZTxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT4ge1xuXG4gICAgY29uc3QgX29wdCA9IG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFNTLCBfQ2FzZVJlZHVjZXI+O1xuXG4gICAgaWYgKHJlZHVjZXJzLl9jaGFuZ2UgPT0gbnVsbClcbiAgICAgIE9iamVjdC5hc3NpZ24oX29wdC5yZWR1Y2VycywgZGVmYXVsdFNsaWNlUmVkdWNlcnMpO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9pbml0ID09IG51bGwpIHtcbiAgICAgIHJlZHVjZXJzLl9pbml0ID0gKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGBzbGljZSBcIiR7b3B0Lm5hbWV9XCIgaXMgY3JlYXRlZCAke2FjdGlvbi5wYXlsb2FkLmlzTGF6eSA/ICdsYXppbHknIDogJyd9YF0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcmVsb2FkZWRTdGF0ZSAmJiB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHQuaW5pdGlhbFN0YXRlLCB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSk7XG4gICAgfVxuICAgIGNvbnN0IHNsaWNlID0gcmVkdXhDcmVhdGVTbGljZShcbiAgICAgIG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8U1MsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTUz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKi9cbiAgYWRkRXBpYzxTID0gYW55PihcbiAgICBlcGljOiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCBTPikge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyArK3RoaXMuZXBpY1NlcTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCB1bnN1YnNjcmliZUVwaWNdKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgZXBpY0lkICsgJyBpcyBhZGRlZCddKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVFcGljLm5leHQoZXBpY0lkKTtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5jb21wbGV0ZSgpO1xuICAgIH07XG4gIH1cblxuICBzbGljZVN0YXRlPFNTLCBDYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTUywgQ2FzZVJlZHVjZXJzLCBOYW1lPik6IFNTIHtcbiAgICBjb25zdCBzdG9yZSA9IHRoaXMuZ2V0Um9vdFN0b3JlKCk7XG4gICAgcmV0dXJuIHN0b3JlID8gc3RvcmUuZ2V0U3RhdGUoKVtzbGljZS5uYW1lXSBhcyBTUyA6IHt9IGFzIFNTO1xuICB9XG5cbiAgc2xpY2VTdG9yZTxTUz4oc2xpY2U6IFNsaWNlPFNTPik6IE9ic2VydmFibGU8U1M+IHtcbiAgICByZXR1cm4gKHRoaXMucmVhbHRpbWVTdGF0ZSQgYXMgQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBTU30+KS5waXBlKFxuICAgICAgbWFwKHMgPT4gc1tzbGljZS5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICAgKTtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZGlzcGF0Y2gnLCBhY3Rpb24udHlwZSk7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBLCBTbGljZSBleHRlbmRzIHthY3Rpb25zOiBBfT4oc2xpY2U6IFNsaWNlKTogU2xpY2VbJ2FjdGlvbnMnXSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyB0eXBlb2Ygc2xpY2UuYWN0aW9ucztcbiAgICBmb3IgKGNvbnN0IFtzbGljZU5hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBuYW1lID0gc2xpY2VOYW1lO1xuICAgICAgY29uc3QgZG9BY3Rpb24gPSAoLi4ucGFyYW06IGFueVtdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IChhY3Rpb25DcmVhdG9yIGFzIGFueSkoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgICB9O1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXAgYXMgU2xpY2VbJ2FjdGlvbnMnXTtcbiAgfVxuXG4gIHN0b3BBbGxFcGljcygpIHtcbiAgICB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgdGFwKHN0b3JlID0+IHtcbiAgICAgICAgaWYgKHN0b3JlKVxuICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHtwYXlsb2FkOiBudWxsLCB0eXBlOiAnU1RPUF9FUElDJ30pO1xuICAgICAgfSksXG4gICAgICB0YWtlKDEpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVNaWRkbGV3YXJlOiBNaWRkbGV3YXJlID0gKGFwaSkgPT4ge1xuICAgIHJldHVybiAobmV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChhY3Rpb246IFBheWxvYWRBY3Rpb24pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydhY3Rpb24nLCBhY3Rpb24gIT0gbnVsbCA/IGFjdGlvbi50eXBlIDogYWN0aW9uXSk7XG5cbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXI8U3RhdGUsXG4gICAgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICAgICkge1xuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IHRydWV9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiBmYWxzZX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSb290UmVkdWNlcigpOiBSZWR1Y2VyIHtcbiAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCk7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG59XG5cblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=