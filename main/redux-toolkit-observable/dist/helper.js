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
exports.Refrigerator = exports.sliceRefActionOp = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
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
    var helper = __assign(__assign({}, slice), { action$: action$.asObservable(), actionDispatcher: actionDispatcher,
        addEpic: function (epicFactory) {
            return addEpic$(rxjs_1.of(epicFactory));
        },
        addEpic$: addEpic$, destroy$: destory$.asObservable(), destroy: function () {
            destory$.next();
            destory$.complete();
            stateFactory.removeSlice(slice);
        },
        getStore: function () {
            return stateFactory.sliceStore(slice);
        },
        getState: function () {
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
    var sourceSub;
    var multicaseActionMap = {};
    var splitActions = {};
    var _loop_2 = function (reducerName) {
        var subject = multicaseActionMap[actionCreators[reducerName].type] = new rxjs_1.Subject();
        // eslint-disable-next-line no-loop-func
        splitActions[reducerName] = rxjs_1.defer(function () {
            if (sourceSub == null)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(function () {
            if (sourceSub) {
                sourceSub.unsubscribe();
                sourceSub = undefined;
            }
        }));
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_2(reducerName);
    }
    var source = action$.pipe(op.share(), op.map(function (action) {
        var match = multicaseActionMap[action.type];
        if (match) {
            match.next(action);
        }
    }));
    return splitActions;
}
exports.castByActionType = castByActionType;
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
    Refrigerator.prototype.getRef = function () {
        return this.ref;
    };
    return Refrigerator;
}());
exports.Refrigerator = Refrigerator;
Refrigerator[immer_1.immerable] = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFDckMsK0JBQTZDO0FBa0I3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxJQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLElBQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsSUFBSSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFcEQsSUFBSSxpQkFBVSxDQUFDO1FBQ2IsZUFBZTtRQUNmLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7WUFDbEMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsSUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBQSxHQUFHO1lBQ2QsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsSUFBTSxNQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FB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RztBQUNIO0lBSUUsc0JBQVksU0FBWTtRQUN0QixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQXlCLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBQ0QsNkJBQU0sR0FBTjtRQUNFLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0lBQ0gsbUJBQUM7QUFBRCxDQUFDLEFBWEQsSUFXQztBQVhZLG9DQUFZO0FBWXpCLFlBQVksQ0FBQyxpQkFBUyxDQUFDLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtTdGF0ZUZhY3RvcnksIEV4dHJhU2xpY2VSZWR1Y2Vyc30gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZSwgUGF5bG9hZEFjdGlvbiwgQ2FzZVJlZHVjZXJBY3Rpb25zLCBQYXlsb2FkQWN0aW9uQ3JlYXRvciwgQWN0aW9uLCBEcmFmdH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbiwgZGVmZXIsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBpbW1lcmFibGUsIEltbXV0YWJsZSB9IGZyb20gJ2ltbWVyJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2VIZWxwZXI8UywgUj4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHVua25vd24+IHwgdm9pZDtcblxuZXhwb3J0IHR5cGUgU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IFNsaWNlPFMsIFI+ICYge1xuICAvKiogWW91IGRvbid0IGhhdmUgdG8gY3JlYXRlIGVuIEVwaWMgZm9yIHN1YnNjcmliaW5nIGFjdGlvbiBzdHJlYW0sIHlvdSBzdWJzY3JpYmUgdGhpcyBwcm9wZXJ0eVxuICAgKiB0byByZWFjdCBvbiAnZG9uZScgcmVkdWNlciBhY3Rpb24sIGFuZCB5b3UgbWF5IGNhbGwgYWN0aW9uRGlzcGF0Y2hlciB0byBlbWl0IGEgbmV3IGFjdGlvblxuICAgKi9cbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGxldCBhY3Rpb24kID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4oKTtcblxuICBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgLy8gUmVsZWFzZSBlcGljXG4gICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKF9hY3Rpb24kID0+IHtcbiAgICAgIHJldHVybiBfYWN0aW9uJC5waXBlKFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbiQubmV4dChhY3Rpb24pKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9LCBvcHRzLm5hbWUpO1xuICB9KS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhoZWxwZXIpO1xuICAgICAgICAgIGlmIChlcGljKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKGVwaWMsIG9wdHMubmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwoZGVzdG9yeSQpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICAvLyByZWxlYXNlRXBpYy5wdXNoKCgpID0+IHN1Yi51bnN1YnNjcmliZSgpKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvLyBsZXQgcmVsZWFzZUVwaWM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW107XG4gIGNvbnN0IGhlbHBlciA9IHtcbiAgICAuLi5zbGljZSxcbiAgICBhY3Rpb24kOiBhY3Rpb24kLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSQ6IGRlc3RvcnkkLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBkZXN0b3J5JC5uZXh0KCk7XG4gICAgICBkZXN0b3J5JC5jb21wbGV0ZSgpO1xuICAgICAgc3RhdGVGYWN0b3J5LnJlbW92ZVNsaWNlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBoZWxwZXI7XG59XG5cbmludGVyZmFjZSBTaW1wbGVSZWR1Y2VyczxTPiB7XG4gIFtLOiBzdHJpbmddOiAoZHJhZnQ6IFMgfCBEcmFmdDxTPiwgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn1cblxuZXhwb3J0IHR5cGUgUmVndWxhclJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gKHM6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248UD4pID0+IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgICAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx1bmtub3duPikgPT4gdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBjcmVhdGVSZWR1Y2VycyBoZWxwcyB0byBzaW1wbGlmeSBob3cgd2Ugd3JpdGluZyBkZWZpbml0aW9uIG9mIFNsaWNlQ2FzZVJlZHVjZXJzLFxuICogZS5nLiBBIHJlZ3VsYXIgU2xpY2VDYXNlUmVkdWNlcnMgdGFrZXMgUGF5bG9hZEFjdGlvbiBhcyBwYXJhbWV0ZXIsIGxpa2U6IFxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0ge1xuICogICByZWR1Y2VyTmFtZShzdGF0ZTogU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxudW1iZXI+KSB7XG4gKiAgICAgIC8vIHVwZGF0ZSBzdGF0ZSB3aXRoIHBheWxvYWQgZGF0YVxuICogICAgfVxuICogfTtcbiAqIGBgYFxuICogTm9ybWFsbHkgcmVkdWNlcidzIGxvZ2ljIG9ubHkgY2FyZSBhYm91dCBgcGF5bG9hZGAgaW5zdGVhZCBvZiBgUGF5bG9hZEFjdGlvbmAsXG4gKiBjcmVhdGVSZWR1Y2VycyBhY2NlcHRzIGEgc2ltcGxlciBmb3JtYXQ6XG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2Vycyh7XG4gKiAgIHJlZHVjZXJOYW1lKGRyYWZ0OiBTdGF0ZSwgcGF5bG9hZDogbnVtYmVyKSB7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKiBZb3UgY2FuIGRlY2xhcmUgcGF5bG9hZCBhcyByZWR1Y2VyJ3MgcGFyYW1ldGVyIGluc3RlYWQgb2YgYSBQYXlsb2FkQWN0aW9uXG4gKiBAcGFyYW0gc2ltcGxlUmVkdWNlcnNcbiAqIEByZXR1cm5zIFNsaWNlQ2FzZVJlZHVjZXJzIHdoaWNoIGNhbiBiZSBwYXJ0IG9mIHBhcmFtZXRlciBvZiBjcmVhdGVTbGljZUhlbHBlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PihzaW1wbGVSZWR1Y2VyczogUik6IFJlZ3VsYXJSZWR1Y2VyczxTLCBSPiB7XG4gIGNvbnN0IHJSZWR1Y2VycyA9IHt9IGFzIHtba2V5OiBzdHJpbmddOiBhbnl9O1xuICBmb3IgKGNvbnN0IFtrZXksIHNSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhzaW1wbGVSZWR1Y2VycykpIHtcbiAgICByUmVkdWNlcnNba2V5XSA9IChzOiBEcmFmdDxTPiwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGFueT4pID0+IHtcbiAgICAgIHJldHVybiBzUmVkdWNlcihzLCBwYXlsb2FkKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiByUmVkdWNlcnMgYXMgUmVndWxhclJlZHVjZXJzPFMsIFI+O1xufVxuXG5cbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXIgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxSIGV4dGVuZHMgQ2FzZVJlZHVjZXJBY3Rpb25zPFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+PihhY3Rpb25DcmVhdG9yczogUixcbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPik6XG4gIHtcbiAgICBbSyBpbiBrZXlvZiBSXTpcbiAgICAgIE9ic2VydmFibGU8XG4gICAgICAgIFJbS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICAgID5cbiAgfSB7XG5cbiAgICBsZXQgc291cmNlU3ViOiBTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgbXVsdGljYXNlQWN0aW9uTWFwOiB7W0s6IHN0cmluZ106IFN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnksIGFueT4gfCBBY3Rpb24+IHwgdW5kZWZpbmVkfSA9IHt9O1xuICAgIGNvbnN0IHNwbGl0QWN0aW9uczoge1tLIGluIGtleW9mIFJdPzogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj59ID0ge307XG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBtdWx0aWNhc2VBY3Rpb25NYXBbKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSBhcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcikudHlwZV0gPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueSwgYW55PiAgfCBBY3Rpb24+KCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICBzcGxpdEFjdGlvbnNbcmVkdWNlck5hbWUgYXMga2V5b2YgUl0gPSBkZWZlcigoKSA9PiB7XG4gICAgICAgIGlmIChzb3VyY2VTdWIgPT0gbnVsbClcbiAgICAgICAgICBzb3VyY2VTdWIgPSBzb3VyY2Uuc3Vic2NyaWJlKCk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0LmFzT2JzZXJ2YWJsZSgpIGFzIE9ic2VydmFibGU8YW55PjtcbiAgICAgIH0pLnBpcGUoXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIG9wLnNoYXJlKCksXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtdWx0aWNhc2VBY3Rpb25NYXBbYWN0aW9uLnR5cGUgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgbWF0Y2gubmV4dChhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucyBhcyB7XG4gICAgICBbSyBpbiBrZXlvZiBSXTogT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPj5cbiAgICB9O1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBJbW1lckpTIGRvZXMgbm90IHdvcmsgd2l0aCBzb21lIGxhcmdlIG9iamVjdCAobGlrZSBIVE1MRWxlbWVudCksIG1lYW5pbmcgeW91IGNhbiBub3QgZGlyZWN0bHkgZGVmaW5lZCBhXG4gKiBSZWR1eC10b29sa2l0IHN0YXRlIHRvIGNvbnRhaW4gc3VjaCBhIGxhcmdlIG9iamVjdCwgdGhpcyBjbGFzcyBwcm92aWRlcyBhIHdyYXBwZXIgdG8gdGhvc2VcbiAqIFwibGFyZ2Ugb2JqZWN0XCIsIGFuZCBhdm9pZCBJbW1lckpzIHRvIHJlY3Vyc2l2ZWx5IGZyZWV6ZSBpdCBieSBwcmUtZnJlZXplIGl0c2VsZi4gXG4gKiBcbiAqIFVzZSBpdCB3aXRoIGBJbW11dGFibGVgIHRvIGluZm9ybSBSZWR1eC10b29sa2l0IGFuZCBJbW1lckpTIHRoYXQgdGhpcyB0eXBlIHNob3VsZCBiZSBpZ25vcmVkIGZyb20gYGRyYWZ0aW5nYFxuICogVXNhZ2U6XG4gKiBgYGBcbiAgICBpbXBvcnQge0ltbXV0YWJsZX0gZnJvbSAnaW1tZXInO1xuXG4gICAgaW50ZXJmYWNlIFlvdXJTdGF0ZSB7XG4gICAgICBzb21lRG9tOiBJbW11dGFibGU8UmVmcmlnZXJhdG9yPEhUTUxFbGVtZW50Pj47XG4gICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyaWdlcmF0b3I8VD4ge1xuICBwcml2YXRlIHJlZjogSW1tdXRhYmxlPFQ+O1xuICBbaW1tZXJhYmxlXTogZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3JpZ2luUmVmOiBUKSB7XG4gICAgdGhpcy5yZWYgPSBvcmlnaW5SZWYgYXMgSW1tdXRhYmxlPFQ+O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cbiAgZ2V0UmVmKCk6IFQge1xuICAgIHJldHVybiB0aGlzLnJlZiBhcyBUO1xuICB9XG59XG5SZWZyaWdlcmF0b3JbaW1tZXJhYmxlXSA9IGZhbHNlO1xuIl19