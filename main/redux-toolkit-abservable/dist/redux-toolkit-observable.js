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
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        /**
         * Unlike store.dispatch(action),
         * If you call next() on this subject, it can save action dispatch an action even before store is configured
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(20);
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
        this.epicWithUnsub$ = new rxjs_1.BehaviorSubject(this.createRootEpic());
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
                    .pipe(operators_1.takeUntil(unsub.pipe(operators_1.tap(function (epicId) {
                    _this.debugLog.next(['[redux-toolkit-obs]', "unsubscribe from " + epicId]);
                }))));
            }));
        });
        return this;
    };
    /**
     * Create our special slice with a default reducer action:
     * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
     * - initialState is loaded from StateFactory's partial preloadedState
     */
    StateFactory.prototype.newSlice = function (opt) {
        var _opt = opt;
        var reducers = _opt.reducers;
        _opt.initialState.__inited = false;
        if (reducers._change == null)
            Object.assign(_opt.reducers, defaultSliceReducers);
        if (reducers._init == null) {
            reducers._init = function (draft, action) {
                draft.__inited = true;
                console.log("slice \"" + opt.name + "\" is created " + (action.payload.isLazy ? 'lazily' : ''));
                // this.debugLog.next(['[redux-toolkit-obs]', `slice "${opt.name}" is created ${action.payload.isLazy ? 'lazily' : ''}`]);
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
        return function () { return unsubscribeEpic.next(epicId); };
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
    StateFactory.prototype.addSliceMaybeReplaceReducer = function (slice) {
        var _this = this;
        this.reducerMap[slice.name] = slice.reducer;
        if (this.getRootStore()) {
            setTimeout(function () {
                return _this.dispatch(slice.actions._init({ isLazy: true }));
            }, 0);
            // this.getRootStore()!.dispatch(slice.actions._init({isLazy: true}));
            // store has been configured, in this case we do replaceReducer()
            var newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
        }
        else {
            // console.log(`${slice.name} is added`);
            this.dispatch(slice.actions._init({ isLazy: false }));
        }
        // return slices.map(slice => typedBindActionCreaters(slice.actions, store.dispatch));
        return slice;
    };
    StateFactory.prototype.createRootReducer = function () {
        // createReducer({}, builder => {
        //   builder.addCase(this.globalChangeActionCreator,(draft, action) => {
        //     action.payload(draft);
        //   })
        //   .addDefaultCase((draft, action) => {
        //     return combineReducers(this.reducerMap)(draft, action);
        //   });
        // });
        return toolkit_1.combineReducers(this.reducerMap);
    };
    StateFactory.prototype.getRootStore = function () {
        return this.store$.getValue();
    };
    StateFactory.prototype.createRootEpic = function () {
        var _this = this;
        var unsubscribeEpic = new rxjs_1.Subject();
        var logEpic = function (action$, state$) {
            return rxjs_1.merge(
            // state$.pipe(
            //   tap(state => this.debugLog.next(['state', state])),
            //   ignoreElements()
            // ),
            // action$.pipe(
            //   tap(action => {
            //     this.debugLog.next(['action', action.type]);
            //   }),
            //   ignoreElements()
            // ),
            _this.actionsToDispatch);
        };
        return [logEpic, unsubscribeEpic];
    };
    return StateFactory;
}());
exports.StateFactory = StateFactory;
if (module.hot) {
    module.hot.decline();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw4QkFBOEI7QUFDOUIsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQzs7R0FFRztBQUNILDRDQU0wQjtBQUMxQixxREFBc0U7QUFDdEUsNkJBQWtGO0FBQ2xGLDRDQUFtRztBQWFuRyxTQUFnQixlQUFlO0lBQUksd0JBQTJDO1NBQTNDLFVBQTJDLEVBQTNDLHFCQUEyQyxFQUEzQyxJQUEyQztRQUEzQyxtQ0FBMkM7O0lBRTVFLE9BQU8seUJBQU0sZUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLElBQUksRUFBTixDQUFNLENBQUMsRUFBRTtBQUNwRCxDQUFDO0FBSEQsMENBR0M7QUFvQkQsSUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07UUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0NBQ0YsQ0FBQztBQUVGO0lBMkJFLHNCQUFvQixjQUF1RDtRQUEzRSxpQkF5QkM7UUF6Qm1CLG1CQUFjLEdBQWQsY0FBYyxDQUF5QztRQXBCM0UsV0FBTSxHQUFHLElBQUksc0JBQWUsQ0FBcUQsU0FBUyxDQUFDLENBQUM7UUFHcEYsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNwQix5R0FBeUc7UUFFakcsYUFBUSxHQUFHLElBQUksb0JBQWEsQ0FBUSxFQUFFLENBQUMsQ0FBQztRQUloRDs7O1dBR0c7UUFDSyxzQkFBaUIsR0FBRyxJQUFJLG9CQUFhLENBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBK0s5RCwwQkFBcUIsR0FBZSxVQUFDLEdBQUc7WUFDOUMsT0FBTyxVQUFDLElBQUk7Z0JBQ1YsT0FBTyxVQUFDLE1BQXFC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TCxnQkFBZ0I7WUFDaEIsb0JBQW9CO1lBQ3BCLG1EQUFtRDtZQUNuRCxRQUFRO1lBQ1IscUJBQXFCO1lBQ3JCLEtBQUs7WUFDTCxLQUFJLENBQUMsaUJBQWlCLENBQ3ZCLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRixPQUFPLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUFoUkQsSUFnUkM7QUFoUlksb0NBQVk7QUFrUnpCLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Q0FDdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBsaWI9XCJlczIwMTdcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vaG1yLW1vZHVsZS5kLnRzXCIgLz5cbi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsXG4gIFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnMsIE1pZGRsZXdhcmVcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIG1lcmdlIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIG1lcmdlTWFwLCB0YWtlLCB0YWtlVW50aWwsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuLy8gZXhwb3J0IHR5cGUgQ2FsbEJhY2tBY3Rpb25SZWR1Y2VyPFNTPiA9IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+PjtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG50eXBlIFNpbXBsZUFjdGlvbkNyZWF0b3I8UD4gPSAoKHBheWxvYWQ/OiBQKSA9PiBQYXlsb2FkQWN0aW9uPFA+KSAmIHt0eXBlOiBzdHJpbmd9O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQPiguLi5hY3Rpb25DcmVhdG9yczogU2ltcGxlQWN0aW9uQ3JlYXRvcjxQPltdKTpcbiAgKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbiguLi5hY3Rpb25DcmVhdG9yczogYW55W10pOlxuLy8gICAoc291cmNlOiBPYnNlcnZhYmxlPGFueT4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxzdHJpbmc+PiB7XG4vLyAgIHJldHVybiBvZlR5cGU8YW55PiguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbi8vIH1cblxuLy8gdHlwZSBTdGF0ZUZyb21SZWR1Y2VyPFQ+ID0gVCBleHRlbmRzIFJlZHVjZXI8Q29tYmluZWRTdGF0ZTxpbmZlciBTPj4gPyBTIDogdW5rbm93bjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWR1eFN0b3JlV2l0aEVwaWNPcHRpb25zPFN0YXRlID0gYW55LCBQYXlsb2FkID0gYW55LCBPdXRwdXQgZXh0ZW5kcyBQYXlsb2FkQWN0aW9uPFBheWxvYWQ+ID0gUGF5bG9hZEFjdGlvbjxQYXlsb2FkPixcbkNhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4gPSBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiB7XG4gIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ107XG4gIHNsaWNlczogU2xpY2U8U3RhdGUsIENhc2VSZWR1Y2VycywgTmFtZT5bXTtcbiAgZXBpY3M6IEVwaWM8UGF5bG9hZEFjdGlvbjxQYXlsb2FkPiwgT3V0cHV0LCBTdGF0ZT5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN0YXRlIHtcbiAgYWN0aW9uRXJyb3I/OiBFcnJvcjtcbn1cblxuY29uc3QgZGVmYXVsdFNsaWNlUmVkdWNlcnM6IFBhcnRpYWw8RXh0cmFTbGljZVJlZHVjZXJzPGFueT4+ID0ge1xuICBfY2hhbmdlOiAoc3RhdGUsIGFjdGlvbikgPT4ge1xuICAgIGFjdGlvbi5wYXlsb2FkKHN0YXRlKTtcbiAgfVxufTtcblxuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8e1trZXk6IHN0cmluZ106IGFueX0+O1xuICBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcblxuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IEJlaGF2aW9yU3ViamVjdDxbRXBpYywgU3ViamVjdDxzdHJpbmc+XT47XG5cbiAgLyoqXG4gICAqIFVubGlrZSBzdG9yZS5kaXNwYXRjaChhY3Rpb24pLFxuICAgKiBJZiB5b3UgY2FsbCBuZXh0KCkgb24gdGhpcyBzdWJqZWN0LCBpdCBjYW4gc2F2ZSBhY3Rpb24gZGlzcGF0Y2ggYW4gYWN0aW9uIGV2ZW4gYmVmb3JlIHN0b3JlIGlzIGNvbmZpZ3VyZWRcbiAgICovXG4gIHByaXZhdGUgYWN0aW9uc1RvRGlzcGF0Y2ggPSBuZXcgUmVwbGF5U3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueT4+KDIwKTtcblxuICBwcml2YXRlIHJlcG9ydEFjdGlvbkVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICBwcml2YXRlIGVycm9yU2xpY2U6IFNsaWNlPEVycm9yU3RhdGU+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXSkge1xuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PGFueT4ocHJlbG9hZGVkU3RhdGUpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHRoaXMuY3JlYXRlUm9vdEVwaWMoKSk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2Uoe1xuICAgICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBFcnJvclN0YXRlLFxuICAgICAgbmFtZTogJ2Vycm9yJyxcbiAgICAgIHJlZHVjZXJzOiB7XG4gICAgICAgIHJlcG9ydEFjdGlvbkVycm9yKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxFcnJvcj4pIHtcbiAgICAgICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5lcnJvclNsaWNlID0gZXJyb3JTbGljZTtcblxuICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IgPSB0aGlzLmJpbmRBY3Rpb25DcmVhdG9ycyhlcnJvclNsaWNlKS5yZXBvcnRBY3Rpb25FcnJvcjtcblxuICB9XG5cbiAgY29uZmlndXJlU3RvcmUobWlkZGxld2FyZXM/OiBNaWRkbGV3YXJlW10pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgY29uc3QgbWlkZGxld2FyZSA9IG1pZGRsZXdhcmVzID8gW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgLi4ubWlkZGxld2FyZXNdIDogW2VwaWNNaWRkbGV3YXJlLCB0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZV07XG4gICAgY29uc3Qgc3RvcmUgPSBjb25maWd1cmVTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55PiwgTWlkZGxld2FyZTxhbnk+W10+KHtcbiAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgLy8gcHJlbG9hZGVkU3RhdGU6IHRoaXMucHJlbG9hZGVkU3RhdGUsXG4gICAgICBtaWRkbGV3YXJlXG4gICAgfSk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKChbZXBpYywgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgYXMgUmV0dXJuVHlwZTxFcGljPilcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHRha2VVbnRpbCh1bnN1Yi5waXBlKHRhcCgoZXBpY0lkKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICB9KSkpXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFNTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIG9wdDogQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KSB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT47XG4gICAgY29uc3QgcmVkdWNlcnMgPSBfb3B0LnJlZHVjZXJzIGFzIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsIF9DYXNlUmVkdWNlcj47XG5cbiAgICAoX29wdC5pbml0aWFsU3RhdGUgYXMgYW55KS5fX2luaXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9jaGFuZ2UgPT0gbnVsbClcbiAgICAgIE9iamVjdC5hc3NpZ24oX29wdC5yZWR1Y2VycywgZGVmYXVsdFNsaWNlUmVkdWNlcnMpO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9pbml0ID09IG51bGwpIHtcbiAgICAgIHJlZHVjZXJzLl9pbml0ID0gKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAgICAgKGRyYWZ0IGFzIGFueSkuX19pbml0ZWQgPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmxvZyhgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWApO1xuICAgICAgICAvLyB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT4pO1xuXG4gICAgdGhpcy5hZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXIoc2xpY2UpO1xuXG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcmVtb3ZlU2xpY2Uoc2xpY2U6IHtuYW1lOiBzdHJpbmd9KSB7XG4gICAgZGVsZXRlIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXTtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdyZW1vdmUgc2xpY2UgJysgc2xpY2UubmFtZV0pO1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIGEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgZnJvbSB0aGlzIGVwaWNcbiAgICogQHBhcmFtIGVwaWMgXG4gICAqL1xuICBhZGRFcGljKFxuICAgIGVwaWM6IEVwaWMpIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKyt0aGlzLmVwaWNTZXE7XG4gICAgY29uc3QgdW5zdWJzY3JpYmVFcGljID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQubmV4dChbZXBpYywgdW5zdWJzY3JpYmVFcGljXSk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGVwaWNJZCArICcgaXMgYWRkZWQnXSk7XG4gICAgcmV0dXJuICgpID0+IHVuc3Vic2NyaWJlRXBpYy5uZXh0KGVwaWNJZCk7XG4gIH1cblxuICBzbGljZVN0YXRlPFNTLCBDYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTUywgQ2FzZVJlZHVjZXJzLCBOYW1lPik6IFNTIHtcbiAgICBjb25zdCBzdG9yZSA9IHRoaXMuZ2V0Um9vdFN0b3JlKCk7XG4gICAgcmV0dXJuIHN0b3JlID8gc3RvcmUuZ2V0U3RhdGUoKVtzbGljZS5uYW1lXSBhcyBTUyA6IHt9IGFzIFNTO1xuICB9XG5cbiAgc2xpY2VTdG9yZTxTUz4oc2xpY2U6IFNsaWNlPFNTPik6IE9ic2VydmFibGU8U1M+IHtcbiAgICByZXR1cm4gKHRoaXMucmVhbHRpbWVTdGF0ZSQgYXMgQmVoYXZpb3JTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBTU30+KS5waXBlKFxuICAgICAgbWFwKHMgPT4gc1tzbGljZS5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICAgKTtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxpbmsgUmVkdXgncyBiaW5kQWN0aW9uQ3JlYXRvcnMsIG91ciBzdG9yZSBpcyBsYXppbHkgY3JlYXRlZCwgZGlzcGF0Y2ggaXMgbm90IGF2YWlsYWJsZSBhdCBiZWdpbm5pbmcuXG4gICAqIFBhcmFtZXRlciBpcyBhIFNsaWNlIGluc3RlYWQgb2YgYWN0aW9uIG1hcFxuICAgKi9cbiAgYmluZEFjdGlvbkNyZWF0b3JzPEEsIFNsaWNlIGV4dGVuZHMge2FjdGlvbnM6IEF9PihzbGljZTogU2xpY2UpIHtcblxuICAgIGNvbnN0IGFjdGlvbk1hcCA9IHt9IGFzIHR5cGVvZiBzbGljZS5hY3Rpb25zO1xuICAgIGZvciAoY29uc3QgW3NsaWNlTmFtZSwgYWN0aW9uQ3JlYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2xpY2UuYWN0aW9ucykpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBzbGljZU5hbWU7XG4gICAgICBjb25zdCBkb0FjdGlvbiA9ICguLi5wYXJhbTogYW55W10pID0+IHtcbiAgICAgICAgY29uc3QgYWN0aW9uID0gKGFjdGlvbkNyZWF0b3IgYXMgYW55KSguLi5wYXJhbSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICAgIH07XG4gICAgICBhY3Rpb25NYXBbbmFtZV0gPSBkb0FjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbk1hcCBhcyBTbGljZVsnYWN0aW9ucyddO1xuICB9XG5cbiAgcHJpdmF0ZSBlcnJvckhhbmRsZU1pZGRsZXdhcmU6IE1pZGRsZXdhcmUgPSAoYXBpKSA9PiB7XG4gICAgcmV0dXJuIChuZXh0KSA9PiB7XG4gICAgICByZXR1cm4gKGFjdGlvbjogUGF5bG9hZEFjdGlvbikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbi50eXBlXSk7XG5cbiAgICAgICAgICBjb25zdCByZXQgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBmYWlsZWQgYWN0aW9uJywgYWN0aW9uKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGFjdGlvbiBkaXNwYXRjaCBlcnJvcicsIGVycik7XG4gICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXI8U3RhdGUsXG4gICAgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICAgICkge1xuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT5cbiAgICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IHRydWV9KSksIDApO1xuICAgICAgLy8gdGhpcy5nZXRSb290U3RvcmUoKSEuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgICAgLy8gc3RvcmUgaGFzIGJlZW4gY29uZmlndXJlZCwgaW4gdGhpcyBjYXNlIHdlIGRvIHJlcGxhY2VSZWR1Y2VyKClcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgJHtzbGljZS5uYW1lfSBpcyBhZGRlZGApO1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IGZhbHNlfSkpO1xuICAgIH1cbiAgICAvLyByZXR1cm4gc2xpY2VzLm1hcChzbGljZSA9PiB0eXBlZEJpbmRBY3Rpb25DcmVhdGVycyhzbGljZS5hY3Rpb25zLCBzdG9yZS5kaXNwYXRjaCkpO1xuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdFJlZHVjZXIoKTogUmVkdWNlciB7XG4gICAgLy8gY3JlYXRlUmVkdWNlcih7fSwgYnVpbGRlciA9PiB7XG4gICAgLy8gICBidWlsZGVyLmFkZENhc2UodGhpcy5nbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yLChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgLy8gICAgIGFjdGlvbi5wYXlsb2FkKGRyYWZ0KTtcbiAgICAvLyAgIH0pXG4gICAgLy8gICAuYWRkRGVmYXVsdENhc2UoKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApKGRyYWZ0LCBhY3Rpb24pO1xuICAgIC8vICAgfSk7XG4gICAgLy8gfSk7XG4gICAgcmV0dXJuIGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290U3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RvcmUkLmdldFZhbHVlKCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVJvb3RFcGljKCk6IFtFcGljLCBTdWJqZWN0PHN0cmluZz5dIHtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgY29uc3QgbG9nRXBpYzogRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4+ID0gKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAvLyBzdGF0ZSQucGlwZShcbiAgICAgICAgLy8gICB0YXAoc3RhdGUgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnc3RhdGUnLCBzdGF0ZV0pKSxcbiAgICAgICAgLy8gICBpZ25vcmVFbGVtZW50cygpXG4gICAgICAgIC8vICksXG4gICAgICAgIC8vIGFjdGlvbiQucGlwZShcbiAgICAgICAgLy8gICB0YXAoYWN0aW9uID0+IHtcbiAgICAgICAgLy8gICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ2FjdGlvbicsIGFjdGlvbi50eXBlXSk7XG4gICAgICAgIC8vICAgfSksXG4gICAgICAgIC8vICAgaWdub3JlRWxlbWVudHMoKVxuICAgICAgICAvLyApLFxuICAgICAgICB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoXG4gICAgICApO1xuICAgIH07XG5cbiAgICByZXR1cm4gW2xvZ0VwaWMsIHVuc3Vic2NyaWJlRXBpY107XG4gIH1cbn1cblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=