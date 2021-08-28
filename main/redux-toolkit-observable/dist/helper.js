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
exports.Refrigerator = exports.sliceRefActionOp = exports.isActionOfCreator = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
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
    var subscriberCnt = 0;
    var dispatcherByType = {};
    var splitActions = {};
    var _loop_2 = function (reducerName) {
        var subject = dispatcherByType[actionCreators[reducerName].type] = new rxjs_1.Subject();
        // eslint-disable-next-line no-loop-func
        splitActions[reducerName] = rxjs_1.defer(function () {
            if (subscriberCnt++ === 0)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(function () {
            if (--subscriberCnt === 0 && sourceSub) {
                sourceSub.unsubscribe();
                sourceSub = undefined;
            }
        }));
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_2(reducerName);
    }
    var source = action$.pipe(
    // op.share(), we don't need share(), we have implemented same logic
    op.map(function (action) {
        var match = dispatcherByType[action.type];
        if (match) {
            match.next(action);
        }
    }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFDckMsK0JBQTZDO0FBa0I3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxJQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLElBQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsSUFBSSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFcEQsSUFBSSxpQkFBVSxDQUFDO1FBQ2IsZUFBZTtRQUNmLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7WUFDbEMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsSUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBQSxHQUFHO1lBQ2QsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsSUFBTSxNQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FB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QUMsQ0FBQztZQUM3QyxPQUFPLElBQUksaUJBQVUsQ0FBdUIsVUFBQSxHQUFHLElBQUksT0FBQSxPQUFPLEVBQVAsQ0FBTyxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUM7QUFWRCw0Q0FVQztBQUVEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0g7SUFJRSxzQkFBWSxTQUFZO1FBQ3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBeUIsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCx3Q0FBaUIsR0FBakIsVUFBa0IsR0FBTTtRQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDOUI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBQ0QsNkJBQU0sR0FBTjtRQUNFLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0lBQ0gsbUJBQUM7QUFBRCxDQUFDLEFBbkJELElBbUJDO0FBbkJZLG9DQUFZO0FBb0J6QixZQUFZLENBQUMsaUJBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnN9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgUGF5bG9hZEFjdGlvbkNyZWF0b3IsIEFjdGlvbiwgRHJhZnQsXG4gIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbiwgZGVmZXIsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBpbW1lcmFibGUsIEltbXV0YWJsZSB9IGZyb20gJ2ltbWVyJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2VIZWxwZXI8UywgUj4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHVua25vd24+IHwgdm9pZDtcblxuZXhwb3J0IHR5cGUgU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IFNsaWNlPFMsIFI+ICYge1xuICAvKiogWW91IGRvbid0IGhhdmUgdG8gY3JlYXRlIGVuIEVwaWMgZm9yIHN1YnNjcmliaW5nIGFjdGlvbiBzdHJlYW0sIHlvdSBzdWJzY3JpYmUgdGhpcyBwcm9wZXJ0eVxuICAgKiB0byByZWFjdCBvbiAnZG9uZScgcmVkdWNlciBhY3Rpb24sIGFuZCB5b3UgbWF5IGNhbGwgYWN0aW9uRGlzcGF0Y2hlciB0byBlbWl0IGEgbmV3IGFjdGlvblxuICAgKi9cbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGxldCBhY3Rpb24kID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4oKTtcblxuICBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgLy8gUmVsZWFzZSBlcGljXG4gICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKF9hY3Rpb24kID0+IHtcbiAgICAgIHJldHVybiBfYWN0aW9uJC5waXBlKFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbiQubmV4dChhY3Rpb24pKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9LCBvcHRzLm5hbWUpO1xuICB9KS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhoZWxwZXIpO1xuICAgICAgICAgIGlmIChlcGljKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKGVwaWMsIG9wdHMubmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwoZGVzdG9yeSQpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICAvLyByZWxlYXNlRXBpYy5wdXNoKCgpID0+IHN1Yi51bnN1YnNjcmliZSgpKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvLyBsZXQgcmVsZWFzZUVwaWM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW107XG4gIGNvbnN0IGhlbHBlciA9IHtcbiAgICAuLi5zbGljZSxcbiAgICBhY3Rpb24kOiBhY3Rpb24kLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSQ6IGRlc3RvcnkkLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBkZXN0b3J5JC5uZXh0KCk7XG4gICAgICBkZXN0b3J5JC5jb21wbGV0ZSgpO1xuICAgICAgc3RhdGVGYWN0b3J5LnJlbW92ZVNsaWNlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBoZWxwZXI7XG59XG5cbnR5cGUgU2ltcGxlUmVkdWNlcnM8Uz4gPSB7XG4gIFtLOiBzdHJpbmddOiAoZHJhZnQ6IFMgfCBEcmFmdDxTPiwgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbmV4cG9ydCB0eXBlIFJlZ3VsYXJSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IChzOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFA+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgICAgKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248dW5rbm93bj4pID0+IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogY3JlYXRlUmVkdWNlcnMgaGVscHMgdG8gc2ltcGxpZnkgaG93IHdlIHdyaXRpbmcgZGVmaW5pdGlvbiBvZiBTbGljZUNhc2VSZWR1Y2VycyxcbiAqIGUuZy4gQSByZWd1bGFyIFNsaWNlQ2FzZVJlZHVjZXJzIHRha2VzIFBheWxvYWRBY3Rpb24gYXMgcGFyYW1ldGVyLCBsaWtlOiBcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IHtcbiAqICAgcmVkdWNlck5hbWUoc3RhdGU6IFN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248bnVtYmVyPikge1xuICogICAgICAvLyB1cGRhdGUgc3RhdGUgd2l0aCBwYXlsb2FkIGRhdGFcbiAqICAgIH1cbiAqIH07XG4gKiBgYGBcbiAqIE5vcm1hbGx5IHJlZHVjZXIncyBsb2dpYyBvbmx5IGNhcmUgYWJvdXQgYHBheWxvYWRgIGluc3RlYWQgb2YgYFBheWxvYWRBY3Rpb25gLFxuICogY3JlYXRlUmVkdWNlcnMgYWNjZXB0cyBhIHNpbXBsZXIgZm9ybWF0OlxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0gY3JlYXRlUmVkdWNlcnMoe1xuICogICByZWR1Y2VyTmFtZShkcmFmdDogU3RhdGUsIHBheWxvYWQ6IG51bWJlcikge1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogWW91IGNhbiBkZWNsYXJlIHBheWxvYWQgYXMgcmVkdWNlcidzIHBhcmFtZXRlciBpbnN0ZWFkIG9mIGEgUGF5bG9hZEFjdGlvblxuICogQHBhcmFtIHNpbXBsZVJlZHVjZXJzXG4gKiBAcmV0dXJucyBTbGljZUNhc2VSZWR1Y2VycyB3aGljaCBjYW4gYmUgcGFydCBvZiBwYXJhbWV0ZXIgb2YgY3JlYXRlU2xpY2VIZWxwZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4oc2ltcGxlUmVkdWNlcnM6IFIpOiBSZWd1bGFyUmVkdWNlcnM8UywgUj4ge1xuICBjb25zdCByUmVkdWNlcnMgPSB7fSBhcyB7W2tleTogc3RyaW5nXTogYW55fTtcbiAgZm9yIChjb25zdCBba2V5LCBzUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMoc2ltcGxlUmVkdWNlcnMpKSB7XG4gICAgclJlZHVjZXJzW2tleV0gPSAoczogRHJhZnQ8Uz4sIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4gc1JlZHVjZXIocywgcGF5bG9hZCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gclJlZHVjZXJzIGFzIFJlZ3VsYXJSZWR1Y2VyczxTLCBSPjtcbn1cblxuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UiBleHRlbmRzIENhc2VSZWR1Y2VyQWN0aW9uczxTbGljZUNhc2VSZWR1Y2Vyczxhbnk+Pj4oYWN0aW9uQ3JlYXRvcnM6IFIsXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4pOlxuICB7XG4gICAgW0sgaW4ga2V5b2YgUl06XG4gICAgICBPYnNlcnZhYmxlPFxuICAgICAgICBSW0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICAgIFBheWxvYWRBY3Rpb248UD4gOiBQYXlsb2FkQWN0aW9uPHVua25vd24+XG4gICAgICA+XG4gIH0ge1xuXG4gICAgbGV0IHNvdXJjZVN1YjogU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xuICAgIGxldCBzdWJzY3JpYmVyQ250ID0gMDtcbiAgICBjb25zdCBkaXNwYXRjaGVyQnlUeXBlOiB7W0s6IHN0cmluZ106IFN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnksIGFueT4gfCBBY3Rpb24+IHwgdW5kZWZpbmVkfSA9IHt9O1xuICAgIGNvbnN0IHNwbGl0QWN0aW9uczoge1tLIGluIGtleW9mIFJdPzogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj59ID0ge307XG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBkaXNwYXRjaGVyQnlUeXBlWyhhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0gYXMgUGF5bG9hZEFjdGlvbkNyZWF0b3IpLnR5cGVdID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbjxhbnksIGFueT4gIHwgQWN0aW9uPigpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgc3BsaXRBY3Rpb25zW3JlZHVjZXJOYW1lIGFzIGtleW9mIFJdID0gZGVmZXIoKCkgPT4ge1xuICAgICAgICBpZiAoc3Vic2NyaWJlckNudCsrID09PSAwKVxuICAgICAgICAgIHNvdXJjZVN1YiA9IHNvdXJjZS5zdWJzY3JpYmUoKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCkgYXMgT2JzZXJ2YWJsZTxhbnk+O1xuICAgICAgfSkucGlwZShcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKC0tc3Vic2NyaWJlckNudCA9PT0gMCAmJiBzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIC8vIG9wLnNoYXJlKCksIHdlIGRvbid0IG5lZWQgc2hhcmUoKSwgd2UgaGF2ZSBpbXBsZW1lbnRlZCBzYW1lIGxvZ2ljXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBkaXNwYXRjaGVyQnlUeXBlW2FjdGlvbi50eXBlIGFzIHN0cmluZ107XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgIG1hdGNoLm5leHQoYWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiBzcGxpdEFjdGlvbnMgYXMge1xuICAgICAgW0sgaW4ga2V5b2YgUl06IE9ic2VydmFibGU8UltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj4+XG4gICAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWN0aW9uT2ZDcmVhdG9yPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxhbnksIGFueT4sIGFjdGlvbkNyZWF0b3I6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPik6XG4gIGFjdGlvbiBpcyBQYXlsb2FkQWN0aW9uPFAsIFQ+IHtcbiAgcmV0dXJuIGFjdGlvbi50eXBlID09PSBhY3Rpb25DcmVhdG9yLnR5cGU7XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG4vKipcbiAqIEltbWVySlMgZG9lcyBub3Qgd29yayB3aXRoIHNvbWUgbGFyZ2Ugb2JqZWN0IChsaWtlIEhUTUxFbGVtZW50KSwgbWVhbmluZyB5b3UgY2FuIG5vdCBkaXJlY3RseSBkZWZpbmVkIGFcbiAqIFJlZHV4LXRvb2xraXQgc3RhdGUgdG8gY29udGFpbiBzdWNoIGEgbGFyZ2Ugb2JqZWN0LCB0aGlzIGNsYXNzIHByb3ZpZGVzIGEgd3JhcHBlciB0byB0aG9zZVxuICogXCJsYXJnZSBvYmplY3RcIiwgYW5kIGF2b2lkIEltbWVySnMgdG8gcmVjdXJzaXZlbHkgZnJlZXplIGl0IGJ5IHByZS1mcmVlemUgaXRzZWxmLiBcbiAqIFxuICogVXNlIGl0IHdpdGggYEltbXV0YWJsZWAgdG8gaW5mb3JtIFJlZHV4LXRvb2xraXQgYW5kIEltbWVySlMgdGhhdCB0aGlzIHR5cGUgc2hvdWxkIGJlIGlnbm9yZWQgZnJvbSBgZHJhZnRpbmdgXG4gKiBVc2FnZTpcbiAqIGBgYFxuICAgIGltcG9ydCB7SW1tdXRhYmxlfSBmcm9tICdpbW1lcic7XG5cbiAgICBpbnRlcmZhY2UgWW91clN0YXRlIHtcbiAgICAgIHNvbWVEb206IEltbXV0YWJsZTxSZWZyaWdlcmF0b3I8SFRNTEVsZW1lbnQ+PjtcbiAgICB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZnJpZ2VyYXRvcjxUPiB7XG4gIHByaXZhdGUgcmVmOiBJbW11dGFibGU8VD47XG4gIFtpbW1lcmFibGVdOiBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihvcmlnaW5SZWY6IFQpIHtcbiAgICB0aGlzLnJlZiA9IG9yaWdpblJlZiBhcyBJbW11dGFibGU8VD47XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuXG4gIGNyZWF0TmV3SWZOb0VxdWFsKHJlZjogVCkge1xuICAgIGlmICh0aGlzLnJlZiAhPT0gcmVmKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZnJpZ2VyYXRvcihyZWYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbiAgZ2V0UmVmKCk6IFQge1xuICAgIHJldHVybiB0aGlzLnJlZiBhcyBUO1xuICB9XG59XG5SZWZyaWdlcmF0b3JbaW1tZXJhYmxlXSA9IGZhbHNlO1xuIl19