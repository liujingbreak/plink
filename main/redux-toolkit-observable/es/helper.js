import { Observable, EMPTY, of } from 'rxjs';
import * as op from 'rxjs/operators';
export function createSliceHelper(stateFactory, opts) {
    const slice = stateFactory.newSlice(opts);
    const actionDispatcher = stateFactory.bindActionCreators(slice);
    function addEpic$(epicFactory$) {
        const sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(fac => {
            if (fac) {
                const epic = fac(helper);
                if (epic) {
                    return new Observable(() => {
                        const release = stateFactory.addEpic(epic, opts.name);
                        return release;
                    });
                }
            }
            return EMPTY;
        })).subscribe();
        releaseEpic.push(() => sub.unsubscribe());
    }
    let releaseEpic = [];
    const helper = Object.assign(Object.assign({}, slice), { actionDispatcher, addEpic(epicFactory) {
            addEpic$(of(epicFactory));
        }, addEpic$,
        destroy() {
            stateFactory.removeSlice(slice);
            if (releaseEpic)
                releaseEpic.forEach(cb => cb());
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
