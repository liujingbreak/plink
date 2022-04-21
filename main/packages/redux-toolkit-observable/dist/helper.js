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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUVBQTZGO0FBSTdGLCtCQUFzRTtBQUN0RSxtREFBcUM7QUFDckMsaUNBQTZDO0FBeUI3QyxTQUFnQixpQkFBaUIsQ0FDL0IsWUFBMEIsRUFBRSxJQUE4QjtJQUUxRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7SUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFPLEVBQTBCLENBQUM7SUFFdEQsSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRTtRQUNsQixlQUFlO1FBQ2YsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDdEMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBQ0osQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVmLFNBQVMsUUFBUSxDQUFDLFlBQThEO1FBQzlFLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQzNCLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2pCLElBQUksR0FBRyxFQUFFO2dCQUNQLE1BQU0sSUFBSSxHQUFHLEdB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YSxZQUFZO0lBSXZCLFlBQVksU0FBWTtRQUN0QixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQXlCLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsaUJBQWlCLENBQUMsR0FBTTtRQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDOUI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBQ0QsTUFBTTtRQUNKLE9BQU8sSUFBSSxDQUFDLEdBQVEsQ0FBQztJQUN2QixDQUFDO0NBQ0Y7QUFuQkQsb0NBbUJDO0FBQ0QsWUFBWSxDQUFDLGlCQUFTLENBQUMsR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1N0YXRlRmFjdG9yeSwgRXh0cmFTbGljZVJlZHVjZXJzLCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBTbGljZUNhc2VSZWR1Y2VycywgU2xpY2UsIFBheWxvYWRBY3Rpb24sIENhc2VSZWR1Y2VyQWN0aW9ucywgUGF5bG9hZEFjdGlvbkNyZWF0b3IsIEFjdGlvbiwgRHJhZnQsXG4gIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGUsIEVNUFRZLCBvZiwgU3ViamVjdCwgT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBpbW1lcmFibGUsIEltbXV0YWJsZSB9IGZyb20gJ2ltbWVyJztcblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9XG4gIChzbGljZTogU2xpY2VIZWxwZXI8UywgUiwgTmFtZT4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHtbc2xpY2VOYW1lIGluIE5hbWVdOiBTfT4gfCB2b2lkO1xuXG4vKipcbiAqIEEgc2VwYXJhdGUgUmVkdXggc2xpY2Ugd2hpY2ggaGFzIGl0cyBvd24gbGlmZSBjeWNsZSwgd29ya3MgZm9yIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSBtYW5hZ2VtZW50LlxuICogQ29tcGFyZSB0byBSZWFjdCdzIHVzZVJlZHVjZXIoKSBob29rLCBzbGljZUhlbHBlciBvZmZlcnMgbW9yZSBzdHJvbmcgZnVuY3Rpb25hbGl0eSBmb3IgY29tcGxpY2F0ZWQgY29tcG9uZW50LFxuICogaXQgdXNlcyByZWR1eC1vYnNlcnZhYmxlIHRvIHJlc29sdmUgYXN5bmMgYWN0aW9uIG5lZWRzLlxuICovXG5leHBvcnQgdHlwZSBTbGljZUhlbHBlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID0gU2xpY2U8UywgUiwgTmFtZT4gJiB7XG4gIC8qKiBZb3UgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgZW4gRXBpYyBmb3Igc3Vic2NyaWJpbmcgYWN0aW9uIHN0cmVhbSwgeW91IHN1YnNjcmliZSB0aGlzIHByb3BlcnR5XG4gICAqIHRvIHJlYWN0IG9uICdkb25lJyByZWR1Y2VyIGFjdGlvbiwgYW5kIHlvdSBtYXkgY2FsbCBhY3Rpb25EaXNwYXRjaGVyIHRvIGVtaXQgYSBuZXcgYWN0aW9uXG4gICAqL1xuICBhY3Rpb24kOiBPYnNlcnZhYmxlPFBheWxvYWRBY3Rpb24gfCBBY3Rpb24+O1xuICBhY3Rpb24kQnlUeXBlOiBBY3Rpb25CeVR5cGU8Q2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+PjtcbiAgYWN0aW9uRGlzcGF0Y2hlcjogQ2FzZVJlZHVjZXJBY3Rpb25zPFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuICBkZXN0cm95JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5OiBPYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBkZXN0cm95KCk6IHZvaWQ7XG4gIGdldFN0b3JlKCk6IE9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2VIZWxwZXI8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksIG9wdHM6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlSGVscGVyPFMsIFI+IHtcblxuICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZShvcHRzKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuICBjb25zdCBkZXN0b3J5JCA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgU3ViamVjdDxQYXlsb2FkQWN0aW9uIHwgQWN0aW9uPigpO1xuXG4gIG5ldyBPYnNlcnZhYmxlKCgpID0+IHtcbiAgICAvLyBSZWxlYXNlIGVwaWNcbiAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoX2FjdGlvbiQgPT4ge1xuICAgICAgcmV0dXJuIF9hY3Rpb24kLnBpcGUoXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uJC5uZXh0KGFjdGlvbikpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0sIG9wdHMubmFtZSk7XG4gIH0pLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKGhlbHBlcik7XG4gICAgICAgICAgaWYgKGVwaWMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZSgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFJlbGVhc2UgZXBpY1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdGVGYWN0b3J5LmFkZEVwaWMoZXBpYywgb3B0cy5uYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbChkZXN0b3J5JClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIC8vIHJlbGVhc2VFcGljLnB1c2goKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCkpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8vIGxldCByZWxlYXNlRXBpYzogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcbiAgY29uc3QgaGVscGVyID0ge1xuICAgIC4uLnNsaWNlLFxuICAgIGFjdGlvbiQ6IGFjdGlvbiQuYXNPYnNlcnZhYmxlKCksXG4gICAgYWN0aW9uJEJ5VHlwZTogY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGVwaWMoZXBpYzogRXBpYykge1xuICAgICAgY29uc3QgZmFjOiBFcGljRmFjdG9yeTxTLCBSPiA9ICgpID0+IGVwaWM7XG4gICAgICBhZGRFcGljJChvZihmYWMpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQob2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGRlc3Ryb3kkOiBkZXN0b3J5JC5hc09ic2VydmFibGUoKSxcbiAgICBkZXN0cm95KCkge1xuICAgICAgZGVzdG9yeSQubmV4dCgpO1xuICAgICAgZGVzdG9yeSQuY29tcGxldGUoKTtcbiAgICAgIHN0YXRlRmFjdG9yeS5yZW1vdmVTbGljZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gaGVscGVyO1xufVxuXG50eXBlIFNpbXBsZVJlZHVjZXJzPFM+ID0ge1xuICBbSzogc3RyaW5nXTogKGRyYWZ0OiBTIHwgRHJhZnQ8Uz4sIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG5leHBvcnQgdHlwZSBSZWd1bGFyUmVkdWNlcnM8UywgUiBleHRlbmRzIFNpbXBsZVJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyAoczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQPikgPT4gdm9pZCB8IERyYWZ0PFM+IDpcbiAgICAgIChzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHVua25vd24+KSA9PiB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIGNyZWF0ZVJlZHVjZXJzIGhlbHBzIHRvIHNpbXBsaWZ5IGhvdyB3ZSB3cml0aW5nIGRlZmluaXRpb24gb2YgU2xpY2VDYXNlUmVkdWNlcnMsXG4gKiBlLmcuIEEgcmVndWxhciBTbGljZUNhc2VSZWR1Y2VycyB0YWtlcyBQYXlsb2FkQWN0aW9uIGFzIHBhcmFtZXRlciwgbGlrZTogXG4gKiBgYGB0c1xuICogY29uc3QgcmVkdWNlcnMgPSB7XG4gKiAgIHJlZHVjZXJOYW1lKHN0YXRlOiBTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPG51bWJlcj4pIHtcbiAqICAgICAgLy8gdXBkYXRlIHN0YXRlIHdpdGggcGF5bG9hZCBkYXRhXG4gKiAgICB9XG4gKiB9O1xuICogYGBgXG4gKiBOb3JtYWxseSByZWR1Y2VyJ3MgbG9naWMgb25seSBjYXJlIGFib3V0IGBwYXlsb2FkYCBpbnN0ZWFkIG9mIGBQYXlsb2FkQWN0aW9uYCxcbiAqIGNyZWF0ZVJlZHVjZXJzIGFjY2VwdHMgYSBzaW1wbGVyIGZvcm1hdDpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzKHtcbiAqICAgcmVkdWNlck5hbWUoZHJhZnQ6IFN0YXRlLCBwYXlsb2FkOiBudW1iZXIpIHtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFlvdSBjYW4gZGVjbGFyZSBwYXlsb2FkIGFzIHJlZHVjZXIncyBwYXJhbWV0ZXIgaW5zdGVhZCBvZiBhIFBheWxvYWRBY3Rpb25cbiAqIEBwYXJhbSBzaW1wbGVSZWR1Y2Vyc1xuICogQHJldHVybnMgU2xpY2VDYXNlUmVkdWNlcnMgd2hpY2ggY2FuIGJlIHBhcnQgb2YgcGFyYW1ldGVyIG9mIGNyZWF0ZVNsaWNlSGVscGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyczxTLCBSIGV4dGVuZHMgU2ltcGxlUmVkdWNlcnM8Uz4+KHNpbXBsZVJlZHVjZXJzOiBSKTogUmVndWxhclJlZHVjZXJzPFMsIFI+IHtcbiAgY29uc3QgclJlZHVjZXJzID0ge30gYXMge1trZXk6IHN0cmluZ106IGFueX07XG4gIGZvciAoY29uc3QgW2tleSwgc1JlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHNpbXBsZVJlZHVjZXJzKSkge1xuICAgIHJSZWR1Y2Vyc1trZXldID0gKHM6IERyYWZ0PFM+LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55PikgPT4ge1xuICAgICAgcmV0dXJuIHNSZWR1Y2VyKHMsIHBheWxvYWQpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHJSZWR1Y2VycyBhcyBSZWd1bGFyUmVkdWNlcnM8UywgUj47XG59XG5cbnR5cGUgQWN0aW9uQnlUeXBlPFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBPYnNlcnZhYmxlPFxuICAgICAgUltLXSBleHRlbmRzIFBheWxvYWRBY3Rpb25DcmVhdG9yPGluZmVyIFA+ID9cbiAgICAgICAgUGF5bG9hZEFjdGlvbjxQPiA6IFBheWxvYWRBY3Rpb248dW5rbm93bj5cbiAgICA+XG59O1xuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UiBleHRlbmRzIENhc2VSZWR1Y2VyQWN0aW9uczxTbGljZUNhc2VSZWR1Y2Vyczxhbnk+Pj4oYWN0aW9uQ3JlYXRvcnM6IFIsXG4gIGFjdGlvbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4pOiBBY3Rpb25CeVR5cGU8Uj4ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShvcC5zaGFyZSgpKTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnMgPSB7fSBhcyBBY3Rpb25CeVR5cGU8Uj47XG5cbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNwbGl0QWN0aW9ucywgcmVkdWNlck5hbWUsIHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBzb3VyY2UucGlwZShvZlBheWxvYWRBY3Rpb24oYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJEJ5VHlwZTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LCBzbGljZTogU2xpY2U8UywgUj4gfCBTbGljZUhlbHBlcjxTLCBSPikge1xuICBpZiAoKHNsaWNlIGFzIFNsaWNlSGVscGVyPFMsIFI+KS5hY3Rpb24kKSB7XG4gICAgcmV0dXJuIChzbGljZSBhcyBTbGljZUhlbHBlcjxTLCBSPikuYWN0aW9uJEJ5VHlwZTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhY3Rpb24kID0gbmV3IFN1YmplY3Q8UGF5bG9hZEFjdGlvbiB8IEFjdGlvbj4oKTtcbiAgICBzdGF0ZUZhY3RvcnkuYWRkRXBpYyhfYWN0aW9uJCA9PiB7XG4gICAgICByZXR1cm4gX2FjdGlvbiQucGlwZShcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24kLm5leHQoYWN0aW9uKSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSwgc2xpY2UubmFtZSk7XG4gICAgcmV0dXJuIGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWN0aW9uT2ZDcmVhdG9yPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbjogUGF5bG9hZEFjdGlvbjxhbnksIGFueT4sIGFjdGlvbkNyZWF0b3I6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPik6XG4gIGFjdGlvbiBpcyBQYXlsb2FkQWN0aW9uPFAsIFQ+IHtcbiAgcmV0dXJuIGFjdGlvbi50eXBlID09PSBhY3Rpb25DcmVhdG9yLnR5cGU7XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFNsaWNlSGVscGVyPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IE9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTbGljZUhlbHBlcjxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG50eXBlIEFjdGlvbk9mUmVkdWNlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIFQgZXh0ZW5kcyBrZXlvZiBSPiA9IFJbVF0gZXh0ZW5kcyAoczogYW55LCBhY3Rpb246IGluZmVyIEEpID0+IGFueSA/XG4oQSBleHRlbmRzIHtwYXlsb2FkOiBpbmZlciBQfSA/IHtwYXlsb2FkOiBQOyB0eXBlOiBUfSA6IHt0eXBlOiBUfSkgOiBuZXZlcjtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZjxQLCBUIGV4dGVuZHMgc3RyaW5nPihcbiAgc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksXG4gIGFjdGlvbkNyZWF0b3I6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQLCBUPikge1xuXG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQIGV4dGVuZHMgdW5kZWZpbmVkID8ge3R5cGU6IFR9IDogUGF5bG9hZEFjdGlvbjxQLCBUPj4oc3ViID0+IHtcbiAgICBzdGF0ZUZhY3RvcnkuYWRkRXBpYzx1bmtub3duPigoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKGFjdGlvbkNyZWF0b3IpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHN1Yi5uZXh0KGFjdGlvbiBhcyBhbnkpKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kT2ZTbGljZTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sXG4gIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgc2xpY2VIZWxwZXI6IFNsaWNlSGVscGVyPFMsIFI+LFxuICBhY3Rpb25UeXBlOiBUKSB7XG5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPEFjdGlvbk9mUmVkdWNlcjxTLCBSLCBUPj4oc3ViID0+IHtcbiAgICBzbGljZUhlbHBlci5hZGRFcGljKHNsaWNlID0+IChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uc1thY3Rpb25UeXBlXSEpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHN1Yi5uZXh0KGFjdGlvbiBhcyBhbnkpKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBJbW1lckpTIGRvZXMgbm90IHdvcmsgd2l0aCBzb21lIGxhcmdlIG9iamVjdCAobGlrZSBIVE1MRWxlbWVudCksIG1lYW5pbmcgeW91IGNhbiBub3QgZGlyZWN0bHkgZGVmaW5lZCBhXG4gKiBSZWR1eC10b29sa2l0IHN0YXRlIHRvIGNvbnRhaW4gc3VjaCBhIGxhcmdlIG9iamVjdCwgdGhpcyBjbGFzcyBwcm92aWRlcyBhIHdyYXBwZXIgdG8gdGhvc2VcbiAqIFwibGFyZ2Ugb2JqZWN0XCIsIGFuZCBhdm9pZCBJbW1lckpzIHRvIHJlY3Vyc2l2ZWx5IGZyZWV6ZSBpdCBieSBwcmUtZnJlZXplIGl0c2VsZi4gXG4gKiBcbiAqIFVzZSBpdCB3aXRoIGBJbW11dGFibGVgIHRvIGluZm9ybSBSZWR1eC10b29sa2l0IGFuZCBJbW1lckpTIHRoYXQgdGhpcyB0eXBlIHNob3VsZCBiZSBpZ25vcmVkIGZyb20gYGRyYWZ0aW5nYFxuICogVXNhZ2U6XG4gKiBgYGBcbiAgICBpbXBvcnQge0ltbXV0YWJsZX0gZnJvbSAnaW1tZXInO1xuXG4gICAgaW50ZXJmYWNlIFlvdXJTdGF0ZSB7XG4gICAgICBzb21lRG9tOiBJbW11dGFibGU8UmVmcmlnZXJhdG9yPEhUTUxFbGVtZW50Pj47XG4gICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyaWdlcmF0b3I8VD4ge1xuICBwcml2YXRlIHJlZjogSW1tdXRhYmxlPFQ+O1xuICBbaW1tZXJhYmxlXTogZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3JpZ2luUmVmOiBUKSB7XG4gICAgdGhpcy5yZWYgPSBvcmlnaW5SZWYgYXMgSW1tdXRhYmxlPFQ+O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cblxuICBjcmVhdE5ld0lmTm9FcXVhbChyZWY6IFQpIHtcbiAgICBpZiAodGhpcy5yZWYgIT09IHJlZikge1xuICAgICAgcmV0dXJuIG5ldyBSZWZyaWdlcmF0b3IocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG4gIGdldFJlZigpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5yZWYgYXMgVDtcbiAgfVxufVxuUmVmcmlnZXJhdG9yW2ltbWVyYWJsZV0gPSBmYWxzZTtcbiJdfQ==