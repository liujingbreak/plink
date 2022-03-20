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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7R0FRRztBQUNILHlDQUEyQjtBQUMzQixtREFBcUM7QUEySDlCLE1BQU0sZUFBZSxHQUFzQixDQUNoRCxHQUFHLGNBQWdDLEVBQUUsRUFBRTtJQUN2QyxPQUFPLFVBQVMsR0FBa0M7UUFDaEQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDeEUsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQVBXLFFBQUEsZUFBZSxtQkFPMUI7QUFHRjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUVwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sWUFBWSxHQUFHLEVBQXdCLENBQUM7SUFFOUMsS0FBSyxNQUFNLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBZ0IsRUFBRTtRQUNwRSxNQUFNLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUU7WUFDL0MsR0FBRztnQkFDRCxpRUFBaUU7Z0JBQ2pFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFBLHVCQUFlLEVBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0tBQ0o7SUFF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QWUsRUFBQyxLQUFLLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQ2xELEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDM0MsQ0FDRixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgcHJvdmlkZSBzb21lIGhvb2tzIHdoaWNoIGxldmVyYWdlcyBSeEpTIHRvIG1pbWljIFJlZHV4LXRvb2xraXQgKyBSZWR1eC1vYnNlcnZhYmxlXG4gKiB3aGljaCBpcyBzdXBwb3NlZCB0byBiZSB1c2VkIGluZGVwZW5kZW50bHkgd2l0aGluIGFueSBSZWFjdCBjb21wb25lbnQgaW4gY2FzZSB5b3VyIGNvbXBvbmVudCBoYXMgXG4gKiBjb21wbGljYXRlZCBhc3luYyBzdGF0ZSBjaGFuZ2UgbG9naWMuXG4gKiBcbiAqIC0gaXQgaXMgc21hbGwgYW5kIHN1cHBvc2VkIHRvIGJlIHdlbGwgcGVyZm9ybWVkXG4gKiAtIGl0IGRvZXMgbm90IHVzZSBJbW1lckpTLCB5b3Ugc2hvdWxkIHRha2UgY2FyZSBvZiBpbW11dGFiaWxpdHkgb2Ygc3RhdGUgYnkgeW91cnNlbGZcbiAqIC0gYmVjYXVzZSB0aGVyZSBpcyBubyBJbW1lckpTLCB5b3UgY2FuIHB1dCBhbnkgdHlwZSBvZiBPYmplY3QgaW4gc3RhdGUgaW5jbHVkaW5nIHRob3NlIGFyZSBub3QgZnJpZW5kbHkgYnkgSW1tZXJKU1xuICovXG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uPFM+IHtcbiAgdHlwZTogc3RyaW5nO1xuICByZWR1Y2VyPyhvbGQ6IFMpOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXlsb2FkQWN0aW9uPFMsIFAgPSBhbnk+IHtcbiAgdHlwZTogc3RyaW5nO1xuICBwYXlsb2FkOiBQO1xuICByZWR1Y2VyPyhvbGQ6IFMsIHBheWxvYWQ6IFApOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcnM8UywgUiA9IGFueT4gPSB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW0sgaW4ga2V5b2YgUl06IChzdGF0ZTogUywgLi4ucGF5bG9hZDogYW55W10pID0+IFMgfCB2b2lkO1xufTtcblxuZXhwb3J0IHR5cGUgQWN0aW9uczxTLCBSPiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06XG4gICAgUltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyB7XG4gICAgICAoKTogQWN0aW9uVHlwZXM8UywgUj5bS107XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgfSA6XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyB7XG4gICAgICAocGF5bG9hZDogUCk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH0gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgLi4ucGF5bG9hZDogaW5mZXIgTSkgPT4gYW55ID8ge1xuICAgICAgKC4uLnBheWxvYWQ6IE0pOiBBY3Rpb25UeXBlczxTLCBSPltLXTtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICB9IDoge1xuICAgICAgKCk6IEFjdGlvblR5cGVzPFMsIFI+W0tdO1xuICAgICAgdHlwZTogc3RyaW5nO1xuICAgIH07XG59O1xuXG50eXBlIEFjdGlvblR5cGVzPFMsIFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPjpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgUD4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUywgLi4ucGF5bG9hZDogaW5mZXIgTSkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBNPiA6XG4gICAgUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPjtcbn07XG5cbnR5cGUgT3V0cHV0QWN0aW9uT2JzPFMsIFIgZXh0ZW5kcyBSZWR1Y2Vyczxhbnk+LCBLIGV4dGVuZHMga2V5b2YgUj4gPVxuICByeC5PYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+IDogUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDogUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPj47XG4gIC8vIHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFBhcmFtZXRlcnM8UltLXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW0tdPlsxXSwgSz4+O1xuXG50eXBlIE9mVHlwZVBpcGVPcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9IChzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4pID0+IE91dHB1dEFjdGlvbk9iczxTLCBSLCBLPjtcblxuLyoqIHNhbWUgYXMgb2ZQYXlsb2FkQWN0aW9uKCkgLCB0byBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlLCB1bmxpa2Ugb2ZQYXlsb2FkQWN0aW9uKCksIHBhcmFtZXRlciBpcyBhIHN0cmluZyBpbnN0ZWFkIG9mIGFjdGlvbkNyZWF0b3IgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIDxLMSBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzI+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFIsIEszIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMiwgYWN0aW9uVHlwZTM6IEszKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzIgfCBLMz47XG4gIDxLIGV4dGVuZHMga2V5b2YgUj4oLi4uYWN0aW9uVHlwZXM6IEtbXSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLPjtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2U8UywgUj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuZXhwb3J0IGludGVyZmFjZSBTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBzdGF0ZSQ6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9yIGZ1bmN0aW9ucyAqL1xuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj47XG4gIGFjdGlvbiRCeVR5cGU6IEFjdGlvbkJ5VHlwZTxTLCBSPjtcbiAgZGlzcGF0Y2g6IChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pID0+IHZvaWQ7XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgYm91bmQgd2l0aCBkaXNwYXRjaGVyICovXG4gIGFjdGlvbkRpc3BhdGNoZXI6IEFjdGlvbnM8UywgUj47XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgKi9cbiAgYWN0aW9uczogQWN0aW9uczxTLCBSPjtcbiAgZGVzdHJveTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSQ6IHJ4Lk9ic2VydmFibGU8YW55PjtcbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gZXBpYyB0aGUgXCJFcGljXCIgc3RyZWFtIG9mIGFjdGlvbnMtaW4sIGFjdGlvbnMtb3V0LCByZWZlciB0byBodHRwczovL3JlZHV4LW9ic2VydmFibGUuanMub3JnL2RvY3MvYmFzaWNzL0VwaWNzLmh0bWxcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byBkZXN0b3J5IChzdWJzY3JpYmUgZnJvbSkgZXBpY1xuICAgKi9cbiAgZXBpYyhlcGljOiBFcGljPFM+KTogdm9pZDtcbiAgLyoqXG4gICAqIGVwaWMoZXBpYykgaXMgcmVjb21tZW5kZWQgdG8gYmUgdXNlZCBpbnN0ZWFkIG9mIGFkZEVwaWMoKSwgaXQgaGFzIGNvbmNpc2VyIG1ldGhvZCBzaWduYXR1cmUuXG4gICAqIEBwYXJhbSBlcGljRmFjdG9yeSBhIGZhY3RvcnkgZnVuY3Rpb24gd2hpY2ggY3JlYXRlcyB0aGUgXCJFcGljXCIgKHN0cmVhbSBvZiBhY3Rpb25zLWluIGFuZCBhY3Rpb25zLW91dCxcbiAgICogIHJlZmVyIHRvIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvZG9jcy9iYXNpY3MvRXBpY3MuaHRtbClcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byByZW1vdmUvdW5zdWJzY3JpYmUgdGhpcyBlcGljXG4gICAqL1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIC8qKlxuICAgKiBNb3N0IG9mIHRoZSB0aW1lIHlvdSBqdXN0IG5lZWQgZXBpYyhlcGljKSwgdGhpcyBtZXRob2QgaXMgY29udmVuaWVudCBpbiBjYXNlIG9mIGNvbnN0YW50bHkgXCJhZGRpbmdcIlxuICAgKiBuZXcgZXBpYyBhZnRlciBcInVuc3Vic2NyaWJlXCIgZnJvbSBwcmVjZWRpbmcgb2xkIGVwaWNcbiAgICogQHBhcmFtIGVwaWNGYWN0b3J5JCB0aGlzIG9ic2VydmFibGUgd2lsbCBiZSBcInN3aXRjaE1hcCgpXCJlZCBpbiBhIHBpcGVsaW5lXG4gICAqL1xuICBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG4gIC8qKiB1bi1wcm9jZXNzZWQgYWN0aW9ucyBnbyB0aHJvdWdoIHRoaXMgb3BlcmF0b3IgKi9cbiAgc2V0QWN0aW9uSW50ZXJjZXB0b3IoaW50ZWM6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+LCBQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+KTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgRXBpYzxTLCBBJCA9IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4gPSAoYWN0aW9uczogQSQsIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiBBJDtcblxudHlwZSBBY3Rpb25PZkNyZWF0b3I8Qz4gPSBDIGV4dGVuZHMge1xuICAoKTogYW55O1xuICB0eXBlOiBzdHJpbmc7XG59ID8geyB0eXBlOiBzdHJpbmc7IHBheWxvYWQ6IHVuZGVmaW5lZCB9IDpcbiAgQyBleHRlbmRzIHtcbiAgICAocGF5bG9hZDogaW5mZXIgUCk6IGFueTtcbiAgICB0eXBlOiBzdHJpbmc7XG4gIH0gPyB7dHlwZTogc3RyaW5nOyBwYXlsb2FkOiBQfSA6XG4gIEMgZXh0ZW5kcyB7XG4gICAgKC4uLmFyZ3M6IGluZmVyIE0pOiBhbnk7XG4gICAgdHlwZTogc3RyaW5nO1xuICB9ID8ge3R5cGU6IHN0cmluZzsgcGF5bG9hZDogTX0gOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9mUGF5bG9hZEFjdGlvbkZuIHtcbiAgPEM+KGFjdGlvbkNyZWF0b3JzOiBDKTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIEFjdGlvbk9mQ3JlYXRvcjxDPj47XG4gIDxDMSwgQzI+KGFjdGlvbkNyZWF0b3JzOiBDMSwgYWN0aW9uQ3JlYXRvcnMxOiBDMik6XG4gICAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnkgLCBBY3Rpb25PZkNyZWF0b3I8QzE+IHwgQWN0aW9uT2ZDcmVhdG9yPEMyPj47XG4gIDxDMSwgQzIsIEMzPihhY3Rpb25DcmVhdG9yczogQzEsIGFjdGlvbkNyZWF0b3JzMTogQzIsIGFjdGlvbkNyZWF0b3JzMjogQzMpOlxuICAgIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBBY3Rpb25PZkNyZWF0b3I8QzE+IHwgQWN0aW9uT2ZDcmVhdG9yPEMyPiB8IEFjdGlvbk9mQ3JlYXRvcjxDMz4+O1xuICAoLi4uYWN0aW9uQ3JlYXRvcnM6IHt0eXBlOiBzdHJpbmd9W10pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwge3R5cGU6IHN0cmluZzsgcGF5bG9hZD86IHVua25vd259Pjtcbn1cblxuZXhwb3J0IGNvbnN0IG9mUGF5bG9hZEFjdGlvbjogT2ZQYXlsb2FkQWN0aW9uRm4gPSAoXG4gIC4uLmFjdGlvbkNyZWF0b3JzOiB7dHlwZTogc3RyaW5nfVtdKSA9PiB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8e3R5cGU6IHN0cmluZ30+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25DcmVhdG9ycy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBhYy50eXBlKSlcbiAgICApO1xuICB9O1xufTtcblxudHlwZSBBY3Rpb25CeVR5cGU8UywgUj4gPSB7W0sgaW4ga2V5b2YgUl06IHJ4Lk9ic2VydmFibGU8QWN0aW9uVHlwZXM8UywgUj5bS10+fTtcbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXJlIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihhY3Rpb25DcmVhdG9yczogQWN0aW9uczxTLCBSPixcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+KTogQWN0aW9uQnlUeXBlPFMsIFI+IHtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShvcC5zaGFyZSgpKTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnMgPSB7fSBhcyBBY3Rpb25CeVR5cGU8UywgUj47XG5cbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSBhcyAoa2V5b2YgUilbXSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNwbGl0QWN0aW9ucywgcmVkdWNlck5hbWUsIHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50XG4gICAgICAgICAgcmV0dXJuIHNvdXJjZS5waXBlKG9mUGF5bG9hZEFjdGlvbihhY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWN0aW9uT2ZDcmVhdG9yPEMgZXh0ZW5kcyB7dHlwZTogc3RyaW5nfT4oYWN0aW9uOiBhbnksIGFjdGlvbkNyZWF0b3I6IEMpOlxuICBhY3Rpb24gaXMgQWN0aW9uT2ZDcmVhdG9yPEM+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuY29uc3Qgc2xpY2VDb3VudDROYW1lOiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZU9wdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgLyoqIEdlbmVyYXRlIHVuaXF1ZSBJRCBhcyBwYXJ0IG9mIHNsaWNlJ3MgbmFtZSwgZGVmYXVsdDogdHJ1ZSAqL1xuICBnZW5lcmF0ZUlkPzogYm9vbGVhbjtcbiAgZGVidWc/OiBib29sZWFuO1xuICBkZWJ1Z0FjdGlvbk9ubHk/OiBib29sZWFuO1xuICByb290U3RvcmU/OiByeC5CZWhhdmlvclN1YmplY3Q8e1trOiBzdHJpbmddOiBTfT47XG59XG5cbi8qKlxuICogUmVkdWNlcnMgYW5kIGluaXRpYWxTdGF0ZSBhcmUgcmV1c2VkIGNyb3NzIG11bHRpcGxlIGNvbXBvbmVudFxuICogXG4gKiAgU2xpY2UgLS0tIENvbXBvbmVudCBpbnN0YW5jZSAoc3RhdGUsIGFjdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZTxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9wdDogU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2U8UywgUj4ge1xuICBsZXQgbmFtZSA9IG9wdC5uYW1lO1xuICBpZiAob3B0LmdlbmVyYXRlSWQgPT09IHVuZGVmaW5lZCB8fCBvcHQuZ2VuZXJhdGVJZCA9PT0gdHJ1ZSkge1xuICAgIGlmIChzbGljZUNvdW50NE5hbWVbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgc2xpY2VDb3VudDROYW1lW25hbWVdID0gMDtcbiAgICB9XG4gICAgb3B0Lm5hbWUgPSBuYW1lID0gbmFtZSArICcuJyArICgrK3NsaWNlQ291bnQ0TmFtZVtuYW1lXSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ3JlYXRvcnMgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0ge30gYXMgQWN0aW9uczxTLCBSPjtcblxuICBmb3IgKGNvbnN0IFtrZXksIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKG9wdC5yZWR1Y2VycykpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZSArICcvJyArIGtleTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgY29uc3QgY3JlYXRvciA9ICgoLi4ucGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIHBheWxvYWQ6IHBheWxvYWQubGVuZ3RoID09PSAwID8gdW5kZWZpbmVkIDpcbiAgICAgICAgICBwYXlsb2FkLmxlbmd0aCA9PT0gMSA/IHBheWxvYWRbMF0gOlxuICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgIHJlZHVjZXJcbiAgICAgIH07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvcjtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgocGF5bG9hZD86IGFueSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICBjb25zdCBhY3Rpb24gPSBjcmVhdG9yKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBhbnk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXS50eXBlID0gY3JlYXRvci50eXBlO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxTPihvcHQuaW5pdGlhbFN0YXRlKTtcbiAgY29uc3QgdW5wcm9jZXNzZWRBY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcbiAgY29uc3QgYWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG5cbiAgZnVuY3Rpb24gb2ZUeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+KFxuICAgIC4uLmFjdGlvblR5cGVzOiBUW10pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pIHtcbiAgICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25UeXBlcy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBuYW1lICsgJy8nICsgYWMpKVxuICAgICAgKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSB7XG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIGxldCBhY3Rpb25Db3VudCA9IDA7XG4gIGxldCBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gIC8vIFRvIHdhcm4gZGV2ZWxvcGVyIHRoYXQgbm8gYWN0aW9uIGRpc3BhdGNoaW5nIHNob3VkIGJlIGNhbGxlZCBpbnNpZGUgYSByZWR1Y2VyLCB0aGlzIGlzIHNpZGUtZWZmZWN0cyBhbmQgXG4gIC8vIHdpbGwgbGVhZHMgdG8gcmVjdXJzaXZlIHJlZHVjZXJcbiAgbGV0IGluUmVkdWNlciA9IGZhbHNlO1xuICBjb25zdCBpbnRlcmNlcHRvciQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+LCBQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+PihcbiAgICBpbnB1dCA9PiBpbnB1dFxuICApO1xuXG4gIGNvbnN0IHN1YiA9IHJ4Lm1lcmdlKFxuICAgIGludGVyY2VwdG9yJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKGludGVyY2VwdG9yID0+IHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKFxuICAgICAgICAvLyBvcC5vYnNlcnZlT24ocngucXVldWVTY2hlZHVsZXIpLCAvLyBBdm9pZCByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBhY3Rpb24gaW5zaWRlIGFuIHJlZHVjZXIsIGJ1dCBub3JtYWxseSByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBzaG91bGQgYmUgd2FybmVkIGFuZCBmb3JiaWRkZW5cbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgICAgaWYgKG9wdC5kZWJ1ZyB8fCBvcHQuZGVidWdBY3Rpb25Pbmx5KSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6YWN0aW9uIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNmYWU0ZmM7JywgYWN0aW9uLnR5cGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGludGVyY2VwdG9yLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgICBpZiAoYWN0aW9uLnJlZHVjZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJTdGF0ZSA9IHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgY29uc3Qgc2hhbGxvd0NvcGllZCA9IHsuLi5jdXJyU3RhdGUsIF9fYWM6ICsrYWN0aW9uQ291bnR9O1xuICAgICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaW5SZWR1Y2VyKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRG8gbm90IGRpc3BhdGNoIGFjdGlvbiBpbnNpZGUgYSByZWR1Y2VyISAoYWN0aW9uOiAke2FjdGlvbi50eXBlfSlgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgICBsZXQgbmV3U3RhdGU6IFMgfCB2b2lkO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgbmV3U3RhdGUgPSBhY3Rpb24ucmVkdWNlcihzaGFsbG93Q29waWVkLCAoYWN0aW9uIGFzIFBheWxvYWRBY3Rpb248Uz4pLnBheWxvYWQpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgLy8gZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1N0YXRlID8gbmV3U3RhdGUgOiBzaGFsbG93Q29waWVkO1xuICAgICAgICAgICAgc3RhdGUkLm5leHQoY2hhbmdlZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFjdGlvbiQubmV4dChhY3Rpb24pO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdyZWR1Y2VyIGVycm9yJyxcbiAgICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgICAgfSlcbiAgICAgICkpXG4gICAgKSxcblxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICAgKSA6IHJ4LkVNUFRZXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhzbGljZSwgb2ZUeXBlIGFzIE9mVHlwZUZuPFMsIFI+KTtcbiAgICAgICAgICBpZiAoZXBpYylcbiAgICAgICAgICAgIHJldHVybiBlcGljKGFjdGlvbiQsIHN0YXRlJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwodW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpKSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4gZGlzcGF0Y2goYWN0aW9uKSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnZXBpYyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBzbGljZTogU2xpY2U8UywgUj4gPSB7XG4gICAgbmFtZSxcbiAgICBzdGF0ZSQsXG4gICAgYWN0aW9uJCxcbiAgICBhY3Rpb24kQnlUeXBlOiBjYXN0QnlBY3Rpb25UeXBlKGFjdGlvbkNyZWF0b3JzLCBhY3Rpb24kKSxcbiAgICBhY3Rpb25zOiBhY3Rpb25DcmVhdG9ycyxcbiAgICBkaXNwYXRjaCxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGRlc3Ryb3ksXG4gICAgZGVzdHJveSQ6IHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSxcbiAgICBlcGljKGVwaWM6IEVwaWM8Uz4pIHtcbiAgICAgIGNvbnN0IGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPiA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIGVwaWM7XG4gICAgICB9O1xuICAgICAgYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIHNldEFjdGlvbkludGVyY2VwdG9yKGludGVjOiByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPiwgUGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pikge30sXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGUkO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICBpZiAoZXhlY3V0aW5nUmVkdWNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvIGJlIGNvbnNpc3RlbnQgd2l0aCBSZWR1eFxcJ3MgYmVoYXZpb3VyLCBzbGljZS5nZXRTdGF0ZSgpIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGludm9rZWQgaW5zaWRlIGEgcmVkdWNlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHNsaWNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LFxuICBUIGV4dGVuZHMga2V5b2YgUj4oXG4gIHNsaWNlOiBTbGljZTxTLCBSPixcbiAgYWN0aW9uVHlwZTogVCkge1xuXG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8ge3R5cGU6IFR9IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgcDogaW5mZXIgUCkgPT4gYW55ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDogbmV2ZXI+KHN1YiA9PiB7XG4gICAgc2xpY2UuYWRkRXBpYyhzbGljZSA9PiAoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnNbYWN0aW9uVHlwZV0pLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHN1Yi5uZXh0KGFjdGlvbiBhcyBhbnkpKSxcbiAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3Rpb24kQnlUeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oc2xpY2U6IFNsaWNlPFMsIFI+KSB7XG4gIHJldHVybiBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIHNsaWNlLmFjdGlvbiQpO1xufVxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuIGV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5jb25zdCBkZW1vU2xpY2UgPSBjcmVhdGVTbGljZSh7XG4gIG5hbWU6ICdkZW1vJyxcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyB7b2s/OiBib29sZWFuOyBlcnJvcj86IEVycm9yfSxcbiAgcmVkdWNlcnM6IHtcbiAgICBoZWxsb3cocywgZ3JlZXRpbmc6IHtkYXRhOiBzdHJpbmd9KSB7fSxcbiAgICB3b3JsZChzKSB7fSxcbiAgICBtdWx0aVBheWxvYWRSZWR1Y2VyKHMsIGFyZzE6IHN0cmluZywgYXJnMjogbnVtYmVyKSB7fVxuICB9XG59KTtcbmRlbW9TbGljZS5hZGRFcGljKChzbGljZSwgb2ZUeXBlKSA9PiB7XG4gIHJldHVybiAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5hYmMoKTtcbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25TdHJlYW1zLmhlbGxvdy5waXBlKCksXG4gICAgICBhY3Rpb25TdHJlYW1zLm11bHRpUGF5bG9hZFJlZHVjZXIucGlwZSgpLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ2hlbGxvdycsICdoZWxsb3cnKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25zLndvcmxkKCkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ3dvcmxkJyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHR5cGVvZiBhY3Rpb24ucGF5bG9hZC5kYXRhID09PSAnc3RyaW5nJylcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50XG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdywgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQgKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMubXVsdGlQYXlsb2FkUmVkdWNlciksXG4gICAgICAgIG9wLnRhcCgoe3BheWxvYWQ6IFthMSwgYTJdfSkgPT4gYWxlcnQoYTEpKVxuICAgICAgKVxuICAgICkucGlwZShvcC5pZ25vcmVFbGVtZW50cygpKTtcbiAgfTtcbn0pO1xuYWN0aW9uJE9mU2xpY2UoZGVtb1NsaWNlLCAnaGVsbG93JykucGlwZShvcC50YXAoYWN0aW9uID0+IGFjdGlvbikpO1xuYWN0aW9uJE9mU2xpY2UoZGVtb1NsaWNlLCAnd29ybGQnKS5waXBlKG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uKSk7XG4iXX0=