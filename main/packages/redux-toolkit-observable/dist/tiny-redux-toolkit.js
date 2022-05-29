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
        const creator = ((payload) => {
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
        actionDispatcher[key] = ((...payload) => {
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
                const payload = action.payload;
                const params = Array.isArray(payload) ? payload : [payload];
                newState = action.reducer(shallowCopied, ...params);
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
                    return epic(action$, state$).pipe(op.catchError((err, src) => {
                        console.error(err);
                        dispatch({ type: 'Epic error',
                            reducer(s) {
                                return Object.assign(Object.assign({}, s), { error: err });
                            }
                        });
                        return src;
                    }));
            }
            return rx.EMPTY;
        }), op.takeUntil(unprocessedAction$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))), op.tap(action => dispatch(action)), op.catchError((err, caught) => {
            console.error(err);
            dispatch({ type: 'Epics error',
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
/**
 * @deprecated use Slice['action$ByType'] instead
 */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQTBEO0FBQzFEOzs7Ozs7OztHQVFHO0FBQ0gseUNBQTJCO0FBQzNCLG1EQUFxQztBQTRIOUIsTUFBTSxlQUFlLEdBQXNCLENBQ2hELEdBQUcsY0FBZ0MsRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sVUFBUyxHQUFrQztRQUNoRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUN4RSxDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBUFcsUUFBQSxlQUFlLG1CQU8xQjtBQUdGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0gsU0FBZ0IsZ0JBQWdCLENBQTJCLGNBQTZCLEVBQ3RGLE9BQXNEO0lBRXRELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDeEMsTUFBTSxZQUFZLEdBQUcsRUFBd0IsQ0FBQztJQUU5QyxLQUFLLE1BQU0sV0FBVyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFnQixFQUFFO1FBQ3BFLE1BQU0sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRTtZQUMvQyxHQUFHO2dCQUNELGlFQUFpRTtnQkFDakUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUEsdUJBQWUsRUFBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUM7U0FDRixD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RUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50ICovXG4vKipcbiAqIFRoaXMgZmlsZSBwcm92aWRlIHNvbWUgaG9va3Mgd2hpY2ggbGV2ZXJhZ2VzIFJ4SlMgdG8gbWltaWMgUmVkdXgtdG9vbGtpdCArIFJlZHV4LW9ic2VydmFibGVcbiAqIHdoaWNoIGlzIHN1cHBvc2VkIHRvIGJlIHVzZWQgaW5kZXBlbmRlbnRseSB3aXRoaW4gYW55IFJlYWN0IGNvbXBvbmVudCBpbiBjYXNlIHlvdXIgY29tcG9uZW50IGhhcyBcbiAqIGNvbXBsaWNhdGVkIGFzeW5jIHN0YXRlIGNoYW5nZSBsb2dpYy5cbiAqIFxuICogLSBpdCBpcyBzbWFsbCBhbmQgc3VwcG9zZWQgdG8gYmUgd2VsbCBwZXJmb3JtZWRcbiAqIC0gaXQgZG9lcyBub3QgdXNlIEltbWVySlMsIHlvdSBzaG91bGQgdGFrZSBjYXJlIG9mIGltbXV0YWJpbGl0eSBvZiBzdGF0ZSBieSB5b3Vyc2VsZlxuICogLSBiZWNhdXNlIHRoZXJlIGlzIG5vIEltbWVySlMsIHlvdSBjYW4gcHV0IGFueSB0eXBlIG9mIE9iamVjdCBpbiBzdGF0ZSBpbmNsdWRpbmcgdGhvc2UgYXJlIG5vdCBmcmllbmRseSBieSBJbW1lckpTXG4gKi9cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb248Uz4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHJlZHVjZXI/KG9sZDogUyk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBheWxvYWRBY3Rpb248UywgUCA9IGFueVtdPiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcGF5bG9hZDogUDtcbiAgcmVkdWNlcj8ob2xkOiBTLCAuLi5wYXlsb2FkOiBQIGV4dGVuZHMgQXJyYXk8aW5mZXIgST4gPyBJW10gOiBbUF0pOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcnM8UywgUiA9IGFueT4gPSB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW0sgaW4ga2V5b2YgUl06IChzdGF0ZTogUywgLi4ucGF5bG9hZDogYW55W10pID0+IFMgfCB2b2lkO1xufTtcblxuZXhwb3J0IHR5cGUgQWN0aW9uczxTLCBSPiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06XG4gICAgUltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyB7XG4gICAgICAoKTogQWN0aW9uVHlwZXM8UywgUj5bS107XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgfSA6XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyB7XG4gICAgICAocGF5bG9hZDogUCk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH0gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgLi4ucGF5bG9hZDogaW5mZXIgTSkgPT4gYW55ID8ge1xuICAgICAgKC4uLnBheWxvYWQ6IE0pOiBBY3Rpb25UeXBlczxTLCBSPltLXTtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICB9IDoge1xuICAgICAgKCk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH07XG59O1xuXG50eXBlIEFjdGlvblR5cGVzPFMsIFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPjpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgUD4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgLi4ucGF5bG9hZDogaW5mZXIgTSkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBNPiA6XG4gICAgUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPjtcbn07XG5cbnR5cGUgT3V0cHV0QWN0aW9uT2JzPFMsIFIgZXh0ZW5kcyBSZWR1Y2Vyczxhbnk+LCBLIGV4dGVuZHMga2V5b2YgUj4gPVxuICByeC5PYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+IDogUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDogUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPj47XG4gIC8vIHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFBhcmFtZXRlcnM8UltLXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW0tdPlsxXSwgSz4+O1xuXG50eXBlIE9mVHlwZVBpcGVPcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9IChzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4pID0+IE91dHB1dEFjdGlvbk9iczxTLCBSLCBLPjtcblxuLyoqIHNhbWUgYXMgb2ZQYXlsb2FkQWN0aW9uKCkgLCB0byBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlLCB1bmxpa2Ugb2ZQYXlsb2FkQWN0aW9uKCksIHBhcmFtZXRlciBpcyBhIHN0cmluZyBpbnN0ZWFkIG9mIGFjdGlvbkNyZWF0b3IgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIDxLMSBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzI+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFIsIEszIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMiwgYWN0aW9uVHlwZTM6IEszKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzIgfCBLMz47XG4gIDxLIGV4dGVuZHMga2V5b2YgUj4oLi4uYWN0aW9uVHlwZXM6IEtbXSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLPjtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2U8UywgUj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmcgfCBudW1iZXI7XG4gIHN0YXRlJDogcnguQmVoYXZpb3JTdWJqZWN0PFM+O1xuICAvKiogQWN0aW9uIGNyZWF0b3IgZnVuY3Rpb25zICovXG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+PjtcbiAgYWN0aW9uJEJ5VHlwZTogQWN0aW9uQnlUeXBlPFMsIFI+O1xuICBkaXNwYXRjaDogKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikgPT4gdm9pZDtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyBib3VuZCB3aXRoIGRpc3BhdGNoZXIgKi9cbiAgYWN0aW9uRGlzcGF0Y2hlcjogQWN0aW9uczxTLCBSPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyAqL1xuICBhY3Rpb25zOiBBY3Rpb25zPFMsIFI+O1xuICBkZXN0cm95OiAoKSA9PiB2b2lkO1xuICBkZXN0cm95JDogcnguT2JzZXJ2YWJsZTxhbnk+O1xuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBlcGljIHRoZSBcIkVwaWNcIiBzdHJlYW0gb2YgYWN0aW9ucy1pbiwgYWN0aW9ucy1vdXQsIHJlZmVyIHRvIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvZG9jcy9iYXNpY3MvRXBpY3MuaHRtbFxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIGRlc3RvcnkgKHN1YnNjcmliZSBmcm9tKSBlcGljXG4gICAqL1xuICBlcGljKGVwaWM6IEVwaWM8Uz4pOiB2b2lkO1xuICAvKipcbiAgICogZXBpYyhlcGljKSBpcyByZWNvbW1lbmRlZCB0byBiZSB1c2VkIGluc3RlYWQgb2YgYWRkRXBpYygpLCBpdCBoYXMgY29uY2lzZXIgbWV0aG9kIHNpZ25hdHVyZS5cbiAgICogQHBhcmFtIGVwaWNGYWN0b3J5IGEgZmFjdG9yeSBmdW5jdGlvbiB3aGljaCBjcmVhdGVzIHRoZSBcIkVwaWNcIiAoc3RyZWFtIG9mIGFjdGlvbnMtaW4gYW5kIGFjdGlvbnMtb3V0LFxuICAgKiAgcmVmZXIgdG8gaHR0cHM6Ly9yZWR1eC1vYnNlcnZhYmxlLmpzLm9yZy9kb2NzL2Jhc2ljcy9FcGljcy5odG1sKVxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHJlbW92ZS91bnN1YnNjcmliZSB0aGlzIGVwaWNcbiAgICovXG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgLyoqXG4gICAqIE1vc3Qgb2YgdGhlIHRpbWUgeW91IGp1c3QgbmVlZCBlcGljKGVwaWMpLCB0aGlzIG1ldGhvZCBpcyBjb252ZW5pZW50IGluIGNhc2Ugb2YgY29uc3RhbnRseSBcImFkZGluZ1wiXG4gICAqIG5ldyBlcGljIGFmdGVyIFwidW5zdWJzY3JpYmVcIiBmcm9tIHByZWNlZGluZyBvbGQgZXBpY1xuICAgKiBAcGFyYW0gZXBpY0ZhY3RvcnkkIHRoaXMgb2JzZXJ2YWJsZSB3aWxsIGJlIFwic3dpdGNoTWFwKClcImVkIGluIGEgcGlwZWxpbmVcbiAgICovXG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZ2V0U3RvcmUoKTogcnguT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbiAgLyoqIHVuLXByb2Nlc3NlZCBhY3Rpb25zIGdvIHRocm91Z2ggdGhpcyBvcGVyYXRvciAqL1xuICBzZXRBY3Rpb25JbnRlcmNlcHRvcihpbnRlYzogcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4sIFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4pOiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBFcGljPFMsIEEkID0gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+PiA9IChhY3Rpb25zOiBBJCwgc3RhdGVzOiByeC5CZWhhdmlvclN1YmplY3Q8Uz4pID0+IEEkO1xuXG50eXBlIEFjdGlvbk9mQ3JlYXRvcjxDPiA9IEMgZXh0ZW5kcyB7XG4gICgpOiBhbnk7XG4gIHR5cGU6IHN0cmluZztcbn0gPyB7IHR5cGU6IHN0cmluZzsgcGF5bG9hZDogdW5kZWZpbmVkIH0gOlxuICBDIGV4dGVuZHMge1xuICAgIChwYXlsb2FkOiBpbmZlciBQKTogYW55O1xuICAgIHR5cGU6IHN0cmluZztcbiAgfSA/IHt0eXBlOiBzdHJpbmc7IHBheWxvYWQ6IFB9IDpcbiAgQyBleHRlbmRzIHtcbiAgICAoLi4uYXJnczogaW5mZXIgTSk6IGFueTtcbiAgICB0eXBlOiBzdHJpbmc7XG4gIH0gPyB7dHlwZTogc3RyaW5nOyBwYXlsb2FkOiBNfSA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgT2ZQYXlsb2FkQWN0aW9uRm4ge1xuICA8Qz4oYWN0aW9uQ3JlYXRvcnM6IEMpOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgQWN0aW9uT2ZDcmVhdG9yPEM+PjtcbiAgPEMxLCBDMj4oYWN0aW9uQ3JlYXRvcnM6IEMxLCBhY3Rpb25DcmVhdG9yczE6IEMyKTpcbiAgICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSAsIEFjdGlvbk9mQ3JlYXRvcjxDMT4gfCBBY3Rpb25PZkNyZWF0b3I8QzI+PjtcbiAgPEMxLCBDMiwgQzM+KGFjdGlvbkNyZWF0b3JzOiBDMSwgYWN0aW9uQ3JlYXRvcnMxOiBDMiwgYWN0aW9uQ3JlYXRvcnMyOiBDMyk6XG4gICAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIEFjdGlvbk9mQ3JlYXRvcjxDMT4gfCBBY3Rpb25PZkNyZWF0b3I8QzI+IHwgQWN0aW9uT2ZDcmVhdG9yPEMzPj47XG4gICguLi5hY3Rpb25DcmVhdG9yczoge3R5cGU6IHN0cmluZ31bXSk6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCB7dHlwZTogc3RyaW5nOyBwYXlsb2FkPzogdW5rbm93bn0+O1xufVxuXG5leHBvcnQgY29uc3Qgb2ZQYXlsb2FkQWN0aW9uOiBPZlBheWxvYWRBY3Rpb25GbiA9IChcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IHt0eXBlOiBzdHJpbmd9W10pID0+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTx7dHlwZTogc3RyaW5nfT4pIHtcbiAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbkNyZWF0b3JzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IGFjLnR5cGUpKVxuICAgICk7XG4gIH07XG59O1xuXG50eXBlIEFjdGlvbkJ5VHlwZTxTLCBSPiA9IHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxTLCBSPltLXT59O1xuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpcmUgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25zPFMsIFI+LFxuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj4pOiBBY3Rpb25CeVR5cGU8UywgUj4ge1xuXG4gIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShvcC5zaGFyZSgpKTtcbiAgY29uc3Qgc3BsaXRBY3Rpb25zID0ge30gYXMgQWN0aW9uQnlUeXBlPFMsIFI+O1xuXG4gIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpIGFzIChrZXlvZiBSKVtdKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNwbGl0QWN0aW9ucywgcmVkdWNlck5hbWUsIHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnRcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5waXBlKG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzcGxpdEFjdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FjdGlvbk9mQ3JlYXRvcjxDIGV4dGVuZHMge3R5cGU6IHN0cmluZ30+KGFjdGlvbjogYW55LCBhY3Rpb25DcmVhdG9yOiBDKTpcbiAgYWN0aW9uIGlzIEFjdGlvbk9mQ3JlYXRvcjxDPiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgcmV0dXJuIGFjdGlvbi50eXBlID09PSBhY3Rpb25DcmVhdG9yLnR5cGU7XG59XG5cbmNvbnN0IHNsaWNlQ291bnQ0TmFtZToge1tuYW1lOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2VPcHRpb25zPFJTLCBSIGV4dGVuZHMgUmVkdWNlcnM8UlM+LCBTIGV4dGVuZHMgUlMgPSBSUz4ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGluaXRpYWxTdGF0ZTogUztcbiAgcmVkdWNlcnM6IFI7XG4gIC8qKiBHZW5lcmF0ZSB1bmlxdWUgSUQgYXMgcGFydCBvZiBzbGljZSdzIG5hbWUsIGRlZmF1bHQ6IHRydWUgKi9cbiAgZ2VuZXJhdGVJZD86IGJvb2xlYW47XG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgZGVidWdBY3Rpb25Pbmx5PzogYm9vbGVhbjtcbiAgcm9vdFN0b3JlPzogcnguQmVoYXZpb3JTdWJqZWN0PHtbazogc3RyaW5nXTogU30+O1xufVxuXG4vKipcbiAqIFJlZHVjZXJzIGFuZCBpbml0aWFsU3RhdGUgYXJlIHJldXNlZCBjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRcbiAqIFxuICogIFNsaWNlIC0tLSBDb21wb25lbnQgaW5zdGFuY2UgKHN0YXRlLCBhY3Rpb25zKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2U8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihvcHQ6IFNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlPFMsIFI+IHtcbiAgbGV0IG5hbWUgPSBvcHQubmFtZTtcbiAgaWYgKG9wdC5nZW5lcmF0ZUlkID09PSB1bmRlZmluZWQgfHwgb3B0LmdlbmVyYXRlSWQgPT09IHRydWUpIHtcbiAgICBpZiAoc2xpY2VDb3VudDROYW1lW25hbWVdID09IG51bGwpIHtcbiAgICAgIHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9IDA7XG4gICAgfVxuICAgIG9wdC5uYW1lID0gbmFtZSA9IG5hbWUgKyAnLicgKyAoKytzbGljZUNvdW50NE5hbWVbbmFtZV0pO1xuICB9XG4gIGNvbnN0IGFjdGlvbkNyZWF0b3JzID0ge30gYXMgQWN0aW9uczxTLCBSPjtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG5cbiAgZm9yIChjb25zdCBba2V5LCByZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhvcHQucmVkdWNlcnMpKSB7XG4gICAgY29uc3QgdHlwZSA9IG5hbWUgKyAnLycgKyBrZXk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGNvbnN0IGNyZWF0b3IgPSAoKHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0ge1xuICAgICAgICB0eXBlLFxuICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLmxlbmd0aCA9PT0gMCA/IHVuZGVmaW5lZCA6XG4gICAgICAgICAgcGF5bG9hZC5sZW5ndGggPT09IDEgPyBwYXlsb2FkWzBdIDpcbiAgICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgIHJlZHVjZXJcbiAgICAgIH07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvcjtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgoLi4ucGF5bG9hZDogYW55W10pID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgY29uc3QgYWN0aW9uID0gY3JlYXRvcihwYXlsb2FkKTtcbiAgICAgIGRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm5cbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0udHlwZSA9IGNyZWF0b3IudHlwZTtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Uz4ob3B0LmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHVucHJvY2Vzc2VkQWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuXG4gIGZ1bmN0aW9uIG9mVHlwZTxUIGV4dGVuZHMga2V5b2YgUj4oXG4gICAgLi4uYWN0aW9uVHlwZXM6IFRbXSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvblR5cGVzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IG5hbWUgKyAnLycgKyBhYykpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pIHtcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgbGV0IGFjdGlvbkNvdW50ID0gMDtcbiAgbGV0IGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgLy8gVG8gd2FybiBkZXZlbG9wZXIgdGhhdCBubyBhY3Rpb24gZGlzcGF0Y2hpbmcgc2hvdWQgYmUgY2FsbGVkIGluc2lkZSBhIHJlZHVjZXIsIHRoaXMgaXMgc2lkZS1lZmZlY3RzIGFuZCBcbiAgLy8gd2lsbCBsZWFkcyB0byByZWN1cnNpdmUgcmVkdWNlclxuICBsZXQgaW5SZWR1Y2VyID0gZmFsc2U7XG4gIGNvbnN0IGludGVyY2VwdG9yJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8cnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4sIFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4+KFxuICAgIGlucHV0ID0+IGlucHV0XG4gICk7XG5cbiAgY29uc3Qgc3ViID0gcngubWVyZ2UoXG4gICAgaW50ZXJjZXB0b3IkLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoaW50ZXJjZXB0b3IgPT4gdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICAgIC8vIG9wLm9ic2VydmVPbihyeC5xdWV1ZVNjaGVkdWxlciksIC8vIEF2b2lkIHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIGFjdGlvbiBpbnNpZGUgYW4gcmVkdWNlciwgYnV0IG5vcm1hbGx5IHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIHNob3VsZCBiZSB3YXJuZWQgYW5kIGZvcmJpZGRlblxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgICBpZiAob3B0LmRlYnVnIHx8IG9wdC5kZWJ1Z0FjdGlvbk9ubHkpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDphY3Rpb24gYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2ZhZTRmYzsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgaW50ZXJjZXB0b3IsXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICAgIGlmIChhY3Rpb24ucmVkdWNlcikge1xuICAgICAgICAgICAgY29uc3QgY3VyclN0YXRlID0gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpblJlZHVjZXIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5SZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBuZXdTdGF0ZTogUyB8IHZvaWQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkO1xuICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBBcnJheS5pc0FycmF5KHBheWxvYWQpID8gcGF5bG9hZCA6IFtwYXlsb2FkXTtcbiAgICAgICAgICAgICAgbmV3U3RhdGUgPSBhY3Rpb24ucmVkdWNlcihzaGFsbG93Q29waWVkLCAuLi5wYXJhbXMpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgLy8gZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1N0YXRlID8gbmV3U3RhdGUgOiBzaGFsbG93Q29waWVkO1xuICAgICAgICAgICAgc3RhdGUkLm5leHQoY2hhbmdlZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFjdGlvbiQubmV4dChhY3Rpb24pO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdyZWR1Y2VyIGVycm9yJyxcbiAgICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgICAgfSlcbiAgICAgICkpXG4gICAgKSxcblxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICApIDogcnguRU1QVFlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGRpc3BhdGNoKHtcbiAgICAgIHR5cGU6ICdfX09uRGVzdHJveSdcbiAgICB9KTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKHNsaWNlLCBvZlR5cGUgYXMgT2ZUeXBlRm48UywgUj4pO1xuICAgICAgICAgIGlmIChlcGljKVxuICAgICAgICAgICAgcmV0dXJuIGVwaWMoYWN0aW9uJCwgc3RhdGUkKS5waXBlKFxuICAgICAgICAgICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ0VwaWMgZXJyb3InLFxuICAgICAgICAgICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbCh1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSkpLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiBkaXNwYXRjaChhY3Rpb24pKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdFcGljcyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBzbGljZTogU2xpY2U8UywgUj4gPSB7XG4gICAgbmFtZSxcbiAgICBzdGF0ZSQsXG4gICAgYWN0aW9uJCxcbiAgICBhY3Rpb24kQnlUeXBlOiBjYXN0QnlBY3Rpb25UeXBlKGFjdGlvbkNyZWF0b3JzLCBhY3Rpb24kKSxcbiAgICBhY3Rpb25zOiBhY3Rpb25DcmVhdG9ycyxcbiAgICBkaXNwYXRjaCxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGRlc3Ryb3ksXG4gICAgZGVzdHJveSQ6IHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSxcbiAgICBlcGljKGVwaWM6IEVwaWM8Uz4pIHtcbiAgICAgIGNvbnN0IGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPiA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIGVwaWM7XG4gICAgICB9O1xuICAgICAgYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIHNldEFjdGlvbkludGVyY2VwdG9yKGludGVjOiByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPiwgUGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pikge1xuICAgICAgaW50ZXJjZXB0b3IkLm5leHQoaW50ZWMpO1xuICAgIH0sXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGUkO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICBpZiAoZXhlY3V0aW5nUmVkdWNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvIGJlIGNvbnNpc3RlbnQgd2l0aCBSZWR1eFxcJ3MgYmVoYXZpb3VyLCBzbGljZS5nZXRTdGF0ZSgpIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGludm9rZWQgaW5zaWRlIGEgcmVkdWNlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHNsaWNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LFxuICBUIGV4dGVuZHMga2V5b2YgUj4oXG4gIHNsaWNlOiBTbGljZTxTLCBSPixcbiAgYWN0aW9uVHlwZTogVCkge1xuXG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8ge3R5cGU6IFR9IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgcDogaW5mZXIgUCkgPT4gYW55ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDogbmV2ZXI+KHN1YiA9PiB7XG4gICAgICBzbGljZS5hZGRFcGljKHNsaWNlID0+IChhY3Rpb24kKSA9PiB7XG4gICAgICAgIHJldHVybiBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnNbYWN0aW9uVHlwZV0pLFxuICAgICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEBkZXByZWNhdGVkIHVzZSBTbGljZVsnYWN0aW9uJEJ5VHlwZSddIGluc3RlYWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRCeVR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihzbGljZTogU2xpY2U8UywgUj4pIHtcbiAgcmV0dXJuIGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgc2xpY2UuYWN0aW9uJCk7XG59XG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2Uoe1xuICBuYW1lOiAnZGVtbycsXG4gIGluaXRpYWxTdGF0ZToge30gYXMge29rPzogYm9vbGVhbjsgZXJyb3I/OiBFcnJvcn0sXG4gIHJlZHVjZXJzOiB7XG4gICAgaGVsbG93KHMsIGdyZWV0aW5nOiB7ZGF0YTogc3RyaW5nfSkge30sXG4gICAgd29ybGQocykge30sXG4gICAgbXVsdGlQYXlsb2FkUmVkdWNlcihzLCBhcmcxOiBzdHJpbmcsIGFyZzI6IG51bWJlcikge31cbiAgfVxufSk7XG5kZW1vU2xpY2UuYWRkRXBpYygoc2xpY2UsIG9mVHlwZSkgPT4ge1xuICByZXR1cm4gKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuYWJjKCk7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uU3RyZWFtcy5oZWxsb3cucGlwZSgpLFxuICAgICAgYWN0aW9uU3RyZWFtcy5tdWx0aVBheWxvYWRSZWR1Y2VyLnBpcGUoKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdoZWxsb3cnLCAnaGVsbG93JyksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9ucy53b3JsZCgpKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCd3b3JsZCcpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaGVsbG93KSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB0eXBlb2YgYWN0aW9uLnBheWxvYWQuZGF0YSA9PT0gJ3N0cmluZycpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3csIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkIClcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLm11bHRpUGF5bG9hZFJlZHVjZXIpLFxuICAgICAgICBvcC50YXAoKHtwYXlsb2FkOiBbYTEsIGEyXX0pID0+IGFsZXJ0KGExKSlcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ2hlbGxvdycpLnBpcGUob3AudGFwKGFjdGlvbiA9PiBhY3Rpb24pKTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ3dvcmxkJykucGlwZShvcC50YXAoYWN0aW9uID0+IGFjdGlvbikpO1xuIl19