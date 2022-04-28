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
exports.sliceRefActionOp = exports.action$ByType = exports.action$OfSlice = exports.createSlice = exports.isActionOfCreator = exports.castByActionType = exports.ofPayloadAction = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const ofPayloadAction = (...actionCreators) => {
    return function (src) {
        return src.pipe(op.filter(action => actionCreators.some(ac => action.type === ac.type)));
    };
};
exports.ofPayloadAction = ofPayloadAction;
/**
 * Map action stream to multiple action streams by theire action type.
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                return source.pipe((0, exports.ofPayloadAction)(actionCreators[reducerName]));
            }
        });
    }
    return splitActions;
}
exports.castByActionType = castByActionType;
function isActionOfCreator(action, actionCreator) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return action.type === actionCreator.type;
}
exports.isActionOfCreator = isActionOfCreator;
const sliceCount4Name = {};
/**
 * Reducers and initialState are reused cross multiple component
 *
 *  Slice --- Component instance (state, actions)
 */
function createSlice(opt) {
    let name = opt.name;
    if (opt.generateId === undefined || opt.generateId === true) {
        if (sliceCount4Name[name] == null) {
            sliceCount4Name[name] = 0;
        }
        opt.name = name = name + '.' + (++sliceCount4Name[name]);
    }
    const actionCreators = {};
    const actionDispatcher = {};
    for (const [key, reducer] of Object.entries(opt.reducers)) {
        const type = name + '/' + key;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const creator = ((...payload) => {
            const action = {
                type,
                payload: payload.length === 0 ? undefined :
                    payload.length === 1 ? payload[0] :
                        payload,
                reducer
            };
            return action;
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        creator.type = type;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        actionCreators[key] = creator;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        actionDispatcher[key] = ((payload) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const action = creator(payload);
            dispatch(action);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return action;
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
    let actionCount = 0;
    let executingReducer = false;
    // To warn developer that no action dispatching shoud be called inside a reducer, this is side-effects and 
    // will leads to recursive reducer
    let inReducer = false;
    const interceptor$ = new rx.BehaviorSubject(input => input);
    const sub = rx.merge(interceptor$.pipe(op.switchMap(interceptor => unprocessedAction$.pipe(
    // op.observeOn(rx.queueScheduler), // Avoid recursively dispatching action inside an reducer, but normally recursively dispatching should be warned and forbidden
    op.tap(action => {
        if (opt.debug || opt.debugActionOnly) {
            // eslint-disable-next-line no-console
            console.log(`%c ${name} internal:action `, 'color: black; background: #fae4fc;', action.type);
        }
    }), interceptor, op.tap(action => {
        if (action.reducer) {
            const currState = state$.getValue();
            const shallowCopied = Object.assign(Object.assign({}, currState), { __ac: ++actionCount });
            executingReducer = true;
            if (inReducer) {
                throw new Error(`Do not dispatch action inside a reducer! (action: ${action.type})`);
            }
            inReducer = true;
            let newState;
            try {
                newState = action.reducer(shallowCopied, action.payload);
            }
            finally {
                inReducer = false;
                executingReducer = false;
            }
            // inReducer = false;
            // executingReducer = false;
            const changed = newState ? newState : shallowCopied;
            state$.next(changed);
        }
        action$.next(action);
    }), op.catchError((err, caught) => {
        console.error(err);
        dispatch({ type: 'reducer error',
            reducer(s) {
                return Object.assign(Object.assign({}, s), { error: err });
            }
        });
        return caught;
    })))), state$.pipe(op.tap(state => {
        if (opt.debug) {
            // eslint-disable-next-line no-console
            console.log(`%c ${name} internal:state `, 'color: black; background: #e98df5;', state);
        }
    })), opt.rootStore ? state$.pipe(op.tap(state => { var _a; return opt.rootStore.next(Object.assign(Object.assign({}, (_a = opt.rootStore) === null || _a === void 0 ? void 0 : _a.getValue()), { [opt.name]: state })); })) : rx.EMPTY).subscribe();
    function destroy() {
        dispatch({
            type: '__OnDestroy'
        });
        sub.unsubscribe();
    }
    function addEpic$(epicFactory$) {
        const sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(fac => {
            if (fac) {
                const epic = fac(slice, ofType);
                if (epic)
                    return epic(action$, state$);
            }
            return rx.EMPTY;
        }), op.takeUntil(unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))), op.tap(action => dispatch(action)), op.catchError((err, caught) => {
            console.error(err);
            dispatch({ type: 'epic error',
                reducer(s) {
                    return Object.assign(Object.assign({}, s), { error: err });
                }
            });
            return caught;
        })).subscribe();
        return () => sub.unsubscribe();
    }
    const slice = {
        name,
        state$,
        action$,
        action$ByType: castByActionType(actionCreators, action$),
        actions: actionCreators,
        dispatch,
        actionDispatcher,
        destroy,
        destroy$: unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1)),
        epic(epic) {
            const epicFactory = () => {
                return epic;
            };
            addEpic$(rx.of(epicFactory));
        },
        setActionInterceptor(intec) {
            interceptor$.next(intec);
        },
        addEpic(epicFactory) {
            return addEpic$(rx.of(epicFactory));
        },
        addEpic$,
        getStore() {
            return state$;
        },
        getState() {
            if (executingReducer) {
                throw new Error('To be consistent with Redux\'s behaviour, slice.getState() is not allowed to be invoked inside a reducer');
            }
            return state$.getValue();
        }
    };
    return slice;
}
exports.createSlice = createSlice;
function action$OfSlice(slice, actionType) {
    return new rx.Observable(sub => {
        slice.addEpic(slice => (action$) => {
            return action$.pipe((0, exports.ofPayloadAction)(slice.actions[actionType]), op.map(action => sub.next(action)), op.ignoreElements());
        });
    });
}
exports.action$OfSlice = action$OfSlice;
function action$ByType(slice) {
    return castByActionType(slice.actions, slice.action$);
}
exports.action$ByType = action$ByType;
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
            return new rx.Observable(sub => release);
        }));
    };
}
exports.sliceRefActionOp = sliceRefActionOp;
const demoSlice = createSlice({
    name: 'demo',
    initialState: {},
    reducers: {
        hellow(s, greeting) { },
        world(s) { },
        multiPayloadReducer(s, arg1, arg2) { }
    }
});
demoSlice.addEpic((slice, ofType) => {
    return (action$, state$) => {
        const actionStreams = castByActionType(slice.actions, action$);
        // slice.actionDispatcher.abc();
        return rx.merge(actionStreams.hellow.pipe(), actionStreams.multiPayloadReducer.pipe(), action$.pipe(ofType('hellow', 'hellow'), op.map(action => slice.actions.world())), action$.pipe(ofType('world'), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe((0, exports.ofPayloadAction)(slice.actions.hellow), op.tap(action => typeof action.payload.data === 'string')), action$.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        (0, exports.ofPayloadAction)(slice.actions.world), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe((0, exports.ofPayloadAction)(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(action => action.payload)), action$.pipe((0, exports.ofPayloadAction)(slice.actions.multiPayloadReducer), op.tap(({ payload: [a1, a2] }) => alert(a1)))).pipe(op.ignoreElements());
    };
});
action$OfSlice(demoSlice, 'hellow').pipe(op.tap(action => action));
action$OfSlice(demoSlice, 'world').pipe(op.tap(action => action));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQTBEO0FBQzFEOzs7Ozs7OztHQVFHO0FBQ0gseUNBQTJCO0FBQzNCLG1EQUFxQztBQTRIOUIsTUFBTSxlQUFlLEdBQXNCLENBQ2hELEdBQUcsY0FBZ0MsRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sVUFBUyxHQUFrQztRQUNoRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUN4RSxDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBUFcsUUFBQSxlQUFlLG1CQU8xQjtBQUdGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0gsU0FBZ0IsZ0JBQWdCLENBQTJCLGNBQTZCLEVBQ3RGLE9BQXNEO0lBRXBELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDeEMsTUFBTSxZQUFZLEdBQUcsRUFBd0IsQ0FBQztJQUU5QyxLQUFLLE1BQU0sV0FBVyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFnQixFQUFFO1FBQ3BFLE1BQU0sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRTtZQUMvQyxHQUFHO2dCQUNELGlFQUFpRTtnQkFDakUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUEsdUJBQWUsRUFBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUM7U0FDRixD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QUFNLENBQUMsT0FBTyxDQUFFLENBQ2xDLEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FDVixJQUFBLHVCQUFlLEVBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUNsRCxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzNDLENBQ0YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSCxjQUFjLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuRSxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnQgKi9cbi8qKlxuICogVGhpcyBmaWxlIHByb3ZpZGUgc29tZSBob29rcyB3aGljaCBsZXZlcmFnZXMgUnhKUyB0byBtaW1pYyBSZWR1eC10b29sa2l0ICsgUmVkdXgtb2JzZXJ2YWJsZVxuICogd2hpY2ggaXMgc3VwcG9zZWQgdG8gYmUgdXNlZCBpbmRlcGVuZGVudGx5IHdpdGhpbiBhbnkgUmVhY3QgY29tcG9uZW50IGluIGNhc2UgeW91ciBjb21wb25lbnQgaGFzIFxuICogY29tcGxpY2F0ZWQgYXN5bmMgc3RhdGUgY2hhbmdlIGxvZ2ljLlxuICogXG4gKiAtIGl0IGlzIHNtYWxsIGFuZCBzdXBwb3NlZCB0byBiZSB3ZWxsIHBlcmZvcm1lZFxuICogLSBpdCBkb2VzIG5vdCB1c2UgSW1tZXJKUywgeW91IHNob3VsZCB0YWtlIGNhcmUgb2YgaW1tdXRhYmlsaXR5IG9mIHN0YXRlIGJ5IHlvdXJzZWxmXG4gKiAtIGJlY2F1c2UgdGhlcmUgaXMgbm8gSW1tZXJKUywgeW91IGNhbiBwdXQgYW55IHR5cGUgb2YgT2JqZWN0IGluIHN0YXRlIGluY2x1ZGluZyB0aG9zZSBhcmUgbm90IGZyaWVuZGx5IGJ5IEltbWVySlNcbiAqL1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbjxTPiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcmVkdWNlcj8ob2xkOiBTKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF5bG9hZEFjdGlvbjxTLCBQID0gYW55PiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcGF5bG9hZDogUDtcbiAgcmVkdWNlcj8ob2xkOiBTLCBwYXlsb2FkOiBQKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIFJlZHVjZXJzPFMsIFIgPSBhbnk+ID0ge1xuICAvKiogUmV0dXJuaW5nIGB1bmRlZmluZWQgLyB2b2lkYCBoYXMgc2FtZSBlZmZlY3Qgb2YgcmV0dXJuaW5nIG9sZCBzdGF0ZSByZWZlcmVuY2UsXG4gICAqIFJldHVybmluZyBhIGJyYW5kIG5ldyBzdGF0ZSBvYmplY3QgZm9yIGltbXV0YWJpbGl0eSBpbiBub3JtYWwgY2FzZS5cbiAgICovXG4gIFtLIGluIGtleW9mIFJdOiAoc3RhdGU6IFMsIC4uLnBheWxvYWQ6IGFueVtdKSA9PiBTIHwgdm9pZDtcbn07XG5cbmV4cG9ydCB0eXBlIEFjdGlvbnM8UywgUj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8ge1xuICAgICAgKCk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH0gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8ge1xuICAgICAgKHBheWxvYWQ6IFApOiBBY3Rpb25UeXBlczxTLCBSPltLXTtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICB9IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIC4uLnBheWxvYWQ6IGluZmVyIE0pID0+IGFueSA/IHtcbiAgICAgICguLi5wYXlsb2FkOiBNKTogQWN0aW9uVHlwZXM8UywgUj5bS107XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgfSA6IHtcbiAgICAgICgpOiBBY3Rpb25UeXBlczxTLCBSPltLXTtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICB9O1xufTtcblxudHlwZSBBY3Rpb25UeXBlczxTLCBSPiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06XG4gICAgUltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyBBY3Rpb248Uz46XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIC4uLnBheWxvYWQ6IGluZmVyIE0pID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgTT4gOlxuICAgIFBheWxvYWRBY3Rpb248UywgdW5rbm93bj47XG59O1xuXG50eXBlIE91dHB1dEFjdGlvbk9iczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8YW55PiwgSyBleHRlbmRzIGtleW9mIFI+ID1cbiAgcnguT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPiA6IFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBQPiA6IFBheWxvYWRBY3Rpb248UywgdW5rbm93bj4+O1xuICAvLyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBQYXJhbWV0ZXJzPFJbS10+WzFdIGV4dGVuZHMgdW5kZWZpbmVkID8gdm9pZCA6IFBhcmFtZXRlcnM8UltLXT5bMV0sIEs+PjtcblxudHlwZSBPZlR5cGVQaXBlT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBLIGV4dGVuZHMga2V5b2YgUj4gPSAoc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KSA9PiBPdXRwdXRBY3Rpb25PYnM8UywgUiwgSz47XG5cbi8qKiBzYW1lIGFzIG9mUGF5bG9hZEFjdGlvbigpICwgdG8gZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSwgdW5saWtlIG9mUGF5bG9hZEFjdGlvbigpLCBwYXJhbWV0ZXIgaXMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhY3Rpb25DcmVhdG9yICovXG5leHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMT47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMik6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSLCBLMyBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIsIGFjdGlvblR5cGUzOiBLMyk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyIHwgSzM+O1xuICA8SyBleHRlbmRzIGtleW9mIFI+KC4uLmFjdGlvblR5cGVzOiBLW10pOiBPZlR5cGVQaXBlT3A8UywgUiwgSz47XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlPFMsIFI+LCBvZlR5cGU6IE9mVHlwZUZuPFMsIFI+KSA9PiBFcGljPFM+IHwgdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBzdGF0ZSQ6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9yIGZ1bmN0aW9ucyAqL1xuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj47XG4gIGFjdGlvbiRCeVR5cGU6IEFjdGlvbkJ5VHlwZTxTLCBSPjtcbiAgZGlzcGF0Y2g6IChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pID0+IHZvaWQ7XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgYm91bmQgd2l0aCBkaXNwYXRjaGVyICovXG4gIGFjdGlvbkRpc3BhdGNoZXI6IEFjdGlvbnM8UywgUj47XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgKi9cbiAgYWN0aW9uczogQWN0aW9uczxTLCBSPjtcbiAgZGVzdHJveTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSQ6IHJ4Lk9ic2VydmFibGU8YW55PjtcbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gZXBpYyB0aGUgXCJFcGljXCIgc3RyZWFtIG9mIGFjdGlvbnMtaW4sIGFjdGlvbnMtb3V0LCByZWZlciB0byBodHRwczovL3JlZHV4LW9ic2VydmFibGUuanMub3JnL2RvY3MvYmFzaWNzL0VwaWNzLmh0bWxcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byBkZXN0b3J5IChzdWJzY3JpYmUgZnJvbSkgZXBpY1xuICAgKi9cbiAgZXBpYyhlcGljOiBFcGljPFM+KTogdm9pZDtcbiAgLyoqXG4gICAqIGVwaWMoZXBpYykgaXMgcmVjb21tZW5kZWQgdG8gYmUgdXNlZCBpbnN0ZWFkIG9mIGFkZEVwaWMoKSwgaXQgaGFzIGNvbmNpc2VyIG1ldGhvZCBzaWduYXR1cmUuXG4gICAqIEBwYXJhbSBlcGljRmFjdG9yeSBhIGZhY3RvcnkgZnVuY3Rpb24gd2hpY2ggY3JlYXRlcyB0aGUgXCJFcGljXCIgKHN0cmVhbSBvZiBhY3Rpb25zLWluIGFuZCBhY3Rpb25zLW91dCxcbiAgICogIHJlZmVyIHRvIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvZG9jcy9iYXNpY3MvRXBpY3MuaHRtbClcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byByZW1vdmUvdW5zdWJzY3JpYmUgdGhpcyBlcGljXG4gICAqL1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIC8qKlxuICAgKiBNb3N0IG9mIHRoZSB0aW1lIHlvdSBqdXN0IG5lZWQgZXBpYyhlcGljKSwgdGhpcyBtZXRob2QgaXMgY29udmVuaWVudCBpbiBjYXNlIG9mIGNvbnN0YW50bHkgXCJhZGRpbmdcIlxuICAgKiBuZXcgZXBpYyBhZnRlciBcInVuc3Vic2NyaWJlXCIgZnJvbSBwcmVjZWRpbmcgb2xkIGVwaWNcbiAgICogQHBhcmFtIGVwaWNGYWN0b3J5JCB0aGlzIG9ic2VydmFibGUgd2lsbCBiZSBcInN3aXRjaE1hcCgpXCJlZCBpbiBhIHBpcGVsaW5lXG4gICAqL1xuICBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG4gIC8qKiB1bi1wcm9jZXNzZWQgYWN0aW9ucyBnbyB0aHJvdWdoIHRoaXMgb3BlcmF0b3IgKi9cbiAgc2V0QWN0aW9uSW50ZXJjZXB0b3IoaW50ZWM6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+LCBQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+KTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgRXBpYzxTLCBBJCA9IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4gPSAoYWN0aW9uczogQSQsIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiBBJDtcblxudHlwZSBBY3Rpb25PZkNyZWF0b3I8Qz4gPSBDIGV4dGVuZHMge1xuICAoKTogYW55O1xuICB0eXBlOiBzdHJpbmc7XG59ID8geyB0eXBlOiBzdHJpbmc7IHBheWxvYWQ6IHVuZGVmaW5lZCB9IDpcbiAgQyBleHRlbmRzIHtcbiAgICAocGF5bG9hZDogaW5mZXIgUCk6IGFueTtcbiAgICB0eXBlOiBzdHJpbmc7XG4gIH0gPyB7dHlwZTogc3RyaW5nOyBwYXlsb2FkOiBQfSA6XG4gIEMgZXh0ZW5kcyB7XG4gICAgKC4uLmFyZ3M6IGluZmVyIE0pOiBhbnk7XG4gICAgdHlwZTogc3RyaW5nO1xuICB9ID8ge3R5cGU6IHN0cmluZzsgcGF5bG9hZDogTX0gOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9mUGF5bG9hZEFjdGlvbkZuIHtcbiAgPEM+KGFjdGlvbkNyZWF0b3JzOiBDKTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIEFjdGlvbk9mQ3JlYXRvcjxDPj47XG4gIDxDMSwgQzI+KGFjdGlvbkNyZWF0b3JzOiBDMSwgYWN0aW9uQ3JlYXRvcnMxOiBDMik6XG4gICAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnkgLCBBY3Rpb25PZkNyZWF0b3I8QzE+IHwgQWN0aW9uT2ZDcmVhdG9yPEMyPj47XG4gIDxDMSwgQzIsIEMzPihhY3Rpb25DcmVhdG9yczogQzEsIGFjdGlvbkNyZWF0b3JzMTogQzIsIGFjdGlvbkNyZWF0b3JzMjogQzMpOlxuICAgIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBBY3Rpb25PZkNyZWF0b3I8QzE+IHwgQWN0aW9uT2ZDcmVhdG9yPEMyPiB8IEFjdGlvbk9mQ3JlYXRvcjxDMz4+O1xuICAoLi4uYWN0aW9uQ3JlYXRvcnM6IHt0eXBlOiBzdHJpbmd9W10pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwge3R5cGU6IHN0cmluZzsgcGF5bG9hZD86IHVua25vd259Pjtcbn1cblxuZXhwb3J0IGNvbnN0IG9mUGF5bG9hZEFjdGlvbjogT2ZQYXlsb2FkQWN0aW9uRm4gPSAoXG4gIC4uLmFjdGlvbkNyZWF0b3JzOiB7dHlwZTogc3RyaW5nfVtdKSA9PiB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8e3R5cGU6IHN0cmluZ30+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25DcmVhdG9ycy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBhYy50eXBlKSlcbiAgICApO1xuICB9O1xufTtcblxudHlwZSBBY3Rpb25CeVR5cGU8UywgUj4gPSB7W0sgaW4ga2V5b2YgUl06IHJ4Lk9ic2VydmFibGU8QWN0aW9uVHlwZXM8UywgUj5bS10+fTtcbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXJlIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihhY3Rpb25DcmVhdG9yczogQWN0aW9uczxTLCBSPixcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+KTogQWN0aW9uQnlUeXBlPFMsIFI+IHtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShvcC5zaGFyZSgpKTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnMgPSB7fSBhcyBBY3Rpb25CeVR5cGU8UywgUj47XG5cbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSBhcyAoa2V5b2YgUilbXSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNwbGl0QWN0aW9ucywgcmVkdWNlck5hbWUsIHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZS5waXBlKG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWN0aW9uT2ZDcmVhdG9yPEMgZXh0ZW5kcyB7dHlwZTogc3RyaW5nfT4oYWN0aW9uOiBhbnksIGFjdGlvbkNyZWF0b3I6IEMpOlxuICBhY3Rpb24gaXMgQWN0aW9uT2ZDcmVhdG9yPEM+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuY29uc3Qgc2xpY2VDb3VudDROYW1lOiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZU9wdGlvbnM8UlMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxSUz4sIFMgZXh0ZW5kcyBSUyA9IFJTPiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgLyoqIEdlbmVyYXRlIHVuaXF1ZSBJRCBhcyBwYXJ0IG9mIHNsaWNlJ3MgbmFtZSwgZGVmYXVsdDogdHJ1ZSAqL1xuICBnZW5lcmF0ZUlkPzogYm9vbGVhbjtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkZWJ1Z0FjdGlvbk9ubHk/OiBib29sZWFuO1xuICByb290U3RvcmU/OiByeC5CZWhhdmlvclN1YmplY3Q8e1trOiBzdHJpbmddOiBTfT47XG59XG5cbi8qKlxuICogUmVkdWNlcnMgYW5kIGluaXRpYWxTdGF0ZSBhcmUgcmV1c2VkIGNyb3NzIG11bHRpcGxlIGNvbXBvbmVudFxuICogXG4gKiAgU2xpY2UgLS0tIENvbXBvbmVudCBpbnN0YW5jZSAoc3RhdGUsIGFjdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZTxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9wdDogU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2U8UywgUj4ge1xuICBsZXQgbmFtZSA9IG9wdC5uYW1lO1xuICBpZiAob3B0LmdlbmVyYXRlSWQgPT09IHVuZGVmaW5lZCB8fCBvcHQuZ2VuZXJhdGVJZCA9PT0gdHJ1ZSkge1xuICAgIGlmIChzbGljZUNvdW50NE5hbWVbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgc2xpY2VDb3VudDROYW1lW25hbWVdID0gMDtcbiAgICB9XG4gICAgb3B0Lm5hbWUgPSBuYW1lID0gbmFtZSArICcuJyArICgrK3NsaWNlQ291bnQ0TmFtZVtuYW1lXSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ3JlYXRvcnMgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0ge30gYXMgQWN0aW9uczxTLCBSPjtcblxuICBmb3IgKGNvbnN0IFtrZXksIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKG9wdC5yZWR1Y2VycykpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZSArICcvJyArIGtleTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgY29uc3QgY3JlYXRvciA9ICgoLi4ucGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIHBheWxvYWQ6IHBheWxvYWQubGVuZ3RoID09PSAwID8gdW5kZWZpbmVkIDpcbiAgICAgICAgICBwYXlsb2FkLmxlbmd0aCA9PT0gMSA/IHBheWxvYWRbMF0gOlxuICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgIHJlZHVjZXJcbiAgICAgIH07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvcjtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgocGF5bG9hZD86IGFueSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICBjb25zdCBhY3Rpb24gPSBjcmVhdG9yKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBhbnk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXS50eXBlID0gY3JlYXRvci50eXBlO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxTPihvcHQuaW5pdGlhbFN0YXRlKTtcbiAgY29uc3QgdW5wcm9jZXNzZWRBY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcbiAgY29uc3QgYWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG5cbiAgZnVuY3Rpb24gb2ZUeXBlPFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgICAuLi5hY3Rpb25UeXBlczogVFtdKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uVHlwZXMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gbmFtZSArICcvJyArIGFjKSlcbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikge1xuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICBsZXQgYWN0aW9uQ291bnQgPSAwO1xuICBsZXQgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAvLyBUbyB3YXJuIGRldmVsb3BlciB0aGF0IG5vIGFjdGlvbiBkaXNwYXRjaGluZyBzaG91ZCBiZSBjYWxsZWQgaW5zaWRlIGEgcmVkdWNlciwgdGhpcyBpcyBzaWRlLWVmZmVjdHMgYW5kIFxuICAvLyB3aWxsIGxlYWRzIHRvIHJlY3Vyc2l2ZSByZWR1Y2VyXG4gIGxldCBpblJlZHVjZXIgPSBmYWxzZTtcbiAgY29uc3QgaW50ZXJjZXB0b3IkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxyeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPiwgUGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4oXG4gICAgaW5wdXQgPT4gaW5wdXRcbiAgKTtcblxuICBjb25zdCBzdWIgPSByeC5tZXJnZShcbiAgICBpbnRlcmNlcHRvciQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcChpbnRlcmNlcHRvciA9PiB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShcbiAgICAgICAgLy8gb3Aub2JzZXJ2ZU9uKHJ4LnF1ZXVlU2NoZWR1bGVyKSwgLy8gQXZvaWQgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgYWN0aW9uIGluc2lkZSBhbiByZWR1Y2VyLCBidXQgbm9ybWFsbHkgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgc2hvdWxkIGJlIHdhcm5lZCBhbmQgZm9yYmlkZGVuXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICAgIGlmIChvcHQuZGVidWcgfHwgb3B0LmRlYnVnQWN0aW9uT25seSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOmFjdGlvbiBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZmFlNGZjOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBpbnRlcmNlcHRvcixcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgICAgaWYgKGFjdGlvbi5yZWR1Y2VyKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyU3RhdGUgPSBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgIGNvbnN0IHNoYWxsb3dDb3BpZWQgPSB7Li4uY3VyclN0YXRlLCBfX2FjOiArK2FjdGlvbkNvdW50fTtcbiAgICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGluUmVkdWNlcikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERvIG5vdCBkaXNwYXRjaCBhY3Rpb24gaW5zaWRlIGEgcmVkdWNlciEgKGFjdGlvbjogJHthY3Rpb24udHlwZX0pYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpblJlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgICAgbGV0IG5ld1N0YXRlOiBTIHwgdm9pZDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc2hhbGxvd0NvcGllZCwgKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkKTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBuZXdTdGF0ZSA/IG5ld1N0YXRlIDogc2hhbGxvd0NvcGllZDtcbiAgICAgICAgICAgIHN0YXRlJC5uZXh0KGNoYW5nZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgIGRpc3BhdGNoKHt0eXBlOiAncmVkdWNlciBlcnJvcicsXG4gICAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyIGFzIHVua25vd259O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICAgIH0pXG4gICAgICApKVxuICAgICksXG5cbiAgICBzdGF0ZSQucGlwZShcbiAgICAgIG9wLnRhcChzdGF0ZSA9PiB7XG4gICAgICAgIGlmIChvcHQuZGVidWcpIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOnN0YXRlIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNlOThkZjU7Jywgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgb3B0LnJvb3RTdG9yZSA/IHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IG9wdC5yb290U3RvcmUhLm5leHQoey4uLm9wdC5yb290U3RvcmU/LmdldFZhbHVlKCksIFtvcHQubmFtZV06IHN0YXRlfSkpXG4gICAgICkgOiByeC5FTVBUWVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgZGlzcGF0Y2goe1xuICAgICAgdHlwZTogJ19fT25EZXN0cm95J1xuICAgIH0pO1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoc2xpY2UsIG9mVHlwZSBhcyBPZlR5cGVGbjxTLCBSPik7XG4gICAgICAgICAgaWYgKGVwaWMpXG4gICAgICAgICAgICByZXR1cm4gZXBpYyhhY3Rpb24kLCBzdGF0ZSQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IGRpc3BhdGNoKGFjdGlvbikpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ2VwaWMgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyIGFzIHVua25vd259O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgc2xpY2U6IFNsaWNlPFMsIFI+ID0ge1xuICAgIG5hbWUsXG4gICAgc3RhdGUkLFxuICAgIGFjdGlvbiQsXG4gICAgYWN0aW9uJEJ5VHlwZTogY2FzdEJ5QWN0aW9uVHlwZShhY3Rpb25DcmVhdG9ycywgYWN0aW9uJCksXG4gICAgYWN0aW9uczogYWN0aW9uQ3JlYXRvcnMsXG4gICAgZGlzcGF0Y2gsXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBkZXN0cm95LFxuICAgIGRlc3Ryb3kkOiB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSksXG4gICAgZXBpYyhlcGljOiBFcGljPFM+KSB7XG4gICAgICBjb25zdCBlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4gPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBlcGljO1xuICAgICAgfTtcbiAgICAgIGFkZEVwaWMkKHJ4Lm9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBzZXRBY3Rpb25JbnRlcmNlcHRvcihpbnRlYzogcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4sIFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4pIHtcbiAgICAgIGludGVyY2VwdG9yJC5uZXh0KGludGVjKTtcbiAgICB9LFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlJDtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgaWYgKGV4ZWN1dGluZ1JlZHVjZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUbyBiZSBjb25zaXN0ZW50IHdpdGggUmVkdXhcXCdzIGJlaGF2aW91ciwgc2xpY2UuZ2V0U3RhdGUoKSBpcyBub3QgYWxsb3dlZCB0byBiZSBpbnZva2VkIGluc2lkZSBhIHJlZHVjZXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzbGljZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRPZlNsaWNlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPixcbiAgVCBleHRlbmRzIGtleW9mIFI+KFxuICBzbGljZTogU2xpY2U8UywgUj4sXG4gIGFjdGlvblR5cGU6IFQpIHtcblxuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8UltUXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IHt0eXBlOiBUfSA6XG4gICAgUltUXSBleHRlbmRzIChzOiBhbnksIHA6IGluZmVyIFApID0+IGFueSA/IHtwYXlsb2FkOiBQOyB0eXBlOiBUfSA6IG5ldmVyPihzdWIgPT4ge1xuICAgIHNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zW2FjdGlvblR5cGVdKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJEJ5VHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KHNsaWNlOiBTbGljZTxTLCBSPikge1xuICByZXR1cm4gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBzbGljZS5hY3Rpb24kKTtcbn1cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbiBleHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2Uoe1xuICBuYW1lOiAnZGVtbycsXG4gIGluaXRpYWxTdGF0ZToge30gYXMge29rPzogYm9vbGVhbjsgZXJyb3I/OiBFcnJvcn0sXG4gIHJlZHVjZXJzOiB7XG4gICAgaGVsbG93KHMsIGdyZWV0aW5nOiB7ZGF0YTogc3RyaW5nfSkge30sXG4gICAgd29ybGQocykge30sXG4gICAgbXVsdGlQYXlsb2FkUmVkdWNlcihzLCBhcmcxOiBzdHJpbmcsIGFyZzI6IG51bWJlcikge31cbiAgfVxufSk7XG5kZW1vU2xpY2UuYWRkRXBpYygoc2xpY2UsIG9mVHlwZSkgPT4ge1xuICByZXR1cm4gKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuYWJjKCk7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uU3RyZWFtcy5oZWxsb3cucGlwZSgpLFxuICAgICAgYWN0aW9uU3RyZWFtcy5tdWx0aVBheWxvYWRSZWR1Y2VyLnBpcGUoKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdoZWxsb3cnLCAnaGVsbG93JyksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9ucy53b3JsZCgpKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCd3b3JsZCcpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaGVsbG93KSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB0eXBlb2YgYWN0aW9uLnBheWxvYWQuZGF0YSA9PT0gJ3N0cmluZycpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3csIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkIClcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLm11bHRpUGF5bG9hZFJlZHVjZXIpLFxuICAgICAgICBvcC50YXAoKHtwYXlsb2FkOiBbYTEsIGEyXX0pID0+IGFsZXJ0KGExKSlcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ2hlbGxvdycpLnBpcGUob3AudGFwKGFjdGlvbiA9PiBhY3Rpb24pKTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ3dvcmxkJykucGlwZShvcC50YXAoYWN0aW9uID0+IGFjdGlvbikpO1xuIl19