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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5RUFBNkY7QUFJN0YsK0JBQXNFO0FBQ3RFLG1EQUFxQztBQUNyQyxpQ0FBNkM7QUFtQjdDLFNBQWdCLGlCQUFpQixDQUMvQixZQUEwQixFQUFFLElBQThCO0lBRTFELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLGNBQU8sRUFBMEIsQ0FBQztJQUVwRCxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2xCLGVBQWU7UUFDZixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUNsQixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUN0QyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWYsU0FBUyxRQUFRLENBQUMsWUFBOEQ7UUFDOUUsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxD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LEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFFLENBQUMsRUFDM0MsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBYSxDQUFDLENBQUMsRUFDekMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFkRCx3Q0FjQztBQUVEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBYSxZQUFZO0lBSXZCLFlBQVksU0FBWTtRQUN0QixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQXlCLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsaUJBQWlCLENBQUMsR0FBTTtRQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDOUI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBQ0QsTUFBTTtRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0NBQ0Y7QUFuQkQsb0NBbUJDO0FBQ0QsWUFBWSxDQUFDLGlCQUFTLENBQUMsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1N0YXRlRmFjdG9yeSwgRXh0cmFTbGljZVJlZHVjZXJzLCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgUGF5bG9hZEFjdGlvbkNyZWF0b3IsIEFjdGlvbiwgRHJhZnQsXG4gIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBpbW1lcmFibGUsIEltbXV0YWJsZSB9IGZyb20gJ2ltbWVyJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9XG4gIChzbGljZTogU2xpY2VIZWxwZXI8UywgUiwgTmFtZT4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHtbc2xpY2VOYW1lIGluIE5hbWVdOiBTfT4gfCB2b2lkO1xuXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID0gU2xpY2U8UywgUiwgTmFtZT4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb25EaXNwYXRjaGVyOiBDYXNlUmVkdWNlckFjdGlvbnM8UiAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPj47XG4gIGRlc3Ryb3kkOiBPYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3Rvcnk6IE9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3koKTogdm9pZDtcbiAgZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgb3B0czogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2VIZWxwZXI8UywgUj4ge1xuXG4gIGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKG9wdHMpO1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4gIGNvbnN0IGRlc3RvcnkkID0gbmV3IFN1YmplY3QoKTtcbiAgbGV0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKG9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBkZXN0cm95JDogZGVzdG9yeSQuYXNPYnNlcnZhYmxlKCksXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGRlc3RvcnkkLm5leHQoKTtcbiAgICAgIGRlc3RvcnkkLmNvbXBsZXRlKCk7XG4gICAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2Uoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGhlbHBlcjtcbn1cblxudHlwZSBTaW1wbGVSZWR1Y2VyczxTPiA9IHtcbiAgW0s6IHN0cmluZ106IChkcmFmdDogUyB8IERyYWZ0PFM+LCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuZXhwb3J0IHR5cGUgUmVndWxhclJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTaW1wbGVSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gKHM6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248UD4pID0+IHZvaWQgfCBEcmFmdDxTPiA6XG4gICAgICAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx1bmtub3duPikgPT4gdm9pZCB8IERyYWZ0PFM+O1xufTtcblxuLyoqXG4gKiBjcmVhdGVSZWR1Y2VycyBoZWxwcyB0byBzaW1wbGlmeSBob3cgd2Ugd3JpdGluZyBkZWZpbml0aW9uIG9mIFNsaWNlQ2FzZVJlZHVjZXJzLFxuICogZS5nLiBBIHJlZ3VsYXIgU2xpY2VDYXNlUmVkdWNlcnMgdGFrZXMgUGF5bG9hZEFjdGlvbiBhcyBwYXJhbWV0ZXIsIGxpa2U6IFxuICogYGBgdHNcbiAqIGNvbnN0IHJlZHVjZXJzID0ge1xuICogICByZWR1Y2VyTmFtZShzdGF0ZTogU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxudW1iZXI+KSB7XG4gKiAgICAgIC8vIHVwZGF0ZSBzdGF0ZSB3aXRoIHBheWxvYWQgZGF0YVxuICogICAgfVxuICogfTtcbiAqIGBgYFxuICogTm9ybWFsbHkgcmVkdWNlcidzIGxvZ2ljIG9ubHkgY2FyZSBhYm91dCBgcGF5bG9hZGAgaW5zdGVhZCBvZiBgUGF5bG9hZEFjdGlvbmAsXG4gKiBjcmVhdGVSZWR1Y2VycyBhY2NlcHRzIGEgc2ltcGxlciBmb3JtYXQ6XG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2Vycyh7XG4gKiAgIHJlZHVjZXJOYW1lKGRyYWZ0OiBTdGF0ZSwgcGF5bG9hZDogbnVtYmVyKSB7XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKiBZb3UgY2FuIGRlY2xhcmUgcGF5bG9hZCBhcyByZWR1Y2VyJ3MgcGFyYW1ldGVyIGluc3RlYWQgb2YgYSBQYXlsb2FkQWN0aW9uXG4gKiBAcGFyYW0gc2ltcGxlUmVkdWNlcnNcbiAqIEByZXR1cm5zIFNsaWNlQ2FzZVJlZHVjZXJzIHdoaWNoIGNhbiBiZSBwYXJ0IG9mIHBhcmFtZXRlciBvZiBjcmVhdGVTbGljZUhlbHBlclxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PihzaW1wbGVSZWR1Y2VyczogUik6IFJlZ3VsYXJSZWR1Y2VyczxTLCBSPiB7XG4gIGNvbnN0IHJSZWR1Y2VycyA9IHt9IGFzIHtba2V5OiBzdHJpbmddOiBhbnl9O1xuICBmb3IgKGNvbnN0IFtrZXksIHNSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhzaW1wbGVSZWR1Y2VycykpIHtcbiAgICByUmVkdWNlcnNba2V5XSA9IChzOiBEcmFmdDxTPiwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGFueT4pID0+IHtcbiAgICAgIHJldHVybiBzUmVkdWNlcihzLCBwYXlsb2FkKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiByUmVkdWNlcnMgYXMgUmVndWxhclJlZHVjZXJzPFMsIFI+O1xufVxuXG50eXBlIEFjdGlvbkJ5VHlwZTxSPiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06XG4gICAgT2JzZXJ2YWJsZTxcbiAgICAgIFJbS10gZXh0ZW5kcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcjxpbmZlciBQPiA/XG4gICAgICAgIFBheWxvYWRBY3Rpb248UD4gOiBQYXlsb2FkQWN0aW9uPHVua25vd24+XG4gICAgPlxufTtcblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpciBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFIgZXh0ZW5kcyBDYXNlUmVkdWNlckFjdGlvbnM8U2xpY2VDYXNlUmVkdWNlcnM8YW55Pj4+KGFjdGlvbkNyZWF0b3JzOiBSLFxuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KTogQWN0aW9uQnlUeXBlPFI+IHtcbiAgICBjb25zdCBzb3VyY2UgPSBhY3Rpb24kLnBpcGUob3Auc2hhcmUoKSk7XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zID0ge30gYXMgQWN0aW9uQnlUeXBlPFI+O1xuXG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzcGxpdEFjdGlvbnMsIHJlZHVjZXJOYW1lLCB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gc291cmNlLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWN0aW9uT2ZDcmVhdG9yPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxhbnksIGFueT4sIGFjdGlvbkNyZWF0b3I6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPik6XG4gIGFjdGlvbiBpcyBQYXlsb2FkQWN0aW9uPFAsIFQ+IHtcbiAgcmV0dXJuIGFjdGlvbi50eXBlID09PSBhY3Rpb25DcmVhdG9yLnR5cGU7XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG50eXBlIEFjdGlvbk9mUmVkdWNlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIFQgZXh0ZW5kcyBrZXlvZiBSPiA9IFJbVF0gZXh0ZW5kcyAoczogYW55LCBhY3Rpb246IGluZmVyIEEpID0+IGFueSA/XG4oQSBleHRlbmRzIHtwYXlsb2FkOiBpbmZlciBQfSA/IHtwYXlsb2FkOiBQOyB0eXBlOiBUfSA6IHt0eXBlOiBUfSkgOiBuZXZlcjtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZjxQLCBUIGV4dGVuZHMgc3RyaW5nPihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksXG4gIGFjdGlvbkNyZWF0b3I6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPikge1xuXG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQIGV4dGVuZHMgdW5kZWZpbmVkID8ge3R5cGU6IFR9IDogUGF5bG9hZEFjdGlvbjxQLCBUPj4oc3ViID0+IHtcbiAgICBzdGF0ZUZhY3RvcnkuYWRkRXBpYzx1bmtub3duPigoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKGFjdGlvbkNyZWF0b3IpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHN1Yi5uZXh0KGFjdGlvbiBhcyBhbnkpKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kT2ZTbGljZTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sXG4gIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgc2xpY2VIZWxwZXI6IFNsaWNlSGVscGVyPFMsIFI+LFxuICBhY3Rpb25UeXBlOiBUKSB7XG5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPEFjdGlvbk9mUmVkdWNlcjxTLCBSLCBUPj4oc3ViID0+IHtcbiAgICBzbGljZUhlbHBlci5hZGRFcGljKHNsaWNlID0+IChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uc1thY3Rpb25UeXBlXSEpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHN1Yi5uZXh0KGFjdGlvbiBhcyBhbnkpKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogSW1tZXJKUyBkb2VzIG5vdCB3b3JrIHdpdGggc29tZSBsYXJnZSBvYmplY3QgKGxpa2UgSFRNTEVsZW1lbnQpLCBtZWFuaW5nIHlvdSBjYW4gbm90IGRpcmVjdGx5IGRlZmluZWQgYVxuICogUmVkdXgtdG9vbGtpdCBzdGF0ZSB0byBjb250YWluIHN1Y2ggYSBsYXJnZSBvYmplY3QsIHRoaXMgY2xhc3MgcHJvdmlkZXMgYSB3cmFwcGVyIHRvIHRob3NlXG4gKiBcImxhcmdlIG9iamVjdFwiLCBhbmQgYXZvaWQgSW1tZXJKcyB0byByZWN1cnNpdmVseSBmcmVlemUgaXQgYnkgcHJlLWZyZWV6ZSBpdHNlbGYuIFxuICogXG4gKiBVc2UgaXQgd2l0aCBgSW1tdXRhYmxlYCB0byBpbmZvcm0gUmVkdXgtdG9vbGtpdCBhbmQgSW1tZXJKUyB0aGF0IHRoaXMgdHlwZSBzaG91bGQgYmUgaWdub3JlZCBmcm9tIGBkcmFmdGluZ2BcbiAqIFVzYWdlOlxuICogYGBgXG4gICAgaW1wb3J0IHtJbW11dGFibGV9IGZyb20gJ2ltbWVyJztcblxuICAgIGludGVyZmFjZSBZb3VyU3RhdGUge1xuICAgICAgc29tZURvbTogSW1tdXRhYmxlPFJlZnJpZ2VyYXRvcjxIVE1MRWxlbWVudD4+O1xuICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVmcmlnZXJhdG9yPFQ+IHtcbiAgcHJpdmF0ZSByZWY6IEltbXV0YWJsZTxUPjtcbiAgW2ltbWVyYWJsZV06IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9yaWdpblJlZjogVCkge1xuICAgIHRoaXMucmVmID0gb3JpZ2luUmVmIGFzIEltbXV0YWJsZTxUPjtcbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG5cbiAgY3JlYXROZXdJZk5vRXF1YWwocmVmOiBUKSB7XG4gICAgaWYgKHRoaXMucmVmICE9PSByZWYpIHtcbiAgICAgIHJldHVybiBuZXcgUmVmcmlnZXJhdG9yKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxuICBnZXRSZWYoKTogVCB7XG4gICAgcmV0dXJuIHRoaXMucmVmIGFzIFQ7XG4gIH1cbn1cblJlZnJpZ2VyYXRvcltpbW1lcmFibGVdID0gZmFsc2U7XG4iXX0=