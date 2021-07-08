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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDZCQUEyRjtBQUMzRixpREFBcUM7QUFrQnJDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELElBQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsSUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUVwRCxJQUFJLGlCQUFVLENBQUM7UUFDYixlQUFlO1FBQ2YsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTtZQUNsQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQ2xCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFwQixDQUFvQixDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUNKLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFZixTQUFTLFFBQVEsQ0FBQyxZQUE4RDtRQUM5RSxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUMzQixFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFBLEdBQUc7WUFDZCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxJQUFNLE1BQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pC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YWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnN9IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgUGF5bG9hZEFjdGlvbkNyZWF0b3IsIEFjdGlvbiwgRHJhZnR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgRXBpYyB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBFTVBUWSwgb2YsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24sIGRlZmVyLCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgdW5rbm93bj4gfCB2b2lkO1xuXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gU2xpY2U8UywgUj4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb25EaXNwYXRjaGVyOiBDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj47XG4gIGRlc3Ryb3kkOiBPYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3Rvcnk6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4gIGNvbnN0IGRlc3RvcnkkID0gbmV3IFN1YmplY3QoKTtcbiAgbGV0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKG9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBkZXN0cm95JDogZGVzdG9yeSQuYXNPYnNlcnZhYmxlKCksXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGRlc3RvcnkkLm5leHQoKTtcbiAgICAgIGRlc3RvcnkkLmNvbXBsZXRlKCk7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxuaW50ZXJmYWNlIFNpbXBsZVJlZHVjZXJzPFM+IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59XG5cbmV4cG9ydCB0eXBlIFJlZ3VsYXJSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IChzOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFA+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgICAgKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248dW5rbm93bj4pID0+IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogY3JlYXRlUmVkdWNlcnMgaGVscHMgdG8gc2ltcGxpZnkgaG93IHdlIHdyaXRpbmcgZGVmaW5pdGlvbiBvZiBTbGljZUNhc2VSZWR1Y2VycyxcbiAqIGUuZy4gQSByZWd1bGFyIFNsaWNlQ2FzZVJlZHVjZXJzIHRha2VzIFBheWxvYWRBY3Rpb24gYXMgcGFyYW1ldGVyLCBsaWtlOiBcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IHtcbiAqICAgcmVkdWNlck5hbWUoc3RhdGU6IFN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248bnVtYmVyPikge1xuICogICAgICAvLyB1cGRhdGUgc3RhdGUgd2l0aCBwYXlsb2FkIGRhdGFcbiAqICAgIH1cbiAqIH07XG4gKiBgYGBcbiAqIE5vcm1hbGx5IHJlZHVjZXIncyBsb2dpYyBvbmx5IGNhcmUgYWJvdXQgYHBheWxvYWRgIGluc3RlYWQgb2YgYFBheWxvYWRBY3Rpb25gLFxuICogY3JlYXRlUmVkdWNlcnMgYWNjZXB0cyBhIHNpbXBsZXIgZm9ybWF0OlxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0gY3JlYXRlUmVkdWNlcnMoe1xuICogICByZWR1Y2VyTmFtZShkcmFmdDogU3RhdGUsIHBheWxvYWQ6IG51bWJlcikge1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogWW91IGNhbiBkZWNsYXJlIHBheWxvYWQgYXMgcmVkdWNlcidzIHBhcmFtZXRlciBpbnN0ZWFkIG9mIGEgUGF5bG9hZEFjdGlvblxuICogQHBhcmFtIHNpbXBsZVJlZHVjZXJzXG4gKiBAcmV0dXJucyBTbGljZUNhc2VSZWR1Y2VycyB3aGljaCBjYW4gYmUgcGFydCBvZiBwYXJhbWV0ZXIgb2YgY3JlYXRlU2xpY2VIZWxwZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4oc2ltcGxlUmVkdWNlcnM6IFIpOiBSZWd1bGFyUmVkdWNlcnM8UywgUj4ge1xuICBjb25zdCByUmVkdWNlcnMgPSB7fSBhcyB7W2tleTogc3RyaW5nXTogYW55fTtcbiAgZm9yIChjb25zdCBba2V5LCBzUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMoc2ltcGxlUmVkdWNlcnMpKSB7XG4gICAgclJlZHVjZXJzW2tleV0gPSAoczogRHJhZnQ8Uz4sIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4gc1JlZHVjZXIocywgcGF5bG9hZCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gclJlZHVjZXJzIGFzIFJlZ3VsYXJSZWR1Y2VyczxTLCBSPjtcbn1cblxuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyZSBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oYWN0aW9uQ3JlYXRvcnM6IENhc2VSZWR1Y2VyQWN0aW9uczxSPixcbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPik6XG4gIHtcbiAgICBbSyBpbiBrZXlvZiBSXTpcbiAgICAgIE9ic2VydmFibGU8XG4gICAgICAgIENhc2VSZWR1Y2VyQWN0aW9uczxSPltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPlxuICAgICAgPlxuICB9IHtcblxuICAgIGxldCBzb3VyY2VTdWI6IFN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBtdWx0aWNhc2VBY3Rpb25NYXA6IHtbSzogc3RyaW5nXTogU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPiB8IHVuZGVmaW5lZH0gPSB7fTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnM6IHtbSyBpbiBrZXlvZiBSXT86IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbj59ID0ge307XG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBtdWx0aWNhc2VBY3Rpb25NYXBbKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSBhcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcikudHlwZV0gPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uPFMsIGFueT4+KCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICBzcGxpdEFjdGlvbnNbcmVkdWNlck5hbWUgYXMga2V5b2YgUl0gPSBkZWZlcigoKSA9PiB7XG4gICAgICAgIGlmIChzb3VyY2VTdWIgPT0gbnVsbClcbiAgICAgICAgICBzb3VyY2VTdWIgPSBzb3VyY2Uuc3Vic2NyaWJlKCk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0LmFzT2JzZXJ2YWJsZSgpIGFzIE9ic2VydmFibGU8YW55PjtcbiAgICAgIH0pLnBpcGUoXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIG9wLnNoYXJlKCksXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtdWx0aWNhc2VBY3Rpb25NYXBbYWN0aW9uLnR5cGUgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgbWF0Y2gubmV4dChhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucyBhcyB7XG4gICAgICBbSyBpbiBrZXlvZiBSXTogT2JzZXJ2YWJsZTxDYXNlUmVkdWNlckFjdGlvbnM8Uj5bS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgIFBheWxvYWRBY3Rpb248UD4gOiBQYXlsb2FkQWN0aW9uPHVua25vd24+PlxuICAgIH07XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuIl19