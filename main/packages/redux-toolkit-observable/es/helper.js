import { ofPayloadAction } from './redux-toolkit-observable';
import { Observable, EMPTY, of, Subject } from 'rxjs';
import * as op from 'rxjs/operators';
import { immerable } from 'immer';
export function createSliceHelper(stateFactory, opts) {
    const slice = stateFactory.newSlice(opts);
    const actionDispatcher = stateFactory.bindActionCreators(slice);
    const destory$ = new Subject();
    const action$ = new Subject();
    new Observable(() => {
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
                    return new Observable(() => {
                        // Release epic
                        return stateFactory.addEpic(epic, opts.name);
                    });
                }
            }
            return EMPTY;
        }), op.takeUntil(destory$)).subscribe();
        // releaseEpic.push(() => sub.unsubscribe());
        return () => sub.unsubscribe();
    }
    // let releaseEpic: Array<() => void> = [];
    const helper = Object.assign(Object.assign({}, slice), { action$: action$.asObservable(), action$ByType: castByActionType(slice.actions, action$), actionDispatcher,
        epic(epic) {
            const fac = () => epic;
            addEpic$(of(fac));
        },
        addEpic(epicFactory) {
            return addEpic$(of(epicFactory));
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
export function createReducers(simpleReducers) {
    const rReducers = {};
    for (const [key, sReducer] of Object.entries(simpleReducers)) {
        rReducers[key] = (s, { payload }) => {
            return sReducer(s, payload);
        };
    }
    return rReducers;
}
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
export function castByActionType(actionCreators, action$) {
    const source = action$.pipe(op.share());
    const splitActions = {};
    for (const reducerName of Object.keys(actionCreators)) {
        Object.defineProperty(splitActions, reducerName, {
            get() {
                return source.pipe(ofPayloadAction(actionCreators[reducerName]));
            }
        });
    }
    return splitActions;
}
export function action$ByType(stateFactory, slice) {
    if (slice.action$) {
        return slice.action$ByType;
    }
    else {
        const action$ = new Subject();
        stateFactory.addEpic(_action$ => {
            return _action$.pipe(op.tap(action => action$.next(action)), op.ignoreElements());
        }, slice.name);
        return castByActionType(slice.actions, action$);
    }
}
export function isActionOfCreator(action, actionCreator) {
    return action.type === actionCreator.type;
}
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
export function sliceRefActionOp(epicFactory) {
    return function (in$) {
        return in$.pipe(op.switchMap(({ payload }) => {
            const release = payload.addEpic(epicFactory);
            return new Observable(sub => release);
        }));
    };
}
export function action$Of(stateFactory, actionCreator) {
    return new Observable(sub => {
        stateFactory.addEpic((action$) => {
            return action$.pipe(ofPayloadAction(actionCreator), op.map(action => sub.next(action)), op.ignoreElements());
        });
    });
}
export function action$OfSlice(sliceHelper, actionType) {
    return new Observable(sub => {
        sliceHelper.addEpic(slice => (action$) => {
            return action$.pipe(ofPayloadAction(slice.actions[actionType]), op.map(action => sub.next(action)), op.ignoreElements());
        });
    });
}
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
export class Refrigerator {
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
Refrigerator[immerable] = false;
//# sourceMappingURL=helper.js.map