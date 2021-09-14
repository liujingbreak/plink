"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Refrigerator = exports.action$OfSlice = exports.action$Of = exports.sliceRefActionOp = exports.isActionOfCreator = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
var rxjs_1 = require("rxjs");
var op = __importStar(require("rxjs/operators"));
var immer_1 = require("immer");
function createSliceHelper(stateFactory, opts) {
    var slice = stateFactory.newSlice(opts);
    var actionDispatcher = stateFactory.bindActionCreators(slice);
    var destory$ = new rxjs_1.Subject();
    var action$ = new rxjs_1.Subject();
    new rxjs_1.Observable(function () {
        // Release epic
        return stateFactory.addEpic(function (_action$) {
            return _action$.pipe(op.tap(function (action) { return action$.next(action); }), op.ignoreElements());
        }, opts.name);
    }).subscribe();
    function addEpic$(epicFactory$) {
        var sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(function (fac) {
            if (fac) {
                var epic_1 = fac(helper);
                if (epic_1) {
                    return new rxjs_1.Observable(function () {
                        // Release epic
                        return stateFactory.addEpic(epic_1, opts.name);
                    });
                }
            }
            return rxjs_1.EMPTY;
        }), op.takeUntil(destory$)).subscribe();
        // releaseEpic.push(() => sub.unsubscribe());
        return function () { return sub.unsubscribe(); };
    }
    // let releaseEpic: Array<() => void> = [];
    var helper = __assign(__assign({}, slice), { action$: action$.asObservable(), actionDispatcher: actionDispatcher, addEpic: function (epicFactory) {
            return addEpic$((0, rxjs_1.of)(epicFactory));
        }, addEpic$: addEpic$, destroy$: destory$.asObservable(), destroy: function () {
            destory$.next();
            destory$.complete();
            stateFactory.removeSlice(slice);
        }, getStore: function () {
            return stateFactory.sliceStore(slice);
        }, getState: function () {
            return stateFactory.sliceState(slice);
        } });
    return helper;
}
exports.createSliceHelper = createSliceHelper;
/**
 * createReducers helps to simplify how we writing definition of SliceCaseReducers,
 * e.g. A regular SliceCaseReducers takes PayloadAction as parameter, like:
 * ```ts
 * const reducers = {
 *   reducerName(state: State, {payload}: PayloadAction<number>) {
 *      // update state with payload data
 *    }
 * };
 * ```
 * Normally reducer's logic only care about `payload` instead of `PayloadAction`,
 * createReducers accepts a simpler format:
 * ```ts
 * const reducers = createReducers({
 *   reducerName(draft: State, payload: number) {
 *   }
 * });
 * ```
 * You can declare payload as reducer's parameter instead of a PayloadAction
 * @param simpleReducers
 * @returns SliceCaseReducers which can be part of parameter of createSliceHelper
 */
function createReducers(simpleReducers) {
    var rReducers = {};
    var _loop_1 = function (key, sReducer) {
        rReducers[key] = function (s, _a) {
            var payload = _a.payload;
            return sReducer(s, payload);
        };
    };
    for (var _i = 0, _a = Object.entries(simpleReducers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], sReducer = _b[1];
        _loop_1(key, sReducer);
    }
    return rReducers;
}
exports.createReducers = createReducers;
/**
 * Map action stream to multiple action streams by their action type.
 * This is an alternative way to categorize action stream, compare to "ofPayloadAction()"
 * Usage:
```
slice.addEpic(slice => action$ => {
  const actionsByType = castByActionType(slice.actions, action$);
  return merge(
    actionsByType.REDUCER_NAME_A.pipe(
      ...
    ),
    actionsByType.REDUCER_NAME_B.pipe(
      ...
    ),
  )
})
```
 * @param actionCreators
 * @param action$
 */
function castByActionType(actionCreators, action$) {
    var source = action$.pipe(op.share());
    var splitActions = {};
    var _loop_2 = function (reducerName) {
        Object.defineProperty(splitActions, reducerName, {
            get: function () {
                return source.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(actionCreators[reducerName]));
            }
        });
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_2(reducerName);
    }
    return splitActions;
}
exports.castByActionType = castByActionType;
function isActionOfCreator(action, actionCreator) {
    return action.type === actionCreator.type;
}
exports.isActionOfCreator = isActionOfCreator;
/**
 * Add an epicFactory to another component's sliceHelper
 * e.g.
 * ```
 * action$.pipe(ofPayloadAction(slice.actionDispatcher._onChildSliceRef),
 *  childSliceOp((childSlice) => {
 *    return childAction$ => {
 *      return childAction$.pipe(...);
 *    };
 *  })
 * ```
 * @param epicFactory
 */
function sliceRefActionOp(epicFactory) {
    return function (in$) {
        return in$.pipe(op.switchMap(function (_a) {
            var payload = _a.payload;
            var release = payload.addEpic(epicFactory);
            return new rxjs_1.Observable(function (sub) { return release; });
        }));
    };
}
exports.sliceRefActionOp = sliceRefActionOp;
function action$Of(stateFactory, actionCreator) {
    return new rxjs_1.Observable(function (sub) {
        stateFactory.addEpic(function (action$) {
            return action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(actionCreator), op.map(function (action) { return sub.next(action); }), op.ignoreElements());
        });
    });
}
exports.action$Of = action$Of;
function action$OfSlice(sliceHelper, actionType) {
    return new rxjs_1.Observable(function (sub) {
        sliceHelper.addEpic(function (slice) { return function (action$) {
            return action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions[actionType]), op.map(function (action) { return sub.next(action); }), op.ignoreElements());
        }; });
    });
}
exports.action$OfSlice = action$OfSlice;
/**
 * ImmerJS does not work with some large object (like HTMLElement), meaning you can not directly defined a
 * Redux-toolkit state to contain such a large object, this class provides a wrapper to those
 * "large object", and avoid ImmerJs to recursively freeze it by pre-freeze itself.
 *
 * Use it with `Immutable` to inform Redux-toolkit and ImmerJS that this type should be ignored from `drafting`
 * Usage:
 * ```
    import {Immutable} from 'immer';

    interface YourState {
      someDom: Immutable<Refrigerator<HTMLElement>>;
    }
 * ```
 */
var Refrigerator = /** @class */ (function () {
    function Refrigerator(originRef) {
        this.ref = originRef;
        Object.freeze(this);
    }
    Refrigerator.prototype.creatNewIfNoEqual = function (ref) {
        if (this.ref !== ref) {
            return new Refrigerator(ref);
        }
        else {
            return this;
        }
    };
    Refrigerator.prototype.getRef = function () {
        return this.ref;
    };
    return Refrigerator;
}());
exports.Refrigerator = Refrigerator;
Refrigerator[immer_1.immerable] = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVFQUE2RjtBQUk3Riw2QkFBc0U7QUFDdEUsaURBQXFDO0FBQ3JDLCtCQUE2QztBQW1CN0MsU0FBZ0IsaUJBQWlCLENBQy9CLFlBQTBCLEVBQUUsSUFBOEI7SUFFMUQsSUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQyxJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRSxJQUFNLFFBQVEsR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLElBQUksY0FBTyxFQUEwQixDQUFDO0lBRXBELElBQUksaUJBQVUsQ0FBQztRQUNiLGVBQWU7UUFDZixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxRQUFRO1lBQ2xDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQXBCLENBQW9CLENBQUMsRUFDdEMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBQ0osQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVmLFNBQVMsUUFBUSxDQUFDLFlBQThEO1FBQzlFLElBQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQzNCLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLFVBQUEsR0FBRztZQUNkLElBQUksR0FBRyxFQUFFO2dCQUNQLElBQU0sTUFBSSxHQUFHLEdBQUcs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b2FkQWN0aW9ufSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9ucywgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlLCBQYXlsb2FkQWN0aW9uLCBDYXNlUmVkdWNlckFjdGlvbnMsIFBheWxvYWRBY3Rpb25DcmVhdG9yLCBBY3Rpb24sIERyYWZ0LFxuICBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgRXBpYyB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBFTVBUWSwgb2YsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgaW1tZXJhYmxlLCBJbW11dGFibGUgfSBmcm9tICdpbW1lcic7XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4gPVxuICAoc2xpY2U6IFNsaWNlSGVscGVyPFMsIFIsIE5hbWU+KSA9PiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCB7W3NsaWNlTmFtZSBpbiBOYW1lXTogU30+IHwgdm9pZDtcblxuZXhwb3J0IHR5cGUgU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9IFNsaWNlPFMsIFIsIE5hbWU+ICYge1xuICAvKiogWW91IGRvbid0IGhhdmUgdG8gY3JlYXRlIGVuIEVwaWMgZm9yIHN1YnNjcmliaW5nIGFjdGlvbiBzdHJlYW0sIHlvdSBzdWJzY3JpYmUgdGhpcyBwcm9wZXJ0eVxuICAgKiB0byByZWFjdCBvbiAnZG9uZScgcmVkdWNlciBhY3Rpb24sIGFuZCB5b3UgbWF5IGNhbGwgYWN0aW9uRGlzcGF0Y2hlciB0byBlbWl0IGEgbmV3IGFjdGlvblxuICAgKi9cbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGxldCBhY3Rpb24kID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4oKTtcblxuICBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgLy8gUmVsZWFzZSBlcGljXG4gICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKF9hY3Rpb24kID0+IHtcbiAgICAgIHJldHVybiBfYWN0aW9uJC5waXBlKFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbiQubmV4dChhY3Rpb24pKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9LCBvcHRzLm5hbWUpO1xuICB9KS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhoZWxwZXIpO1xuICAgICAgICAgIGlmIChlcGljKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKGVwaWMsIG9wdHMubmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwoZGVzdG9yeSQpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICAvLyByZWxlYXNlRXBpYy5wdXNoKCgpID0+IHN1Yi51bnN1YnNjcmliZSgpKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvLyBsZXQgcmVsZWFzZUVwaWM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW107XG4gIGNvbnN0IGhlbHBlciA9IHtcbiAgICAuLi5zbGljZSxcbiAgICBhY3Rpb24kOiBhY3Rpb24kLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSQ6IGRlc3RvcnkkLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBkZXN0b3J5JC5uZXh0KCk7XG4gICAgICBkZXN0b3J5JC5jb21wbGV0ZSgpO1xuICAgICAgc3RhdGVGYWN0b3J5LnJlbW92ZVNsaWNlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBoZWxwZXI7XG59XG5cbnR5cGUgU2ltcGxlUmVkdWNlcnM8Uz4gPSB7XG4gIFtLOiBzdHJpbmddOiAoZHJhZnQ6IFMgfCBEcmFmdDxTPiwgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbmV4cG9ydCB0eXBlIFJlZ3VsYXJSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IChzOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFA+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgICAgKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248dW5rbm93bj4pID0+IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogY3JlYXRlUmVkdWNlcnMgaGVscHMgdG8gc2ltcGxpZnkgaG93IHdlIHdyaXRpbmcgZGVmaW5pdGlvbiBvZiBTbGljZUNhc2VSZWR1Y2VycyxcbiAqIGUuZy4gQSByZWd1bGFyIFNsaWNlQ2FzZVJlZHVjZXJzIHRha2VzIFBheWxvYWRBY3Rpb24gYXMgcGFyYW1ldGVyLCBsaWtlOiBcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IHtcbiAqICAgcmVkdWNlck5hbWUoc3RhdGU6IFN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248bnVtYmVyPikge1xuICogICAgICAvLyB1cGRhdGUgc3RhdGUgd2l0aCBwYXlsb2FkIGRhdGFcbiAqICAgIH1cbiAqIH07XG4gKiBgYGBcbiAqIE5vcm1hbGx5IHJlZHVjZXIncyBsb2dpYyBvbmx5IGNhcmUgYWJvdXQgYHBheWxvYWRgIGluc3RlYWQgb2YgYFBheWxvYWRBY3Rpb25gLFxuICogY3JlYXRlUmVkdWNlcnMgYWNjZXB0cyBhIHNpbXBsZXIgZm9ybWF0OlxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0gY3JlYXRlUmVkdWNlcnMoe1xuICogICByZWR1Y2VyTmFtZShkcmFmdDogU3RhdGUsIHBheWxvYWQ6IG51bWJlcikge1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogWW91IGNhbiBkZWNsYXJlIHBheWxvYWQgYXMgcmVkdWNlcidzIHBhcmFtZXRlciBpbnN0ZWFkIG9mIGEgUGF5bG9hZEFjdGlvblxuICogQHBhcmFtIHNpbXBsZVJlZHVjZXJzXG4gKiBAcmV0dXJucyBTbGljZUNhc2VSZWR1Y2VycyB3aGljaCBjYW4gYmUgcGFydCBvZiBwYXJhbWV0ZXIgb2YgY3JlYXRlU2xpY2VIZWxwZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4oc2ltcGxlUmVkdWNlcnM6IFIpOiBSZWd1bGFyUmVkdWNlcnM8UywgUj4ge1xuICBjb25zdCByUmVkdWNlcnMgPSB7fSBhcyB7W2tleTogc3RyaW5nXTogYW55fTtcbiAgZm9yIChjb25zdCBba2V5LCBzUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMoc2ltcGxlUmVkdWNlcnMpKSB7XG4gICAgclJlZHVjZXJzW2tleV0gPSAoczogRHJhZnQ8Uz4sIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4gc1JlZHVjZXIocywgcGF5bG9hZCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gclJlZHVjZXJzIGFzIFJlZ3VsYXJSZWR1Y2VyczxTLCBSPjtcbn1cblxudHlwZSBBY3Rpb25CeVR5cGU8Uj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOlxuICAgIE9ic2VydmFibGU8XG4gICAgICBSW0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPlxuICAgID5cbn07XG5cbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXIgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxSIGV4dGVuZHMgQ2FzZVJlZHVjZXJBY3Rpb25zPFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+PihhY3Rpb25DcmVhdG9yczogUixcbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPik6IEFjdGlvbkJ5VHlwZTxSPiB7XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKG9wLnNoYXJlKCkpO1xuICAgIGNvbnN0IHNwbGl0QWN0aW9ucyA9IHt9IGFzIEFjdGlvbkJ5VHlwZTxSPjtcblxuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3BsaXRBY3Rpb25zLCByZWR1Y2VyTmFtZSwge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZS5waXBlKG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzcGxpdEFjdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FjdGlvbk9mQ3JlYXRvcjxQLCBUIGV4dGVuZHMgc3RyaW5nPihhY3Rpb246IFBheWxvYWRBY3Rpb248YW55LCBhbnk+LCBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD4pOlxuICBhY3Rpb24gaXMgUGF5bG9hZEFjdGlvbjxQLCBUPiB7XG4gIHJldHVybiBhY3Rpb24udHlwZSA9PT0gYWN0aW9uQ3JlYXRvci50eXBlO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxudHlwZSBBY3Rpb25PZlJlZHVjZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4gPSBSW1RdIGV4dGVuZHMgKHM6IGFueSwgYWN0aW9uOiBpbmZlciBBKSA9PiBhbnkgP1xuKEEgZXh0ZW5kcyB7cGF5bG9hZDogaW5mZXIgUH0gPyB7cGF5bG9hZDogUDsgdHlwZTogVH0gOiB7dHlwZTogVH0pIDogbmV2ZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kT2Y8UCwgVCBleHRlbmRzIHN0cmluZz4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LFxuICBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD4pIHtcblxuICByZXR1cm4gbmV3IE9ic2VydmFibGU8UCBleHRlbmRzIHVuZGVmaW5lZCA/IHt0eXBlOiBUfSA6IFBheWxvYWRBY3Rpb248UCwgVD4+KHN1YiA9PiB7XG4gICAgc3RhdGVGYWN0b3J5LmFkZEVwaWM8dW5rbm93bj4oKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mU2xpY2U8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LFxuICBUIGV4dGVuZHMga2V5b2YgUj4oXG4gIHNsaWNlSGVscGVyOiBTbGljZUhlbHBlcjxTLCBSPixcbiAgYWN0aW9uVHlwZTogVCkge1xuXG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxBY3Rpb25PZlJlZHVjZXI8UywgUiwgVD4+KHN1YiA9PiB7XG4gICAgc2xpY2VIZWxwZXIuYWRkRXBpYyhzbGljZSA9PiAoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnNbYWN0aW9uVHlwZV0hKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEltbWVySlMgZG9lcyBub3Qgd29yayB3aXRoIHNvbWUgbGFyZ2Ugb2JqZWN0IChsaWtlIEhUTUxFbGVtZW50KSwgbWVhbmluZyB5b3UgY2FuIG5vdCBkaXJlY3RseSBkZWZpbmVkIGFcbiAqIFJlZHV4LXRvb2xraXQgc3RhdGUgdG8gY29udGFpbiBzdWNoIGEgbGFyZ2Ugb2JqZWN0LCB0aGlzIGNsYXNzIHByb3ZpZGVzIGEgd3JhcHBlciB0byB0aG9zZVxuICogXCJsYXJnZSBvYmplY3RcIiwgYW5kIGF2b2lkIEltbWVySnMgdG8gcmVjdXJzaXZlbHkgZnJlZXplIGl0IGJ5IHByZS1mcmVlemUgaXRzZWxmLiBcbiAqIFxuICogVXNlIGl0IHdpdGggYEltbXV0YWJsZWAgdG8gaW5mb3JtIFJlZHV4LXRvb2xraXQgYW5kIEltbWVySlMgdGhhdCB0aGlzIHR5cGUgc2hvdWxkIGJlIGlnbm9yZWQgZnJvbSBgZHJhZnRpbmdgXG4gKiBVc2FnZTpcbiAqIGBgYFxuICAgIGltcG9ydCB7SW1tdXRhYmxlfSBmcm9tICdpbW1lcic7XG5cbiAgICBpbnRlcmZhY2UgWW91clN0YXRlIHtcbiAgICAgIHNvbWVEb206IEltbXV0YWJsZTxSZWZyaWdlcmF0b3I8SFRNTEVsZW1lbnQ+PjtcbiAgICB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZnJpZ2VyYXRvcjxUPiB7XG4gIHByaXZhdGUgcmVmOiBJbW11dGFibGU8VD47XG4gIFtpbW1lcmFibGVdOiBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihvcmlnaW5SZWY6IFQpIHtcbiAgICB0aGlzLnJlZiA9IG9yaWdpblJlZiBhcyBJbW11dGFibGU8VD47XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuXG4gIGNyZWF0TmV3SWZOb0VxdWFsKHJlZjogVCkge1xuICAgIGlmICh0aGlzLnJlZiAhPT0gcmVmKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZnJpZ2VyYXRvcihyZWYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbiAgZ2V0UmVmKCk6IFQge1xuICAgIHJldHVybiB0aGlzLnJlZiBhcyBUO1xuICB9XG59XG5SZWZyaWdlcmF0b3JbaW1tZXJhYmxlXSA9IGZhbHNlO1xuIl19