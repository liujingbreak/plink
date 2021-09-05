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
    var sourceSub;
    var subscriberCnt = 0;
    var dispatcherByType = {};
    var splitActions = {};
    var _loop_2 = function (reducerName) {
        var subject = dispatcherByType[actionCreators[reducerName].type] = new rxjs_1.Subject();
        // eslint-disable-next-line no-loop-func
        splitActions[reducerName] = (0, rxjs_1.defer)(function () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFDckMsK0JBQTZDO0FBa0I3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxJQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLElBQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsSUFBSSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFcEQsSUFBSSxpQkFBVSxDQUFDO1FBQ2IsZUFBZTtRQUNmLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7WUFDbEMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsSUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBQSxHQUFHO1lBQ2QsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsSUFBTSxNQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FB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QUMsV0FBVyxDQUFDLENBQUM7WUFDN0MsT0FBTyxJQUFJLGlCQUFVLENBQXVCLFVBQUEsR0FBRyxJQUFJLE9BQUEsT0FBTyxFQUFQLENBQU8sQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBVkQsNENBVUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNIO0lBSUUsc0JBQVksU0FBWTtRQUN0QixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQXlCLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsd0NBQWlCLEdBQWpCLFVBQWtCLEdBQU07UUFDdEIsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFBRTtZQUNwQixPQUFPLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztJQUNELDZCQUFNLEdBQU47UUFDRSxPQUFPLElBQUksQ0FBQyxHQUFRLENBQUM7SUFDdkIsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQW5CRCxJQW1CQztBQW5CWSxvQ0FBWTtBQW9CekIsWUFBWSxDQUFDLGlCQUFTLENBQUMsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1N0YXRlRmFjdG9yeSwgRXh0cmFTbGljZVJlZHVjZXJzfSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9ucywgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlLCBQYXlsb2FkQWN0aW9uLCBDYXNlUmVkdWNlckFjdGlvbnMsIFBheWxvYWRBY3Rpb25DcmVhdG9yLCBBY3Rpb24sIERyYWZ0LFxuICBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgRXBpYyB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBFTVBUWSwgb2YsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24sIGRlZmVyLCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgaW1tZXJhYmxlLCBJbW11dGFibGUgfSBmcm9tICdpbW1lcic7XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlSGVscGVyPFMsIFI+KSA9PiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCB1bmtub3duPiB8IHZvaWQ7XG5cbmV4cG9ydCB0eXBlIFNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSBTbGljZTxTLCBSPiAmIHtcbiAgLyoqIFlvdSBkb24ndCBoYXZlIHRvIGNyZWF0ZSBlbiBFcGljIGZvciBzdWJzY3JpYmluZyBhY3Rpb24gc3RyZWFtLCB5b3Ugc3Vic2NyaWJlIHRoaXMgcHJvcGVydHlcbiAgICogdG8gcmVhY3Qgb24gJ2RvbmUnIHJlZHVjZXIgYWN0aW9uLCBhbmQgeW91IG1heSBjYWxsIGFjdGlvbkRpc3BhdGNoZXIgdG8gZW1pdCBhIG5ldyBhY3Rpb25cbiAgICovXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj47XG4gIGFjdGlvbkRpc3BhdGNoZXI6IENhc2VSZWR1Y2VyQWN0aW9uczxSICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+PjtcbiAgZGVzdHJveSQ6IE9ic2VydmFibGU8YW55PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeTogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSgpOiB2b2lkO1xuICBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LCBvcHRzOiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZUhlbHBlcjxTLCBSPiB7XG5cbiAgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uob3B0cyk7XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbiAgY29uc3QgZGVzdG9yeSQgPSBuZXcgU3ViamVjdCgpO1xuICBsZXQgYWN0aW9uJCA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KCk7XG5cbiAgbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhfYWN0aW9uJCA9PiB7XG4gICAgICByZXR1cm4gX2FjdGlvbiQucGlwZShcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24kLm5leHQoYWN0aW9uKSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSwgb3B0cy5uYW1lKTtcbiAgfSkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoaGVscGVyKTtcbiAgICAgICAgICBpZiAoZXBpYykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gUmVsZWFzZSBlcGljXG4gICAgICAgICAgICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhlcGljLCBvcHRzLm5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKGRlc3RvcnkkKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgLy8gcmVsZWFzZUVwaWMucHVzaCgoKSA9PiBzdWIudW5zdWJzY3JpYmUoKSk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLy8gbGV0IHJlbGVhc2VFcGljOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdO1xuICBjb25zdCBoZWxwZXIgPSB7XG4gICAgLi4uc2xpY2UsXG4gICAgYWN0aW9uJDogYWN0aW9uJC5hc09ic2VydmFibGUoKSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQob2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGRlc3Ryb3kkOiBkZXN0b3J5JC5hc09ic2VydmFibGUoKSxcbiAgICBkZXN0cm95KCkge1xuICAgICAgZGVzdG9yeSQubmV4dCgpO1xuICAgICAgZGVzdG9yeSQuY29tcGxldGUoKTtcbiAgICAgIHN0YXRlRmFjdG9yeS5yZW1vdmVTbGljZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gaGVscGVyO1xufVxuXG50eXBlIFNpbXBsZVJlZHVjZXJzPFM+ID0ge1xuICBbSzogc3RyaW5nXTogKGRyYWZ0OiBTIHwgRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMge1trZXk6IHN0cmluZ106IGFueX07XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2VycyBhcyBSZWd1bGFyUmVkdWNlcnM8UywgUj47XG59XG5cblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpciBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFIgZXh0ZW5kcyBDYXNlUmVkdWNlckFjdGlvbnM8U2xpY2VDYXNlUmVkdWNlcnM8YW55Pj4+KGFjdGlvbkNyZWF0b3JzOiBSLFxuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KTpcbiAge1xuICAgIFtLIGluIGtleW9mIFJdOlxuICAgICAgT2JzZXJ2YWJsZTxcbiAgICAgICAgUltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPlxuICAgICAgPlxuICB9IHtcblxuICAgIGxldCBzb3VyY2VTdWI6IFN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICBsZXQgc3Vic2NyaWJlckNudCA9IDA7XG4gICAgY29uc3QgZGlzcGF0Y2hlckJ5VHlwZToge1tLOiBzdHJpbmddOiBTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55LCBhbnk+IHwgQWN0aW9uPiB8IHVuZGVmaW5lZH0gPSB7fTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnM6IHtbSyBpbiBrZXlvZiBSXT86IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIGFueT4+fSA9IHt9O1xuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpKSB7XG4gICAgICBjb25zdCBzdWJqZWN0ID0gZGlzcGF0Y2hlckJ5VHlwZVsoYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdIGFzIFBheWxvYWRBY3Rpb25DcmVhdG9yKS50eXBlXSA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55LCBhbnk+ICB8IEFjdGlvbj4oKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgIHNwbGl0QWN0aW9uc1tyZWR1Y2VyTmFtZSBhcyBrZXlvZiBSXSA9IGRlZmVyKCgpID0+IHtcbiAgICAgICAgaWYgKHN1YnNjcmliZXJDbnQrKyA9PT0gMClcbiAgICAgICAgICBzb3VyY2VTdWIgPSBzb3VyY2Uuc3Vic2NyaWJlKCk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0LmFzT2JzZXJ2YWJsZSgpIGFzIE9ic2VydmFibGU8YW55PjtcbiAgICAgIH0pLnBpcGUoXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIGlmICgtLXN1YnNjcmliZXJDbnQgPT09IDAgJiYgc291cmNlU3ViKSB7XG4gICAgICAgICAgICBzb3VyY2VTdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIHNvdXJjZVN1YiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2UgPSBhY3Rpb24kLnBpcGUoXG4gICAgICAvLyBvcC5zaGFyZSgpLCB3ZSBkb24ndCBuZWVkIHNoYXJlKCksIHdlIGhhdmUgaW1wbGVtZW50ZWQgc2FtZSBsb2dpY1xuICAgICAgb3AubWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gZGlzcGF0Y2hlckJ5VHlwZVthY3Rpb24udHlwZSBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBtYXRjaC5uZXh0KGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zIGFzIHtcbiAgICAgIFtLIGluIGtleW9mIFJdOiBPYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgIFBheWxvYWRBY3Rpb248UD4gOiBQYXlsb2FkQWN0aW9uPHVua25vd24+PlxuICAgIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FjdGlvbk9mQ3JlYXRvcjxQLCBUIGV4dGVuZHMgc3RyaW5nPihhY3Rpb246IFBheWxvYWRBY3Rpb248YW55LCBhbnk+LCBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD4pOlxuICBhY3Rpb24gaXMgUGF5bG9hZEFjdGlvbjxQLCBUPiB7XG4gIHJldHVybiBhY3Rpb24udHlwZSA9PT0gYWN0aW9uQ3JlYXRvci50eXBlO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBJbW1lckpTIGRvZXMgbm90IHdvcmsgd2l0aCBzb21lIGxhcmdlIG9iamVjdCAobGlrZSBIVE1MRWxlbWVudCksIG1lYW5pbmcgeW91IGNhbiBub3QgZGlyZWN0bHkgZGVmaW5lZCBhXG4gKiBSZWR1eC10b29sa2l0IHN0YXRlIHRvIGNvbnRhaW4gc3VjaCBhIGxhcmdlIG9iamVjdCwgdGhpcyBjbGFzcyBwcm92aWRlcyBhIHdyYXBwZXIgdG8gdGhvc2VcbiAqIFwibGFyZ2Ugb2JqZWN0XCIsIGFuZCBhdm9pZCBJbW1lckpzIHRvIHJlY3Vyc2l2ZWx5IGZyZWV6ZSBpdCBieSBwcmUtZnJlZXplIGl0c2VsZi4gXG4gKiBcbiAqIFVzZSBpdCB3aXRoIGBJbW11dGFibGVgIHRvIGluZm9ybSBSZWR1eC10b29sa2l0IGFuZCBJbW1lckpTIHRoYXQgdGhpcyB0eXBlIHNob3VsZCBiZSBpZ25vcmVkIGZyb20gYGRyYWZ0aW5nYFxuICogVXNhZ2U6XG4gKiBgYGBcbiAgICBpbXBvcnQge0ltbXV0YWJsZX0gZnJvbSAnaW1tZXInO1xuXG4gICAgaW50ZXJmYWNlIFlvdXJTdGF0ZSB7XG4gICAgICBzb21lRG9tOiBJbW11dGFibGU8UmVmcmlnZXJhdG9yPEhUTUxFbGVtZW50Pj47XG4gICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyaWdlcmF0b3I8VD4ge1xuICBwcml2YXRlIHJlZjogSW1tdXRhYmxlPFQ+O1xuICBbaW1tZXJhYmxlXTogZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3JpZ2luUmVmOiBUKSB7XG4gICAgdGhpcy5yZWYgPSBvcmlnaW5SZWYgYXMgSW1tdXRhYmxlPFQ+O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cblxuICBjcmVhdE5ld0lmTm9FcXVhbChyZWY6IFQpIHtcbiAgICBpZiAodGhpcy5yZWYgIT09IHJlZikge1xuICAgICAgcmV0dXJuIG5ldyBSZWZyaWdlcmF0b3IocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG4gIGdldFJlZigpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5yZWYgYXMgVDtcbiAgfVxufVxuUmVmcmlnZXJhdG9yW2ltbWVyYWJsZV0gPSBmYWxzZTtcbiJdfQ==