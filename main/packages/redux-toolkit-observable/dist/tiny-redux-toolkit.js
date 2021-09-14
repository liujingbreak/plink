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
exports.sliceRefActionOp = exports.action$OfSlice = exports.createSlice = exports.isActionOfCreator = exports.castByActionType = exports.ofPayloadAction = void 0;
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
    var source = action$.pipe(op.share());
    var splitActions = {};
    var _loop_1 = function (reducerName) {
        Object.defineProperty(splitActions, reducerName, {
            get: function () {
                return source.pipe(ofPayloadAction(actionCreators[reducerName]));
            }
        });
    };
    for (var _i = 0, _a = Object.keys(actionCreators); _i < _a.length; _i++) {
        var reducerName = _a[_i];
        _loop_1(reducerName);
    }
    return splitActions;
}
exports.castByActionType = castByActionType;
function isActionOfCreator(action, actionCreator) {
    return action.type === actionCreator.type;
}
exports.isActionOfCreator = isActionOfCreator;
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
function action$OfSlice(sliceHelper, actionType) {
    return new rx.Observable(function (sub) {
        sliceHelper.addEpic(function (slice) { return function (action$) {
            return action$.pipe(ofPayloadAction(slice.actions[actionType]), op.map(function (action) { return sub.next(action); }), op.ignoreElements());
        }; });
    });
}
exports.action$OfSlice = action$OfSlice;
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
        // slice.actionDispatcher.abc();
        return rx.merge(actionStreams.hellow.pipe(), action$.pipe(ofType('hellow', 'hellow'), op.map(function (action) { return slice.actions.world(); })), action$.pipe(ofType('world'), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actions.hellow), op.tap(function (action) { return typeof action.payload.data === 'string'; })), action$.pipe(ofPayloadAction(slice.actions.world), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(function (action) { return action.payload; }))).pipe(op.ignoreElements());
    };
});
action$OfSlice(demoSlice, 'hellow').pipe(op.tap(function (action) { return action; }));
action$OfSlice(demoSlice, 'world').pipe(op.tap(function (action) { return action; }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQWdGckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFHRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUVwRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLElBQU0sWUFBWSxHQUFHLEVBQXdCLENBQUM7NEJBRW5DLFdBQVc7UUFDcEIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFO1lBQy9DLEdBQUc7Z0JBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUM7U0FDRixDQUFDLENBQUM7O0lBTEwsS0FBMEIsVUFBMkIsRUFBM0IsS0FB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Q0FBQyxLQUFLLENBQUMsRUFDcEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLENBQUMsRUFBNUMsQ0FBNEMsQ0FBQyxDQUMvRCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQ1YsZUFBZSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUM1RSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsTUFBTSxDQUFDLE9BQU8sRUFBZCxDQUFjLENBQUMsQ0FDakMsQ0FDRixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLEVBQU4sQ0FBTSxDQUFDLENBQUMsQ0FBQztBQUNuRSxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsTUFBTSxFQUFOLENBQU0sQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoaXMgZmlsZSBwcm92aWRlIHNvbWUgaG9va3Mgd2hpY2ggbGV2ZXJhZ2VzIFJ4SlMgdG8gbWltaWMgUmVkdXgtdG9vbGtpdCArIFJlZHV4LW9ic2VydmFibGVcbiAqIHdoaWNoIGlzIHN1cHBvc2VkIHRvIGJlIHVzZWQgaW5kZXBlbmRlbnRseSB3aXRoaW4gYW55IFJlYWN0IGNvbXBvbmVudCBpbiBjYXNlIHlvdXIgY29tcG9uZW50IGhhcyBcbiAqIGNvbXBsaWNhdGVkIGFzeW5jIHN0YXRlIGNoYW5nZSBsb2dpYy5cbiAqIFxuICogLSBpdCBpcyBzbWFsbCBhbmQgc3VwcG9zZWQgdG8gYmUgd2VsbCBwZXJmb3JtZWRcbiAqIC0gaXQgZG9lcyBub3QgdXNlIEltbWVySlMsIHlvdSBzaG91bGQgdGFrZSBjYXJlIG9mIGltbXV0YWJpbGl0eSBvZiBzdGF0ZSBieSB5b3Vyc2VsZlxuICogLSBiZWNhdXNlIHRoZXJlIGlzIG5vIEltbWVySlMsIHlvdSBjYW4gcHV0IGFueSB0eXBlIG9mIE9iamVjdCBpbiBzdGF0ZSBpbmNsdWRpbmcgdGhvc2UgYXJlIG5vdCBmcmllbmRseSBieSBJbW1lckpTXG4gKi9cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb248Uz4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHJlZHVjZXI/KG9sZDogUyk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBheWxvYWRBY3Rpb248UywgUCA9IGFueT4ge1xuICB0eXBlOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFA7XG4gIHJlZHVjZXI/KG9sZDogUywgcGF5bG9hZDogUCk6IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBSZWR1Y2VyczxTLCBSID0gYW55PiA9IHtcbiAgLyoqIFJldHVybmluZyBgdW5kZWZpbmVkIC8gdm9pZGAgaGFzIHNhbWUgZWZmZWN0IG9mIHJldHVybmluZyBvbGQgc3RhdGUgcmVmZXJlbmNlLFxuICAgKiBSZXR1cm5pbmcgYSBicmFuZCBuZXcgc3RhdGUgb2JqZWN0IGZvciBpbW11dGFiaWxpdHkgaW4gbm9ybWFsIGNhc2UuXG4gICAqL1xuICBbSyBpbiBrZXlvZiBSXTogKHN0YXRlOiBTLCBwYXlsb2FkPzogYW55KSA9PiBTIHwgdm9pZDtcbn07XG5cbmV4cG9ydCB0eXBlIEFjdGlvbnM8UywgUj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOlxuICAgIFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiA6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCB1bmtub3duPjtcbn07XG5cbmV4cG9ydCB0eXBlIEFjdGlvbkNyZWF0b3I8UywgUD4gPSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4gfCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD47XG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHtcbiAgKCk6IEFjdGlvbjxTPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+IHtcbiAgKHBheWxvYWQ6IFApOiBQYXlsb2FkQWN0aW9uPFMsIFA+O1xuICB0eXBlOiBzdHJpbmc7XG59XG5cbnR5cGUgT3V0cHV0QWN0aW9uT2JzPFMsIFIgZXh0ZW5kcyBSZWR1Y2Vyczxhbnk+LCBLIGV4dGVuZHMga2V5b2YgUj4gPVxuICByeC5PYnNlcnZhYmxlPFJbS10gZXh0ZW5kcyAoczogUykgPT4gYW55ID8gQWN0aW9uPFM+IDogUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBQYXlsb2FkQWN0aW9uPFMsIFA+IDogUGF5bG9hZEFjdGlvbjxTLCB1bmtub3duPj47XG4gIC8vIHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFBhcmFtZXRlcnM8UltLXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW0tdPlsxXSwgSz4+O1xuXG50eXBlIE9mVHlwZVBpcGVPcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9IChzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4pID0+IE91dHB1dEFjdGlvbk9iczxTLCBSLCBLPjtcblxuLyoqIHNhbWUgYXMgb2ZQYXlsb2FkQWN0aW9uKCkgLCB0byBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlLCB1bmxpa2Ugb2ZQYXlsb2FkQWN0aW9uKCksIHBhcmFtZXRlciBpcyBhIHN0cmluZyBpbnN0ZWFkIG9mIGFjdGlvbkNyZWF0b3IgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIDxLMSBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzI+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFIsIEszIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMiwgYWN0aW9uVHlwZTM6IEszKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEsxIHwgSzIgfCBLMz47XG4gIDxLIGV4dGVuZHMga2V5b2YgUj4oLi4uYWN0aW9uVHlwZXM6IEtbXSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLPjtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IChzbGljZTogU2xpY2U8UywgUj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuZXhwb3J0IGludGVyZmFjZSBTbGljZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBzdGF0ZSQ6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPjtcbiAgYWN0aW9uJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248Uz4+O1xuICBkaXNwYXRjaDogKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikgPT4gdm9pZDtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyBib3VuZCB3aXRoIGRpc3BhdGNoZXIgKi9cbiAgYWN0aW9uRGlzcGF0Y2hlcjogQWN0aW9uczxTLCBSPjtcbiAgLyoqIEFjdGlvbiBjcmVhdG9ycyAqL1xuICBhY3Rpb25zOiBBY3Rpb25zPFMsIFI+O1xuICBkZXN0cm95OiAoKSA9PiB2b2lkO1xuICBkZXN0cm95JDogcnguT2JzZXJ2YWJsZTxhbnk+O1xuICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogKCkgPT4gdm9pZDtcbiAgZ2V0U3RvcmUoKTogcnguT2JzZXJ2YWJsZTxTPjtcbiAgZ2V0U3RhdGUoKTogUztcbn1cblxuZXhwb3J0IHR5cGUgRXBpYzxTLCBBJCA9IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+Pj4gPSAoYWN0aW9uczogQSQsIHN0YXRlczogcnguQmVoYXZpb3JTdWJqZWN0PFM+KSA9PiBBJDtcblxuLy8gdHlwZSBQYXlsb2FkVHlwZU9mQWN0aW9uPEFjdGlvbkNyZWF0b3JUeXBlPiA9IEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPGFueT4gPyB2b2lkIDpcbi8vICAgQWN0aW9uQ3JlYXRvclR5cGUgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8YW55LCBpbmZlciBQPiA/IFAgOiBuZXZlcjtcblxuLyoqIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUgKi9cbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUD4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxTLCBQPj47XG4gIC8vIChzb3VyY2U6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPGFueT4+KSA9PiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UywgUGF5bG9hZFR5cGVPZkFjdGlvbjxBPj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQLCBTMSwgUDE+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+LCBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UzEsIFAxPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55ICwgUGF5bG9hZEFjdGlvbjxTLCBQPiB8IFBheWxvYWRBY3Rpb248UzEsIFAxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFAsIFMxLCBQMSwgUzIsIFAyPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPiwgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFMxLCBQMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcjxTMiwgUDI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UywgUD4gfCBQYXlsb2FkQWN0aW9uPFMxLCBQMT4gfCBQYXlsb2FkQWN0aW9uPFMyLCBQMj4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbihcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8YW55LCBhbnk+W10pOiByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25DcmVhdG9ycy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBhYy50eXBlKSlcbiAgICApO1xuICB9O1xufVxuXG50eXBlIEFjdGlvbkJ5VHlwZTxTLCBSPiA9IHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn07XG4vKipcbiAqIE1hcCBhY3Rpb24gc3RyZWFtIHRvIG11bHRpcGxlIGFjdGlvbiBzdHJlYW1zIGJ5IHRoZWlyZSBhY3Rpb24gdHlwZS5cbiAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGNhdGVnb3JpemUgYWN0aW9uIHN0cmVhbSwgY29tcGFyZSB0byBcIm9mUGF5bG9hZEFjdGlvbigpXCJcbiAqIFVzYWdlOlxuYGBgXG5zbGljZS5hZGRFcGljKHNsaWNlID0+IGFjdGlvbiQgPT4ge1xuICBjb25zdCBhY3Rpb25zQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0EucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gICAgYWN0aW9uc0J5VHlwZS5SRURVQ0VSX05BTUVfQi5waXBlKFxuICAgICAgLi4uXG4gICAgKSxcbiAgKVxufSlcbmBgYFxuICogQHBhcmFtIGFjdGlvbkNyZWF0b3JzIFxuICogQHBhcmFtIGFjdGlvbiQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXN0QnlBY3Rpb25UeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbnM8UywgUj4sXG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+Pik6IEFjdGlvbkJ5VHlwZTxTLCBSPiB7XG5cbiAgICBjb25zdCBzb3VyY2UgPSBhY3Rpb24kLnBpcGUob3Auc2hhcmUoKSk7XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zID0ge30gYXMgQWN0aW9uQnlUeXBlPFMsIFI+O1xuXG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzcGxpdEFjdGlvbnMsIHJlZHVjZXJOYW1lLCB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gc291cmNlLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGFjdGlvbkNyZWF0b3JzW3JlZHVjZXJOYW1lXSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBY3Rpb25PZkNyZWF0b3I8UCwgUz4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueSwgYW55PiwgYWN0aW9uQ3JlYXRvcjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+KTpcbiAgYWN0aW9uIGlzIFBheWxvYWRBY3Rpb248UywgUD4ge1xuICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IGFjdGlvbkNyZWF0b3IudHlwZTtcbn1cblxuY29uc3Qgc2xpY2VDb3VudDROYW1lOiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZU9wdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgLyoqIEdlbmVyYXRlIHVuaXF1ZSBJRCBhcyBwYXJ0IG9mIHNsaWNlJ3MgbmFtZSwgZGVmYXVsdDogdHJ1ZSAqL1xuICBnZW5lcmF0ZUlkPzogYm9vbGVhbjtcbiAgZGVidWc/OiBib29sZWFuO1xuICByb290U3RvcmU/OiByeC5CZWhhdmlvclN1YmplY3Q8e1trOiBzdHJpbmddOiBTfT47XG59XG5cbi8qKlxuICogUmVkdWNlcnMgYW5kIGluaXRpYWxTdGF0ZSBhcmUgcmV1c2VkIGNyb3NzIG11bHRpcGxlIGNvbXBvbmVudFxuICogXG4gKiAgU2xpY2UgLS0tIENvbXBvbmVudCBpbnN0YW5jZSAoc3RhdGUsIGFjdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZTxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9wdDogU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2U8UywgUj4ge1xuICBsZXQgbmFtZSA9IG9wdC5uYW1lO1xuICBpZiAob3B0LmdlbmVyYXRlSWQgPT09IHVuZGVmaW5lZCB8fCBvcHQuZ2VuZXJhdGVJZCA9PT0gdHJ1ZSkge1xuICAgIGlmIChzbGljZUNvdW50NE5hbWVbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgc2xpY2VDb3VudDROYW1lW25hbWVdID0gMDtcbiAgICB9XG4gICAgb3B0Lm5hbWUgPSBuYW1lID0gbmFtZSArICcuJyArICgrK3NsaWNlQ291bnQ0TmFtZVtuYW1lXSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ3JlYXRvcnMgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0ge30gYXMgQWN0aW9uczxTLCBSPjtcblxuICBmb3IgKGNvbnN0IFtrZXksIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKG9wdC5yZWR1Y2VycykpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZSArICcvJyArIGtleTtcbiAgICBjb25zdCBjcmVhdG9yID0gKChwYXlsb2FkOiB1bmtub3duKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7dHlwZSwgcGF5bG9hZCwgcmVkdWNlcn07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBhbnk+O1xuICAgIGNyZWF0b3IudHlwZSA9IHR5cGU7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGFjdGlvbkNyZWF0b3JzW2tleSBhcyBrZXlvZiBSXSA9IGNyZWF0b3IgYXMgYW55O1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdID0gKChwYXlsb2FkPzogYW55KSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSBjcmVhdG9yKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuXG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0udHlwZSA9IGNyZWF0b3IudHlwZTtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Uz4ob3B0LmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHVucHJvY2Vzc2VkQWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuXG4gIGZ1bmN0aW9uIG9mVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgICAuLi5hY3Rpb25UeXBlczogVFtdKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uVHlwZXMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gbmFtZSArICcvJyArIGFjKSlcbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikge1xuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICBsZXQgYWN0aW9uQ291bnQgPSAwO1xuICBsZXQgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAvLyBUbyB3YXJuIGRldmVsb3BlciB0aGF0IG5vIGFjdGlvbiBkaXNwYXRjaGluZyBzaG91ZCBiZSBjYWxsZWQgaW5zaWRlIGEgcmVkdWNlciwgdGhpcyBpcyBzaWRlLWVmZmVjdHMgYW5kIFxuICAvLyB3aWxsIGxlYWRzIHRvIHJlY3Vyc2l2ZSByZWR1Y2VyXG4gIGxldCBpblJlZHVjZXIgPSBmYWxzZTtcblxuICBjb25zdCBzdWIgPSByeC5tZXJnZShcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShcbiAgICAgIC8vIG9wLm9ic2VydmVPbihyeC5xdWV1ZVNjaGVkdWxlciksIC8vIEF2b2lkIHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIGFjdGlvbiBpbnNpZGUgYW4gcmVkdWNlciwgYnV0IG5vcm1hbGx5IHJlY3Vyc2l2ZWx5IGRpc3BhdGNoaW5nIHNob3VsZCBiZSB3YXJuZWQgYW5kIGZvcmJpZGRlblxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChvcHQuZGVidWcpIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOmFjdGlvbiBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZmFlNGZjOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbi5yZWR1Y2VyKSB7XG4gICAgICAgICAgY29uc3QgY3VyclN0YXRlID0gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgICAgICAgY29uc3Qgc2hhbGxvd0NvcGllZCA9IHsuLi5jdXJyU3RhdGUsIF9fYWM6ICsrYWN0aW9uQ291bnR9O1xuICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGlmIChpblJlZHVjZXIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRG8gbm90IGRpc3BhdGNoIGFjdGlvbiBpbnNpZGUgYSByZWR1Y2VyISAoYWN0aW9uOiAke2FjdGlvbi50eXBlfSlgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5SZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICBsZXQgbmV3U3RhdGU6IFMgfCB2b2lkO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBuZXdTdGF0ZSA9IGFjdGlvbi5yZWR1Y2VyKHNoYWxsb3dDb3BpZWQsIChhY3Rpb24gYXMgUGF5bG9hZEFjdGlvbjxTPikucGF5bG9hZCk7XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAvLyBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1N0YXRlID8gbmV3U3RhdGUgOiBzaGFsbG93Q29waWVkO1xuICAgICAgICAgIHN0YXRlJC5uZXh0KGNoYW5nZWQpO1xuICAgICAgICB9XG4gICAgICAgIGFjdGlvbiQubmV4dChhY3Rpb24pO1xuICAgICAgfSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAncmVkdWNlciBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBzdGF0ZSQucGlwZShcbiAgICAgIG9wLnRhcChzdGF0ZSA9PiB7XG4gICAgICAgIGlmIChvcHQuZGVidWcpIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOnN0YXRlIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNlOThkZjU7Jywgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgb3B0LnJvb3RTdG9yZSA/IHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IG9wdC5yb290U3RvcmUhLm5leHQoey4uLm9wdC5yb290U3RvcmU/LmdldFZhbHVlKCksIFtvcHQubmFtZV06IHN0YXRlfSkpXG4gICAgICkgOiByeC5FTVBUWVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgZGlzcGF0Y2goe1xuICAgICAgdHlwZTogJ19fT25EZXN0cm95J1xuICAgIH0pO1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBjb25zdCBzdWIgPSBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoc2xpY2UsIG9mVHlwZSBhcyBPZlR5cGVGbjxTLCBSPik7XG4gICAgICAgICAgaWYgKGVwaWMpXG4gICAgICAgICAgICByZXR1cm4gZXBpYyhhY3Rpb24kLCBzdGF0ZSQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IGRpc3BhdGNoKGFjdGlvbikpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ2VwaWMgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyIGFzIHVua25vd259O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgc2xpY2U6IFNsaWNlPFMsIFI+ID0ge1xuICAgIG5hbWUsXG4gICAgc3RhdGUkLFxuICAgIGFjdGlvbiQsXG4gICAgYWN0aW9uczogYWN0aW9uQ3JlYXRvcnMsXG4gICAgZGlzcGF0Y2gsXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBkZXN0cm95LFxuICAgIGRlc3Ryb3kkOiB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSksXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGUkO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICBpZiAoZXhlY3V0aW5nUmVkdWNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvIGJlIGNvbnNpc3RlbnQgd2l0aCBSZWR1eFxcJ3MgYmVoYXZpb3VyLCBzbGljZS5nZXRTdGF0ZSgpIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGludm9rZWQgaW5zaWRlIGEgcmVkdWNlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHNsaWNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aW9uJE9mU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LFxuICBUIGV4dGVuZHMga2V5b2YgUj4oXG4gIHNsaWNlSGVscGVyOiBTbGljZTxTLCBSPixcbiAgYWN0aW9uVHlwZTogVCkge1xuXG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8ge3R5cGU6IFR9IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgcDogaW5mZXIgUCkgPT4gYW55ID8ge3BheWxvYWQ6IFA7IHR5cGU6IFR9IDogbmV2ZXI+KHN1YiA9PiB7XG4gICAgc2xpY2VIZWxwZXIuYWRkRXBpYyhzbGljZSA9PiAoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnNbYWN0aW9uVHlwZV0hKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzdWIubmV4dChhY3Rpb24gYXMgYW55KSksXG4gICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG4gZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlKHtcbiAgbmFtZTogJ2RlbW8nLFxuICBpbml0aWFsU3RhdGU6IHt9IGFzIHtvaz86IGJvb2xlYW47IGVycm9yPzogRXJyb3J9LFxuICByZWR1Y2Vyczoge1xuICAgIGhlbGxvdyhzLCBncmVldGluZzoge2RhdGE6IHN0cmluZ30pIHt9LFxuICAgIHdvcmxkKHMpIHt9XG4gIH1cbn0pO1xuZGVtb1NsaWNlLmFkZEVwaWMoKHNsaWNlLCBvZlR5cGUpID0+IHtcbiAgcmV0dXJuIChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgICBjb25zdCBhY3Rpb25TdHJlYW1zID0gY2FzdEJ5QWN0aW9uVHlwZShzbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgICAvLyBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmFiYygpO1xuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvblN0cmVhbXMuaGVsbG93LnBpcGUoKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdoZWxsb3cnLCAnaGVsbG93JyksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9ucy53b3JsZCgpKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCd3b3JsZCcpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaGVsbG93KSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiB0eXBlb2YgYWN0aW9uLnBheWxvYWQuZGF0YSA9PT0gJ3N0cmluZycpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3csIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkKVxuICAgICAgKVxuICAgICkucGlwZShvcC5pZ25vcmVFbGVtZW50cygpKTtcbiAgfTtcbn0pO1xuYWN0aW9uJE9mU2xpY2UoZGVtb1NsaWNlLCAnaGVsbG93JykucGlwZShvcC50YXAoYWN0aW9uID0+IGFjdGlvbikpO1xuYWN0aW9uJE9mU2xpY2UoZGVtb1NsaWNlLCAnd29ybGQnKS5waXBlKG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uKSk7XG4iXX0=