"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.sliceRefActionOp = exports.createSlice = exports.castByActionType = exports.ofPayloadAction = void 0;
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
var rx = __importStar(require("rxjs"));
var op = __importStar(require("rxjs/operators"));
function ofPayloadAction() {
    var actionCreators = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        actionCreators[_i] = arguments[_i];
    }
    return function (src) {
        return src.pipe(op.filter(function (action) { return actionCreators.some(function (ac) { return action.type === ac.type; }); }));
    };
}
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
    var dispatcherByType = {};
    var splitActions = {};
    var sourceSub;
    var subscriberCnt = 0;
    var source = action$.pipe(
    // op.share(), we don't need share(), we have implemented same logic
    op.map(function (action) {
        var match = dispatcherByType[action.type];
        if (match) {
            match.next(action);
        }
    }));
    var _loop_1 = function (reducerName) {
        var subject = dispatcherByType[actionCreators[reducerName].type] = new rx.Subject();
        // eslint-disable-next-line no-loop-func
        splitActions[reducerName] = rx.defer(function () {
            if (subscriberCnt++ === 0)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(function () {
            if (--subscriberCnt === 0 && sourceSub) {
                sourceSub.unsubscribe();
                sourceSub = undefined;
            }
        }));
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_1(reducerName);
    }
    return splitActions;
}
exports.castByActionType = castByActionType;
var sliceCount4Name = {};
/**
 * Reducers and initialState are reused cross multiple component
 *
 *  Slice --- Component instance (state, actions)
 */
function createSlice(opt) {
    var name = opt.name;
    if (opt.generateId === undefined || opt.generateId === true) {
        if (sliceCount4Name[name] == null) {
            sliceCount4Name[name] = 0;
        }
        opt.name = name = name + '.' + (++sliceCount4Name[name]);
    }
    var actionCreators = {};
    var actionDispatcher = {};
    var _loop_2 = function (key, reducer) {
        var type = name + '/' + key;
        var creator = (function (payload) {
            var action = { type: type, payload: payload, reducer: reducer };
            return action;
        });
        creator.type = type;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        actionCreators[key] = creator;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        actionDispatcher[key] = (function (payload) {
            var action = creator(payload);
            dispatch(action);
            return action;
        });
        actionDispatcher[key].type = creator.type;
    };
    for (var _i = 0, _a = Object.entries(opt.reducers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], reducer = _b[1];
        _loop_2(key, reducer);
    }
    var state$ = new rx.BehaviorSubject(opt.initialState);
    var unprocessedAction$ = new rx.Subject();
    var action$ = new rx.Subject();
    function ofType() {
        var actionTypes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            actionTypes[_i] = arguments[_i];
        }
        return function (src) {
            return src.pipe(op.filter(function (action) { return actionTypes.some(function (ac) { return action.type === name + '/' + ac; }); }));
        };
    }
    function dispatch(action) {
        unprocessedAction$.next(action);
    }
    var actionCount = 0;
    var executingReducer = false;
    // To warn developer that no action dispatching shoud be called inside a reducer, this is side-effects and 
    // will leads to recursive reducer
    var inReducer = false;
    var sub = rx.merge(unprocessedAction$.pipe(
    // op.observeOn(rx.queueScheduler), // Avoid recursively dispatching action inside an reducer, but normally recursively dispatching should be warned and forbidden
    op.tap(function (action) {
        if (opt.debug) {
            // eslint-disable-next-line no-console
            console.log("%c " + name + " internal:action ", 'color: black; background: #fae4fc;', action.type);
        }
    }), op.tap(function (action) {
        if (action.reducer) {
            var currState = state$.getValue();
            var shallowCopied = __assign(__assign({}, currState), { __ac: ++actionCount });
            executingReducer = true;
            if (inReducer) {
                throw new Error("Do not dispatch action inside a reducer! (action: " + action.type + ")");
            }
            inReducer = true;
            var newState = void 0;
            try {
                newState = action.reducer(shallowCopied, action.payload);
            }
            finally {
                inReducer = false;
                executingReducer = false;
            }
            // inReducer = false;
            // executingReducer = false;
            var changed = newState ? newState : shallowCopied;
            state$.next(changed);
        }
        action$.next(action);
    }), op.catchError(function (err, caught) {
        console.error(err);
        dispatch({ type: 'reducer error', reducer: function (s) {
                return __assign(__assign({}, s), { error: err });
            }
        });
        return caught;
    })), state$.pipe(op.tap(function (state) {
        if (opt.debug) {
            // eslint-disable-next-line no-console
            console.log("%c " + name + " internal:state ", 'color: black; background: #e98df5;', state);
        }
    })), opt.rootStore ? state$.pipe(op.tap(function (state) {
        var _a;
        var _b;
        return opt.rootStore.next(__assign(__assign({}, (_b = opt.rootStore) === null || _b === void 0 ? void 0 : _b.getValue()), (_a = {}, _a[opt.name] = state, _a)));
    })) : rx.EMPTY).subscribe();
    function destroy() {
        dispatch({
            type: '__OnDestroy'
        });
        sub.unsubscribe();
    }
    function addEpic$(epicFactory$) {
        var sub = epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(function (fac) {
            if (fac) {
                var epic = fac(slice, ofType);
                if (epic)
                    return epic(action$, state$);
            }
            return rx.EMPTY;
        }), op.takeUntil(unprocessedAction$.pipe(op.filter(function (action) { return action.type === '__OnDestroy'; }), op.take(1))), op.tap(function (action) { return dispatch(action); }), op.catchError(function (err, caught) {
            console.error(err);
            dispatch({ type: 'epic error', reducer: function (s) {
                    return __assign(__assign({}, s), { error: err });
                }
            });
            return caught;
        })).subscribe();
        return function () { return sub.unsubscribe(); };
    }
    var slice = {
        name: name,
        state$: state$,
        action$: action$,
        actions: actionCreators,
        dispatch: dispatch,
        actionDispatcher: actionDispatcher,
        destroy: destroy,
        destroy$: unprocessedAction$.pipe(op.filter(function (action) { return action.type === '__OnDestroy'; }), op.take(1)),
        addEpic: function (epicFactory) {
            return addEpic$(rx.of(epicFactory));
        },
        addEpic$: addEpic$,
        getStore: function () {
            return state$;
        },
        getState: function () {
            if (executingReducer) {
                throw new Error('To be consistent with Redux\'s behaviour, slice.getState() is not allowed to be invoked inside a reducer');
            }
            return state$.getValue();
        }
    };
    return slice;
}
exports.createSlice = createSlice;
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
        return in$.pipe(op.switchMap(function (_a) {
            var payload = _a.payload;
            var release = payload.addEpic(epicFactory);
            return new rx.Observable(function (sub) { return release; });
        }));
    };
}
exports.sliceRefActionOp = sliceRefActionOp;
// const demoSlice = createSlice({
//   name: 'demo',
//   initialState: {} as {ok?: boolean; error?: Error},
//   reducers: {
//     hellow(s, greeting: {data: string}) {},
//     world(s) {}
//   }
// });
// demoSlice.addEpic((slice, ofType) => {
//   return (action$, state$) => {
//     const actionStreams = castByActionType(slice.actions, action$);
//     return rx.merge(
//       actionStreams.hellow.pipe(),
//       action$.pipe(
//         ofType('hellow', 'hellow'),
//         op.map(action => slice.actions.world())
//       ),
//       action$.pipe(
//         ofType('world'),
//         op.tap(action => slice.actionDispatcher.hellow({data: 'yes'}))
//       ),
//       action$.pipe(
//         ofPayloadAction(slice.actions.hellow),
//         op.tap(action => typeof action.payload.data === 'string')
//       ),
//       action$.pipe(
//         ofPayloadAction(slice.actions.world),
//         op.tap(action => slice.actionDispatcher.hellow({data: 'yes'}))
//       ),
//       action$.pipe(
//         ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world),
//         op.tap(action => action.payload)
//       )
//     ).pipe(op.ignoreElements());
//   };
// });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQStFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUlwRCxJQUFNLGdCQUFnQixHQUE2RSxFQUFFLENBQUM7SUFDdEcsSUFBTSxZQUFZLEdBQW1FLEVBQUUsQ0FBQztJQUV4RixJQUFJLFNBQXNDLENBQUM7SUFDM0MsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBRXRCLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJO0lBQ3pCLG9FQUFvRTtJQUNwRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTTtRQUNYLElBQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEtBQUssRUFBRTtZQUNULEtBQUssQ0FBQyxJQUFJ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bEIsdURBQXVEO0FBQ3ZELGdCQUFnQjtBQUNoQiw4Q0FBOEM7QUFDOUMsa0JBQWtCO0FBQ2xCLE1BQU07QUFDTixNQUFNO0FBQ04seUNBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyxzRUFBc0U7QUFFdEUsdUJBQXVCO0FBQ3ZCLHFDQUFxQztBQUNyQyxzQkFBc0I7QUFDdEIsc0NBQXNDO0FBQ3RDLGtEQUFrRDtBQUNsRCxXQUFXO0FBQ1gsc0JBQXNCO0FBQ3RCLDJCQUEyQjtBQUMzQix5RUFBeUU7QUFDekUsV0FBVztBQUNYLHNCQUFzQjtBQUN0QixpREFBaUQ7QUFDakQsb0VBQW9FO0FBQ3BFLFdBQVc7QUFDWCxzQkFBc0I7QUFDdEIsZ0RBQWdEO0FBQ2hELHlFQUF5RTtBQUN6RSxXQUFXO0FBQ1gsc0JBQXNCO0FBQ3RCLHdGQUF3RjtBQUN4RiwyQ0FBMkM7QUFDM0MsVUFBVTtBQUNWLG1DQUFtQztBQUNuQyxPQUFPO0FBQ1AsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhpcyBmaWxlIHByb3ZpZGUgc29tZSBob29rcyB3aGljaCBsZXZlcmFnZXMgUnhKUyB0byBtaW1pYyBSZWR1eC10b29sa2l0ICsgUmVkdXgtb2JzZXJ2YWJsZVxuICogd2hpY2ggaXMgc3VwcG9zZWQgdG8gYmUgdXNlZCBpbmRlcGVuZGVudGx5IHdpdGhpbiBhbnkgUmVhY3QgY29tcG9uZW50IGluIGNhc2UgeW91ciBjb21wb25lbnQgaGFzIFxuICogY29tcGxpY2F0ZWQgYXN5bmMgc3RhdGUgY2hhbmdlIGxvZ2ljLlxuICogXG4gKiAtIGl0IGlzIHNtYWxsIGFuZCBzdXBwb3NlZCB0byBiZSB3ZWxsIHBlcmZvcm1lZFxuICogLSBpdCBkb2VzIG5vdCB1c2UgSW1tZXJKUywgeW91IHNob3VsZCB0YWtlIGNhcmUgb2YgaW1tdXRhYmlsaXR5IG9mIHN0YXRlIGJ5IHlvdXJzZWxmXG4gKiAtIGJlY2F1c2UgdGhlcmUgaXMgbm8gSW1tZXJKUywgeW91IGNhbiBwdXQgYW55IHR5cGUgb2YgT2JqZWN0IGluIHN0YXRlIGluY2x1ZGluZyB0aG9zZSBhcmUgbm90IGZyaWVuZGx5IGJ5IEltbWVySlNcbiAqL1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbjxTPiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcmVkdWNlcj8ob2xkOiBTKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF5bG9hZEFjdGlvbjxTLCBQID0gYW55PiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcGF5bG9hZDogUDtcbiAgcmVkdWNlcj8ob2xkOiBTLCBwYXlsb2FkOiBQKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdWNlcnM8Uz4ge1xuICAvKiogUmV0dXJuaW5nIGB1bmRlZmluZWQgLyB2b2lkYCBoYXMgc2FtZSBlZmZlY3Qgb2YgcmV0dXJuaW5nIG9sZCBzdGF0ZSByZWZlcmVuY2UsXG4gICAqIFJldHVybmluZyBhIGJyYW5kIG5ldyBzdGF0ZSBvYmplY3QgZm9yIGltbXV0YWJpbGl0eSBpbiBub3JtYWwgY2FzZS5cbiAgICovXG4gIFt0eXBlOiBzdHJpbmddOiAoc3RhdGU6IFMsIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBBY3Rpb25zPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+IDogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIHVua25vd24+O1xufTtcblxuZXhwb3J0IHR5cGUgQWN0aW9uQ3JlYXRvcjxTLCBQPiA9IEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiB8IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPjtcbmludGVyZmFjZSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4ge1xuICAoKTogQWN0aW9uPFM+O1xuICB0eXBlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4ge1xuICAocGF5bG9hZDogUCk6IFBheWxvYWRBY3Rpb248UywgUD47XG4gIHR5cGU6IHN0cmluZztcbn1cblxudHlwZSBPdXRwdXRBY3Rpb25PYnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPGFueT4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9XG4gIHJ4Lk9ic2VydmFibGU8UltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyBBY3Rpb248Uz4gOiBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgUD4gOiBQYXlsb2FkQWN0aW9uPFMsIHVua25vd24+PjtcbiAgLy8gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgUGFyYW1ldGVyczxSW0tdPlsxXSBleHRlbmRzIHVuZGVmaW5lZCA/IHZvaWQgOiBQYXJhbWV0ZXJzPFJbS10+WzFdLCBLPj47XG5cbnR5cGUgT2ZUeXBlUGlwZU9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgSyBleHRlbmRzIGtleW9mIFI+ID0gKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PikgPT4gT3V0cHV0QWN0aW9uT2JzPFMsIFIsIEs+O1xuXG4vKiogc2FtZSBhcyBvZlBheWxvYWRBY3Rpb24oKSAsIHRvIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUsIHVubGlrZSBvZlBheWxvYWRBY3Rpb24oKSwgcGFyYW1ldGVyIGlzIGEgc3RyaW5nIGluc3RlYWQgb2YgYWN0aW9uQ3JlYXRvciAqL1xuZXhwb3J0IGludGVyZmFjZSBPZlR5cGVGbjxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzE+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMj47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUiwgSzMgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyLCBhY3Rpb25UeXBlMzogSzMpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMiB8IEszPjtcbiAgPEsgZXh0ZW5kcyBrZXlvZiBSPiguLi5hY3Rpb25UeXBlczogS1tdKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEs+O1xufVxuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZTxTLCBSPiwgb2ZUeXBlOiBPZlR5cGVGbjxTLCBSPikgPT4gRXBpYzxTPiB8IHZvaWQ7XG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmcgfCBudW1iZXI7XG4gIHN0YXRlJDogcnguQmVoYXZpb3JTdWJqZWN0PFM+O1xuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj47XG4gIGRpc3BhdGNoOiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSA9PiB2b2lkO1xuICAvKiogQWN0aW9uIGNyZWF0b3JzIGJvdW5kIHdpdGggZGlzcGF0Y2hlciAqL1xuICBhY3Rpb25EaXNwYXRjaGVyOiBBY3Rpb25zPFMsIFI+O1xuICAvKiogQWN0aW9uIGNyZWF0b3JzICovXG4gIGFjdGlvbnM6IEFjdGlvbnM8UywgUj47XG4gIGRlc3Ryb3k6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3kkOiByeC5PYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBnZXRTdG9yZSgpOiByeC5PYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufVxuXG5leHBvcnQgdHlwZSBFcGljPFMsIEEkID0gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+PiA9IChhY3Rpb25zOiBBJCwgc3RhdGVzOiByeC5CZWhhdmlvclN1YmplY3Q8Uz4pID0+IEEkO1xuXG4vLyB0eXBlIFBheWxvYWRUeXBlT2ZBY3Rpb248QWN0aW9uQ3JlYXRvclR5cGU+ID0gQWN0aW9uQ3JlYXRvclR5cGUgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8YW55PiA/IHZvaWQgOlxuLy8gICBBY3Rpb25DcmVhdG9yVHlwZSBleHRlbmRzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxhbnksIGluZmVyIFA+ID8gUCA6IG5ldmVyO1xuXG4vKiogZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPik6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFMsIFA+PjtcbiAgLy8gKHNvdXJjZTogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBQYXlsb2FkVHlwZU9mQWN0aW9uPEE+Pj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFAsIFMxLCBQMT4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4sIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxTMSwgUDE+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnkgLCBQYXlsb2FkQWN0aW9uPFMsIFA+IHwgUGF5bG9hZEFjdGlvbjxTMSwgUDE+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUCwgUzEsIFAxLCBTMiwgUDI+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+LCBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UzEsIFAxPiwgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yPFMyLCBQMj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxTLCBQPiB8IFBheWxvYWRBY3Rpb248UzEsIFAxPiB8IFBheWxvYWRBY3Rpb248UzIsIFAyPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uKFxuICAuLi5hY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxhbnksIGFueT5bXSk6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pIHtcbiAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbkNyZWF0b3JzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IGFjLnR5cGUpKVxuICAgICk7XG4gIH07XG59XG5cbi8qKlxuICogTWFwIGFjdGlvbiBzdHJlYW0gdG8gbXVsdGlwbGUgYWN0aW9uIHN0cmVhbXMgYnkgdGhlaXJlIGFjdGlvbiB0eXBlLlxuICogVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB3YXkgdG8gY2F0ZWdvcml6ZSBhY3Rpb24gc3RyZWFtLCBjb21wYXJlIHRvIFwib2ZQYXlsb2FkQWN0aW9uKClcIlxuICogVXNhZ2U6XG5gYGBcbnNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gIGNvbnN0IGFjdGlvbnNCeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQS5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9CLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICApXG59KVxuYGBgXG4gKiBAcGFyYW0gYWN0aW9uQ3JlYXRvcnMgXG4gKiBAcGFyYW0gYWN0aW9uJCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhc3RCeUFjdGlvblR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihhY3Rpb25DcmVhdG9yczogQWN0aW9uczxTLCBSPixcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+KTpcbiAge1tLIGluIGtleW9mIFJdOiByeC5PYnNlcnZhYmxlPFJldHVyblR5cGU8QWN0aW9uczxTLCBSPltLXT4+fSB7XG5cblxuICAgIGNvbnN0IGRpc3BhdGNoZXJCeVR5cGU6IHtbSzogc3RyaW5nXTogcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+IHwgdW5kZWZpbmVkfSA9IHt9O1xuICAgIGNvbnN0IHNwbGl0QWN0aW9uczoge1tLIGluIGtleW9mIFJdPzogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn0gPSB7fTtcblxuICAgIGxldCBzb3VyY2VTdWI6IHJ4LlN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICBsZXQgc3Vic2NyaWJlckNudCA9IDA7XG5cbiAgICBjb25zdCBzb3VyY2UgPSBhY3Rpb24kLnBpcGUoXG4gICAgICAvLyBvcC5zaGFyZSgpLCB3ZSBkb24ndCBuZWVkIHNoYXJlKCksIHdlIGhhdmUgaW1wbGVtZW50ZWQgc2FtZSBsb2dpY1xuICAgICAgb3AubWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gZGlzcGF0Y2hlckJ5VHlwZVthY3Rpb24udHlwZV07XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgIG1hdGNoLm5leHQoYWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuXG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBkaXNwYXRjaGVyQnlUeXBlW2FjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXS50eXBlXSA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4oKTtcblxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgc3BsaXRBY3Rpb25zW3JlZHVjZXJOYW1lIGFzIGtleW9mIFJdID0gcnguZGVmZXIoKCkgPT4ge1xuICAgICAgICBpZiAoc3Vic2NyaWJlckNudCsrID09PSAwKVxuICAgICAgICAgIHNvdXJjZVN1YiA9IHNvdXJjZS5zdWJzY3JpYmUoKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCkgYXMgcnguT2JzZXJ2YWJsZTxhbnk+O1xuICAgICAgfSkucGlwZShcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKC0tc3Vic2NyaWJlckNudCA9PT0gMCAmJiBzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGl0QWN0aW9ucyBhcyB7W0sgaW4ga2V5b2YgUl06IHJ4Lk9ic2VydmFibGU8UmV0dXJuVHlwZTxBY3Rpb25zPFMsIFI+W0tdPj59O1xufVxuXG5jb25zdCBzbGljZUNvdW50NE5hbWU6IHtbbmFtZTogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlT3B0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nO1xuICBpbml0aWFsU3RhdGU6IFM7XG4gIHJlZHVjZXJzOiBSO1xuICAvKiogR2VuZXJhdGUgdW5pcXVlIElEIGFzIHBhcnQgb2Ygc2xpY2UncyBuYW1lLCBkZWZhdWx0OiB0cnVlICovXG4gIGdlbmVyYXRlSWQ/OiBib29sZWFuO1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIHJvb3RTdG9yZT86IHJ4LkJlaGF2aW9yU3ViamVjdDx7W2s6IHN0cmluZ106IFN9Pjtcbn1cblxuLyoqXG4gKiBSZWR1Y2VycyBhbmQgaW5pdGlhbFN0YXRlIGFyZSByZXVzZWQgY3Jvc3MgbXVsdGlwbGUgY29tcG9uZW50XG4gKiBcbiAqICBTbGljZSAtLS0gQ29tcG9uZW50IGluc3RhbmNlIChzdGF0ZSwgYWN0aW9ucylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlPFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ob3B0OiBTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZTxTLCBSPiB7XG4gIGxldCBuYW1lID0gb3B0Lm5hbWU7XG4gIGlmIChvcHQuZ2VuZXJhdGVJZCA9PT0gdW5kZWZpbmVkIHx8IG9wdC5nZW5lcmF0ZUlkID09PSB0cnVlKSB7XG4gICAgaWYgKHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9PSBudWxsKSB7XG4gICAgICBzbGljZUNvdW50NE5hbWVbbmFtZV0gPSAwO1xuICAgIH1cbiAgICBvcHQubmFtZSA9IG5hbWUgPSBuYW1lICsgJy4nICsgKCsrc2xpY2VDb3VudDROYW1lW25hbWVdKTtcbiAgfVxuICBjb25zdCBhY3Rpb25DcmVhdG9ycyA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuXG4gIGZvciAoY29uc3QgW2tleSwgcmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMob3B0LnJlZHVjZXJzKSkge1xuICAgIGNvbnN0IHR5cGUgPSBuYW1lICsgJy8nICsga2V5O1xuICAgIGNvbnN0IGNyZWF0b3IgPSAoKHBheWxvYWQ6IHVua25vd24pID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHt0eXBlLCBwYXlsb2FkLCByZWR1Y2VyfTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIGFueT47XG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvciBhcyBhbnk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0gPSAoKHBheWxvYWQ/OiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IGNyZWF0b3IocGF5bG9hZCk7XG4gICAgICBkaXNwYXRjaChhY3Rpb24pO1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBhbnk7XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXS50eXBlID0gY3JlYXRvci50eXBlO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxTPihvcHQuaW5pdGlhbFN0YXRlKTtcbiAgY29uc3QgdW5wcm9jZXNzZWRBY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcbiAgY29uc3QgYWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG5cbiAgZnVuY3Rpb24gb2ZUeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+KFxuICAgIC4uLmFjdGlvblR5cGVzOiBUW10pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pIHtcbiAgICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25UeXBlcy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBuYW1lICsgJy8nICsgYWMpKVxuICAgICAgKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSB7XG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIGxldCBhY3Rpb25Db3VudCA9IDA7XG4gIGxldCBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gIC8vIFRvIHdhcm4gZGV2ZWxvcGVyIHRoYXQgbm8gYWN0aW9uIGRpc3BhdGNoaW5nIHNob3VkIGJlIGNhbGxlZCBpbnNpZGUgYSByZWR1Y2VyLCB0aGlzIGlzIHNpZGUtZWZmZWN0cyBhbmQgXG4gIC8vIHdpbGwgbGVhZHMgdG8gcmVjdXJzaXZlIHJlZHVjZXJcbiAgbGV0IGluUmVkdWNlciA9IGZhbHNlO1xuXG4gIGNvbnN0IHN1YiA9IHJ4Lm1lcmdlKFxuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKFxuICAgICAgLy8gb3Aub2JzZXJ2ZU9uKHJ4LnF1ZXVlU2NoZWR1bGVyKSwgLy8gQXZvaWQgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgYWN0aW9uIGluc2lkZSBhbiByZWR1Y2VyLCBidXQgbm9ybWFsbHkgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgc2hvdWxkIGJlIHdhcm5lZCBhbmQgZm9yYmlkZGVuXG4gICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6YWN0aW9uIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNmYWU0ZmM7JywgYWN0aW9uLnR5cGUpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoYWN0aW9uLnJlZHVjZXIpIHtcbiAgICAgICAgICBjb25zdCBjdXJyU3RhdGUgPSBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgaWYgKGluUmVkdWNlcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpblJlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGxldCBuZXdTdGF0ZTogUyB8IHZvaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc2hhbGxvd0NvcGllZCwgKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkKTtcbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIC8vIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gbmV3U3RhdGUgPyBuZXdTdGF0ZSA6IHNoYWxsb3dDb3BpZWQ7XG4gICAgICAgICAgc3RhdGUkLm5leHQoY2hhbmdlZCk7XG4gICAgICAgIH1cbiAgICAgICAgYWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gICAgICB9KSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdyZWR1Y2VyIGVycm9yJyxcbiAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLFxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICAgKSA6IHJ4LkVNUFRZXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhzbGljZSwgb2ZUeXBlIGFzIE9mVHlwZUZuPFMsIFI+KTtcbiAgICAgICAgICBpZiAoZXBpYylcbiAgICAgICAgICAgIHJldHVybiBlcGljKGFjdGlvbiQsIHN0YXRlJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwodW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpKSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4gZGlzcGF0Y2goYWN0aW9uKSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnZXBpYyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBzbGljZTogU2xpY2U8UywgUj4gPSB7XG4gICAgbmFtZSxcbiAgICBzdGF0ZSQsXG4gICAgYWN0aW9uJCxcbiAgICBhY3Rpb25zOiBhY3Rpb25DcmVhdG9ycyxcbiAgICBkaXNwYXRjaCxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGRlc3Ryb3ksXG4gICAgZGVzdHJveSQ6IHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSxcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKHJ4Lm9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZSQ7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIGlmIChleGVjdXRpbmdSZWR1Y2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG8gYmUgY29uc2lzdGVudCB3aXRoIFJlZHV4XFwncyBiZWhhdmlvdXIsIHNsaWNlLmdldFN0YXRlKCkgaXMgbm90IGFsbG93ZWQgdG8gYmUgaW52b2tlZCBpbnNpZGUgYSByZWR1Y2VyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gc2xpY2U7XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbiBleHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuLy8gY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2Uoe1xuLy8gICBuYW1lOiAnZGVtbycsXG4vLyAgIGluaXRpYWxTdGF0ZToge30gYXMge29rPzogYm9vbGVhbjsgZXJyb3I/OiBFcnJvcn0sXG4vLyAgIHJlZHVjZXJzOiB7XG4vLyAgICAgaGVsbG93KHMsIGdyZWV0aW5nOiB7ZGF0YTogc3RyaW5nfSkge30sXG4vLyAgICAgd29ybGQocykge31cbi8vICAgfVxuLy8gfSk7XG4vLyBkZW1vU2xpY2UuYWRkRXBpYygoc2xpY2UsIG9mVHlwZSkgPT4ge1xuLy8gICByZXR1cm4gKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuLy8gICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4vLyAgICAgcmV0dXJuIHJ4Lm1lcmdlKFxuLy8gICAgICAgYWN0aW9uU3RyZWFtcy5oZWxsb3cucGlwZSgpLFxuLy8gICAgICAgYWN0aW9uJC5waXBlKFxuLy8gICAgICAgICBvZlR5cGUoJ2hlbGxvdycsICdoZWxsb3cnKSxcbi8vICAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25zLndvcmxkKCkpXG4vLyAgICAgICApLFxuLy8gICAgICAgYWN0aW9uJC5waXBlKFxuLy8gICAgICAgICBvZlR5cGUoJ3dvcmxkJyksXG4vLyAgICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4vLyAgICAgICApLFxuLy8gICAgICAgYWN0aW9uJC5waXBlKFxuLy8gICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuLy8gICAgICAgICBvcC50YXAoYWN0aW9uID0+IHR5cGVvZiBhY3Rpb24ucGF5bG9hZC5kYXRhID09PSAnc3RyaW5nJylcbi8vICAgICAgICksXG4vLyAgICAgICBhY3Rpb24kLnBpcGUoXG4vLyAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbi8vICAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbi8vICAgICAgICksXG4vLyAgICAgICBhY3Rpb24kLnBpcGUoXG4vLyAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdywgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci53b3JsZCksXG4vLyAgICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQpXG4vLyAgICAgICApXG4vLyAgICAgKS5waXBlKG9wLmlnbm9yZUVsZW1lbnRzKCkpO1xuLy8gICB9O1xuLy8gfSk7XG5cbiJdfQ==