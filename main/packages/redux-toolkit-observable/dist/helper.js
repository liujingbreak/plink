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
exports.Refrigerator = exports.action$OfSlice = exports.action$Of = exports.sliceRefActionOp = exports.isActionOfCreator = exports.action$ByType = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
const rxjs_1 = require("rxjs");
const op = __importStar(require("rxjs/operators"));
const immer_1 = require("immer");
function createSliceHelper(stateFactory, opts) {
    const slice = stateFactory.newSlice(opts);
    const actionDispatcher = stateFactory.bindActionCreators(slice);
    const destory$ = new rxjs_1.Subject();
    const action$ = new rxjs_1.Subject();
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
    const helper = Object.assign(Object.assign({}, slice), { action$: action$.asObservable(), action$ByType: castByActionType(slice.actions, action$), actionDispatcher,
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
function action$ByType(stateFactory, slice) {
    if (slice.action$) {
        return slice.action$ByType;
    }
    else {
        const action$ = new rxjs_1.Subject();
        stateFactory.addEpic(_action$ => {
            return _action$.pipe(op.tap(action => action$.next(action)), op.ignoreElements());
        }, slice.name);
        return castByActionType(slice.actions, action$);
    }
}
exports.action$ByType = action$ByType;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5RUFBNkY7QUFJN0YsK0JBQXNFO0FBQ3RFLG1EQUFxQztBQUNyQyxpQ0FBNkM7QUF5QjdDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUV0RCxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2xCLGVBQWU7UUFDZixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxD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QVk7SUFJdkIsWUFBWSxTQUFZO1FBQ3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBeUIsQ0FBQztRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxHQUFNO1FBQ3RCLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQUU7WUFDcEIsT0FBTyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM5QjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFDRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUMsR0FBUSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRjtBQW5CRCxvQ0FtQkM7QUFDRCxZQUFZLENBQUMsaUJBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U3RhdGVGYWN0b3J5LCBFeHRyYVNsaWNlUmVkdWNlcnMsIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZSwgUGF5bG9hZEFjdGlvbiwgQ2FzZVJlZHVjZXJBY3Rpb25zLCBQYXlsb2FkQWN0aW9uQ3JlYXRvciwgQWN0aW9uLCBEcmFmdCxcbiAgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgRU1QVFksIG9mLCBTdWJqZWN0LCBPcGVyYXRvckZ1bmN0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGltbWVyYWJsZSwgSW1tdXRhYmxlIH0gZnJvbSAnaW1tZXInO1xuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID1cbiAgKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSLCBOYW1lPikgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwge1tzbGljZU5hbWUgaW4gTmFtZV06IFN9PiB8IHZvaWQ7XG5cbi8qKlxuICogQSBzZXBhcmF0ZSBSZWR1eCBzbGljZSB3aGljaCBoYXMgaXRzIG93biBsaWZlIGN5Y2xlLCB3b3JrcyBmb3IgY29tcG9uZW50IGludGVybmFsIHN0YXRlIG1hbmFnZW1lbnQuXG4gKiBDb21wYXJlIHRvIFJlYWN0J3MgdXNlUmVkdWNlcigpIGhvb2ssIHNsaWNlSGVscGVyIG9mZmVycyBtb3JlIHN0cm9uZyBmdW5jdGlvbmFsaXR5IGZvciBjb21wbGljYXRlZCBjb21wb25lbnQsXG4gKiBpdCB1c2VzIHJlZHV4LW9ic2VydmFibGUgdG8gcmVzb2x2ZSBhc3luYyBhY3Rpb24gbmVlZHMuXG4gKi9cbmV4cG9ydCB0eXBlIFNsaWNlSGVscGVyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4gPSBTbGljZTxTLCBSLCBOYW1lPiAmIHtcbiAgLyoqIFlvdSBkb24ndCBoYXZlIHRvIGNyZWF0ZSBlbiBFcGljIGZvciBzdWJzY3JpYmluZyBhY3Rpb24gc3RyZWFtLCB5b3Ugc3Vic2NyaWJlIHRoaXMgcHJvcGVydHlcbiAgICogdG8gcmVhY3Qgb24gJ2RvbmUnIHJlZHVjZXIgYWN0aW9uLCBhbmQgeW91IG1heSBjYWxsIGFjdGlvbkRpc3BhdGNoZXIgdG8gZW1pdCBhIG5ldyBhY3Rpb25cbiAgICovXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj47XG4gIGFjdGlvbiRCeVR5cGU6IEFjdGlvbkJ5VHlwZTxDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj4+O1xuICBhY3Rpb25EaXNwYXRjaGVyOiBDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj47XG4gIGRlc3Ryb3kkOiBPYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3Rvcnk6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4gIGNvbnN0IGRlc3RvcnkkID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3QgYWN0aW9uJCA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KCk7XG5cbiAgbmV3IE9ic2VydmFibGUoKCkgPT4ge1xuICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhfYWN0aW9uJCA9PiB7XG4gICAgICByZXR1cm4gX2FjdGlvbiQucGlwZShcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24kLm5leHQoYWN0aW9uKSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSwgb3B0cy5uYW1lKTtcbiAgfSkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoaGVscGVyKTtcbiAgICAgICAgICBpZiAoZXBpYykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gUmVsZWFzZSBlcGljXG4gICAgICAgICAgICAgIHJldHVybiBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhlcGljLCBvcHRzLm5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKGRlc3RvcnkkKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgLy8gcmVsZWFzZUVwaWMucHVzaCgoKSA9PiBzdWIudW5zdWJzY3JpYmUoKSk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLy8gbGV0IHJlbGVhc2VFcGljOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdO1xuICBjb25zdCBoZWxwZXIgPSB7XG4gICAgLi4uc2xpY2UsXG4gICAgYWN0aW9uJDogYWN0aW9uJC5hc09ic2VydmFibGUoKSxcbiAgICBhY3Rpb24kQnlUeXBlOiBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgZXBpYyhlcGljOiBFcGljKSB7XG4gICAgICBjb25zdCBmYWM6IEVwaWNGYWN0b3J5PFMsIFI+ID0gKCkgPT4gZXBpYztcbiAgICAgIGFkZEVwaWMkKG9mKGZhYykpO1xuICAgIH0sXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChvZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZGVzdHJveSQ6IGRlc3RvcnkkLmFzT2JzZXJ2YWJsZSgpLFxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBkZXN0b3J5JC5uZXh0KCk7XG4gICAgICBkZXN0b3J5JC5jb21wbGV0ZSgpO1xuICAgICAgc3RhdGVGYWN0b3J5LnJlbW92ZVNsaWNlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBoZWxwZXI7XG59XG5cbnR5cGUgU2ltcGxlUmVkdWNlcnM8Uz4gPSB7XG4gIFtLOiBzdHJpbmddOiAoZHJhZnQ6IFMgfCBEcmFmdDxTPiwgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbmV4cG9ydCB0eXBlIFJlZ3VsYXJSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IChzOiBEcmFmdDxTPikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFA+KSA9PiB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgICAgKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248dW5rbm93bj4pID0+IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogY3JlYXRlUmVkdWNlcnMgaGVscHMgdG8gc2ltcGxpZnkgaG93IHdlIHdyaXRpbmcgZGVmaW5pdGlvbiBvZiBTbGljZUNhc2VSZWR1Y2VycyxcbiAqIGUuZy4gQSByZWd1bGFyIFNsaWNlQ2FzZVJlZHVjZXJzIHRha2VzIFBheWxvYWRBY3Rpb24gYXMgcGFyYW1ldGVyLCBsaWtlOiBcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IHtcbiAqICAgcmVkdWNlck5hbWUoc3RhdGU6IFN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248bnVtYmVyPikge1xuICogICAgICAvLyB1cGRhdGUgc3RhdGUgd2l0aCBwYXlsb2FkIGRhdGFcbiAqICAgIH1cbiAqIH07XG4gKiBgYGBcbiAqIE5vcm1hbGx5IHJlZHVjZXIncyBsb2dpYyBvbmx5IGNhcmUgYWJvdXQgYHBheWxvYWRgIGluc3RlYWQgb2YgYFBheWxvYWRBY3Rpb25gLFxuICogY3JlYXRlUmVkdWNlcnMgYWNjZXB0cyBhIHNpbXBsZXIgZm9ybWF0OlxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0gY3JlYXRlUmVkdWNlcnMoe1xuICogICByZWR1Y2VyTmFtZShkcmFmdDogU3RhdGUsIHBheWxvYWQ6IG51bWJlcikge1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogWW91IGNhbiBkZWNsYXJlIHBheWxvYWQgYXMgcmVkdWNlcidzIHBhcmFtZXRlciBpbnN0ZWFkIG9mIGEgUGF5bG9hZEFjdGlvblxuICogQHBhcmFtIHNpbXBsZVJlZHVjZXJzXG4gKiBAcmV0dXJucyBTbGljZUNhc2VSZWR1Y2VycyB3aGljaCBjYW4gYmUgcGFydCBvZiBwYXJhbWV0ZXIgb2YgY3JlYXRlU2xpY2VIZWxwZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4oc2ltcGxlUmVkdWNlcnM6IFIpOiBSZWd1bGFyUmVkdWNlcnM8UywgUj4ge1xuICBjb25zdCByUmVkdWNlcnMgPSB7fSBhcyB7W2tleTogc3RyaW5nXTogYW55fTtcbiAgZm9yIChjb25zdCBba2V5LCBzUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMoc2ltcGxlUmVkdWNlcnMpKSB7XG4gICAgclJlZHVjZXJzW2tleV0gPSAoczogRHJhZnQ8Uz4sIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4gc1JlZHVjZXIocywgcGF5bG9hZCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gclJlZHVjZXJzIGFzIFJlZ3VsYXJSZWR1Y2VyczxTLCBSPjtcbn1cblxudHlwZSBBY3Rpb25CeVR5cGU8Uj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOlxuICAgIE9ic2VydmFibGU8XG4gICAgICBSW0tdIGV4dGVuZHMgUGF5bG9hZEFjdGlvbkNyZWF0b3I8aW5mZXIgUD4gP1xuICAgICAgICBQYXlsb2FkQWN0aW9uPFA+IDogUGF5bG9hZEFjdGlvbjx1bmtub3duPlxuICAgID5cbn07XG5cbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXIgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxSIGV4dGVuZHMgQ2FzZVJlZHVjZXJBY3Rpb25zPFNsaWNlQ2FzZVJlZHVjZXJzPGFueT4+PihhY3Rpb25DcmVhdG9yczogUixcbiAgYWN0aW9uJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPik6IEFjdGlvbkJ5VHlwZTxSPiB7XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKG9wLnNoYXJlKCkpO1xuICAgIGNvbnN0IHNwbGl0QWN0aW9ucyA9IHt9IGFzIEFjdGlvbkJ5VHlwZTxSPjtcblxuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3BsaXRBY3Rpb25zLCByZWR1Y2VyTmFtZSwge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZS5waXBlKG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzcGxpdEFjdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kQnlUeXBlPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIHNsaWNlOiBTbGljZTxTLCBSPiB8IFNsaWNlSGVscGVyPFMsIFI+KSB7XG4gIGlmICgoc2xpY2UgYXMgU2xpY2VIZWxwZXI8UywgUj4pLmFjdGlvbiQpIHtcbiAgICByZXR1cm4gKHNsaWNlIGFzIFNsaWNlSGVscGVyPFMsIFI+KS5hY3Rpb24kQnlUeXBlO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuICAgIHN0YXRlRmFjdG9yeS5hZGRFcGljKF9hY3Rpb24kID0+IHtcbiAgICAgIHJldHVybiBfYWN0aW9uJC5waXBlKFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbiQubmV4dChhY3Rpb24pKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9LCBzbGljZS5uYW1lKTtcbiAgICByZXR1cm4gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBY3Rpb25PZkNyZWF0b3I8UCwgVCBleHRlbmRzIHN0cmluZz4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueSwgYW55PiwgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KTpcbiAgYWN0aW9uIGlzIFBheWxvYWRBY3Rpb248UCwgVD4ge1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbnR5cGUgQWN0aW9uT2ZSZWR1Y2VyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+ID0gUltUXSBleHRlbmRzIChzOiBhbnksIGFjdGlvbjogaW5mZXIgQSkgPT4gYW55ID9cbihBIGV4dGVuZHMge3BheWxvYWQ6IGluZmVyIFB9ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDoge3R5cGU6IFR9KSA6IG5ldmVyO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSxcbiAgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+KSB7XG5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFAgZXh0ZW5kcyB1bmRlZmluZWQgPyB7dHlwZTogVH0gOiBQYXlsb2FkQWN0aW9uPFAsIFQ+PihzdWIgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5hZGRFcGljPHVua25vd24+KChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvciksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZlNsaWNlPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPixcbiAgVCBleHRlbmRzIGtleW9mIFI+KFxuICBzbGljZUhlbHBlcjogU2xpY2VIZWxwZXI8UywgUj4sXG4gIGFjdGlvblR5cGU6IFQpIHtcblxuICByZXR1cm4gbmV3IE9ic2VydmFibGU8QWN0aW9uT2ZSZWR1Y2VyPFMsIFIsIFQ+PihzdWIgPT4ge1xuICAgIHNsaWNlSGVscGVyLmFkZEVwaWMoc2xpY2UgPT4gKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zW2FjdGlvblR5cGVdISksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuXG4vKipcbiAqIEltbWVySlMgZG9lcyBub3Qgd29yayB3aXRoIHNvbWUgbGFyZ2Ugb2JqZWN0IChsaWtlIEhUTUxFbGVtZW50KSwgbWVhbmluZyB5b3UgY2FuIG5vdCBkaXJlY3RseSBkZWZpbmVkIGFcbiAqIFJlZHV4LXRvb2xraXQgc3RhdGUgdG8gY29udGFpbiBzdWNoIGEgbGFyZ2Ugb2JqZWN0LCB0aGlzIGNsYXNzIHByb3ZpZGVzIGEgd3JhcHBlciB0byB0aG9zZVxuICogXCJsYXJnZSBvYmplY3RcIiwgYW5kIGF2b2lkIEltbWVySnMgdG8gcmVjdXJzaXZlbHkgZnJlZXplIGl0IGJ5IHByZS1mcmVlemUgaXRzZWxmLiBcbiAqIFxuICogVXNlIGl0IHdpdGggYEltbXV0YWJsZWAgdG8gaW5mb3JtIFJlZHV4LXRvb2xraXQgYW5kIEltbWVySlMgdGhhdCB0aGlzIHR5cGUgc2hvdWxkIGJlIGlnbm9yZWQgZnJvbSBgZHJhZnRpbmdgXG4gKiBVc2FnZTpcbiAqIGBgYFxuICAgIGltcG9ydCB7SW1tdXRhYmxlfSBmcm9tICdpbW1lcic7XG5cbiAgICBpbnRlcmZhY2UgWW91clN0YXRlIHtcbiAgICAgIHNvbWVEb206IEltbXV0YWJsZTxSZWZyaWdlcmF0b3I8SFRNTEVsZW1lbnQ+PjtcbiAgICB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZnJpZ2VyYXRvcjxUPiB7XG4gIHByaXZhdGUgcmVmOiBJbW11dGFibGU8VD47XG4gIFtpbW1lcmFibGVdOiBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihvcmlnaW5SZWY6IFQpIHtcbiAgICB0aGlzLnJlZiA9IG9yaWdpblJlZiBhcyBJbW11dGFibGU8VD47XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuXG4gIGNyZWF0TmV3SWZOb0VxdWFsKHJlZjogVCkge1xuICAgIGlmICh0aGlzLnJlZiAhPT0gcmVmKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZnJpZ2VyYXRvcihyZWYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbiAgZ2V0UmVmKCk6IFQge1xuICAgIHJldHVybiB0aGlzLnJlZiBhcyBUO1xuICB9XG59XG5SZWZyaWdlcmF0b3JbaW1tZXJhYmxlXSA9IGZhbHNlO1xuIl19