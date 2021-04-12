/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export function ofPayloadAction(...actionCreators) {
    return function (src) {
        return src.pipe(op.filter(action => actionCreators.some(ac => action.type === ac.type)));
    };
}
const sliceCount4Name = {};
/**
 * Reducers and initialState are reused cross multiple component
 *
 *  Slice --- Component instance (state, actions)
 */
export function createSlice(opt) {
    let name = opt.name;
    if (opt.generateId === undefined || opt.generateId === true) {
        if (sliceCount4Name[name] == null) {
            sliceCount4Name[name] = 0;
        }
        opt.name = name = name + (++sliceCount4Name[name]);
    }
    const actionCreators = {};
    const actionDispatcher = {};
    for (const [key, reducer] of Object.entries(opt.reducers)) {
        const type = name + '/' + key;
        const creator = ((payload) => {
            const action = { type, payload, reducer };
            return action;
        });
        creator.type = type;
        actionCreators[key] = creator;
        actionDispatcher[key] = ((payload) => {
            const action = creator(payload);
            dispatch(action);
            return action;
        });
        actionDispatcher[key].type = creator.type;
    }
    const state$ = new rx.BehaviorSubject(opt.initialState);
    const unprocessedAction$ = new rx.Subject();
    const action$ = new rx.Subject();
    function ofType(...actionTypes) {
        return function (src) {
            return src.pipe(op.filter(action => actionTypes.some(ac => action.type === name + '/' + ac)));
        };
    }
    function dispatch(action) {
        unprocessedAction$.next(action);
    }
    const sub = rx.merge(state$.pipe(op.tap(state => {
        if (opt.debug) {
            // tslint:disable-next-line: no-console
            console.log(`%c ${name} internal:state`, 'color: black; background: #e98df5;', state);
        }
    }), op.distinctUntilChanged()
    // op.tap(state => onStateChange(state))
    ), unprocessedAction$.pipe(op.tap(action => {
        if (opt.debug) {
            // tslint:disable-next-line: no-console
            console.log(`%c ${name} internal:action`, 'color: black; background: #fae4fc;', action.type);
        }
    }), op.tap(action => {
        if (action.reducer) {
            const currState = state$.getValue();
            const newState = action.reducer(currState, action.payload);
            if (newState !== undefined) {
                state$.next(Object.assign({}, newState));
            }
            else {
                state$.next(Object.assign({}, currState));
            }
        }
        action$.next(action);
    }), op.catchError((err, caught) => {
        console.error(err);
        dispatch({ type: 'reducer error', reducer(s) {
                return Object.assign(Object.assign({}, s), { error: err });
            }
        });
        return caught;
    })), opt.rootStore ? state$.pipe(op.tap(state => { var _a; return opt.rootStore.next(Object.assign(Object.assign({}, (_a = opt.rootStore) === null || _a === void 0 ? void 0 : _a.getValue()), { [opt.name]: state })); })) : rx.EMPTY).subscribe();
    function destroy() {
        dispatch({
            type: '__OnDestroy'
        });
        sub.unsubscribe();
    }
    function addEpic(epic) {
        epic(action$, state$).pipe(op.takeUntil(unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))), op.tap(action => dispatch(action)), op.catchError((err, caught) => {
            console.error(err);
            dispatch({ type: 'epic error', reducer(s) {
                    return Object.assign(Object.assign({}, s), { error: err });
                }
            });
            return caught;
        })).subscribe();
    }
    const slice = {
        name,
        state$,
        actions: actionCreators,
        dispatch,
        actionDispatcher,
        destroy,
        addEpic(epicFactory) {
            const epic = epicFactory(slice, ofType);
            addEpic(epic);
        }
    };
    return slice;
}
const demoSlice = createSlice({
    name: 'demo',
    initialState: {},
    reducers: {
        hellow(s, greeting) { },
        world(s) { }
    }
});
demoSlice.addEpic((slice, ofType) => {
    return (action$, state$) => {
        return rx.merge(action$.pipe(ofType('hellow', 'hellow'), op.map(action => slice.actions.world())), action$.pipe(ofType('world'), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe(ofPayloadAction(slice.actions.hellow), op.tap(action => typeof action.payload.data === 'string')), action$.pipe(ofPayloadAction(slice.actions.world), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe(ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(action => action.payload))).pipe(op.ignoreElements());
    };
});
