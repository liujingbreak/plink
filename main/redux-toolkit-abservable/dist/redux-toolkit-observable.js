"use strict";
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
var StateFactory = /** @class */ (function () {
    function StateFactory(preloadedState) {
        this.preloadedState = preloadedState;
        this.store$ = new rxjs_1.BehaviorSubject(undefined);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        /**
         * Unlike store.dispatch(action),
         * If you call next() on this subject, it can save action dispatch an action even before store is configured
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(10);
        this.realtimeState$ = new rxjs_1.BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new rxjs_1.BehaviorSubject(this.createRootEpic());
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(operators_1.filter(function (store) { return store != null; }), operators_1.take(1)).toPromise();
        this.newSlice({
            initialState: {},
            name: 'debug',
            reducers: {}
        });
        this.defaultSliceReducers = {
            _change: function (state, action) {
                action.payload(state);
            }
        };
    }
    StateFactory.prototype.configureStore = function () {
        var _this = this;
        if (this.store$.getValue())
            return;
        var rootReducer = this.createRootReducer();
        var epicMiddleware = redux_observable_1.createEpicMiddleware();
        var store = toolkit_1.configureStore({
            reducer: rootReducer,
            // preloadedState: this.preloadedState,
            middleware: [epicMiddleware]
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
        var _this = this;
        var _opt = opt;
        var reducers = _opt.reducers;
        if (reducers._change == null)
            Object.assign(_opt.reducers, this.defaultSliceReducers);
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
        return function () { return unsubscribeEpic.next(epicId); };
    };
    StateFactory.prototype.sliceState = function (slice) {
        var store = this.getRootStore();
        return store ? store.getState()[slice.name] : {};
    };
    StateFactory.prototype.sliceStore = function (slice) {
        return this.realtimeState$.pipe(operators_1.map(function (s) { return s[slice.name]; }), operators_1.filter(function (ss) { return ss != null; }), operators_1.distinctUntilChanged());
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
        this.reducerMap[slice.name] = slice.reducer;
        if (this.getRootStore()) {
            this.dispatch(slice.actions._init({ isLazy: true }));
            // store has been configured, in this case we do replaceReducer()
            var newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
        }
        else {
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
            action$.pipe(operators_1.tap(function (action) {
                _this.debugLog.next(['action', action.type]);
            }), operators_1.ignoreElements()), _this.actionsToDispatch);
        };
        return [logEpic, unsubscribeEpic];
    };
    return StateFactory;
}());
exports.StateFactory = StateFactory;
if (module.hot) {
    module.hot.decline();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0NBQWtDO0FBQ2xDOztHQUVHO0FBQ0gsNENBTTBCO0FBQzFCLHFEQUFzRTtBQUN0RSw2QkFBa0Y7QUFDbEYsNENBQW1IO0FBYW5ILFNBQWdCLGVBQWU7SUFBSSx3QkFBMkM7U0FBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO1FBQTNDLG1DQUEyQzs7SUFFNUUsT0FBTyx5QkFBTSxlQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxFQUFOLENBQU0sQ0FBQyxFQUFFO0FBQ3BELENBQUM7QUFIRCwwQ0FHQztBQWdCRDtJQXdCRSxzQkFBb0IsY0FBdUQ7UUFBdkQsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBakIzRSxXQUFNLEdBQUcsSUFBSSxzQkFBZSxDQUFxRCxTQUFTLENBQUMsQ0FBQztRQUdwRixZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUVqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBS2hEOzs7V0FHRztRQUNLLHNCQUFpQixHQUFHLElBQUksb0JBQWEsQ0FBcUIsRUFBRSxDQUFDLENBQUM7UUFHcEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLHNCQUFlLENBQU0sY0FBYyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLHNCQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBRXJCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ3BDLGtCQUFNLENBQXlDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxJQUFJLElBQUksRUFBYixDQUFhLENBQUMsRUFDdEUsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNaLFlBQVksRUFBRSxFQUFFO1lBQ2hCLElBQUksRUFBRSxPQUFPO1lBQ2IsUUFBUSxFQUFFLEVBQUU7U0FDYixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0JBQW9CLEdBQUc7WUFDMUIsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07Z0JBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsQ0FBQztTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQscUNBQWMsR0FBZDtRQUFBLGlCQXFDQztRQXBDQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ3hCLE9BQU87UUFDVCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUM3QyxJQUFNLGNBQWMsR0FBRyx1Q0FBb0IsRUFBc0IsQ0FBQztRQUVsRSxJQUFNLEtBQUssR0FBRyx3QkFBYyxDQUEwQjtZQUNwRCxPQUFPLEVBQUUsV0FBVztZQUNwQix1Q0FBdUM7WUFDdkMsVUFBVSxFQUFFLENBQUMsY0FBYyxDQUFDO1NBQzdCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhCLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDZCxJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0IsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDdEIsZ0NBQW9CLEVBQUU7UUFDdEIsMkNBQTJDO1FBQzNDLGVBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQXBDLENBQW9DLENBQUMsQ0FDbkQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVk7WUFDL0MsT0FBTyxLQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDN0Isb0JBQVEsQ0FBQyxVQUFDLEVBQWE7b0JBQVosSUFBSSxRQUFBLEVBQUUsS0FBSyxRQUFBO2dCQUFNLE9BQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFzQjtxQkFDbEYsSUFBSSxDQUNILHFCQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsVUFBQyxNQUFNO29CQUM5QixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLHNCQUFvQixNQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ0w7WUFMeUIsQ0FLekIsQ0FDRixDQUNGLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwrQkFBUSxHQUFSLFVBQ0UsR0FBK0M7UUFEakQsaUJBd0JDO1FBckJDLElBQU0sSUFBSSxHQUFHLEdBQTBFLENBQUM7UUFDeEYsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQXVELENBQUM7UUFFOUUsSUFBSSxRQUFRLENBQUMsT0FBTyxJQUFJLElBQUk7WUFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTFELElBQUksUUFBUSxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDMUIsUUFBUSxDQUFDLEtBQUssR0FBRyxVQUFDLEtBQUssRUFBRSxNQUFNO2dCQUM3QixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLGFBQVUsR0FBRyxDQUFDLElBQUksdUJBQWdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztZQUN6SCxDQUFDLENBQUM7U0FDSDtRQUVELElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN4RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRTtRQUNELElBQU0sS0FBSyxHQUFHLHFCQUFnQixDQUM1QixHQUEwRSxDQUFDLENBQUM7UUFFOUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELGtDQUFXLEdBQVgsVUFBWSxLQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMscUJBQXFCLEVBQUUsZUFBZSxHQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxZQUFZLEVBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDckQ7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsOEJBQU8sR0FBUCxVQUNFLElBQVU7UUFDVixJQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3hDLElBQU0sZUFBZSxHQUFHLElBQUksY0FBTyxFQUFVLENBQUM7UUFDOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sY0FBTSxPQUFBLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQTVCLENBQTRCLENBQUM7SUFDNUMsQ0FBQztJQUVELGlDQUFVLEdBQVYsVUFDRSxLQUFvQztRQUNwQyxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbEMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFPLENBQUMsQ0FBQyxDQUFDLEVBQVEsQ0FBQztJQUMvRCxDQUFDO0lBRUQsaUNBQVUsR0FBVixVQUFlLEtBQWdCO1FBQzdCLE9BQVEsSUFBSSxDQUFDLGNBQXVELENBQUMsSUFBSSxDQUN2RSxlQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFiLENBQWEsQ0FBQyxFQUN2QixrQkFBTSxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxJQUFJLElBQUksRUFBVixDQUFVLENBQUMsRUFDeEIsZ0NBQW9CLEVBQUUsQ0FDdkIsQ0FBQztJQUNKLENBQUM7SUFFRCwrQkFBUSxHQUFSLFVBQVksTUFBd0I7UUFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gseUNBQWtCLEdBQWxCLFVBQWtELEtBQVk7UUFBOUQsaUJBYUM7UUFYQyxJQUFNLFNBQVMsR0FBRyxFQUEwQixDQUFDO2dDQUNqQyxTQUFTLEVBQUUsYUFBYTtZQUNsQyxJQUFNLE1BQUksR0FBRyxTQUFTLENBQUM7WUFDdkIsSUFBTSxRQUFRLEdBQUc7Z0JBQUMsZUFBZTtxQkFBZixVQUFlLEVBQWYscUJBQWUsRUFBZixJQUFlO29CQUFmLDBCQUFlOztnQkFDL0IsSUFBTSxNQUFNLEdBQUksYUFBcUIsZUFBSSxLQUFLLENBQUMsQ0FBQztnQkFDaEQsS0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEIsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDO1lBQ0YsU0FBUyxDQUFDLE1BQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQzs7UUFQN0IsS0FBeUMsVUFBNkIsRUFBN0IsS0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBN0IsY0FBNkIsRUFBN0IsSUFBNkI7WUFBM0QsSUFBQSxXQUEwQixFQUF6QixTQUFTLFFBQUEsRUFBRSxhQUFhLFFBQUE7b0JBQXhCLFNBQVMsRUFBRSxhQUFhO1NBUW5DO1FBQ0QsT0FBTyxTQUE2QixDQUFDO0lBQ3ZDLENBQUM7SUFFTyxrREFBMkIsR0FBbkMsVUFFRSxLQUErRTtRQUcvRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25ELGlFQUFpRTtZQUNqRSxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMsWUFBWSxFQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ3JEO2FBQU07WUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQztTQUNyRDtRQUNELHNGQUFzRjtRQUN0RixPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyx3Q0FBaUIsR0FBekI7UUFDRSxpQ0FBaUM7UUFDakMsd0VBQXdFO1FBQ3hFLDZCQUE2QjtRQUM3QixPQUFPO1FBQ1AseUNBQXlDO1FBQ3pDLDhEQUE4RDtRQUM5RCxRQUFRO1FBQ1IsTUFBTTtRQUNOLE9BQU8seUJBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVPLG1DQUFZLEdBQXBCO1FBQ0UsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFTyxxQ0FBYyxHQUF0QjtRQUFBLGlCQW1CQztRQWxCQyxJQUFNLGVBQWUsR0FBRyxJQUFJLGNBQU8sRUFBVSxDQUFDO1FBQzlDLElBQU0sT0FBTyxHQUE2QixVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQ3hELE9BQU8sWUFBSztZQUNWLGVBQWU7WUFDZix3REFBd0Q7WUFDeEQscUJBQXFCO1lBQ3JCLEtBQUs7WUFDTCxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQUcsQ0FBQyxVQUFBLE1BQU07Z0JBQ1IsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUMsQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQixFQUNELEtBQUksQ0FBQyxpQkFBaUIsQ0FDdkIsQ0FBQztRQUNKLENBQUMsQ0FBQztRQUVGLE9BQU8sQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQXZPRCxJQXVPQztBQXZPWSxvQ0FBWTtBQXlPekIsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuLyoqXG4gKiBBIGNvbWJvIHNldCBmb3IgdXNpbmcgUmVkdXgtdG9vbGtpdCBhbG9uZyB3aXRoIHJlZHV4LW9ic2VydmFibGVcbiAqL1xuaW1wb3J0IHtcbiAgQ2FzZVJlZHVjZXIsIGNvbWJpbmVSZWR1Y2VycywgY29uZmlndXJlU3RvcmUsXG4gIENvbmZpZ3VyZVN0b3JlT3B0aW9ucywgY3JlYXRlU2xpY2UgYXMgcmVkdXhDcmVhdGVTbGljZSwgQ3JlYXRlU2xpY2VPcHRpb25zLFxuICBEcmFmdCwgRW5oYW5jZWRTdG9yZSwgUGF5bG9hZEFjdGlvbiwgUmVkdWNlcnNNYXBPYmplY3QsXG4gIFNsaWNlLCBTbGljZUNhc2VSZWR1Y2VycywgUmVkdWNlcixcbiAgVmFsaWRhdGVTbGljZUNhc2VSZWR1Y2Vyc1xufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IGNyZWF0ZUVwaWNNaWRkbGV3YXJlLCBFcGljLCBvZlR5cGUgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgUmVwbGF5U3ViamVjdCwgU3ViamVjdCwgbWVyZ2UgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VVbnRpbCwgdGFwLCBpZ25vcmVFbGVtZW50cyB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuLy8gZXhwb3J0IHR5cGUgQ2FsbEJhY2tBY3Rpb25SZWR1Y2VyPFNTPiA9IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+PjtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG50eXBlIFNpbXBsZUFjdGlvbkNyZWF0b3I8UD4gPSAoKHBheWxvYWQ/OiBQKSA9PiBQYXlsb2FkQWN0aW9uPFA+KSAmIHt0eXBlOiBzdHJpbmd9O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQPiguLi5hY3Rpb25DcmVhdG9yczogU2ltcGxlQWN0aW9uQ3JlYXRvcjxQPltdKTpcbiAgKHNvdXJjZTogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSA9PiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbiguLi5hY3Rpb25DcmVhdG9yczogYW55W10pOlxuLy8gICAoc291cmNlOiBPYnNlcnZhYmxlPGFueT4pID0+IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxzdHJpbmc+PiB7XG4vLyAgIHJldHVybiBvZlR5cGU8YW55PiguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKTtcbi8vIH1cblxuLy8gdHlwZSBTdGF0ZUZyb21SZWR1Y2VyPFQ+ID0gVCBleHRlbmRzIFJlZHVjZXI8Q29tYmluZWRTdGF0ZTxpbmZlciBTPj4gPyBTIDogdW5rbm93bjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWR1eFN0b3JlV2l0aEVwaWNPcHRpb25zPFN0YXRlID0gYW55LCBQYXlsb2FkID0gYW55LCBPdXRwdXQgZXh0ZW5kcyBQYXlsb2FkQWN0aW9uPFBheWxvYWQ+ID0gUGF5bG9hZEFjdGlvbjxQYXlsb2FkPixcbkNhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4gPSBTbGljZUNhc2VSZWR1Y2Vyczxhbnk+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiB7XG4gIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ107XG4gIHNsaWNlczogU2xpY2U8U3RhdGUsIENhc2VSZWR1Y2VycywgTmFtZT5bXTtcbiAgZXBpY3M6IEVwaWM8UGF5bG9hZEFjdGlvbjxQYXlsb2FkPiwgT3V0cHV0LCBTdGF0ZT5bXTtcbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8e1trZXk6IHN0cmluZ106IGFueX0+O1xuICBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcbiAgcm9vdFN0b3JlUmVhZHk6IFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+O1xuICBwcml2YXRlIGVwaWNTZXEgPSAwO1xuICAvLyBwcml2YXRlIGdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IgPSBjcmVhdGVBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PGFueT4pID0+IHZvaWQ+KCdfX2dsb2JhbF9jaGFuZ2UnKTtcblxuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IEJlaGF2aW9yU3ViamVjdDxbRXBpYywgU3ViamVjdDxzdHJpbmc+XT47XG5cbiAgcHJpdmF0ZSBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj47XG4gIC8qKlxuICAgKiBVbmxpa2Ugc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSxcbiAgICogSWYgeW91IGNhbGwgbmV4dCgpIG9uIHRoaXMgc3ViamVjdCwgaXQgY2FuIHNhdmUgYWN0aW9uIGRpc3BhdGNoIGFuIGFjdGlvbiBldmVuIGJlZm9yZSBzdG9yZSBpcyBjb25maWd1cmVkXG4gICAqL1xuICBwcml2YXRlIGFjdGlvbnNUb0Rpc3BhdGNoID0gbmV3IFJlcGxheVN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnk+PigxMCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8YW55PihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBCZWhhdmlvclN1YmplY3QodGhpcy5jcmVhdGVSb290RXBpYygpKTtcbiAgICB0aGlzLmxvZyQgPSB0aGlzLmRlYnVnTG9nLmFzT2JzZXJ2YWJsZSgpO1xuICAgIHRoaXMucmVkdWNlck1hcCA9IHt9O1xuXG4gICAgdGhpcy5yb290U3RvcmVSZWFkeSA9IHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICBmaWx0ZXI8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4+KHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgICB0aGlzLm5ld1NsaWNlKHtcbiAgICAgIGluaXRpYWxTdGF0ZToge30sXG4gICAgICBuYW1lOiAnZGVidWcnLFxuICAgICAgcmVkdWNlcnM6IHt9XG4gICAgfSk7XG5cbiAgICB0aGlzLmRlZmF1bHRTbGljZVJlZHVjZXJzID0ge1xuICAgICAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICAgICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBjb25maWd1cmVTdG9yZSgpIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCByb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICBjb25zdCBlcGljTWlkZGxld2FyZSA9IGNyZWF0ZUVwaWNNaWRkbGV3YXJlPFBheWxvYWRBY3Rpb248YW55Pj4oKTtcblxuICAgIGNvbnN0IHN0b3JlID0gY29uZmlndXJlU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+KHtcbiAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgLy8gcHJlbG9hZGVkU3RhdGU6IHRoaXMucHJlbG9hZGVkU3RhdGUsXG4gICAgICBtaWRkbGV3YXJlOiBbZXBpY01pZGRsZXdhcmVdXG4gICAgfSk7XG5cbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKChbZXBpYywgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgYXMgUmV0dXJuVHlwZTxFcGljPilcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHRha2VVbnRpbCh1bnN1Yi5waXBlKHRhcCgoZXBpY0lkKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICB9KSkpXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFNTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIG9wdDogQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KSB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTUywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiwgTmFtZT47XG4gICAgY29uc3QgcmVkdWNlcnMgPSBfb3B0LnJlZHVjZXJzIGFzIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCB0aGlzLmRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFNTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+LCBOYW1lPik7XG5cbiAgICB0aGlzLmFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcihzbGljZSk7XG5cbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICByZW1vdmVTbGljZShzbGljZToge25hbWU6IHN0cmluZ30pIHtcbiAgICBkZWxldGUgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ3JlbW92ZSBzbGljZSAnKyBzbGljZS5uYW1lXSk7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSBmcm9tIHRoaXMgZXBpY1xuICAgKiBAcGFyYW0gZXBpYyBcbiAgICovXG4gIGFkZEVwaWMoXG4gICAgZXBpYzogRXBpYykge1xuICAgIGNvbnN0IGVwaWNJZCA9ICdFcGljLScgKyArK3RoaXMuZXBpY1NlcTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCB1bnN1YnNjcmliZUVwaWNdKTtcbiAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgZXBpY0lkICsgJyBpcyBhZGRlZCddKTtcbiAgICByZXR1cm4gKCkgPT4gdW5zdWJzY3JpYmVFcGljLm5leHQoZXBpY0lkKTtcbiAgfVxuXG4gIHNsaWNlU3RhdGU8U1MsIENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFNTLCBDYXNlUmVkdWNlcnMsIE5hbWU+KTogU1Mge1xuICAgIGNvbnN0IHN0b3JlID0gdGhpcy5nZXRSb290U3RvcmUoKTtcbiAgICByZXR1cm4gc3RvcmUgPyBzdG9yZS5nZXRTdGF0ZSgpW3NsaWNlLm5hbWVdIGFzIFNTIDoge30gYXMgU1M7XG4gIH1cblxuICBzbGljZVN0b3JlPFNTPihzbGljZTogU2xpY2U8U1M+KTogT2JzZXJ2YWJsZTxTUz4ge1xuICAgIHJldHVybiAodGhpcy5yZWFsdGltZVN0YXRlJCBhcyBCZWhhdmlvclN1YmplY3Q8e1trZXk6IHN0cmluZ106IFNTfT4pLnBpcGUoXG4gICAgICBtYXAocyA9PiBzW3NsaWNlLm5hbWVdKSxcbiAgICAgIGZpbHRlcihzcyA9PiBzcyAhPSBudWxsKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKClcbiAgICApO1xuICB9XG5cbiAgZGlzcGF0Y2g8VD4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFQ+KSB7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBLCBTbGljZSBleHRlbmRzIHthY3Rpb25zOiBBfT4oc2xpY2U6IFNsaWNlKSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyB0eXBlb2Ygc2xpY2UuYWN0aW9ucztcbiAgICBmb3IgKGNvbnN0IFtzbGljZU5hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBuYW1lID0gc2xpY2VOYW1lO1xuICAgICAgY29uc3QgZG9BY3Rpb24gPSAoLi4ucGFyYW06IGFueVtdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IChhY3Rpb25DcmVhdG9yIGFzIGFueSkoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgICB9O1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXAgYXMgU2xpY2VbJ2FjdGlvbnMnXTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyPFN0YXRlLFxuICAgIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTdGF0ZSwgU2xpY2VDYXNlUmVkdWNlcnM8U3RhdGU+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFN0YXRlPiwgTmFtZT5cbiAgICApIHtcblxuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgICAgLy8gc3RvcmUgaGFzIGJlZW4gY29uZmlndXJlZCwgaW4gdGhpcyBjYXNlIHdlIGRvIHJlcGxhY2VSZWR1Y2VyKClcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogZmFsc2V9KSk7XG4gICAgfVxuICAgIC8vIHJldHVybiBzbGljZXMubWFwKHNsaWNlID0+IHR5cGVkQmluZEFjdGlvbkNyZWF0ZXJzKHNsaWNlLmFjdGlvbnMsIHN0b3JlLmRpc3BhdGNoKSk7XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSb290UmVkdWNlcigpOiBSZWR1Y2VyIHtcbiAgICAvLyBjcmVhdGVSZWR1Y2VyKHt9LCBidWlsZGVyID0+IHtcbiAgICAvLyAgIGJ1aWxkZXIuYWRkQ2FzZSh0aGlzLmdsb2JhbENoYW5nZUFjdGlvbkNyZWF0b3IsKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAvLyAgICAgYWN0aW9uLnBheWxvYWQoZHJhZnQpO1xuICAgIC8vICAgfSlcbiAgICAvLyAgIC5hZGREZWZhdWx0Q2FzZSgoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgIC8vICAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCkoZHJhZnQsIGFjdGlvbik7XG4gICAgLy8gICB9KTtcbiAgICAvLyB9KTtcbiAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCk7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdEVwaWMoKTogW0VwaWMsIFN1YmplY3Q8c3RyaW5nPl0ge1xuICAgIGNvbnN0IHVuc3Vic2NyaWJlRXBpYyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICBjb25zdCBsb2dFcGljOiBFcGljPFBheWxvYWRBY3Rpb248YW55Pj4gPSAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgICByZXR1cm4gbWVyZ2UoXG4gICAgICAgIC8vIHN0YXRlJC5waXBlKFxuICAgICAgICAvLyAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpLFxuICAgICAgICAvLyAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICAgLy8gKSxcbiAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgIHRhcChhY3Rpb24gPT4ge1xuICAgICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uLnR5cGVdKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICAgICksXG4gICAgICAgIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2hcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHJldHVybiBbbG9nRXBpYywgdW5zdWJzY3JpYmVFcGljXTtcbiAgfVxufVxuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==