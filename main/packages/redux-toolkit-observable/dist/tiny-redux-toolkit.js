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
exports.sliceRefActionOp = exports.action$ByType = exports.action$OfSlice = exports.createSlice = exports.isActionOfCreator = exports.castByActionType = exports.ofPayloadAction = void 0;
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
        setActionInterceptor(intec) { },
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
        world(s) { }
    }
});
demoSlice.addEpic((slice, ofType) => {
    return (action$, state$) => {
        const actionStreams = castByActionType(slice.actions, action$);
        // slice.actionDispatcher.abc();
        return rx.merge(actionStreams.hellow.pipe(), action$.pipe(ofType('hellow', 'hellow'), op.map(action => slice.actions.world())), action$.pipe(ofType('world'), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe((0, exports.ofPayloadAction)(slice.actions.hellow), op.tap(action => typeof action.payload.data === 'string')), action$.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        (0, exports.ofPayloadAction)(slice.actions.world), op.tap(action => slice.actionDispatcher.hellow({ data: 'yes' }))), action$.pipe((0, exports.ofPayloadAction)(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(action => action.payload))).pipe(op.ignoreElements());
    };
});
action$OfSlice(demoSlice, 'hellow').pipe(op.tap(action => action));
action$OfSlice(demoSlice, 'world').pipe(op.tap(action => action));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7R0FRRztBQUNILHlDQUEyQjtBQUMzQixtREFBcUM7QUEySDlCLE1BQU0sZUFBZSxHQUFzQixDQUNoRCxHQUFHLGNBQWdDLEVBQUUsRUFBRTtJQUN2QyxPQUFPLFVBQVMsR0FBa0M7UUFDaEQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDeEUsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQVBXLFFBQUEsZUFBZSxtQkFPMUI7QUFHRjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUVwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sWUFBWSxHQUFHLEVBQXdCLENBQUM7SUFFOUMsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBZ0IsRUFBRTtRQUNwRSxNQUFNLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUU7WUFDL0MsR0FBRztnQkFDRCxpRUFBaUU7Z0JBQ2pFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFBLHVCQUFlLEVBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0tBQ0o7SUFF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QyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDbkUsY0FBYyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoaXMgZmlsZSBwcm92aWRlIHNvbWUgaG9va3Mgd2hpY2ggbGV2ZXJhZ2VzIFJ4SlMgdG8gbWltaWMgUmVkdXgtdG9vbGtpdCArIFJlZHV4LW9ic2VydmFibGVcbiAqIHdoaWNoIGlzIHN1cHBvc2VkIHRvIGJlIHVzZWQgaW5kZXBlbmRlbnRseSB3aXRoaW4gYW55IFJlYWN0IGNvbXBvbmVudCBpbiBjYXNlIHlvdXIgY29tcG9uZW50IGhhcyBcbiAqIGNvbXBsaWNhdGVkIGFzeW5jIHN0YXRlIGNoYW5nZSBsb2dpYy5cbiAqIFxuICogLSBpdCBpcyBzbWFsbCBhbmQgc3VwcG9zZWQgdG8gYmUgd2VsbCBwZXJmb3JtZWRcbiAqIC0gaXQgZG9lcyBub3QgdXNlIEltbWVySlMsIHlvdSBzaG91bGQgdGFrZSBjYXJlIG9mIGltbXV0YWJpbGl0eSBvZiBzdGF0ZSBieSB5b3Vyc2VsZlxuICogLSBiZWNhdXNlIHRoZXJlIGlzIG5vIEltbWVySlMsIHlvdSBjYW4gcHV0IGFueSB0eXBlIG9mIE9iamVjdCBpbiBzdGF0ZSBpbmNsdWRpbmcgdGhvc2UgYXJlIG5vdCBmcmllbmRseSBieSBJbW1lckpTXG4gKi9cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb248Uz4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHJlZHVjZXI/KG9sZDogUyk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBheWxvYWRBY3Rpb248UywgUCA9IGFueT4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFA7XG4gIHJlZHVjZXI/KG9sZDogUywgcGF5bG9hZDogUCk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyczxTLCBSID0gYW55PiA9IHtcbiAgLyoqIFJldHVybmluZyBgdW5kZWZpbmVkIC8gdm9pZGAgaGFzIHNhbWUgZWZmZWN0IG9mIHJldHVybmluZyBvbGQgc3RhdGUgcmVmZXJlbmNlLFxuICAgKiBSZXR1cm5pbmcgYSBicmFuZCBuZXcgc3RhdGUgb2JqZWN0IGZvciBpbW11dGFiaWxpdHkgaW4gbm9ybWFsIGNhc2UuXG4gICAqL1xuICBbSyBpbiBrZXlvZiBSXTogKHN0YXRlOiBTLCAuLi5wYXlsb2FkOiBhbnlbXSkgPT4gUyB8IHZvaWQ7XG59O1xuXG5leHBvcnQgdHlwZSBBY3Rpb25zPFMsIFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IHtcbiAgICAgICgpOiBBY3Rpb25UeXBlczxTLCBSPltLXTtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICB9IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IHtcbiAgICAgIChwYXlsb2FkOiBQKTogQWN0aW9uVHlwZXM8UywgUj5bS107XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgfSA6XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCAuLi5wYXlsb2FkOiBpbmZlciBNKSA9PiBhbnkgPyB7XG4gICAgICAoLi4ucGF5bG9hZDogTSk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH0gOiB7XG4gICAgICAoKTogQWN0aW9uVHlwZXM8UywgUj5bS107XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgfTtcbn07XG5cbnR5cGUgQWN0aW9uVHlwZXM8UywgUj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+OlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBQPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCAuLi5wYXlsb2FkOiBpbmZlciBNKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIE0+IDpcbiAgICBQYXlsb2FkQWN0aW9uPFMsIHVua25vd24+O1xufTtcblxudHlwZSBPdXRwdXRBY3Rpb25PYnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPGFueT4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9XG4gIHJ4Lk9ic2VydmFibGU8UltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyBBY3Rpb248Uz4gOiBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgUD4gOiBQYXlsb2FkQWN0aW9uPFMsIHVua25vd24+PjtcbiAgLy8gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgUGFyYW1ldGVyczxSW0tdPlsxXSBleHRlbmRzIHVuZGVmaW5lZCA/IHZvaWQgOiBQYXJhbWV0ZXJzPFJbS10+WzFdLCBLPj47XG5cbnR5cGUgT2ZUeXBlUGlwZU9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgSyBleHRlbmRzIGtleW9mIFI+ID0gKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PikgPT4gT3V0cHV0QWN0aW9uT2JzPFMsIFIsIEs+O1xuXG4vKiogc2FtZSBhcyBvZlBheWxvYWRBY3Rpb24oKSAsIHRvIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUsIHVubGlrZSBvZlBheWxvYWRBY3Rpb24oKSwgcGFyYW1ldGVyIGlzIGEgc3RyaW5nIGluc3RlYWQgb2YgYWN0aW9uQ3JlYXRvciAqL1xuZXhwb3J0IGludGVyZmFjZSBPZlR5cGVGbjxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzE+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMj47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUiwgSzMgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyLCBhY3Rpb25UeXBlMzogSzMpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMiB8IEszPjtcbiAgPEsgZXh0ZW5kcyBrZXlvZiBSPiguLi5hY3Rpb25UeXBlczogS1tdKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEs+O1xufVxuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZTxTLCBSPiwgb2ZUeXBlOiBPZlR5cGVGbjxTLCBSPikgPT4gRXBpYzxTPiB8IHZvaWQ7XG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmcgfCBudW1iZXI7XG4gIHN0YXRlJDogcnguQmVoYXZpb3JTdWJqZWN0PFM+O1xuICAvKiogQWN0aW9uIGNyZWF0b3IgZnVuY3Rpb25zICovXG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+PjtcbiAgYWN0aW9uJEJ5VHlwZTogQWN0aW9uQnlUeXBlPFMsIFI+O1xuICBkaXNwYXRjaDogKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikgPT4gdm9pZDtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyBib3VuZCB3aXRoIGRpc3BhdGNoZXIgKi9cbiAgYWN0aW9uRGlzcGF0Y2hlcjogQWN0aW9uczxTLCBSPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyAqL1xuICBhY3Rpb25zOiBBY3Rpb25zPFMsIFI+O1xuICBkZXN0cm95OiAoKSA9PiB2b2lkO1xuICBkZXN0cm95JDogcnguT2JzZXJ2YWJsZTxhbnk+O1xuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBlcGljIHRoZSBcIkVwaWNcIiBzdHJlYW0gb2YgYWN0aW9ucy1pbiwgYWN0aW9ucy1vdXQsIHJlZmVyIHRvIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvZG9jcy9iYXNpY3MvRXBpY3MuaHRtbFxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIGRlc3RvcnkgKHN1YnNjcmliZSBmcm9tKSBlcGljXG4gICAqL1xuICBlcGljKGVwaWM6IEVwaWM8Uz4pOiB2b2lkO1xuICAvKipcbiAgICogZXBpYyhlcGljKSBpcyByZWNvbW1lbmRlZCB0byBiZSB1c2VkIGluc3RlYWQgb2YgYWRkRXBpYygpLCBpdCBoYXMgY29uY2lzZXIgbWV0aG9kIHNpZ25hdHVyZS5cbiAgICogQHBhcmFtIGVwaWNGYWN0b3J5IGEgZmFjdG9yeSBmdW5jdGlvbiB3aGljaCBjcmVhdGVzIHRoZSBcIkVwaWNcIiAoc3RyZWFtIG9mIGFjdGlvbnMtaW4gYW5kIGFjdGlvbnMtb3V0LFxuICAgKiAgcmVmZXIgdG8gaHR0cHM6Ly9yZWR1eC1vYnNlcnZhYmxlLmpzLm9yZy9kb2NzL2Jhc2ljcy9FcGljcy5odG1sKVxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHJlbW92ZS91bnN1YnNjcmliZSB0aGlzIGVwaWNcbiAgICovXG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgLyoqXG4gICAqIE1vc3Qgb2YgdGhlIHRpbWUgeW91IGp1c3QgbmVlZCBlcGljKGVwaWMpLCB0aGlzIG1ldGhvZCBpcyBjb252ZW5pZW50IGluIGNhc2Ugb2YgY29uc3RhbnRseSBcImFkZGluZ1wiXG4gICAqIG5ldyBlcGljIGFmdGVyIFwidW5zdWJzY3JpYmVcIiBmcm9tIHByZWNlZGluZyBvbGQgZXBpY1xuICAgKiBAcGFyYW0gZXBpY0ZhY3RvcnkkIHRoaXMgb2JzZXJ2YWJsZSB3aWxsIGJlIFwic3dpdGNoTWFwKClcImVkIGluIGEgcGlwZWxpbmVcbiAgICovXG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZ2V0U3RvcmUoKTogcnguT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbiAgLyoqIHVuLXByb2Nlc3NlZCBhY3Rpb25zIGdvIHRocm91Z2ggdGhpcyBvcGVyYXRvciAqL1xuICBzZXRBY3Rpb25JbnRlcmNlcHRvcihpbnRlYzogcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4sIFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4pOiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBFcGljPFMsIEEkID0gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+PiA9IChhY3Rpb25zOiBBJCwgc3RhdGVzOiByeC5CZWhhdmlvclN1YmplY3Q8Uz4pID0+IEEkO1xuXG50eXBlIEFjdGlvbk9mQ3JlYXRvcjxDPiA9IEMgZXh0ZW5kcyB7XG4gICgpOiBhbnk7XG4gIHR5cGU6IHN0cmluZztcbn0gPyB7IHR5cGU6IHN0cmluZzsgcGF5bG9hZDogdW5kZWZpbmVkIH0gOlxuICBDIGV4dGVuZHMge1xuICAgIChwYXlsb2FkOiBpbmZlciBQKTogYW55O1xuICAgIHR5cGU6IHN0cmluZztcbiAgfSA/IHt0eXBlOiBzdHJpbmc7IHBheWxvYWQ6IFB9IDpcbiAgQyBleHRlbmRzIHtcbiAgICAoLi4uYXJnczogaW5mZXIgTSk6IGFueTtcbiAgICB0eXBlOiBzdHJpbmc7XG4gIH0gPyB7dHlwZTogc3RyaW5nOyBwYXlsb2FkOiBNfSA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgT2ZQYXlsb2FkQWN0aW9uRm4ge1xuICA8Qz4oYWN0aW9uQ3JlYXRvcnM6IEMpOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgQWN0aW9uT2ZDcmVhdG9yPEM+PjtcbiAgPEMxLCBDMj4oYWN0aW9uQ3JlYXRvcnM6IEMxLCBhY3Rpb25DcmVhdG9yczE6IEMyKTpcbiAgICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSAsIEFjdGlvbk9mQ3JlYXRvcjxDMT4gfCBBY3Rpb25PZkNyZWF0b3I8QzI+PjtcbiAgPEMxLCBDMiwgQzM+KGFjdGlvbkNyZWF0b3JzOiBDMSwgYWN0aW9uQ3JlYXRvcnMxOiBDMiwgYWN0aW9uQ3JlYXRvcnMyOiBDMyk6XG4gICAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIEFjdGlvbk9mQ3JlYXRvcjxDMT4gfCBBY3Rpb25PZkNyZWF0b3I8QzI+IHwgQWN0aW9uT2ZDcmVhdG9yPEMzPj47XG4gICguLi5hY3Rpb25DcmVhdG9yczoge3R5cGU6IHN0cmluZ31bXSk6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCB7dHlwZTogc3RyaW5nOyBwYXlsb2FkPzogdW5rbm93bn0+O1xufVxuXG5leHBvcnQgY29uc3Qgb2ZQYXlsb2FkQWN0aW9uOiBPZlBheWxvYWRBY3Rpb25GbiA9IChcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IHt0eXBlOiBzdHJpbmd9W10pID0+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTx7dHlwZTogc3RyaW5nfT4pIHtcbiAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbkNyZWF0b3JzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IGFjLnR5cGUpKVxuICAgICk7XG4gIH07XG59O1xuXG50eXBlIEFjdGlvbkJ5VHlwZTxTLCBSPiA9IHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxTLCBSPltLXT59O1xuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpcmUgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25zPFMsIFI+LFxuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj4pOiBBY3Rpb25CeVR5cGU8UywgUj4ge1xuXG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKG9wLnNoYXJlKCkpO1xuICAgIGNvbnN0IHNwbGl0QWN0aW9ucyA9IHt9IGFzIEFjdGlvbkJ5VHlwZTxTLCBSPjtcblxuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpIGFzIChrZXlvZiBSKVtdKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3BsaXRBY3Rpb25zLCByZWR1Y2VyTmFtZSwge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnRcbiAgICAgICAgICByZXR1cm4gc291cmNlLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBY3Rpb25PZkNyZWF0b3I8QyBleHRlbmRzIHt0eXBlOiBzdHJpbmd9PihhY3Rpb246IGFueSwgYWN0aW9uQ3JlYXRvcjogQyk6XG4gIGFjdGlvbiBpcyBBY3Rpb25PZkNyZWF0b3I8Qz4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gIHJldHVybiBhY3Rpb24udHlwZSA9PT0gYWN0aW9uQ3JlYXRvci50eXBlO1xufVxuXG5jb25zdCBzbGljZUNvdW50NE5hbWU6IHtbbmFtZTogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlT3B0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nO1xuICBpbml0aWFsU3RhdGU6IFM7XG4gIHJlZHVjZXJzOiBSO1xuICAvKiogR2VuZXJhdGUgdW5pcXVlIElEIGFzIHBhcnQgb2Ygc2xpY2UncyBuYW1lLCBkZWZhdWx0OiB0cnVlICovXG4gIGdlbmVyYXRlSWQ/OiBib29sZWFuO1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIGRlYnVnQWN0aW9uT25seT86IGJvb2xlYW47XG4gIHJvb3RTdG9yZT86IHJ4LkJlaGF2aW9yU3ViamVjdDx7W2s6IHN0cmluZ106IFN9Pjtcbn1cblxuLyoqXG4gKiBSZWR1Y2VycyBhbmQgaW5pdGlhbFN0YXRlIGFyZSByZXVzZWQgY3Jvc3MgbXVsdGlwbGUgY29tcG9uZW50XG4gKiBcbiAqICBTbGljZSAtLS0gQ29tcG9uZW50IGluc3RhbmNlIChzdGF0ZSwgYWN0aW9ucylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlPFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ob3B0OiBTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZTxTLCBSPiB7XG4gIGxldCBuYW1lID0gb3B0Lm5hbWU7XG4gIGlmIChvcHQuZ2VuZXJhdGVJZCA9PT0gdW5kZWZpbmVkIHx8IG9wdC5nZW5lcmF0ZUlkID09PSB0cnVlKSB7XG4gICAgaWYgKHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9PSBudWxsKSB7XG4gICAgICBzbGljZUNvdW50NE5hbWVbbmFtZV0gPSAwO1xuICAgIH1cbiAgICBvcHQubmFtZSA9IG5hbWUgPSBuYW1lICsgJy4nICsgKCsrc2xpY2VDb3VudDROYW1lW25hbWVdKTtcbiAgfVxuICBjb25zdCBhY3Rpb25DcmVhdG9ycyA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuXG4gIGZvciAoY29uc3QgW2tleSwgcmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMob3B0LnJlZHVjZXJzKSkge1xuICAgIGNvbnN0IHR5cGUgPSBuYW1lICsgJy8nICsga2V5O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBjb25zdCBjcmVhdG9yID0gKCguLi5wYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgcGF5bG9hZDogcGF5bG9hZC5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOlxuICAgICAgICAgIHBheWxvYWQubGVuZ3RoID09PSAxID8gcGF5bG9hZFswXSA6XG4gICAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgcmVkdWNlclxuICAgICAgfTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBjcmVhdG9yLnR5cGUgPSB0eXBlO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25DcmVhdG9yc1trZXkgYXMga2V5b2YgUl0gPSBjcmVhdG9yO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdID0gKChwYXlsb2FkPzogYW55KSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgIGNvbnN0IGFjdGlvbiA9IGNyZWF0b3IocGF5bG9hZCk7XG4gICAgICBkaXNwYXRjaChhY3Rpb24pO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdLnR5cGUgPSBjcmVhdG9yLnR5cGU7XG4gIH1cblxuICBjb25zdCBzdGF0ZSQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PFM+KG9wdC5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB1bnByb2Nlc3NlZEFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuICBjb25zdCBhY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcblxuICBmdW5jdGlvbiBvZlR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4oXG4gICAgLi4uYWN0aW9uVHlwZXM6IFRbXSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvblR5cGVzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IG5hbWUgKyAnLycgKyBhYykpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pIHtcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgbGV0IGFjdGlvbkNvdW50ID0gMDtcbiAgbGV0IGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgLy8gVG8gd2FybiBkZXZlbG9wZXIgdGhhdCBubyBhY3Rpb24gZGlzcGF0Y2hpbmcgc2hvdWQgYmUgY2FsbGVkIGluc2lkZSBhIHJlZHVjZXIsIHRoaXMgaXMgc2lkZS1lZmZlY3RzIGFuZCBcbiAgLy8gd2lsbCBsZWFkcyB0byByZWN1cnNpdmUgcmVkdWNlclxuICBsZXQgaW5SZWR1Y2VyID0gZmFsc2U7XG4gIGNvbnN0IGludGVyY2VwdG9yJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8cnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4sIFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4+KFxuICAgIGlucHV0ID0+IGlucHV0XG4gICk7XG5cbiAgY29uc3Qgc3ViID0gcngubWVyZ2UoXG4gICAgaW50ZXJjZXB0b3IkLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoaW50ZXJjZXB0b3IgPT4gdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICAgIC8vIG9wLm9ic2VydmVPbihyeC5xdWV1ZVNjaGVkdWxlciksIC8vIEF2b2lkIHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIGFjdGlvbiBpbnNpZGUgYW4gcmVkdWNlciwgYnV0IG5vcm1hbGx5IHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIHNob3VsZCBiZSB3YXJuZWQgYW5kIGZvcmJpZGRlblxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgICBpZiAob3B0LmRlYnVnIHx8IG9wdC5kZWJ1Z0FjdGlvbk9ubHkpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDphY3Rpb24gYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2ZhZTRmYzsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgaW50ZXJjZXB0b3IsXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICAgIGlmIChhY3Rpb24ucmVkdWNlcikge1xuICAgICAgICAgICAgY29uc3QgY3VyclN0YXRlID0gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpblJlZHVjZXIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5SZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBuZXdTdGF0ZTogUyB8IHZvaWQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBuZXdTdGF0ZSA9IGFjdGlvbi5yZWR1Y2VyKHNoYWxsb3dDb3BpZWQsIChhY3Rpb24gYXMgUGF5bG9hZEFjdGlvbjxTPikucGF5bG9hZCk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gbmV3U3RhdGUgPyBuZXdTdGF0ZSA6IHNoYWxsb3dDb3BpZWQ7XG4gICAgICAgICAgICBzdGF0ZSQubmV4dChjaGFuZ2VkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ3JlZHVjZXIgZXJyb3InLFxuICAgICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgICB9KVxuICAgICAgKSlcbiAgICApLFxuXG4gICAgc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDpzdGF0ZSBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZTk4ZGY1OycsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIG9wdC5yb290U3RvcmUgPyBzdGF0ZSQucGlwZShcbiAgICAgIG9wLnRhcChzdGF0ZSA9PiBvcHQucm9vdFN0b3JlIS5uZXh0KHsuLi5vcHQucm9vdFN0b3JlPy5nZXRWYWx1ZSgpLCBbb3B0Lm5hbWVdOiBzdGF0ZX0pKVxuICAgICApIDogcnguRU1QVFlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGRpc3BhdGNoKHtcbiAgICAgIHR5cGU6ICdfX09uRGVzdHJveSdcbiAgICB9KTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKHNsaWNlLCBvZlR5cGUgYXMgT2ZUeXBlRm48UywgUj4pO1xuICAgICAgICAgIGlmIChlcGljKVxuICAgICAgICAgICAgcmV0dXJuIGVwaWMoYWN0aW9uJCwgc3RhdGUkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbCh1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSkpLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiBkaXNwYXRjaChhY3Rpb24pKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdlcGljIGVycm9yJyxcbiAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGNvbnN0IHNsaWNlOiBTbGljZTxTLCBSPiA9IHtcbiAgICBuYW1lLFxuICAgIHN0YXRlJCxcbiAgICBhY3Rpb24kLFxuICAgIGFjdGlvbiRCeVR5cGU6IGNhc3RCeUFjdGlvblR5cGUoYWN0aW9uQ3JlYXRvcnMsIGFjdGlvbiQpLFxuICAgIGFjdGlvbnM6IGFjdGlvbkNyZWF0b3JzLFxuICAgIGRpc3BhdGNoLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgZGVzdHJveSxcbiAgICBkZXN0cm95JDogdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpLFxuICAgIGVwaWMoZXBpYzogRXBpYzxTPikge1xuICAgICAgY29uc3QgZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gZXBpYztcbiAgICAgIH07XG4gICAgICBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgc2V0QWN0aW9uSW50ZXJjZXB0b3IoaW50ZWM6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+LCBQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+KSB7fSxcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKHJ4Lm9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZSQ7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIGlmIChleGVjdXRpbmdSZWR1Y2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG8gYmUgY29uc2lzdGVudCB3aXRoIFJlZHV4XFwncyBiZWhhdmlvdXIsIHNsaWNlLmdldFN0YXRlKCkgaXMgbm90IGFsbG93ZWQgdG8gYmUgaW52b2tlZCBpbnNpZGUgYSByZWR1Y2VyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gc2xpY2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kT2ZTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sXG4gIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgc2xpY2U6IFNsaWNlPFMsIFI+LFxuICBhY3Rpb25UeXBlOiBUKSB7XG5cbiAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPFJbVF0gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyB7dHlwZTogVH0gOlxuICAgIFJbVF0gZXh0ZW5kcyAoczogYW55LCBwOiBpbmZlciBQKSA9PiBhbnkgPyB7cGF5bG9hZDogUDsgdHlwZTogVH0gOiBuZXZlcj4oc3ViID0+IHtcbiAgICBzbGljZS5hZGRFcGljKHNsaWNlID0+IChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uc1thY3Rpb25UeXBlXSksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc3ViLm5leHQoYWN0aW9uIGFzIGFueSkpLFxuICAgICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbiRCeVR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihzbGljZTogU2xpY2U8UywgUj4pIHtcbiAgcmV0dXJuIGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgc2xpY2UuYWN0aW9uJCk7XG59XG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG4gZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlKHtcbiAgbmFtZTogJ2RlbW8nLFxuICBpbml0aWFsU3RhdGU6IHt9IGFzIHtvaz86IGJvb2xlYW47IGVycm9yPzogRXJyb3J9LFxuICByZWR1Y2Vyczoge1xuICAgIGhlbGxvdyhzLCBncmVldGluZzoge2RhdGE6IHN0cmluZ30pIHt9LFxuICAgIHdvcmxkKHMpIHt9XG4gIH1cbn0pO1xuZGVtb1NsaWNlLmFkZEVwaWMoKHNsaWNlLCBvZlR5cGUpID0+IHtcbiAgcmV0dXJuIChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgICBjb25zdCBhY3Rpb25TdHJlYW1zID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgICAvLyBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmFiYygpO1xuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvblN0cmVhbXMuaGVsbG93LnBpcGUoKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdoZWxsb3cnLCAnaGVsbG93JyksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9ucy53b3JsZCgpKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCd3b3JsZCcpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaGVsbG93KSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB0eXBlb2YgYWN0aW9uLnBheWxvYWQuZGF0YSA9PT0gJ3N0cmluZycpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3csIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkIClcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ2hlbGxvdycpLnBpcGUob3AudGFwKGFjdGlvbiA9PiBhY3Rpb24pKTtcbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ3dvcmxkJykucGlwZShvcC50YXAoYWN0aW9uID0+IGFjdGlvbikpO1xuIl19