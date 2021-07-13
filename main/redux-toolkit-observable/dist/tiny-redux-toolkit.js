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
    var multicaseActionMap = {};
    var splitActions = {};
    var sourceSub;
    var _loop_1 = function (reducerName) {
        var subject = multicaseActionMap[actionCreators[reducerName].type] = new rx.Subject();
        // eslint-disable-next-line no-loop-func
        splitActions[reducerName] = rx.defer(function () {
            if (sourceSub == null)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(function () {
            if (sourceSub) {
                sourceSub.unsubscribe();
                sourceSub = undefined;
            }
        }));
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_1(reducerName);
    }
    var source = action$.pipe(op.share(), op.map(function (action) {
        var match = multicaseActionMap[action.type];
        if (match) {
            match.next(action);
        }
    }));
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
            var newState = action.reducer(shallowCopied, action.payload);
            inReducer = false;
            executingReducer = false;
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
var demoSlice = createSlice({
    name: 'demo',
    initialState: {},
    reducers: {
        hellow: function (s, greeting) { },
        world: function (s) { }
    }
});
demoSlice.addEpic(function (slice, ofType) {
    return function (action$, state$) {
        var actionStreams = castByActionType(slice.actions, action$);
        return rx.merge(actionStreams.hellow.pipe(), action$.pipe(ofType('hellow', 'hellow'), op.map(function (action) { return slice.actions.world(); })), action$.pipe(ofType('world'), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actions.hellow), op.tap(function (action) { return typeof action.payload.data === 'string'; })), action$.pipe(ofPayloadAction(slice.actions.world), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(function (action) { return action.payload; }))).pipe(op.ignoreElements());
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQStFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUlwRCxJQUFNLGtCQUFrQixHQUE2RSxFQUFFLENBQUM7SUFDeEcsSUFBTSxZQUFZLEdBQW1FLEVBQUUsQ0FBQztJQUV4RixJQUFJLFNBQXNDLENBQUM7NEJBQ2hDLFdBQVc7UUFDcEIsSUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBcUMsQ0FBQztRQUUzSCx3Q0FBd0M7UUFDeEMsWUFBWSxDQUFDLFdBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO1lBQzlDLElBQUksU0FBUyxJQUFJLElBQUk7Z0JBQ25C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QUssRUFBQyxDQUFDLEVBQTVDLENBQTRDLENBQUMsQ0FDL0QsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQWUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFDNUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sQ0FBQyxPQUFPLEVBQWQsQ0FBYyxDQUFDLENBQ2pDLENBQ0YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoaXMgZmlsZSBwcm92aWRlIHNvbWUgaG9va3Mgd2hpY2ggbGV2ZXJhZ2VzIFJ4SlMgdG8gbWltaWMgUmVkdXgtdG9vbGtpdCArIFJlZHV4LW9ic2VydmFibGVcbiAqIHdoaWNoIGlzIHN1cHBvc2VkIHRvIGJlIHVzZWQgaW5kZXBlbmRlbnRseSB3aXRoaW4gYW55IFJlYWN0IGNvbXBvbmVudCBpbiBjYXNlIHlvdXIgY29tcG9uZW50IGhhcyBcbiAqIGNvbXBsaWNhdGVkIGFzeW5jIHN0YXRlIGNoYW5nZSBsb2dpYy5cbiAqIFxuICogLSBpdCBpcyBzbWFsbCBhbmQgc3VwcG9zZWQgdG8gYmUgd2VsbCBwZXJmb3JtZWRcbiAqIC0gaXQgZG9lcyBub3QgdXNlIEltbWVySlMsIHlvdSBzaG91bGQgdGFrZSBjYXJlIG9mIGltbXV0YWJpbGl0eSBvZiBzdGF0ZSBieSB5b3Vyc2VsZlxuICogLSBiZWNhdXNlIHRoZXJlIGlzIG5vIEltbWVySlMsIHlvdSBjYW4gcHV0IGFueSB0eXBlIG9mIE9iamVjdCBpbiBzdGF0ZSBpbmNsdWRpbmcgdGhvc2UgYXJlIG5vdCBmcmllbmRseSBieSBJbW1lckpTXG4gKi9cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb248Uz4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHJlZHVjZXI/KG9sZDogUyk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBheWxvYWRBY3Rpb248UywgUCA9IGFueT4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFA7XG4gIHJlZHVjZXI/KG9sZDogUywgcGF5bG9hZDogUCk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlZHVjZXJzPFM+IHtcbiAgLyoqIFJldHVybmluZyBgdW5kZWZpbmVkIC8gdm9pZGAgaGFzIHNhbWUgZWZmZWN0IG9mIHJldHVybmluZyBvbGQgc3RhdGUgcmVmZXJlbmNlLFxuICAgKiBSZXR1cm5pbmcgYSBicmFuZCBuZXcgc3RhdGUgb2JqZWN0IGZvciBpbW11dGFiaWxpdHkgaW4gbm9ybWFsIGNhc2UuXG4gICAqL1xuICBbdHlwZTogc3RyaW5nXTogKHN0YXRlOiBTLCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQWN0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiA6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCB1bmtub3duPjtcbn07XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkNyZWF0b3I8UywgUD4gPSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4gfCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD47XG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHtcbiAgKCk6IEFjdGlvbjxTPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+IHtcbiAgKHBheWxvYWQ6IFApOiBQYXlsb2FkQWN0aW9uPFMsIFA+O1xuICB0eXBlOiBzdHJpbmc7XG59XG5cbnR5cGUgT3V0cHV0QWN0aW9uT2JzPFMsIFIgZXh0ZW5kcyBSZWR1Y2Vyczxhbnk+LCBLIGV4dGVuZHMga2V5b2YgUj4gPVxuICByeC5PYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+IDogUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDogUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPj47XG4gIC8vIHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFBhcmFtZXRlcnM8UltLXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW0tdPlsxXSwgSz4+O1xuXG50eXBlIE9mVHlwZVBpcGVPcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9IChzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4pID0+IE91dHB1dEFjdGlvbk9iczxTLCBSLCBLPjtcblxuLyoqIHNhbWUgYXMgb2ZQYXlsb2FkQWN0aW9uKCkgLCB0byBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlLCB1bmxpa2Ugb2ZQYXlsb2FkQWN0aW9uKCksIHBhcmFtZXRlciBpcyBhIHN0cmluZyBpbnN0ZWFkIG9mIGFjdGlvbkNyZWF0b3IgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIDxLMSBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzI+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFIsIEszIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMiwgYWN0aW9uVHlwZTM6IEszKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzIgfCBLMz47XG4gIDxLIGV4dGVuZHMga2V5b2YgUj4oLi4uYWN0aW9uVHlwZXM6IEtbXSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLPjtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2U8UywgUj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuZXhwb3J0IGludGVyZmFjZSBTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBzdGF0ZSQ6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPjtcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+O1xuICBkaXNwYXRjaDogKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikgPT4gdm9pZDtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyBib3VuZCB3aXRoIGRpc3BhdGNoZXIgKi9cbiAgYWN0aW9uRGlzcGF0Y2hlcjogQWN0aW9uczxTLCBSPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyAqL1xuICBhY3Rpb25zOiBBY3Rpb25zPFMsIFI+O1xuICBkZXN0cm95OiAoKSA9PiB2b2lkO1xuICBkZXN0cm95JDogcnguT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZ2V0U3RvcmUoKTogcnguT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn1cblxuZXhwb3J0IHR5cGUgRXBpYzxTLCBBJCA9IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4gPSAoYWN0aW9uczogQSQsIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiBBJDtcblxuLy8gdHlwZSBQYXlsb2FkVHlwZU9mQWN0aW9uPEFjdGlvbkNyZWF0b3JUeXBlPiA9IEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPGFueT4gPyB2b2lkIDpcbi8vICAgQWN0aW9uQ3JlYXRvclR5cGUgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8YW55LCBpbmZlciBQPiA/IFAgOiBuZXZlcjtcblxuLyoqIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUgKi9cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUD4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxTLCBQPj47XG4gIC8vIChzb3VyY2U6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPGFueT4+KSA9PiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UywgUGF5bG9hZFR5cGVPZkFjdGlvbjxBPj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQLCBTMSwgUDE+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+LCBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UzEsIFAxPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55ICwgUGF5bG9hZEFjdGlvbjxTLCBQPiB8IFBheWxvYWRBY3Rpb248UzEsIFAxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFAsIFMxLCBQMSwgUzIsIFAyPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPiwgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFMxLCBQMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcjxTMiwgUDI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UywgUD4gfCBQYXlsb2FkQWN0aW9uPFMxLCBQMT4gfCBQYXlsb2FkQWN0aW9uPFMyLCBQMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbihcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8YW55LCBhbnk+W10pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25DcmVhdG9ycy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBhYy50eXBlKSlcbiAgICApO1xuICB9O1xufVxuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyZSBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbnM8UywgUj4sXG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+Pik6XG4gIHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn0ge1xuXG5cbiAgICBjb25zdCBtdWx0aWNhc2VBY3Rpb25NYXA6IHtbSzogc3RyaW5nXTogcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+IHwgdW5kZWZpbmVkfSA9IHt9O1xuICAgIGNvbnN0IHNwbGl0QWN0aW9uczoge1tLIGluIGtleW9mIFJdPzogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn0gPSB7fTtcblxuICAgIGxldCBzb3VyY2VTdWI6IHJ4LlN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgY29uc3Qgc3ViamVjdCA9IG11bHRpY2FzZUFjdGlvbk1hcFthY3Rpb25DcmVhdG9yc1tyZWR1Y2VyTmFtZV0udHlwZV0gPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+KCk7XG5cbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgIHNwbGl0QWN0aW9uc1tyZWR1Y2VyTmFtZSBhcyBrZXlvZiBSXSA9IHJ4LmRlZmVyKCgpID0+IHtcbiAgICAgICAgaWYgKHNvdXJjZVN1YiA9PSBudWxsKVxuICAgICAgICAgIHNvdXJjZVN1YiA9IHNvdXJjZS5zdWJzY3JpYmUoKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCkgYXMgcnguT2JzZXJ2YWJsZTxhbnk+O1xuICAgICAgfSkucGlwZShcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZVN1Yikge1xuICAgICAgICAgICAgc291cmNlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBzb3VyY2VTdWIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gYWN0aW9uJC5waXBlKFxuICAgICAgb3Auc2hhcmUoKSxcbiAgICAgIG9wLm1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IG11bHRpY2FzZUFjdGlvbk1hcFthY3Rpb24udHlwZV07XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgIG1hdGNoLm5leHQoYWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiBzcGxpdEFjdGlvbnMgYXMge1tLIGluIGtleW9mIFJdOiByeC5PYnNlcnZhYmxlPFJldHVyblR5cGU8QWN0aW9uczxTLCBSPltLXT4+fTtcbn1cblxuY29uc3Qgc2xpY2VDb3VudDROYW1lOiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZU9wdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgLyoqIEdlbmVyYXRlIHVuaXF1ZSBJRCBhcyBwYXJ0IG9mIHNsaWNlJ3MgbmFtZSwgZGVmYXVsdDogdHJ1ZSAqL1xuICBnZW5lcmF0ZUlkPzogYm9vbGVhbjtcbiAgZGVidWc/OiBib29sZWFuO1xuICByb290U3RvcmU/OiByeC5CZWhhdmlvclN1YmplY3Q8e1trOiBzdHJpbmddOiBTfT47XG59XG5cbi8qKlxuICogUmVkdWNlcnMgYW5kIGluaXRpYWxTdGF0ZSBhcmUgcmV1c2VkIGNyb3NzIG11bHRpcGxlIGNvbXBvbmVudFxuICogXG4gKiAgU2xpY2UgLS0tIENvbXBvbmVudCBpbnN0YW5jZSAoc3RhdGUsIGFjdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZTxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9wdDogU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2U8UywgUj4ge1xuICBsZXQgbmFtZSA9IG9wdC5uYW1lO1xuICBpZiAob3B0LmdlbmVyYXRlSWQgPT09IHVuZGVmaW5lZCB8fCBvcHQuZ2VuZXJhdGVJZCA9PT0gdHJ1ZSkge1xuICAgIGlmIChzbGljZUNvdW50NE5hbWVbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgc2xpY2VDb3VudDROYW1lW25hbWVdID0gMDtcbiAgICB9XG4gICAgb3B0Lm5hbWUgPSBuYW1lID0gbmFtZSArICcuJyArICgrK3NsaWNlQ291bnQ0TmFtZVtuYW1lXSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ3JlYXRvcnMgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0ge30gYXMgQWN0aW9uczxTLCBSPjtcblxuICBmb3IgKGNvbnN0IFtrZXksIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKG9wdC5yZWR1Y2VycykpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZSArICcvJyArIGtleTtcbiAgICBjb25zdCBjcmVhdG9yID0gKChwYXlsb2FkOiB1bmtub3duKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7dHlwZSwgcGF5bG9hZCwgcmVkdWNlcn07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBhbnk+O1xuICAgIGNyZWF0b3IudHlwZSA9IHR5cGU7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGFjdGlvbkNyZWF0b3JzW2tleSBhcyBrZXlvZiBSXSA9IGNyZWF0b3IgYXMgYW55O1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdID0gKChwYXlsb2FkPzogYW55KSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSBjcmVhdG9yKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuXG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0udHlwZSA9IGNyZWF0b3IudHlwZTtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Uz4ob3B0LmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHVucHJvY2Vzc2VkQWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuXG4gIGZ1bmN0aW9uIG9mVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgICAuLi5hY3Rpb25UeXBlczogVFtdKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uVHlwZXMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gbmFtZSArICcvJyArIGFjKSlcbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikge1xuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICBsZXQgYWN0aW9uQ291bnQgPSAwO1xuICBsZXQgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAvLyBUbyB3YXJuIGRldmVsb3BlciB0aGF0IG5vIGFjdGlvbiBkaXNwYXRjaGluZyBzaG91ZCBiZSBjYWxsZWQgaW5zaWRlIGEgcmVkdWNlciwgdGhpcyBpcyBzaWRlLWVmZmVjdHMgYW5kIFxuICAvLyB3aWxsIGxlYWRzIHRvIHJlY3Vyc2l2ZSByZWR1Y2VyXG4gIGxldCBpblJlZHVjZXIgPSBmYWxzZTtcblxuICBjb25zdCBzdWIgPSByeC5tZXJnZShcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShcbiAgICAgIC8vIG9wLm9ic2VydmVPbihyeC5xdWV1ZVNjaGVkdWxlciksIC8vIEF2b2lkIHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIGFjdGlvbiBpbnNpZGUgYW4gcmVkdWNlciwgYnV0IG5vcm1hbGx5IHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIHNob3VsZCBiZSB3YXJuZWQgYW5kIGZvcmJpZGRlblxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChvcHQuZGVidWcpIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOmFjdGlvbiBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZmFlNGZjOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbi5yZWR1Y2VyKSB7XG4gICAgICAgICAgY29uc3QgY3VyclN0YXRlID0gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgICAgICAgY29uc3Qgc2hhbGxvd0NvcGllZCA9IHsuLi5jdXJyU3RhdGUsIF9fYWM6ICsrYWN0aW9uQ291bnR9O1xuICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGlmIChpblJlZHVjZXIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRG8gbm90IGRpc3BhdGNoIGFjdGlvbiBpbnNpZGUgYSByZWR1Y2VyISAoYWN0aW9uOiAke2FjdGlvbi50eXBlfSlgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5SZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGFjdGlvbi5yZWR1Y2VyKHNoYWxsb3dDb3BpZWQsIChhY3Rpb24gYXMgUGF5bG9hZEFjdGlvbjxTPikucGF5bG9hZCk7XG4gICAgICAgICAgaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBuZXdTdGF0ZSA/IG5ld1N0YXRlIDogc2hhbGxvd0NvcGllZDtcbiAgICAgICAgICBzdGF0ZSQubmV4dChjaGFuZ2VkKTtcbiAgICAgICAgfVxuICAgICAgICBhY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgICAgIH0pLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ3JlZHVjZXIgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyIGFzIHVua25vd259O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICksXG4gICAgc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDpzdGF0ZSBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZTk4ZGY1OycsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIG9wdC5yb290U3RvcmUgPyBzdGF0ZSQucGlwZShcbiAgICAgIG9wLnRhcChzdGF0ZSA9PiBvcHQucm9vdFN0b3JlIS5uZXh0KHsuLi5vcHQucm9vdFN0b3JlPy5nZXRWYWx1ZSgpLCBbb3B0Lm5hbWVdOiBzdGF0ZX0pKVxuICAgICApIDogcnguRU1QVFlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGRpc3BhdGNoKHtcbiAgICAgIHR5cGU6ICdfX09uRGVzdHJveSdcbiAgICB9KTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKHNsaWNlLCBvZlR5cGUgYXMgT2ZUeXBlRm48UywgUj4pO1xuICAgICAgICAgIGlmIChlcGljKVxuICAgICAgICAgICAgcmV0dXJuIGVwaWMoYWN0aW9uJCwgc3RhdGUkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbCh1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSkpLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiBkaXNwYXRjaChhY3Rpb24pKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdlcGljIGVycm9yJyxcbiAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGNvbnN0IHNsaWNlOiBTbGljZTxTLCBSPiA9IHtcbiAgICBuYW1lLFxuICAgIHN0YXRlJCxcbiAgICBhY3Rpb24kLFxuICAgIGFjdGlvbnM6IGFjdGlvbkNyZWF0b3JzLFxuICAgIGRpc3BhdGNoLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgZGVzdHJveSxcbiAgICBkZXN0cm95JDogdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpLFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlJDtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgaWYgKGV4ZWN1dGluZ1JlZHVjZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUbyBiZSBjb25zaXN0ZW50IHdpdGggUmVkdXhcXCdzIGJlaGF2aW91ciwgc2xpY2UuZ2V0U3RhdGUoKSBpcyBub3QgYWxsb3dlZCB0byBiZSBpbnZva2VkIGluc2lkZSBhIHJlZHVjZXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzbGljZTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuIGV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5jb25zdCBkZW1vU2xpY2UgPSBjcmVhdGVTbGljZSh7XG4gIG5hbWU6ICdkZW1vJyxcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyB7b2s/OiBib29sZWFuOyBlcnJvcj86IEVycm9yfSxcbiAgcmVkdWNlcnM6IHtcbiAgICBoZWxsb3cocywgZ3JlZXRpbmc6IHtkYXRhOiBzdHJpbmd9KSB7fSxcbiAgICB3b3JsZChzKSB7fVxuICB9XG59KTtcbmRlbW9TbGljZS5hZGRFcGljKChzbGljZSwgb2ZUeXBlKSA9PiB7XG4gIHJldHVybiAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25TdHJlYW1zLmhlbGxvdy5waXBlKCksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnaGVsbG93JywgJ2hlbGxvdycpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbnMud29ybGQoKSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnd29ybGQnKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhlbGxvdyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gdHlwZW9mIGFjdGlvbi5wYXlsb2FkLmRhdGEgPT09ICdzdHJpbmcnKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93LCBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZClcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcblxuIl19