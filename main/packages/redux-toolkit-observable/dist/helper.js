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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVFQUE2RjtBQUk3Riw2QkFBMkY7QUFDM0YsaURBQXFDO0FBQ3JDLCtCQUE2QztBQWtCN0MsU0FBZ0IsaUJBQWlCLENBQy9CLFlBQTBCLEVBQUUsSUFBOEI7SUFFMUQsSUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQyxJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRSxJQUFNLFFBQVEsR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLElBQUksY0FBTyxFQUEwQixDQUFDO0lBRXBELElBQUksaUJBQVUsQ0FBQztRQUNiLGVBQWU7UUFDZixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxRQUFRO1lBQ2xDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQXBCLENBQW9CLENBQUMsRUFDdEMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBQ0osQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVmLFNBQVMsUUFBUSxDQUFDLFlBQThEO1FBQzlFLElBQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQzNCLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLFVBQUEsR0FBRztZQUNkLElBQUksR0FBRyxFQUFFO2dCQUNQLElBQU0sTUFBSSxHQUFHLEdBQUcs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LENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFkRCx3Q0FjQztBQUVEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0g7SUFJRSxzQkFBWSxTQUFZO1FBQ3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBeUIsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCx3Q0FBaUIsR0FBakIsVUFBa0IsR0FBTTtRQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDOUI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBQ0QsNkJBQU0sR0FBTjtRQUNFLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0lBQ0gsbUJBQUM7QUFBRCxDQUFDLEFBbkJELElBbUJDO0FBbkJZLG9DQUFZO0FBb0J6QixZQUFZLENBQUMsaUJBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnMsIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZSwgUGF5bG9hZEFjdGlvbiwgQ2FzZVJlZHVjZXJBY3Rpb25zLCBQYXlsb2FkQWN0aW9uQ3JlYXRvciwgQWN0aW9uLCBEcmFmdCxcbiAgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgRU1QVFksIG9mLCBTdWJqZWN0LCBPcGVyYXRvckZ1bmN0aW9uLCBkZWZlciwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGltbWVyYWJsZSwgSW1tdXRhYmxlIH0gZnJvbSAnaW1tZXInO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwgdW5rbm93bj4gfCB2b2lkO1xuXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+ID0gU2xpY2U8UywgUj4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb25EaXNwYXRjaGVyOiBDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj47XG4gIGRlc3Ryb3kkOiBPYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3Rvcnk6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4gIGNvbnN0IGRlc3RvcnkkID0gbmV3IFN1YmplY3QoKTtcbiAgbGV0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKG9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBkZXN0cm95JDogZGVzdG9yeSQuYXNPYnNlcnZhYmxlKCksXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGRlc3RvcnkkLm5leHQoKTtcbiAgICAgIGRlc3RvcnkkLmNvbXBsZXRlKCk7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxudHlwZSBTaW1wbGVSZWR1Y2VyczxTPiA9IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogUyB8IERyYWZ0PFM+LCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuZXhwb3J0IHR5cGUgUmVndWxhclJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gKHM6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248UD4pID0+IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgICAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx1bmtub3duPikgPT4gdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBjcmVhdGVSZWR1Y2VycyBoZWxwcyB0byBzaW1wbGlmeSBob3cgd2Ugd3JpdGluZyBkZWZpbml0aW9uIG9mIFNsaWNlQ2FzZVJlZHVjZXJzLFxuICogZS5nLiBBIHJlZ3VsYXIgU2xpY2VDYXNlUmVkdWNlcnMgdGFrZXMgUGF5bG9hZEFjdGlvbiBhcyBwYXJhbWV0ZXIsIGxpa2U6IFxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0ge1xuICogICByZWR1Y2VyTmFtZShzdGF0ZTogU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxudW1iZXI+KSB7XG4gKiAgICAgIC8vIHVwZGF0ZSBzdGF0ZSB3aXRoIHBheWxvYWQgZGF0YVxuICogICAgfVxuICogfTtcbiAqIGBgYFxuICogTm9ybWFsbHkgcmVkdWNlcidzIGxvZ2ljIG9ubHkgY2FyZSBhYm91dCBgcGF5bG9hZGAgaW5zdGVhZCBvZiBgUGF5bG9hZEFjdGlvbmAsXG4gKiBjcmVhdGVSZWR1Y2VycyBhY2NlcHRzIGEgc2ltcGxlciBmb3JtYXQ6XG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2Vycyh7XG4gKiAgIHJlZHVjZXJOYW1lKGRyYWZ0OiBTdGF0ZSwgcGF5bG9hZDogbnVtYmVyKSB7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKiBZb3UgY2FuIGRlY2xhcmUgcGF5bG9hZCBhcyByZWR1Y2VyJ3MgcGFyYW1ldGVyIGluc3RlYWQgb2YgYSBQYXlsb2FkQWN0aW9uXG4gKiBAcGFyYW0gc2ltcGxlUmVkdWNlcnNcbiAqIEByZXR1cm5zIFNsaWNlQ2FzZVJlZHVjZXJzIHdoaWNoIGNhbiBiZSBwYXJ0IG9mIHBhcmFtZXRlciBvZiBjcmVhdGVTbGljZUhlbHBlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PihzaW1wbGVSZWR1Y2VyczogUik6IFJlZ3VsYXJSZWR1Y2VyczxTLCBSPiB7XG4gIGNvbnN0IHJSZWR1Y2VycyA9IHt9IGFzIHtba2V5OiBzdHJpbmddOiBhbnl9O1xuICBmb3IgKGNvbnN0IFtrZXksIHNSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhzaW1wbGVSZWR1Y2VycykpIHtcbiAgICByUmVkdWNlcnNba2V5XSA9IChzOiBEcmFmdDxTPiwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGFueT4pID0+IHtcbiAgICAgIHJldHVybiBzUmVkdWNlcihzLCBwYXlsb2FkKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiByUmVkdWNlcnMgYXMgUmVndWxhclJlZHVjZXJzPFMsIFI+O1xufVxuXG5cbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXIgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxSIGV4dGVuZHMgQ2FzZVJlZHVjZXJBY3Rpb25zPFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+PihhY3Rpb25DcmVhdG9yczogUixcbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPik6XG4gIHtcbiAgICBbSyBpbiBrZXlvZiBSXTpcbiAgICAgIE9ic2VydmFibGU8XG4gICAgICAgIFJbS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICAgID5cbiAgfSB7XG5cbiAgICBsZXQgc291cmNlU3ViOiBTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG4gICAgbGV0IHN1YnNjcmliZXJDbnQgPSAwO1xuICAgIGNvbnN0IGRpc3BhdGNoZXJCeVR5cGU6IHtbSzogc3RyaW5nXTogU3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueSwgYW55PiB8IEFjdGlvbj4gfCB1bmRlZmluZWR9ID0ge307XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zOiB7W0sgaW4ga2V5b2YgUl0/OiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBhbnk+Pn0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgY29uc3Qgc3ViamVjdCA9IGRpc3BhdGNoZXJCeVR5cGVbKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSBhcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcikudHlwZV0gPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueSwgYW55PiAgfCBBY3Rpb24+KCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICBzcGxpdEFjdGlvbnNbcmVkdWNlck5hbWUgYXMga2V5b2YgUl0gPSBkZWZlcigoKSA9PiB7XG4gICAgICAgIGlmIChzdWJzY3JpYmVyQ250KysgPT09IDApXG4gICAgICAgICAgc291cmNlU3ViID0gc291cmNlLnN1YnNjcmliZSgpO1xuICAgICAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKSBhcyBPYnNlcnZhYmxlPGFueT47XG4gICAgICB9KS5waXBlKFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICBpZiAoLS1zdWJzY3JpYmVyQ250ID09PSAwICYmIHNvdXJjZVN1Yikge1xuICAgICAgICAgICAgc291cmNlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBzb3VyY2VTdWIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKFxuICAgICAgLy8gb3Auc2hhcmUoKSwgd2UgZG9uJ3QgbmVlZCBzaGFyZSgpLCB3ZSBoYXZlIGltcGxlbWVudGVkIHNhbWUgbG9naWNcbiAgICAgIG9wLm1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IGRpc3BhdGNoZXJCeVR5cGVbYWN0aW9uLnR5cGUgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgbWF0Y2gubmV4dChhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucyBhcyB7XG4gICAgICBbSyBpbiBrZXlvZiBSXTogT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPj5cbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBY3Rpb25PZkNyZWF0b3I8UCwgVCBleHRlbmRzIHN0cmluZz4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueSwgYW55PiwgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KTpcbiAgYWN0aW9uIGlzIFBheWxvYWRBY3Rpb248UCwgVD4ge1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbnR5cGUgQWN0aW9uT2ZSZWR1Y2VyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+ID0gUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogaW5mZXIgQSkgPT4gYW55ID9cbihBIGV4dGVuZHMge3BheWxvYWQ6IGluZmVyIFB9ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDoge3R5cGU6IFR9KSA6IG5ldmVyO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSxcbiAgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KSB7XG5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFAgZXh0ZW5kcyB1bmRlZmluZWQgPyB7dHlwZTogVH0gOiBQYXlsb2FkQWN0aW9uPFAsIFQ+PihzdWIgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5hZGRFcGljPHVua25vd24+KChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvciksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZlNsaWNlPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPixcbiAgVCBleHRlbmRzIGtleW9mIFI+KFxuICBzbGljZUhlbHBlcjogU2xpY2VIZWxwZXI8UywgUj4sXG4gIGFjdGlvblR5cGU6IFQpIHtcblxuICByZXR1cm4gbmV3IE9ic2VydmFibGU8QWN0aW9uT2ZSZWR1Y2VyPFMsIFIsIFQ+PihzdWIgPT4ge1xuICAgIHNsaWNlSGVscGVyLmFkZEVwaWMoc2xpY2UgPT4gKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zW2FjdGlvblR5cGVdISksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBJbW1lckpTIGRvZXMgbm90IHdvcmsgd2l0aCBzb21lIGxhcmdlIG9iamVjdCAobGlrZSBIVE1MRWxlbWVudCksIG1lYW5pbmcgeW91IGNhbiBub3QgZGlyZWN0bHkgZGVmaW5lZCBhXG4gKiBSZWR1eC10b29sa2l0IHN0YXRlIHRvIGNvbnRhaW4gc3VjaCBhIGxhcmdlIG9iamVjdCwgdGhpcyBjbGFzcyBwcm92aWRlcyBhIHdyYXBwZXIgdG8gdGhvc2VcbiAqIFwibGFyZ2Ugb2JqZWN0XCIsIGFuZCBhdm9pZCBJbW1lckpzIHRvIHJlY3Vyc2l2ZWx5IGZyZWV6ZSBpdCBieSBwcmUtZnJlZXplIGl0c2VsZi4gXG4gKiBcbiAqIFVzZSBpdCB3aXRoIGBJbW11dGFibGVgIHRvIGluZm9ybSBSZWR1eC10b29sa2l0IGFuZCBJbW1lckpTIHRoYXQgdGhpcyB0eXBlIHNob3VsZCBiZSBpZ25vcmVkIGZyb20gYGRyYWZ0aW5nYFxuICogVXNhZ2U6XG4gKiBgYGBcbiAgICBpbXBvcnQge0ltbXV0YWJsZX0gZnJvbSAnaW1tZXInO1xuXG4gICAgaW50ZXJmYWNlIFlvdXJTdGF0ZSB7XG4gICAgICBzb21lRG9tOiBJbW11dGFibGU8UmVmcmlnZXJhdG9yPEhUTUxFbGVtZW50Pj47XG4gICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyaWdlcmF0b3I8VD4ge1xuICBwcml2YXRlIHJlZjogSW1tdXRhYmxlPFQ+O1xuICBbaW1tZXJhYmxlXTogZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3JpZ2luUmVmOiBUKSB7XG4gICAgdGhpcy5yZWYgPSBvcmlnaW5SZWYgYXMgSW1tdXRhYmxlPFQ+O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cblxuICBjcmVhdE5ld0lmTm9FcXVhbChyZWY6IFQpIHtcbiAgICBpZiAodGhpcy5yZWYgIT09IHJlZikge1xuICAgICAgcmV0dXJuIG5ldyBSZWZyaWdlcmF0b3IocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG4gIGdldFJlZigpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5yZWYgYXMgVDtcbiAgfVxufVxuUmVmcmlnZXJhdG9yW2ltbWVyYWJsZV0gPSBmYWxzZTtcbiJdfQ==