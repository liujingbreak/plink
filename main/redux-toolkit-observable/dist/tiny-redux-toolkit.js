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
    var sourceSub;
    var multicaseActionMap = {};
    var splitActions = {};
    var _loop_1 = function (reducerName) {
        var subject = multicaseActionMap[actionCreators[reducerName].type] = new rx.Subject();
        splitActions[reducerName] = rx.defer(function () {
            if (sourceSub == null)
                sourceSub = source.subscribe();
            return subject.asObservable();
        }).pipe(op.finalize(function () {
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
        actionCreators[key] = creator;
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
            // tslint:disable-next-line: no-console
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
            // tslint:disable-next-line: no-console
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
        return rx.merge(action$.pipe(ofType('hellow', 'hellow'), op.map(function (action) { return slice.actions.world(); })), action$.pipe(ofType('world'), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actions.hellow), op.tap(function (action) { return typeof action.payload.data === 'string'; })), action$.pipe(ofPayloadAction(slice.actions.world), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(function (action) { return action.payload; }))).pipe(op.ignoreElements());
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQStFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUdwRCxJQUFJLFNBQXNDLENBQUM7SUFDM0MsSUFBTSxrQkFBa0IsR0FBNkUsRUFBRSxDQUFDO0lBQ3hHLElBQU0sWUFBWSxHQUFtRSxFQUFFLENBQUM7NEJBQzdFLFdBQVc7UUFDcEIsSUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBeUIsQ0FBQztRQUMvRyxZQUFZLENBQUMsV0FBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7WUFDOUMsSUFBSSxTQUFTLElBQUksSUFBSTtnQkFDbkIsU0FBUyxHQUFHLE1B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QUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sQ0FBQyxPQUFPLEVBQWQsQ0FBYyxDQUFDLENBQ2pDLENBQ0YsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoaXMgZmlsZSBwcm92aWRlIHNvbWUgaG9va3Mgd2hpY2ggbGV2ZXJhZ2VzIFJ4SlMgdG8gbWltaWMgUmVkdXgtdG9vbGtpdCArIFJlZHV4LW9ic2VydmFibGVcbiAqIHdoaWNoIGlzIHN1cHBvc2VkIHRvIGJlIHVzZWQgaW5kZXBlbmRlbnRseSB3aXRoaW4gYW55IFJlYWN0IGNvbXBvbmVudCBpbiBjYXNlIHlvdXIgY29tcG9uZW50IGhhcyBcbiAqIGNvbXBsaWNhdGVkIGFzeW5jIHN0YXRlIGNoYW5nZSBsb2dpYy5cbiAqIFxuICogLSBpdCBpcyBzbWFsbCBhbmQgc3VwcG9zZWQgdG8gYmUgd2VsbCBwZXJmb3JtZWRcbiAqIC0gaXQgZG9lcyBub3QgdXNlIEltbWVySlMsIHlvdSBzaG91bGQgdGFrZSBjYXJlIG9mIGltbXV0YWJpbGl0eSBvZiBzdGF0ZSBieSB5b3Vyc2VsZlxuICogLSBiZWNhdXNlIHRoZXJlIGlzIG5vIEltbWVySlMsIHlvdSBjYW4gcHV0IGFueSB0eXBlIG9mIE9iamVjdCBpbiBzdGF0ZSBpbmNsdWRpbmcgdGhvc2UgYXJlIG5vdCBmcmllbmRseSBieSBJbW1lckpTXG4gKi9cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb248Uz4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHJlZHVjZXI/KG9sZDogUyk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBheWxvYWRBY3Rpb248UywgUCA9IGFueT4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFA7XG4gIHJlZHVjZXI/KG9sZDogUywgcGF5bG9hZDogUCk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlZHVjZXJzPFM+IHtcbiAgLyoqIFJldHVybmluZyBgdW5kZWZpbmVkIC8gdm9pZGAgaGFzIHNhbWUgZWZmZWN0IG9mIHJldHVybmluZyBvbGQgc3RhdGUgcmVmZXJlbmNlLFxuICAgKiBSZXR1cm5pbmcgYSBicmFuZCBuZXcgc3RhdGUgb2JqZWN0IGZvciBpbW11dGFiaWxpdHkgaW4gbm9ybWFsIGNhc2UuXG4gICAqL1xuICBbdHlwZTogc3RyaW5nXTogKHN0YXRlOiBTLCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQWN0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTogUltLXSBleHRlbmRzIChzOiBhbnkpID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBhbnksIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiA6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCB1bmtub3duPjtcbn07XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkNyZWF0b3I8UywgUD4gPSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4gfCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD47XG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHtcbiAgKCk6IEFjdGlvbjxTPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+IHtcbiAgKHBheWxvYWQ6IFApOiBQYXlsb2FkQWN0aW9uPFMsIFA+O1xuICB0eXBlOiBzdHJpbmc7XG59XG5cbnR5cGUgT3V0cHV0QWN0aW9uT2JzPFMsIFIgZXh0ZW5kcyBSZWR1Y2Vyczxhbnk+LCBLIGV4dGVuZHMga2V5b2YgUj4gPVxuICByeC5PYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+IDogUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDogUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPj47XG4gIC8vIHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFBhcmFtZXRlcnM8UltLXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW0tdPlsxXSwgSz4+O1xuXG50eXBlIE9mVHlwZVBpcGVPcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9IChzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4pID0+IE91dHB1dEFjdGlvbk9iczxTLCBSLCBLPjtcblxuLyoqIHNhbWUgYXMgb2ZQYXlsb2FkQWN0aW9uKCkgLCB0byBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlLCB1bmxpa2Ugb2ZQYXlsb2FkQWN0aW9uKCksIHBhcmFtZXRlciBpcyBhIHN0cmluZyBpbnN0ZWFkIG9mIGFjdGlvbkNyZWF0b3IgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIDxLMSBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzI+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFIsIEszIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMiwgYWN0aW9uVHlwZTM6IEszKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzIgfCBLMz47XG4gIDxLIGV4dGVuZHMga2V5b2YgUj4oLi4uYWN0aW9uVHlwZXM6IEtbXSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLPjtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2U8UywgUj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuZXhwb3J0IGludGVyZmFjZSBTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBzdGF0ZSQ6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPjtcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+O1xuICBkaXNwYXRjaDogKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikgPT4gdm9pZDtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyBib3VuZCB3aXRoIGRpc3BhdGNoZXIgKi9cbiAgYWN0aW9uRGlzcGF0Y2hlcjogQWN0aW9uczxTLCBSPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyAqL1xuICBhY3Rpb25zOiBBY3Rpb25zPFMsIFI+O1xuICBkZXN0cm95OiAoKSA9PiB2b2lkO1xuICBkZXN0cm95JDogcnguT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZ2V0U3RvcmUoKTogcnguT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn1cblxuZXhwb3J0IHR5cGUgRXBpYzxTLCBBJCA9IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4gPSAoYWN0aW9uczogQSQsIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiBBJDtcblxuLy8gdHlwZSBQYXlsb2FkVHlwZU9mQWN0aW9uPEFjdGlvbkNyZWF0b3JUeXBlPiA9IEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPGFueT4gPyB2b2lkIDpcbi8vICAgQWN0aW9uQ3JlYXRvclR5cGUgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8YW55LCBpbmZlciBQPiA/IFAgOiBuZXZlcjtcblxuLyoqIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUgKi9cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUD4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxTLCBQPj47XG4gIC8vIChzb3VyY2U6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPGFueT4+KSA9PiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UywgUGF5bG9hZFR5cGVPZkFjdGlvbjxBPj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQLCBTMSwgUDE+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+LCBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UzEsIFAxPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55ICwgUGF5bG9hZEFjdGlvbjxTLCBQPiB8IFBheWxvYWRBY3Rpb248UzEsIFAxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFAsIFMxLCBQMSwgUzIsIFAyPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPiwgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFMxLCBQMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcjxTMiwgUDI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UywgUD4gfCBQYXlsb2FkQWN0aW9uPFMxLCBQMT4gfCBQYXlsb2FkQWN0aW9uPFMyLCBQMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbihcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8YW55LCBhbnk+W10pOiByeC5PcGVyYXRvckZ1bmN0aW9uPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93biwgdW5rbm93bj4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25DcmVhdG9ycy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBhYy50eXBlKSlcbiAgICApO1xuICB9O1xufVxuXG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyZSBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbnM8UywgUj4sXG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+Pik6XG4gIHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn0ge1xuXG4gICAgbGV0IHNvdXJjZVN1YjogcnguU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG11bHRpY2FzZUFjdGlvbk1hcDoge1tLOiBzdHJpbmddOiByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4gfCB1bmRlZmluZWR9ID0ge307XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zOiB7W0sgaW4ga2V5b2YgUl0/OiByeC5PYnNlcnZhYmxlPFJldHVyblR5cGU8QWN0aW9uczxTLCBSPltLXT4+fSA9IHt9O1xuICAgIGZvciAoY29uc3QgcmVkdWNlck5hbWUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpKSB7XG4gICAgICBjb25zdCBzdWJqZWN0ID0gbXVsdGljYXNlQWN0aW9uTWFwW2FjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXS50eXBlXSA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248UywgYW55Pj4oKTtcbiAgICAgIHNwbGl0QWN0aW9uc1tyZWR1Y2VyTmFtZSBhcyBrZXlvZiBSXSA9IHJ4LmRlZmVyKCgpID0+IHtcbiAgICAgICAgaWYgKHNvdXJjZVN1YiA9PSBudWxsKVxuICAgICAgICAgIHNvdXJjZVN1YiA9IHNvdXJjZS5zdWJzY3JpYmUoKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCkgYXMgcnguT2JzZXJ2YWJsZTxhbnk+O1xuICAgICAgfSkucGlwZShcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIG9wLnNoYXJlKCksXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtdWx0aWNhc2VBY3Rpb25NYXBbYWN0aW9uLnR5cGVdO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBtYXRjaC5uZXh0KGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zIGFzIHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn07XG59XG5cbmNvbnN0IHNsaWNlQ291bnQ0TmFtZToge1tuYW1lOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2VPcHRpb25zPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGluaXRpYWxTdGF0ZTogUztcbiAgcmVkdWNlcnM6IFI7XG4gIC8qKiBHZW5lcmF0ZSB1bmlxdWUgSUQgYXMgcGFydCBvZiBzbGljZSdzIG5hbWUsIGRlZmF1bHQ6IHRydWUgKi9cbiAgZ2VuZXJhdGVJZD86IGJvb2xlYW47XG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgcm9vdFN0b3JlPzogcnguQmVoYXZpb3JTdWJqZWN0PHtbazogc3RyaW5nXTogU30+O1xufVxuXG4vKipcbiAqIFJlZHVjZXJzIGFuZCBpbml0aWFsU3RhdGUgYXJlIHJldXNlZCBjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRcbiAqIFxuICogIFNsaWNlIC0tLSBDb21wb25lbnQgaW5zdGFuY2UgKHN0YXRlLCBhY3Rpb25zKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2U8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihvcHQ6IFNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlPFMsIFI+IHtcbiAgbGV0IG5hbWUgPSBvcHQubmFtZTtcbiAgaWYgKG9wdC5nZW5lcmF0ZUlkID09PSB1bmRlZmluZWQgfHwgb3B0LmdlbmVyYXRlSWQgPT09IHRydWUpIHtcbiAgICBpZiAoc2xpY2VDb3VudDROYW1lW25hbWVdID09IG51bGwpIHtcbiAgICAgIHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9IDA7XG4gICAgfVxuICAgIG9wdC5uYW1lID0gbmFtZSA9IG5hbWUgKyAnLicgKyAoKytzbGljZUNvdW50NE5hbWVbbmFtZV0pO1xuICB9XG4gIGNvbnN0IGFjdGlvbkNyZWF0b3JzID0ge30gYXMgQWN0aW9uczxTLCBSPjtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG5cbiAgZm9yIChjb25zdCBba2V5LCByZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhvcHQucmVkdWNlcnMpKSB7XG4gICAgY29uc3QgdHlwZSA9IG5hbWUgKyAnLycgKyBrZXk7XG4gICAgY29uc3QgY3JlYXRvciA9ICgocGF5bG9hZDogYW55KSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7dHlwZSwgcGF5bG9hZCwgcmVkdWNlcn07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcbiAgICBjcmVhdG9yLnR5cGUgPSB0eXBlO1xuICAgIGFjdGlvbkNyZWF0b3JzW2tleSBhcyBrZXlvZiBSXSA9IGNyZWF0b3I7XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgocGF5bG9hZD86IGFueSkgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0gKGNyZWF0b3IgYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIGFueT4pKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdLnR5cGUgPSBjcmVhdG9yLnR5cGU7XG4gIH1cblxuICBjb25zdCBzdGF0ZSQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PFM+KG9wdC5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB1bnByb2Nlc3NlZEFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuICBjb25zdCBhY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcblxuICBmdW5jdGlvbiBvZlR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4oXG4gICAgLi4uYWN0aW9uVHlwZXM6IFRbXSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvblR5cGVzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IG5hbWUgKyAnLycgKyBhYykpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pIHtcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgbGV0IGFjdGlvbkNvdW50ID0gMDtcbiAgbGV0IGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgLy8gVG8gd2FybiBkZXZlbG9wZXIgdGhhdCBubyBhY3Rpb24gZGlzcGF0Y2hpbmcgc2hvdWQgYmUgY2FsbGVkIGluc2lkZSBhIHJlZHVjZXIsIHRoaXMgaXMgc2lkZS1lZmZlY3RzIGFuZCBcbiAgLy8gd2lsbCBsZWFkcyB0byByZWN1cnNpdmUgcmVkdWNlclxuICBsZXQgaW5SZWR1Y2VyID0gZmFsc2U7XG5cbiAgY29uc3Qgc3ViID0gcngubWVyZ2UoXG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICAvLyBvcC5vYnNlcnZlT24ocngucXVldWVTY2hlZHVsZXIpLCAvLyBBdm9pZCByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBhY3Rpb24gaW5zaWRlIGFuIHJlZHVjZXIsIGJ1dCBub3JtYWxseSByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBzaG91bGQgYmUgd2FybmVkIGFuZCBmb3JiaWRkZW5cbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6YWN0aW9uIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNmYWU0ZmM7JywgYWN0aW9uLnR5cGUpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoYWN0aW9uLnJlZHVjZXIpIHtcbiAgICAgICAgICBjb25zdCBjdXJyU3RhdGUgPSBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgaWYgKGluUmVkdWNlcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpblJlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc2hhbGxvd0NvcGllZCwgKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkKTtcbiAgICAgICAgICBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1N0YXRlID8gbmV3U3RhdGUgOiBzaGFsbG93Q29waWVkO1xuICAgICAgICAgIHN0YXRlJC5uZXh0KGNoYW5nZWQpO1xuICAgICAgICB9XG4gICAgICAgIGFjdGlvbiQubmV4dChhY3Rpb24pO1xuICAgICAgfSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAncmVkdWNlciBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnJ9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICksXG4gICAgc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICAgKSA6IHJ4LkVNUFRZXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhzbGljZSwgb2ZUeXBlIGFzIE9mVHlwZUZuPFMsIFI+KTtcbiAgICAgICAgICBpZiAoZXBpYylcbiAgICAgICAgICAgIHJldHVybiBlcGljKGFjdGlvbiQsIHN0YXRlJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwodW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpKSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4gZGlzcGF0Y2goYWN0aW9uKSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnZXBpYyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnJ9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgc2xpY2U6IFNsaWNlPFMsIFI+ID0ge1xuICAgIG5hbWUsXG4gICAgc3RhdGUkLFxuICAgIGFjdGlvbiQsXG4gICAgYWN0aW9uczogYWN0aW9uQ3JlYXRvcnMsXG4gICAgZGlzcGF0Y2gsXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBkZXN0cm95LFxuICAgIGRlc3Ryb3kkOiB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSksXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGUkO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICBpZiAoZXhlY3V0aW5nUmVkdWNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvIGJlIGNvbnNpc3RlbnQgd2l0aCBSZWR1eFxcJ3MgYmVoYXZpb3VyLCBzbGljZS5nZXRTdGF0ZSgpIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGludm9rZWQgaW5zaWRlIGEgcmVkdWNlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHNsaWNlO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG4gZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlKHtcbiAgbmFtZTogJ2RlbW8nLFxuICBpbml0aWFsU3RhdGU6IHt9IGFzIHtvaz86IGJvb2xlYW47IGVycm9yPzogRXJyb3I7fSxcbiAgcmVkdWNlcnM6IHtcbiAgICBoZWxsb3cocywgZ3JlZXRpbmc6IHtkYXRhOiBzdHJpbmd9KSB7fSxcbiAgICB3b3JsZChzKSB7fVxuICB9XG59KTtcbmRlbW9TbGljZS5hZGRFcGljKChzbGljZSwgb2ZUeXBlKSA9PiB7XG4gIHJldHVybiAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ2hlbGxvdycsICdoZWxsb3cnKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25zLndvcmxkKCkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ3dvcmxkJyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHR5cGVvZiBhY3Rpb24ucGF5bG9hZC5kYXRhID09PSAnc3RyaW5nJylcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdywgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQpXG4gICAgICApXG4gICAgKS5waXBlKG9wLmlnbm9yZUVsZW1lbnRzKCkpO1xuICB9O1xufSk7XG5cbiJdfQ==