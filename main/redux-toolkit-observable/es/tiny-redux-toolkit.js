import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export function ofAction(...actionCreators) {
    return function (src) {
        return src.pipe(op.filter(action => actionCreators.some(ac => action.type === ac.type)));
    };
}
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
export default function createTinyReduxToolkit({ initialState, reducers, logPrefix, onStateChange }) {
    // const [state, setState] = React.useState<S>(initialState);
    const state$ = new rx.BehaviorSubject(initialState);
    const unprocessedAction$ = new rx.Subject();
    const action$ = new rx.Subject();
    const bindActions = {};
    for (const [type, reducer] of Object.entries(reducers)) {
        const creator = function (payload) {
            const action = { type, payload, reducer };
            unprocessedAction$.next(action);
            return action;
        };
        creator.type = type;
        bindActions[type] = creator;
    }
    const actionDispatcher = bindActions;
    const sub = rx.merge(state$.pipe(op.tap(state => {
        if (logPrefix) {
            // tslint:disable-next-line: no-console
            console.log(`%c ${logPrefix} internal:state`, 'color: black; background: #e98df5;', state);
        }
    }), op.distinctUntilChanged(), 
    // op.tap(() => {
    //   if (logPrefix) {
    //     // tslint:disable-next-line: no-console
    //     console.log(`%c ${logPrefix} sync to React State`, 'color: black; background: #e98df5;');
    //   }
    // }),
    op.tap(state => onStateChange(state))), unprocessedAction$.pipe(op.tap(action => {
        if (logPrefix) {
            // tslint:disable-next-line: no-console
            console.log(`%c ${logPrefix} internal:action`, 'color: black; background: #fae4fc;', action.type);
        }
    }), op.tap(action => {
        if (action.reducer) {
            const newState = action.reducer(state$.getValue(), action.payload);
            if (newState !== undefined)
                state$.next(newState);
        }
        action$.next(action);
    }), op.catchError((err, caught) => {
        console.error(err);
        dispatch({ type: 'reducer error', reducer(s) {
                return Object.assign(Object.assign({}, s), { error: err });
            }
        });
        return caught;
    }))).subscribe();
    function destroy() {
        dispatch({
            type: '__OnDestroy'
        });
        sub.unsubscribe();
    }
    function addEpic(epic) {
        epic(action$, state$).pipe(op.takeUntil(action$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))), op.tap(action => dispatch(action)), op.catchError((err, caught) => {
            console.error(err);
            dispatch({ type: 'epic error', reducer(s) {
                    return Object.assign(Object.assign({}, s), { error: err });
                }
            });
            return caught;
        })).subscribe();
    }
    function dispatch(action) {
        unprocessedAction$.next(action);
    }
    return {
        addEpic,
        dispatch,
        destroy,
        actionDispatcher
        // state$,
        // action$
    };
}
