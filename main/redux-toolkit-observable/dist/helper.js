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
exports.sliceRefActionOp = exports.createReducers = exports.createSliceHelper = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUFzRTtBQUN0RSxpREFBcUM7QUFrQnJDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELElBQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsSUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUVwRCxJQUFJLGlCQUFVLENBQUM7UUFDYixlQUFlO1FBQ2YsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTtZQUNsQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQ2xCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFwQixDQUFvQixDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUNKLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFZixTQUFTLFFBQVEsQ0FBQyxZQUE4RDtRQUM5RSxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUMzQixFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFBLEdBQUc7WUFDZCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxJQUFNLE1BQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksTUFBSSxFQUFFO29CQUNSLE9BQU8sSUFBSSxpQkFBVSxDQUFDO3dCQUNwQixlQUFlO3dCQUNmLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMvQyxDQUFDLENBQUMsQ0FBQztpQkFDSjthQUNGO1lBQ0QsT0FBTyxZQUFLLENBQUM7UUFDZixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUN2QixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2QsNkNBQTZDO1FBQzdDLE9BQU8sY0FBTSxPQUFBLEdBQUcsQ0FBQyxXQUFXLEVBQUUsRUFBakIsQ0FBaUIsQ0FBQztJQUNqQyxDQUFDO0lBRUQsMkNBQTJDO0lBQzNDLElBQU0sTUFBTSx5QkFDUCxLQUFLLEtBQ1IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFDL0IsZ0JBQWdCLGtCQUFBO1FBQ2hCLE9BQU8sRUFBUCxVQUFRLFdBQThCO1lBQ3BDLE9BQU8sUUFBUSxDQUFDLFNBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDRCxRQUFRLFVBQUEsRUFDUixRQUFRLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxFQUNqQyxPQUFPO1lBQ0wsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixZQUFZLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxRQUFRO1lBQ04sT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxRQUFRO1lBQ04sT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLENBQUMsR0FDRixDQUFDO0lBQ0YsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQTlERCw4Q0E4REM7QUFZRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFpQyxjQUFpQjtJQUM5RSxJQUFNLFNBQVMsR0FBRyxFQUFTLENBQUM7NEJBQ2hCLEdBQUcsRUFBRSxRQUFRO1FBQ3ZCLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFDLENBQVcsRUFBRSxFQUE2QjtnQkFBNUIsT0FBTyxhQUFBO1lBQ3JDLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUM7O0lBSEosS0FBOEIsVUFBOEIsRUFBOUIsS0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUE5QixjQUE4QixFQUE5QixJQUE4QjtRQUFqRCxJQUFBLFdBQWUsRUFBZCxHQUFHLFFBQUEsRUFBRSxRQUFRLFFBQUE7Z0JBQWIsR0FBRyxFQUFFLFFBQVE7S0FJeEI7SUFDRCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDO0FBUkQsd0NBUUM7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxTQUFnQixnQkFBZ0IsQ0FBb0MsV0FBOEI7SUFFaEcsT0FBTyxVQUFTLEdBQWlEO1FBQy9ELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsU0FBUyxDQUFDLFVBQUMsRUFBUztnQkFBUixPQUFPLGFBQUE7WUFDcEIsSUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxPQUFPLElBQUksaUJBQVUsQ0FBdUIsVUFBQSxHQUFHLElBQUksT0FBQSxPQUFPLEVBQVAsQ0FBTyxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUM7QUFWRCw0Q0FVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnN9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgRHJhZnQsIEFjdGlvbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlSGVscGVyPFMsIFI+KSA9PiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCB1bmtub3duPiB8IHZvaWQ7XG5cbmV4cG9ydCB0eXBlIFNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSBTbGljZTxTLCBSPiAmIHtcbiAgLyoqIFlvdSBkb24ndCBoYXZlIHRvIGNyZWF0ZSBlbiBFcGljIGZvciBzdWJzY3JpYmluZyBhY3Rpb24gc3RyZWFtLCB5b3Ugc3Vic2NyaWJlIHRoaXMgcHJvcGVydHlcbiAgICogdG8gcmVhY3Qgb24gJ2RvbmUnIHJlZHVjZXIgYWN0aW9uLCBhbmQgeW91IG1heSBjYWxsIGFjdGlvbkRpc3BhdGNoZXIgdG8gZW1pdCBhIG5ldyBhY3Rpb25cbiAgICovXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj47XG4gIGFjdGlvbkRpc3BhdGNoZXI6IENhc2VSZWR1Y2VyQWN0aW9uczxSICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+PjtcbiAgZGVzdHJveSQ6IE9ic2VydmFibGU8YW55PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeTogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSgpOiB2b2lkO1xuICBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LCBvcHRzOiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZUhlbHBlcjxTLCBSPiB7XG5cbiAgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uob3B0cyk7XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbiAgY29uc3QgZGVzdG9yeSQgPSBuZXcgU3ViamVjdCgpO1xuICBsZXQgYWN0aW9uJCA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KCk7XG5cbiAgbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhfYWN0aW9uJCA9PiB7XG4gICAgICByZXR1cm4gX2FjdGlvbiQucGlwZShcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24kLm5leHQoYWN0aW9uKSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSwgb3B0cy5uYW1lKTtcbiAgfSkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoaGVscGVyKTtcbiAgICAgICAgICBpZiAoZXBpYykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gUmVsZWFzZSBlcGljXG4gICAgICAgICAgICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhlcGljLCBvcHRzLm5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKGRlc3RvcnkkKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgLy8gcmVsZWFzZUVwaWMucHVzaCgoKSA9PiBzdWIudW5zdWJzY3JpYmUoKSk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLy8gbGV0IHJlbGVhc2VFcGljOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdO1xuICBjb25zdCBoZWxwZXIgPSB7XG4gICAgLi4uc2xpY2UsXG4gICAgYWN0aW9uJDogYWN0aW9uJC5hc09ic2VydmFibGUoKSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQob2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGRlc3Ryb3kkOiBkZXN0b3J5JC5hc09ic2VydmFibGUoKSxcbiAgICBkZXN0cm95KCkge1xuICAgICAgZGVzdG9yeSQubmV4dCgpO1xuICAgICAgZGVzdG9yeSQuY29tcGxldGUoKTtcbiAgICAgIHN0YXRlRmFjdG9yeS5yZW1vdmVTbGljZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gaGVscGVyO1xufVxuXG5pbnRlcmZhY2UgU2ltcGxlUmVkdWNlcnM8Uz4ge1xuICBbSzogc3RyaW5nXTogKGRyYWZ0OiBEcmFmdDxTPiwgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn1cblxuZXhwb3J0IHR5cGUgUmVndWxhclJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gKHM6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248UD4pID0+IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgICAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx1bmtub3duPikgPT4gdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBjcmVhdGVSZWR1Y2VycyBoZWxwcyB0byBzaW1wbGlmeSBob3cgd2Ugd3JpdGluZyBkZWZpbml0aW9uIG9mIFNsaWNlQ2FzZVJlZHVjZXJzLFxuICogZS5nLiBBIHJlZ3VsYXIgU2xpY2VDYXNlUmVkdWNlcnMgdGFrZXMgUGF5bG9hZEFjdGlvbiBhcyBwYXJhbWV0ZXIsIGxpa2U6IFxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0ge1xuICogICByZWR1Y2VyTmFtZShzdGF0ZTogU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxudW1iZXI+KSB7XG4gKiAgICAgIC8vIHVwZGF0ZSBzdGF0ZSB3aXRoIHBheWxvYWQgZGF0YVxuICogICAgfVxuICogfTtcbiAqIGBgYFxuICogTm9ybWFsbHkgcmVkdWNlcidzIGxvZ2ljIG9ubHkgY2FyZSBhYm91dCBgcGF5bG9hZGAgaW5zdGVhZCBvZiBgUGF5bG9hZEFjdGlvbmAsXG4gKiBjcmVhdGVSZWR1Y2VycyBhY2NlcHRzIGEgc2ltcGxlciBmb3JtYXQ6XG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2Vycyh7XG4gKiAgIHJlZHVjZXJOYW1lKGRyYWZ0OiBTdGF0ZSwgcGF5bG9hZDogbnVtYmVyKSB7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKiBZb3UgY2FuIGRlY2xhcmUgcGF5bG9hZCBhcyByZWR1Y2VyJ3MgcGFyYW1ldGVyIGluc3RlYWQgb2YgYSBQYXlsb2FkQWN0aW9uXG4gKiBAcGFyYW0gc2ltcGxlUmVkdWNlcnNcbiAqIEByZXR1cm5zIFNsaWNlQ2FzZVJlZHVjZXJzIHdoaWNoIGNhbiBiZSBwYXJ0IG9mIHBhcmFtZXRlciBvZiBjcmVhdGVTbGljZUhlbHBlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PihzaW1wbGVSZWR1Y2VyczogUik6IFJlZ3VsYXJSZWR1Y2VyczxTLCBSPiB7XG4gIGNvbnN0IHJSZWR1Y2VycyA9IHt9IGFzIGFueTtcbiAgZm9yIChjb25zdCBba2V5LCBzUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMoc2ltcGxlUmVkdWNlcnMpKSB7XG4gICAgclJlZHVjZXJzW2tleV0gPSAoczogRHJhZnQ8Uz4sIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4gc1JlZHVjZXIocywgcGF5bG9hZCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gclJlZHVjZXJzO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cbiJdfQ==