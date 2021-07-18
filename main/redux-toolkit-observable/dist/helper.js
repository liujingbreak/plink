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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFDckMsK0JBQTZDO0FBa0I3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxJQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLElBQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsSUFBSSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFcEQsSUFBSSxpQkFBVSxDQUFDO1FBQ2IsZUFBZTtRQUNmLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7WUFDbEMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsSUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBQSxHQUFHO1lBQ2QsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsSUFBTSxNQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FB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RSxzQkFBWSxTQUFZO1FBQ3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBeUIsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDRCw2QkFBTSxHQUFOO1FBQ0UsT0FBTyxJQUFJLENBQUMsR0FBUSxDQUFDO0lBQ3ZCLENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksb0NBQVk7QUFZekIsWUFBWSxDQUFDLGlCQUFTLENBQUMsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1N0YXRlRmFjdG9yeSwgRXh0cmFTbGljZVJlZHVjZXJzfSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9ucywgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlLCBQYXlsb2FkQWN0aW9uLCBDYXNlUmVkdWNlckFjdGlvbnMsIFBheWxvYWRBY3Rpb25DcmVhdG9yLCBBY3Rpb24sIERyYWZ0fSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgRU1QVFksIG9mLCBTdWJqZWN0LCBPcGVyYXRvckZ1bmN0aW9uLCBkZWZlciwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGltbWVyYWJsZSwgSW1tdXRhYmxlIH0gZnJvbSAnaW1tZXInO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgdW5rbm93bj4gfCB2b2lkO1xuXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gU2xpY2U8UywgUj4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb25EaXNwYXRjaGVyOiBDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj47XG4gIGRlc3Ryb3kkOiBPYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3Rvcnk6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4gIGNvbnN0IGRlc3RvcnkkID0gbmV3IFN1YmplY3QoKTtcbiAgbGV0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKG9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBkZXN0cm95JDogZGVzdG9yeSQuYXNPYnNlcnZhYmxlKCksXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGRlc3RvcnkkLm5leHQoKTtcbiAgICAgIGRlc3RvcnkkLmNvbXBsZXRlKCk7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxuaW50ZXJmYWNlIFNpbXBsZVJlZHVjZXJzPFM+IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogUyB8IERyYWZ0PFM+LCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufVxuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMge1trZXk6IHN0cmluZ106IGFueX07XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2VycyBhcyBSZWd1bGFyUmVkdWNlcnM8UywgUj47XG59XG5cblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpciBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFIgZXh0ZW5kcyBDYXNlUmVkdWNlckFjdGlvbnM8U2xpY2VDYXNlUmVkdWNlcnM8YW55Pj4+KGFjdGlvbkNyZWF0b3JzOiBSLFxuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KTpcbiAge1xuICAgIFtLIGluIGtleW9mIFJdOlxuICAgICAgT2JzZXJ2YWJsZTxcbiAgICAgICAgUltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPlxuICAgICAgPlxuICB9IHtcblxuICAgIGxldCBzb3VyY2VTdWI6IFN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBtdWx0aWNhc2VBY3Rpb25NYXA6IHtbSzogc3RyaW5nXTogU3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueSwgYW55PiB8IEFjdGlvbj4gfCB1bmRlZmluZWR9ID0ge307XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zOiB7W0sgaW4ga2V5b2YgUl0/OiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBhbnk+Pn0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgY29uc3Qgc3ViamVjdCA9IG11bHRpY2FzZUFjdGlvbk1hcFsoYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdIGFzIFBheWxvYWRBY3Rpb25DcmVhdG9yKS50eXBlXSA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55LCBhbnk+ICB8IEFjdGlvbj4oKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgIHNwbGl0QWN0aW9uc1tyZWR1Y2VyTmFtZSBhcyBrZXlvZiBSXSA9IGRlZmVyKCgpID0+IHtcbiAgICAgICAgaWYgKHNvdXJjZVN1YiA9PSBudWxsKVxuICAgICAgICAgIHNvdXJjZVN1YiA9IHNvdXJjZS5zdWJzY3JpYmUoKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCkgYXMgT2JzZXJ2YWJsZTxhbnk+O1xuICAgICAgfSkucGlwZShcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZVN1Yikge1xuICAgICAgICAgICAgc291cmNlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBzb3VyY2VTdWIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKFxuICAgICAgb3Auc2hhcmUoKSxcbiAgICAgIG9wLm1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IG11bHRpY2FzZUFjdGlvbk1hcFthY3Rpb24udHlwZSBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBtYXRjaC5uZXh0KGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zIGFzIHtcbiAgICAgIFtLIGluIGtleW9mIFJdOiBPYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgIFBheWxvYWRBY3Rpb248UD4gOiBQYXlsb2FkQWN0aW9uPHVua25vd24+PlxuICAgIH07XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG4vKipcbiAqIEltbWVySlMgZG9lcyBub3Qgd29yayB3aXRoIHNvbWUgbGFyZ2Ugb2JqZWN0IChsaWtlIEhUTUxFbGVtZW50KSwgbWVhbmluZyB5b3UgY2FuIG5vdCBkaXJlY3RseSBkZWZpbmVkIGFcbiAqIFJlZHV4LXRvb2xraXQgc3RhdGUgdG8gY29udGFpbiBzdWNoIGEgbGFyZ2Ugb2JqZWN0LCB0aGlzIGNsYXNzIHByb3ZpZGVzIGEgd3JhcHBlciB0byB0aG9zZVxuICogXCJsYXJnZSBvYmplY3RcIiwgYW5kIGF2b2lkIEltbWVySnMgdG8gcmVjdXJzaXZlbHkgZnJlZXplIGl0IGJ5IHByZS1mcmVlemUgaXRzZWxmLiBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZnJpZ2VyYXRvcjxUPiB7XG4gIHByaXZhdGUgcmVmOiBJbW11dGFibGU8VD47XG4gIFtpbW1lcmFibGVdOiBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihvcmlnaW5SZWY6IFQpIHtcbiAgICB0aGlzLnJlZiA9IG9yaWdpblJlZiBhcyBJbW11dGFibGU8VD47XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuICBnZXRSZWYoKTogVCB7XG4gICAgcmV0dXJuIHRoaXMucmVmIGFzIFQ7XG4gIH1cbn1cblJlZnJpZ2VyYXRvcltpbW1lcmFibGVdID0gZmFsc2U7XG4iXX0=