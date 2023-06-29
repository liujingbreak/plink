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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Refrigerator = exports.action$OfSlice = exports.action$Of = exports.sliceRefActionOp = exports.isActionOfCreator = exports.action$ByType = exports.castByActionType = exports.createReducers = exports.createSliceHelper = void 0;
const rxjs_1 = require("rxjs");
const op = __importStar(require("rxjs/operators"));
const immer_1 = require("immer");
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
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
                return source.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(actionCreators[reducerName]), op.share());
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
        this[_a] = false;
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
_a = immer_1.immerable, _b = immer_1.immerable;
Refrigerator[_b] = false;
exports.Refrigerator = Refrigerator;
//# sourceMappingURL=helper.js.map