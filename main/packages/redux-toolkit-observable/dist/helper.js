"use strict";
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
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
const rxjs_1 = require("rxjs");
const op = __importStar(require("rxjs/operators"));
const immer_1 = require("immer");
function createSliceHelper(stateFactory, opts) {
    const slice = stateFactory.newSlice(opts);
    const actionDispatcher = stateFactory.bindActionCreators(slice);
    const destory$ = new rxjs_1.Subject();
    let action$ = new rxjs_1.Subject();
    new rxjs_1.Observable(() => {
        // Release epic
        return stateFactory.addEpic(_action$ => {
            return _action$.pipe(op.tap(action => action$.next(action)), op.ignoreElements());
        }, opts.name);
    }).subscribe();
    function addEpic$(epicFactory$) {
        const sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(fac => {
            if (fac) {
                const epic = fac(helper);
                if (epic) {
                    return new rxjs_1.Observable(() => {
                        // Release epic
                        return stateFactory.addEpic(epic, opts.name);
                    });
                }
            }
            return rxjs_1.EMPTY;
        }), op.takeUntil(destory$)).subscribe();
        // releaseEpic.push(() => sub.unsubscribe());
        return () => sub.unsubscribe();
    }
    // let releaseEpic: Array<() => void> = [];
    const helper = Object.assign(Object.assign({}, slice), { action$: action$.asObservable(), actionDispatcher,
        epic(epic) {
            const fac = () => epic;
            addEpic$((0, rxjs_1.of)(fac));
        },
        addEpic(epicFactory) {
            return addEpic$((0, rxjs_1.of)(epicFactory));
        },
        addEpic$, destroy$: destory$.asObservable(), destroy() {
            destory$.next();
            destory$.complete();
            stateFactory.removeSlice(slice);
        },
        getStore() {
            return stateFactory.sliceStore(slice);
        },
        getState() {
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
    const rReducers = {};
    for (const [key, sReducer] of Object.entries(simpleReducers)) {
        rReducers[key] = (s, { payload }) => {
            return sReducer(s, payload);
        };
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
    const source = action$.pipe(op.share());
    const splitActions = {};
    for (const reducerName of Object.keys(actionCreators)) {
        Object.defineProperty(splitActions, reducerName, {
            get() {
                return source.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(actionCreators[reducerName]));
            }
        });
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
        return in$.pipe(op.switchMap(({ payload }) => {
            const release = payload.addEpic(epicFactory);
            return new rxjs_1.Observable(sub => release);
        }));
    };
}
exports.sliceRefActionOp = sliceRefActionOp;
function action$Of(stateFactory, actionCreator) {
    return new rxjs_1.Observable(sub => {
        stateFactory.addEpic((action$) => {
            return action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(actionCreator), op.map(action => sub.next(action)), op.ignoreElements());
        });
    });
}
exports.action$Of = action$Of;
function action$OfSlice(sliceHelper, actionType) {
    return new rxjs_1.Observable(sub => {
        sliceHelper.addEpic(slice => (action$) => {
            return action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions[actionType]), op.map(action => sub.next(action)), op.ignoreElements());
        });
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
class Refrigerator {
    constructor(originRef) {
        this.ref = originRef;
        Object.freeze(this);
    }
    creatNewIfNoEqual(ref) {
        if (this.ref !== ref) {
            return new Refrigerator(ref);
        }
        else {
            return this;
        }
    }
    getRef() {
        return this.ref;
    }
}
exports.Refrigerator = Refrigerator;
Refrigerator[immer_1.immerable] = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5RUFBNkY7QUFJN0YsK0JBQXNFO0FBQ3RFLG1EQUFxQztBQUNyQyxpQ0FBNkM7QUF3QjdDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUVwRCxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2xCLGVBQWU7UUFDZixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxD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R0FBRyxDQUFDLEVBQUU7UUFDcEQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdkMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUNqQixJQUFBLDBDQUFlLEVBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQyxFQUMzQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFhLENBQUMsQ0FBQyxFQUN6QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQWRELHdDQWNDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFhLFlBQVk7SUFJdkIsWUFBWSxTQUFZO1FBQ3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBeUIsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxHQUFNO1FBQ3RCLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQUU7WUFDcEIsT0FBTyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM5QjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFDRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBUSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRjtBQW5CRCxvQ0FtQkM7QUFDRCxZQUFZLENBQUMsaUJBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnMsIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZSwgUGF5bG9hZEFjdGlvbiwgQ2FzZVJlZHVjZXJBY3Rpb25zLCBQYXlsb2FkQWN0aW9uQ3JlYXRvciwgQWN0aW9uLCBEcmFmdCxcbiAgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgRU1QVFksIG9mLCBTdWJqZWN0LCBPcGVyYXRvckZ1bmN0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGltbWVyYWJsZSwgSW1tdXRhYmxlIH0gZnJvbSAnaW1tZXInO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID1cbiAgKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSLCBOYW1lPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwge1tzbGljZU5hbWUgaW4gTmFtZV06IFN9PiB8IHZvaWQ7XG5cbi8qKlxuICogQSBzZXBhcmF0ZSBSZWR1eCBzbGljZSB3aGljaCBoYXMgaXRzIG93biBsaWZlIGN5Y2xlLCB3b3JrcyBmb3IgY29tcG9uZW50IGludGVybmFsIHN0YXRlIG1hbmFnZW1lbnQuXG4gKiBDb21wYXJlIHRvIFJlYWN0J3MgdXNlUmVkdWNlcigpIGhvb2ssIHNsaWNlSGVscGVyIG9mZmVycyBtb3JlIHN0cm9uZyBmdW5jdGlvbmFsaXR5IGZvciBjb21wbGljYXRlZCBjb21wb25lbnQsXG4gKiBpdCB1c2VzIHJlZHV4LW9ic2VydmFibGUgdG8gcmVzb2x2ZSBhc3luYyBhY3Rpb24gbmVlZHMuXG4gKi9cbmV4cG9ydCB0eXBlIFNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4gPSBTbGljZTxTLCBSLCBOYW1lPiAmIHtcbiAgLyoqIFlvdSBkb24ndCBoYXZlIHRvIGNyZWF0ZSBlbiBFcGljIGZvciBzdWJzY3JpYmluZyBhY3Rpb24gc3RyZWFtLCB5b3Ugc3Vic2NyaWJlIHRoaXMgcHJvcGVydHlcbiAgICogdG8gcmVhY3Qgb24gJ2RvbmUnIHJlZHVjZXIgYWN0aW9uLCBhbmQgeW91IG1heSBjYWxsIGFjdGlvbkRpc3BhdGNoZXIgdG8gZW1pdCBhIG5ldyBhY3Rpb25cbiAgICovXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj47XG4gIGFjdGlvbkRpc3BhdGNoZXI6IENhc2VSZWR1Y2VyQWN0aW9uczxSICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+PjtcbiAgZGVzdHJveSQ6IE9ic2VydmFibGU8YW55PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeTogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSgpOiB2b2lkO1xuICBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LCBvcHRzOiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZUhlbHBlcjxTLCBSPiB7XG5cbiAgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uob3B0cyk7XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbiAgY29uc3QgZGVzdG9yeSQgPSBuZXcgU3ViamVjdCgpO1xuICBsZXQgYWN0aW9uJCA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KCk7XG5cbiAgbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhfYWN0aW9uJCA9PiB7XG4gICAgICByZXR1cm4gX2FjdGlvbiQucGlwZShcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24kLm5leHQoYWN0aW9uKSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSwgb3B0cy5uYW1lKTtcbiAgfSkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoaGVscGVyKTtcbiAgICAgICAgICBpZiAoZXBpYykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gUmVsZWFzZSBlcGljXG4gICAgICAgICAgICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhlcGljLCBvcHRzLm5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKGRlc3RvcnkkKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgLy8gcmVsZWFzZUVwaWMucHVzaCgoKSA9PiBzdWIudW5zdWJzY3JpYmUoKSk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLy8gbGV0IHJlbGVhc2VFcGljOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdO1xuICBjb25zdCBoZWxwZXIgPSB7XG4gICAgLi4uc2xpY2UsXG4gICAgYWN0aW9uJDogYWN0aW9uJC5hc09ic2VydmFibGUoKSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGVwaWMoZXBpYzogRXBpYykge1xuICAgICAgY29uc3QgZmFjOiBFcGljRmFjdG9yeTxTLCBSPiA9ICgpID0+IGVwaWM7XG4gICAgICBhZGRFcGljJChvZihmYWMpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQob2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGRlc3Ryb3kkOiBkZXN0b3J5JC5hc09ic2VydmFibGUoKSxcbiAgICBkZXN0cm95KCkge1xuICAgICAgZGVzdG9yeSQubmV4dCgpO1xuICAgICAgZGVzdG9yeSQuY29tcGxldGUoKTtcbiAgICAgIHN0YXRlRmFjdG9yeS5yZW1vdmVTbGljZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gaGVscGVyO1xufVxuXG50eXBlIFNpbXBsZVJlZHVjZXJzPFM+ID0ge1xuICBbSzogc3RyaW5nXTogKGRyYWZ0OiBTIHwgRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMge1trZXk6IHN0cmluZ106IGFueX07XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2VycyBhcyBSZWd1bGFyUmVkdWNlcnM8UywgUj47XG59XG5cbnR5cGUgQWN0aW9uQnlUeXBlPFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBPYnNlcnZhYmxlPFxuICAgICAgUltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICA+XG59O1xuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UiBleHRlbmRzIENhc2VSZWR1Y2VyQWN0aW9uczxTbGljZUNhc2VSZWR1Y2Vyczxhbnk+Pj4oYWN0aW9uQ3JlYXRvcnM6IFIsXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4pOiBBY3Rpb25CeVR5cGU8Uj4ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShvcC5zaGFyZSgpKTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnMgPSB7fSBhcyBBY3Rpb25CeVR5cGU8Uj47XG5cbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNwbGl0QWN0aW9ucywgcmVkdWNlck5hbWUsIHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBzb3VyY2UucGlwZShvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBY3Rpb25PZkNyZWF0b3I8UCwgVCBleHRlbmRzIHN0cmluZz4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueSwgYW55PiwgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KTpcbiAgYWN0aW9uIGlzIFBheWxvYWRBY3Rpb248UCwgVD4ge1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbnR5cGUgQWN0aW9uT2ZSZWR1Y2VyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+ID0gUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogaW5mZXIgQSkgPT4gYW55ID9cbihBIGV4dGVuZHMge3BheWxvYWQ6IGluZmVyIFB9ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDoge3R5cGU6IFR9KSA6IG5ldmVyO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSxcbiAgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KSB7XG5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFAgZXh0ZW5kcyB1bmRlZmluZWQgPyB7dHlwZTogVH0gOiBQYXlsb2FkQWN0aW9uPFAsIFQ+PihzdWIgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5hZGRFcGljPHVua25vd24+KChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvciksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZlNsaWNlPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPixcbiAgVCBleHRlbmRzIGtleW9mIFI+KFxuICBzbGljZUhlbHBlcjogU2xpY2VIZWxwZXI8UywgUj4sXG4gIGFjdGlvblR5cGU6IFQpIHtcblxuICByZXR1cm4gbmV3IE9ic2VydmFibGU8QWN0aW9uT2ZSZWR1Y2VyPFMsIFIsIFQ+PihzdWIgPT4ge1xuICAgIHNsaWNlSGVscGVyLmFkZEVwaWMoc2xpY2UgPT4gKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zW2FjdGlvblR5cGVdISksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBJbW1lckpTIGRvZXMgbm90IHdvcmsgd2l0aCBzb21lIGxhcmdlIG9iamVjdCAobGlrZSBIVE1MRWxlbWVudCksIG1lYW5pbmcgeW91IGNhbiBub3QgZGlyZWN0bHkgZGVmaW5lZCBhXG4gKiBSZWR1eC10b29sa2l0IHN0YXRlIHRvIGNvbnRhaW4gc3VjaCBhIGxhcmdlIG9iamVjdCwgdGhpcyBjbGFzcyBwcm92aWRlcyBhIHdyYXBwZXIgdG8gdGhvc2VcbiAqIFwibGFyZ2Ugb2JqZWN0XCIsIGFuZCBhdm9pZCBJbW1lckpzIHRvIHJlY3Vyc2l2ZWx5IGZyZWV6ZSBpdCBieSBwcmUtZnJlZXplIGl0c2VsZi4gXG4gKiBcbiAqIFVzZSBpdCB3aXRoIGBJbW11dGFibGVgIHRvIGluZm9ybSBSZWR1eC10b29sa2l0IGFuZCBJbW1lckpTIHRoYXQgdGhpcyB0eXBlIHNob3VsZCBiZSBpZ25vcmVkIGZyb20gYGRyYWZ0aW5nYFxuICogVXNhZ2U6XG4gKiBgYGBcbiAgICBpbXBvcnQge0ltbXV0YWJsZX0gZnJvbSAnaW1tZXInO1xuXG4gICAgaW50ZXJmYWNlIFlvdXJTdGF0ZSB7XG4gICAgICBzb21lRG9tOiBJbW11dGFibGU8UmVmcmlnZXJhdG9yPEhUTUxFbGVtZW50Pj47XG4gICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyaWdlcmF0b3I8VD4ge1xuICBwcml2YXRlIHJlZjogSW1tdXRhYmxlPFQ+O1xuICBbaW1tZXJhYmxlXTogZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3JpZ2luUmVmOiBUKSB7XG4gICAgdGhpcy5yZWYgPSBvcmlnaW5SZWYgYXMgSW1tdXRhYmxlPFQ+O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cblxuICBjcmVhdE5ld0lmTm9FcXVhbChyZWY6IFQpIHtcbiAgICBpZiAodGhpcy5yZWYgIT09IHJlZikge1xuICAgICAgcmV0dXJuIG5ldyBSZWZyaWdlcmF0b3IocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG4gIGdldFJlZigpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5yZWYgYXMgVDtcbiAgfVxufVxuUmVmcmlnZXJhdG9yW2ltbWVyYWJsZV0gPSBmYWxzZTtcbiJdfQ==