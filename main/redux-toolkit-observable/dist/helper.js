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
exports.sliceRefActionOp = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
var rxjs_1 = require("rxjs");
var op = __importStar(require("rxjs/operators"));
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
 * Map action stream to multiple action streams by theire action type.
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
        splitActions[reducerName] = rxjs_1.defer(function () {
            if (sourceSub == null)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(op.finalize(function () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFrQnJDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELElBQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsSUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUVwRCxJQUFJLGlCQUFVLENBQUM7UUFDYixlQUFlO1FBQ2YsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTtZQUNsQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQ2xCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFwQixDQUFvQixDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUNKLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFZixTQUFTLFFBQVEsQ0FBQyxZQUE4RDtRQUM5RSxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUMzQixFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFBLEdBQUc7WUFDZCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxJQUFNLE1BQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pC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cm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9ucywgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlLCBQYXlsb2FkQWN0aW9uLCBDYXNlUmVkdWNlckFjdGlvbnMsIFBheWxvYWRBY3Rpb25DcmVhdG9yLCBEcmFmdCwgQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgRU1QVFksIG9mLCBTdWJqZWN0LCBPcGVyYXRvckZ1bmN0aW9uLCBkZWZlciwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2VIZWxwZXI8UywgUj4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHVua25vd24+IHwgdm9pZDtcblxuZXhwb3J0IHR5cGUgU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IFNsaWNlPFMsIFI+ICYge1xuICAvKiogWW91IGRvbid0IGhhdmUgdG8gY3JlYXRlIGVuIEVwaWMgZm9yIHN1YnNjcmliaW5nIGFjdGlvbiBzdHJlYW0sIHlvdSBzdWJzY3JpYmUgdGhpcyBwcm9wZXJ0eVxuICAgKiB0byByZWFjdCBvbiAnZG9uZScgcmVkdWNlciBhY3Rpb24sIGFuZCB5b3UgbWF5IGNhbGwgYWN0aW9uRGlzcGF0Y2hlciB0byBlbWl0IGEgbmV3IGFjdGlvblxuICAgKi9cbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGxldCBhY3Rpb24kID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4oKTtcblxuICBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgLy8gUmVsZWFzZSBlcGljXG4gICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKF9hY3Rpb24kID0+IHtcbiAgICAgIHJldHVybiBfYWN0aW9uJC5waXBlKFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbiQubmV4dChhY3Rpb24pKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9LCBvcHRzLm5hbWUpO1xuICB9KS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhoZWxwZXIpO1xuICAgICAgICAgIGlmIChlcGljKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5hZGRFcGljKGVwaWMsIG9wdHMubmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwoZGVzdG9yeSQpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICAvLyByZWxlYXNlRXBpYy5wdXNoKCgpID0+IHN1Yi51bnN1YnNjcmliZSgpKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvLyBsZXQgcmVsZWFzZUVwaWM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW107XG4gIGNvbnN0IGhlbHBlciA9IHtcbiAgICAuLi5zbGljZSxcbiAgICBhY3Rpb24kOiBhY3Rpb24kLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSQ6IGRlc3RvcnkkLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBkZXN0b3J5JC5uZXh0KCk7XG4gICAgICBkZXN0b3J5JC5jb21wbGV0ZSgpO1xuICAgICAgc3RhdGVGYWN0b3J5LnJlbW92ZVNsaWNlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBoZWxwZXI7XG59XG5cbmludGVyZmFjZSBTaW1wbGVSZWR1Y2VyczxTPiB7XG4gIFtLOiBzdHJpbmddOiAoZHJhZnQ6IERyYWZ0PFM+LCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufVxuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMgYW55O1xuICBmb3IgKGNvbnN0IFtrZXksIHNSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhzaW1wbGVSZWR1Y2VycykpIHtcbiAgICByUmVkdWNlcnNba2V5XSA9IChzOiBEcmFmdDxTPiwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGFueT4pID0+IHtcbiAgICAgIHJldHVybiBzUmVkdWNlcihzLCBwYXlsb2FkKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiByUmVkdWNlcnM7XG59XG5cblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpcmUgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGFjdGlvbkNyZWF0b3JzOiBDYXNlUmVkdWNlckFjdGlvbnM8Uj4sXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4pOlxuICB7XG4gICAgW0sgaW4ga2V5b2YgUl06XG4gICAgICBPYnNlcnZhYmxlPFxuICAgICAgICBDYXNlUmVkdWNlckFjdGlvbnM8Uj5bS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICAgID5cbiAgfSB7XG5cbiAgICBsZXQgc291cmNlU3ViOiBTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgbXVsdGljYXNlQWN0aW9uTWFwOiB7W0s6IHN0cmluZ106IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4gfCB1bmRlZmluZWR9ID0ge307XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zOiB7W0sgaW4ga2V5b2YgUl0/OiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24+fSA9IHt9O1xuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpKSB7XG4gICAgICBjb25zdCBzdWJqZWN0ID0gbXVsdGljYXNlQWN0aW9uTWFwWyhhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0gYXMgUGF5bG9hZEFjdGlvbkNyZWF0b3IpLnR5cGVdID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTLCBhbnk+PigpO1xuICAgICAgc3BsaXRBY3Rpb25zW3JlZHVjZXJOYW1lIGFzIGtleW9mIFJdID0gZGVmZXIoKCkgPT4ge1xuICAgICAgICBpZiAoc291cmNlU3ViID09IG51bGwpXG4gICAgICAgICAgc291cmNlU3ViID0gc291cmNlLnN1YnNjcmliZSgpO1xuICAgICAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKSBhcyBPYnNlcnZhYmxlPGFueT47XG4gICAgICB9KS5waXBlKFxuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZVN1Yikge1xuICAgICAgICAgICAgc291cmNlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBzb3VyY2VTdWIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKFxuICAgICAgb3Auc2hhcmUoKSxcbiAgICAgIG9wLm1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IG11bHRpY2FzZUFjdGlvbk1hcFthY3Rpb24udHlwZV07XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgIG1hdGNoLm5leHQoYWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiBzcGxpdEFjdGlvbnMgYXMge1xuICAgICAgW0sgaW4ga2V5b2YgUl06IE9ic2VydmFibGU8Q2FzZVJlZHVjZXJBY3Rpb25zPFI+W0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPj5cbiAgICB9O1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cbiJdfQ==