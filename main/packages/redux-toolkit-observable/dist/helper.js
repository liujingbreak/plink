"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUVBQTZGO0FBSTdGLCtCQUFzRTtBQUN0RSxtREFBcUM7QUFDckMsaUNBQTZDO0FBeUI3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFdEQsSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRTtRQUNsQixlQUFlO1FBQ2YsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDdEMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBQ0osQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVmLFNBQVMsUUFBUSxDQUFDLFlBQThEO1FBQzlFLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQzNCLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2pCLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sSUFBSSxHQUFHLEdB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YSxZQUFZO0lBSXZCLFlBQVksU0FBWTtRQUN0QixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQXlCLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsaUJBQWlCLENBQUMsR0FBTTtRQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDOUI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBQ0QsTUFBTTtRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0NBQ0Y7QUFuQkQsb0NBbUJDO0FBQ0QsWUFBWSxDQUFDLGlCQUFTLENBQUMsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1N0YXRlRmFjdG9yeSwgRXh0cmFTbGljZVJlZHVjZXJzLCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgUGF5bG9hZEFjdGlvbkNyZWF0b3IsIEFjdGlvbiwgRHJhZnQsXG4gIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBpbW1lcmFibGUsIEltbXV0YWJsZSB9IGZyb20gJ2ltbWVyJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9XG4gIChzbGljZTogU2xpY2VIZWxwZXI8UywgUiwgTmFtZT4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHtbc2xpY2VOYW1lIGluIE5hbWVdOiBTfT4gfCB2b2lkO1xuXG4vKipcbiAqIEEgc2VwYXJhdGUgUmVkdXggc2xpY2Ugd2hpY2ggaGFzIGl0cyBvd24gbGlmZSBjeWNsZSwgd29ya3MgZm9yIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSBtYW5hZ2VtZW50LlxuICogQ29tcGFyZSB0byBSZWFjdCdzIHVzZVJlZHVjZXIoKSBob29rLCBzbGljZUhlbHBlciBvZmZlcnMgbW9yZSBzdHJvbmcgZnVuY3Rpb25hbGl0eSBmb3IgY29tcGxpY2F0ZWQgY29tcG9uZW50LFxuICogaXQgdXNlcyByZWR1eC1vYnNlcnZhYmxlIHRvIHJlc29sdmUgYXN5bmMgYWN0aW9uIG5lZWRzLlxuICovXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID0gU2xpY2U8UywgUiwgTmFtZT4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb24kQnlUeXBlOiBBY3Rpb25CeVR5cGU8Q2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+PjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uJEJ5VHlwZTogY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGVwaWMoZXBpYzogRXBpYykge1xuICAgICAgY29uc3QgZmFjOiBFcGljRmFjdG9yeTxTLCBSPiA9ICgpID0+IGVwaWM7XG4gICAgICBhZGRFcGljJChvZihmYWMpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQob2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGRlc3Ryb3kkOiBkZXN0b3J5JC5hc09ic2VydmFibGUoKSxcbiAgICBkZXN0cm95KCkge1xuICAgICAgZGVzdG9yeSQubmV4dCgpO1xuICAgICAgZGVzdG9yeSQuY29tcGxldGUoKTtcbiAgICAgIHN0YXRlRmFjdG9yeS5yZW1vdmVTbGljZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gaGVscGVyO1xufVxuXG50eXBlIFNpbXBsZVJlZHVjZXJzPFM+ID0ge1xuICBbSzogc3RyaW5nXTogKGRyYWZ0OiBTIHwgRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMge1trZXk6IHN0cmluZ106IGFueX07XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2VycyBhcyBSZWd1bGFyUmVkdWNlcnM8UywgUj47XG59XG5cbnR5cGUgQWN0aW9uQnlUeXBlPFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBPYnNlcnZhYmxlPFxuICAgICAgUltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICA+XG59O1xuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UiBleHRlbmRzIENhc2VSZWR1Y2VyQWN0aW9uczxTbGljZUNhc2VSZWR1Y2Vyczxhbnk+Pj4oYWN0aW9uQ3JlYXRvcnM6IFIsXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4pOiBBY3Rpb25CeVR5cGU8Uj4ge1xuICBjb25zdCBzb3VyY2UgPSBhY3Rpb24kLnBpcGUob3Auc2hhcmUoKSk7XG4gIGNvbnN0IHNwbGl0QWN0aW9ucyA9IHt9IGFzIEFjdGlvbkJ5VHlwZTxSPjtcblxuICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzcGxpdEFjdGlvbnMsIHJlZHVjZXJOYW1lLCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UucGlwZShvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHNwbGl0QWN0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRCeVR5cGU8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSwgc2xpY2U6IFNsaWNlPFMsIFI+IHwgU2xpY2VIZWxwZXI8UywgUj4pIHtcbiAgaWYgKChzbGljZSBhcyBTbGljZUhlbHBlcjxTLCBSPikuYWN0aW9uJCkge1xuICAgIHJldHVybiAoc2xpY2UgYXMgU2xpY2VIZWxwZXI8UywgUj4pLmFjdGlvbiRCeVR5cGU7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYWN0aW9uJCA9IG5ldyBTdWJqZWN0PFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+KCk7XG4gICAgc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIHNsaWNlLm5hbWUpO1xuICAgIHJldHVybiBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FjdGlvbk9mQ3JlYXRvcjxQLCBUIGV4dGVuZHMgc3RyaW5nPihhY3Rpb246IFBheWxvYWRBY3Rpb248YW55LCBhbnk+LCBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD4pOlxuICBhY3Rpb24gaXMgUGF5bG9hZEFjdGlvbjxQLCBUPiB7XG4gIHJldHVybiBhY3Rpb24udHlwZSA9PT0gYWN0aW9uQ3JlYXRvci50eXBlO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248U2xpY2VIZWxwZXI8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxudHlwZSBBY3Rpb25PZlJlZHVjZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4gPSBSW1RdIGV4dGVuZHMgKHM6IGFueSwgYWN0aW9uOiBpbmZlciBBKSA9PiBhbnkgP1xuKEEgZXh0ZW5kcyB7cGF5bG9hZDogaW5mZXIgUH0gPyB7cGF5bG9hZDogUDsgdHlwZTogVH0gOiB7dHlwZTogVH0pIDogbmV2ZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kT2Y8UCwgVCBleHRlbmRzIHN0cmluZz4oXG4gIHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LFxuICBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD4pIHtcblxuICByZXR1cm4gbmV3IE9ic2VydmFibGU8UCBleHRlbmRzIHVuZGVmaW5lZCA/IHt0eXBlOiBUfSA6IFBheWxvYWRBY3Rpb248UCwgVD4+KHN1YiA9PiB7XG4gICAgc3RhdGVGYWN0b3J5LmFkZEVwaWM8dW5rbm93bj4oKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mU2xpY2U8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LFxuICBUIGV4dGVuZHMga2V5b2YgUj4oXG4gIHNsaWNlSGVscGVyOiBTbGljZUhlbHBlcjxTLCBSPixcbiAgYWN0aW9uVHlwZTogVCkge1xuXG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxBY3Rpb25PZlJlZHVjZXI8UywgUiwgVD4+KHN1YiA9PiB7XG4gICAgc2xpY2VIZWxwZXIuYWRkRXBpYyhzbGljZSA9PiAoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnNbYWN0aW9uVHlwZV0hKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5cbi8qKlxuICogSW1tZXJKUyBkb2VzIG5vdCB3b3JrIHdpdGggc29tZSBsYXJnZSBvYmplY3QgKGxpa2UgSFRNTEVsZW1lbnQpLCBtZWFuaW5nIHlvdSBjYW4gbm90IGRpcmVjdGx5IGRlZmluZWQgYVxuICogUmVkdXgtdG9vbGtpdCBzdGF0ZSB0byBjb250YWluIHN1Y2ggYSBsYXJnZSBvYmplY3QsIHRoaXMgY2xhc3MgcHJvdmlkZXMgYSB3cmFwcGVyIHRvIHRob3NlXG4gKiBcImxhcmdlIG9iamVjdFwiLCBhbmQgYXZvaWQgSW1tZXJKcyB0byByZWN1cnNpdmVseSBmcmVlemUgaXQgYnkgcHJlLWZyZWV6ZSBpdHNlbGYuIFxuICogXG4gKiBVc2UgaXQgd2l0aCBgSW1tdXRhYmxlYCB0byBpbmZvcm0gUmVkdXgtdG9vbGtpdCBhbmQgSW1tZXJKUyB0aGF0IHRoaXMgdHlwZSBzaG91bGQgYmUgaWdub3JlZCBmcm9tIGBkcmFmdGluZ2BcbiAqIFVzYWdlOlxuICogYGBgXG4gICAgaW1wb3J0IHtJbW11dGFibGV9IGZyb20gJ2ltbWVyJztcblxuICAgIGludGVyZmFjZSBZb3VyU3RhdGUge1xuICAgICAgc29tZURvbTogSW1tdXRhYmxlPFJlZnJpZ2VyYXRvcjxIVE1MRWxlbWVudD4+O1xuICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVmcmlnZXJhdG9yPFQ+IHtcbiAgcHJpdmF0ZSByZWY6IEltbXV0YWJsZTxUPjtcbiAgW2ltbWVyYWJsZV06IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9yaWdpblJlZjogVCkge1xuICAgIHRoaXMucmVmID0gb3JpZ2luUmVmIGFzIEltbXV0YWJsZTxUPjtcbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG5cbiAgY3JlYXROZXdJZk5vRXF1YWwocmVmOiBUKSB7XG4gICAgaWYgKHRoaXMucmVmICE9PSByZWYpIHtcbiAgICAgIHJldHVybiBuZXcgUmVmcmlnZXJhdG9yKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxuICBnZXRSZWYoKTogVCB7XG4gICAgcmV0dXJuIHRoaXMucmVmIGFzIFQ7XG4gIH1cbn1cblJlZnJpZ2VyYXRvcltpbW1lcmFibGVdID0gZmFsc2U7XG4iXX0=