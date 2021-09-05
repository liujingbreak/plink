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
exports.sliceRefActionOp = exports.createSlice = exports.isActionOfCreator = exports.castByActionType = exports.ofPayloadAction = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQWdGckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUlwRCxJQUFNLGdCQUFnQixHQUE2RSxFQUFFLENBQUM7SUFDdEcsSUFBTSxZQUFZLEdBQW1FLEVBQUUsQ0FBQztJQUV4RixJQUFJLFNBQXNDLENBQUM7SUFDM0MsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBRXRCLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJO0lBQ3pCLG9FQUFvRTtJQUNwRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTTtRQUNYLElBQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEtBQUssRUFBRTtZQUNULEtBQUssQ0FBQyxJQUFJ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QUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQXZDLENBQXVDLENBQUMsQ0FDMUQsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUNWLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUNwQyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsQ0FBQyxFQUE1QyxDQUE0QyxDQUFDLENBQy9ELEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FDVixlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQzVFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsT0FBTyxFQUFkLENBQWMsQ0FBQyxDQUNqQyxDQUNGLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgcHJvdmlkZSBzb21lIGhvb2tzIHdoaWNoIGxldmVyYWdlcyBSeEpTIHRvIG1pbWljIFJlZHV4LXRvb2xraXQgKyBSZWR1eC1vYnNlcnZhYmxlXG4gKiB3aGljaCBpcyBzdXBwb3NlZCB0byBiZSB1c2VkIGluZGVwZW5kZW50bHkgd2l0aGluIGFueSBSZWFjdCBjb21wb25lbnQgaW4gY2FzZSB5b3VyIGNvbXBvbmVudCBoYXMgXG4gKiBjb21wbGljYXRlZCBhc3luYyBzdGF0ZSBjaGFuZ2UgbG9naWMuXG4gKiBcbiAqIC0gaXQgaXMgc21hbGwgYW5kIHN1cHBvc2VkIHRvIGJlIHdlbGwgcGVyZm9ybWVkXG4gKiAtIGl0IGRvZXMgbm90IHVzZSBJbW1lckpTLCB5b3Ugc2hvdWxkIHRha2UgY2FyZSBvZiBpbW11dGFiaWxpdHkgb2Ygc3RhdGUgYnkgeW91cnNlbGZcbiAqIC0gYmVjYXVzZSB0aGVyZSBpcyBubyBJbW1lckpTLCB5b3UgY2FuIHB1dCBhbnkgdHlwZSBvZiBPYmplY3QgaW4gc3RhdGUgaW5jbHVkaW5nIHRob3NlIGFyZSBub3QgZnJpZW5kbHkgYnkgSW1tZXJKU1xuICovXG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uPFM+IHtcbiAgdHlwZTogc3RyaW5nO1xuICByZWR1Y2VyPyhvbGQ6IFMpOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXlsb2FkQWN0aW9uPFMsIFAgPSBhbnk+IHtcbiAgdHlwZTogc3RyaW5nO1xuICBwYXlsb2FkOiBQO1xuICByZWR1Y2VyPyhvbGQ6IFMsIHBheWxvYWQ6IFApOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcnM8UywgUiA9IGFueT4gPSB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW0sgaW4ga2V5b2YgUl06IChzdGF0ZTogUywgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQ7XG59O1xuXG5leHBvcnQgdHlwZSBBY3Rpb25zPFMsIFI+ID0ge1xuICBbSyBpbiBrZXlvZiBSXTpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiA6XG4gICAgUltLXSBleHRlbmRzIChzOiBTLCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4gOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgdW5rbm93bj47XG59O1xuXG5leHBvcnQgdHlwZSBBY3Rpb25DcmVhdG9yPFMsIFA+ID0gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHwgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+O1xuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiB7XG4gICgpOiBBY3Rpb248Uz47XG4gIHR5cGU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiB7XG4gIChwYXlsb2FkOiBQKTogUGF5bG9hZEFjdGlvbjxTLCBQPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG50eXBlIE91dHB1dEFjdGlvbk9iczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8YW55PiwgSyBleHRlbmRzIGtleW9mIFI+ID1cbiAgcnguT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPiA6IFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBQPiA6IFBheWxvYWRBY3Rpb248UywgdW5rbm93bj4+O1xuICAvLyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBQYXJhbWV0ZXJzPFJbS10+WzFdIGV4dGVuZHMgdW5kZWZpbmVkID8gdm9pZCA6IFBhcmFtZXRlcnM8UltLXT5bMV0sIEs+PjtcblxudHlwZSBPZlR5cGVQaXBlT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBLIGV4dGVuZHMga2V5b2YgUj4gPSAoc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KSA9PiBPdXRwdXRBY3Rpb25PYnM8UywgUiwgSz47XG5cbi8qKiBzYW1lIGFzIG9mUGF5bG9hZEFjdGlvbigpICwgdG8gZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSwgdW5saWtlIG9mUGF5bG9hZEFjdGlvbigpLCBwYXJhbWV0ZXIgaXMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhY3Rpb25DcmVhdG9yICovXG5leHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMT47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMik6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSLCBLMyBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIsIGFjdGlvblR5cGUzOiBLMyk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyIHwgSzM+O1xuICA8SyBleHRlbmRzIGtleW9mIFI+KC4uLmFjdGlvblR5cGVzOiBLW10pOiBPZlR5cGVQaXBlT3A8UywgUiwgSz47XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlPFMsIFI+LCBvZlR5cGU6IE9mVHlwZUZuPFMsIFI+KSA9PiBFcGljPFM+IHwgdm9pZDtcbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZyB8IG51bWJlcjtcbiAgc3RhdGUkOiByeC5CZWhhdmlvclN1YmplY3Q8Uz47XG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+PjtcbiAgZGlzcGF0Y2g6IChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pID0+IHZvaWQ7XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgYm91bmQgd2l0aCBkaXNwYXRjaGVyICovXG4gIGFjdGlvbkRpc3BhdGNoZXI6IEFjdGlvbnM8UywgUj47XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgKi9cbiAgYWN0aW9uczogQWN0aW9uczxTLCBSPjtcbiAgZGVzdHJveTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSQ6IHJ4Lk9ic2VydmFibGU8YW55PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59XG5cbmV4cG9ydCB0eXBlIEVwaWM8UywgQSQgPSByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4+ID0gKGFjdGlvbnM6IEEkLCBzdGF0ZXM6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPikgPT4gQSQ7XG5cbi8vIHR5cGUgUGF5bG9hZFR5cGVPZkFjdGlvbjxBY3Rpb25DcmVhdG9yVHlwZT4gPSBBY3Rpb25DcmVhdG9yVHlwZSBleHRlbmRzIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxhbnk+ID8gdm9pZCA6XG4vLyAgIEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPGFueSwgaW5mZXIgUD4gPyBQIDogbmV2ZXI7XG5cbi8qKiBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlICovXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFA+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+KTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UywgUD4+O1xuICAvLyAoc291cmNlOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxhbnk+PikgPT4gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIFBheWxvYWRUeXBlT2ZBY3Rpb248QT4+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUCwgUzEsIFAxPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPiwgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFMxLCBQMT4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSAsIFBheWxvYWRBY3Rpb248UywgUD4gfCBQYXlsb2FkQWN0aW9uPFMxLCBQMT4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQLCBTMSwgUDEsIFMyLCBQMj4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4sIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxTMSwgUDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3I8UzIsIFAyPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFMsIFA+IHwgUGF5bG9hZEFjdGlvbjxTMSwgUDE+IHwgUGF5bG9hZEFjdGlvbjxTMiwgUDI+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb24oXG4gIC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPGFueSwgYW55PltdKTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uQ3JlYXRvcnMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gYWMudHlwZSkpXG4gICAgKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpcmUgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25zPFMsIFI+LFxuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj4pOlxuICB7W0sgaW4ga2V5b2YgUl06IHJ4Lk9ic2VydmFibGU8UmV0dXJuVHlwZTxBY3Rpb25zPFMsIFI+W0tdPj59IHtcblxuXG4gICAgY29uc3QgZGlzcGF0Y2hlckJ5VHlwZToge1tLOiBzdHJpbmddOiByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4gfCB1bmRlZmluZWR9ID0ge307XG4gICAgY29uc3Qgc3BsaXRBY3Rpb25zOiB7W0sgaW4ga2V5b2YgUl0/OiByeC5PYnNlcnZhYmxlPFJldHVyblR5cGU8QWN0aW9uczxTLCBSPltLXT4+fSA9IHt9O1xuXG4gICAgbGV0IHNvdXJjZVN1YjogcnguU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xuICAgIGxldCBzdWJzY3JpYmVyQ250ID0gMDtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIC8vIG9wLnNoYXJlKCksIHdlIGRvbid0IG5lZWQgc2hhcmUoKSwgd2UgaGF2ZSBpbXBsZW1lbnRlZCBzYW1lIGxvZ2ljXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBkaXNwYXRjaGVyQnlUeXBlW2FjdGlvbi50eXBlXTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgbWF0Y2gubmV4dChhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG5cbiAgICBmb3IgKGNvbnN0IHJlZHVjZXJOYW1lIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3JzKSkge1xuICAgICAgY29uc3Qgc3ViamVjdCA9IGRpc3BhdGNoZXJCeVR5cGVbYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdLnR5cGVdID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+PigpO1xuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICBzcGxpdEFjdGlvbnNbcmVkdWNlck5hbWUgYXMga2V5b2YgUl0gPSByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgIGlmIChzdWJzY3JpYmVyQ250KysgPT09IDApXG4gICAgICAgICAgc291cmNlU3ViID0gc291cmNlLnN1YnNjcmliZSgpO1xuICAgICAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKSBhcyByeC5PYnNlcnZhYmxlPGFueT47XG4gICAgICB9KS5waXBlKFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICBpZiAoLS1zdWJzY3JpYmVyQ250ID09PSAwICYmIHNvdXJjZVN1Yikge1xuICAgICAgICAgICAgc291cmNlU3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBzb3VyY2VTdWIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zIGFzIHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FjdGlvbk9mQ3JlYXRvcjxQLCBTPihhY3Rpb246IFBheWxvYWRBY3Rpb248YW55LCBhbnk+LCBhY3Rpb25DcmVhdG9yOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4pOlxuICBhY3Rpb24gaXMgUGF5bG9hZEFjdGlvbjxTLCBQPiB7XG4gIHJldHVybiBhY3Rpb24udHlwZSA9PT0gYWN0aW9uQ3JlYXRvci50eXBlO1xufVxuXG5jb25zdCBzbGljZUNvdW50NE5hbWU6IHtbbmFtZTogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlT3B0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgbmFtZTogc3RyaW5nO1xuICBpbml0aWFsU3RhdGU6IFM7XG4gIHJlZHVjZXJzOiBSO1xuICAvKiogR2VuZXJhdGUgdW5pcXVlIElEIGFzIHBhcnQgb2Ygc2xpY2UncyBuYW1lLCBkZWZhdWx0OiB0cnVlICovXG4gIGdlbmVyYXRlSWQ/OiBib29sZWFuO1xuICBkZWJ1Zz86IGJvb2xlYW47XG4gIHJvb3RTdG9yZT86IHJ4LkJlaGF2aW9yU3ViamVjdDx7W2s6IHN0cmluZ106IFN9Pjtcbn1cblxuLyoqXG4gKiBSZWR1Y2VycyBhbmQgaW5pdGlhbFN0YXRlIGFyZSByZXVzZWQgY3Jvc3MgbXVsdGlwbGUgY29tcG9uZW50XG4gKiBcbiAqICBTbGljZSAtLS0gQ29tcG9uZW50IGluc3RhbmNlIChzdGF0ZSwgYWN0aW9ucylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNsaWNlPFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ob3B0OiBTbGljZU9wdGlvbnM8UywgUj4pOiBTbGljZTxTLCBSPiB7XG4gIGxldCBuYW1lID0gb3B0Lm5hbWU7XG4gIGlmIChvcHQuZ2VuZXJhdGVJZCA9PT0gdW5kZWZpbmVkIHx8IG9wdC5nZW5lcmF0ZUlkID09PSB0cnVlKSB7XG4gICAgaWYgKHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9PSBudWxsKSB7XG4gICAgICBzbGljZUNvdW50NE5hbWVbbmFtZV0gPSAwO1xuICAgIH1cbiAgICBvcHQubmFtZSA9IG5hbWUgPSBuYW1lICsgJy4nICsgKCsrc2xpY2VDb3VudDROYW1lW25hbWVdKTtcbiAgfVxuICBjb25zdCBhY3Rpb25DcmVhdG9ycyA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuXG4gIGZvciAoY29uc3QgW2tleSwgcmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMob3B0LnJlZHVjZXJzKSkge1xuICAgIGNvbnN0IHR5cGUgPSBuYW1lICsgJy8nICsga2V5O1xuICAgIGNvbnN0IGNyZWF0b3IgPSAoKHBheWxvYWQ6IHVua25vd24pID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHt0eXBlLCBwYXlsb2FkLCByZWR1Y2VyfTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIGFueT47XG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvciBhcyBhbnk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0gPSAoKHBheWxvYWQ/OiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IGNyZWF0b3IocGF5bG9hZCk7XG4gICAgICBkaXNwYXRjaChhY3Rpb24pO1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBhbnk7XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXS50eXBlID0gY3JlYXRvci50eXBlO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxTPihvcHQuaW5pdGlhbFN0YXRlKTtcbiAgY29uc3QgdW5wcm9jZXNzZWRBY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcbiAgY29uc3QgYWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG5cbiAgZnVuY3Rpb24gb2ZUeXBlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgVCBleHRlbmRzIGtleW9mIFI+KFxuICAgIC4uLmFjdGlvblR5cGVzOiBUW10pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pIHtcbiAgICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb25UeXBlcy5zb21lKGFjID0+IGFjdGlvbi50eXBlID09PSBuYW1lICsgJy8nICsgYWMpKVxuICAgICAgKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSB7XG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgfVxuXG4gIGxldCBhY3Rpb25Db3VudCA9IDA7XG4gIGxldCBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gIC8vIFRvIHdhcm4gZGV2ZWxvcGVyIHRoYXQgbm8gYWN0aW9uIGRpc3BhdGNoaW5nIHNob3VkIGJlIGNhbGxlZCBpbnNpZGUgYSByZWR1Y2VyLCB0aGlzIGlzIHNpZGUtZWZmZWN0cyBhbmQgXG4gIC8vIHdpbGwgbGVhZHMgdG8gcmVjdXJzaXZlIHJlZHVjZXJcbiAgbGV0IGluUmVkdWNlciA9IGZhbHNlO1xuXG4gIGNvbnN0IHN1YiA9IHJ4Lm1lcmdlKFxuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKFxuICAgICAgLy8gb3Aub2JzZXJ2ZU9uKHJ4LnF1ZXVlU2NoZWR1bGVyKSwgLy8gQXZvaWQgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgYWN0aW9uIGluc2lkZSBhbiByZWR1Y2VyLCBidXQgbm9ybWFsbHkgcmVjdXJzaXZlbHkgZGlzcGF0Y2hpbmcgc2hvdWxkIGJlIHdhcm5lZCBhbmQgZm9yYmlkZGVuXG4gICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6YWN0aW9uIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNmYWU0ZmM7JywgYWN0aW9uLnR5cGUpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoYWN0aW9uLnJlZHVjZXIpIHtcbiAgICAgICAgICBjb25zdCBjdXJyU3RhdGUgPSBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgaWYgKGluUmVkdWNlcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpblJlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGxldCBuZXdTdGF0ZTogUyB8IHZvaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc2hhbGxvd0NvcGllZCwgKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkKTtcbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGluUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIC8vIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gbmV3U3RhdGUgPyBuZXdTdGF0ZSA6IHNoYWxsb3dDb3BpZWQ7XG4gICAgICAgICAgc3RhdGUkLm5leHQoY2hhbmdlZCk7XG4gICAgICAgIH1cbiAgICAgICAgYWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gICAgICB9KSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdyZWR1Y2VyIGVycm9yJyxcbiAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLFxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICAgKSA6IHJ4LkVNUFRZXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhzbGljZSwgb2ZUeXBlIGFzIE9mVHlwZUZuPFMsIFI+KTtcbiAgICAgICAgICBpZiAoZXBpYylcbiAgICAgICAgICAgIHJldHVybiBlcGljKGFjdGlvbiQsIHN0YXRlJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwodW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpKSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4gZGlzcGF0Y2goYWN0aW9uKSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnZXBpYyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnIgYXMgdW5rbm93bn07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4gc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBzbGljZTogU2xpY2U8UywgUj4gPSB7XG4gICAgbmFtZSxcbiAgICBzdGF0ZSQsXG4gICAgYWN0aW9uJCxcbiAgICBhY3Rpb25zOiBhY3Rpb25DcmVhdG9ycyxcbiAgICBkaXNwYXRjaCxcbiAgICBhY3Rpb25EaXNwYXRjaGVyLFxuICAgIGRlc3Ryb3ksXG4gICAgZGVzdHJveSQ6IHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSxcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgcmV0dXJuIGFkZEVwaWMkKHJ4Lm9mKGVwaWNGYWN0b3J5KSk7XG4gICAgfSxcbiAgICBhZGRFcGljJCxcbiAgICBnZXRTdG9yZSgpIHtcbiAgICAgIHJldHVybiBzdGF0ZSQ7XG4gICAgfSxcbiAgICBnZXRTdGF0ZSgpIHtcbiAgICAgIGlmIChleGVjdXRpbmdSZWR1Y2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG8gYmUgY29uc2lzdGVudCB3aXRoIFJlZHV4XFwncyBiZWhhdmlvdXIsIHNsaWNlLmdldFN0YXRlKCkgaXMgbm90IGFsbG93ZWQgdG8gYmUgaW52b2tlZCBpbnNpZGUgYSByZWR1Y2VyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdGUkLmdldFZhbHVlKCk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gc2xpY2U7XG59XG5cbi8qKlxuICogQWRkIGFuIGVwaWNGYWN0b3J5IHRvIGFub3RoZXIgY29tcG9uZW50J3Mgc2xpY2VIZWxwZXJcbiAqIGUuZy5cbiAqIGBgYFxuICogYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl9vbkNoaWxkU2xpY2VSZWYpLFxuICogIGNoaWxkU2xpY2VPcCgoY2hpbGRTbGljZSkgPT4ge1xuICogICAgcmV0dXJuIGNoaWxkQWN0aW9uJCA9PiB7XG4gKiAgICAgIHJldHVybiBjaGlsZEFjdGlvbiQucGlwZSguLi4pO1xuICogICAgfTtcbiAqICB9KVxuICogYGBgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcnkgXG4gKi9cbiBleHBvcnQgZnVuY3Rpb24gc2xpY2VSZWZBY3Rpb25PcDxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+PiwgUGF5bG9hZEFjdGlvbjxhbnksIGFueT4+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGluJDogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+Pikge1xuICAgIHJldHVybiBpbiQucGlwZShcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGVhc2UgPSBwYXlsb2FkLmFkZEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxuZXZlcj4+KHN1YiA9PiByZWxlYXNlKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfTtcbn1cblxuY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2Uoe1xuICBuYW1lOiAnZGVtbycsXG4gIGluaXRpYWxTdGF0ZToge30gYXMge29rPzogYm9vbGVhbjsgZXJyb3I/OiBFcnJvcn0sXG4gIHJlZHVjZXJzOiB7XG4gICAgaGVsbG93KHMsIGdyZWV0aW5nOiB7ZGF0YTogc3RyaW5nfSkge30sXG4gICAgd29ybGQocykge31cbiAgfVxufSk7XG5kZW1vU2xpY2UuYWRkRXBpYygoc2xpY2UsIG9mVHlwZSkgPT4ge1xuICByZXR1cm4gKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuYWJjKCk7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uU3RyZWFtcy5oZWxsb3cucGlwZSgpLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ2hlbGxvdycsICdoZWxsb3cnKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25zLndvcmxkKCkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ3dvcmxkJyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHR5cGVvZiBhY3Rpb24ucGF5bG9hZC5kYXRhID09PSAnc3RyaW5nJylcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdywgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQpXG4gICAgICApXG4gICAgKS5waXBlKG9wLmlnbm9yZUVsZW1lbnRzKCkpO1xuICB9O1xufSk7XG5cbiJdfQ==