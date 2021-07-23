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
        return rx.merge(actionStreams.hellow.pipe(), action$.pipe(ofType('hellow', 'hellow'), op.map(function (action) { return slice.actions.world(); })), action$.pipe(ofType('world'), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actions.hellow), op.tap(function (action) { return typeof action.payload.data === 'string'; })), action$.pipe(ofPayloadAction(slice.actions.world), op.tap(function (action) { return slice.actionDispatcher.hellow({ data: 'yes' }); })), action$.pipe(ofPayloadAction(slice.actionDispatcher.hellow, slice.actionDispatcher.world), op.tap(function (action) { return action.payload; }))).pipe(op.ignoreElements());
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQStFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQWdCLGdCQUFnQixDQUEyQixjQUE2QixFQUN0RixPQUFzRDtJQUlwRCxJQUFNLGtCQUFrQixHQUE2RSxFQUFFLENBQUM7SUFDeEcsSUFBTSxZQUFZLEdBQW1FLEVBQUUsQ0FBQztJQUV4RixJQUFJLFNBQXNDLENBQUM7NEJBQ2hDLFdBQVc7UUFDcEIsSUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBcUMsQ0FBQztRQUUzSCx3Q0FBd0M7UUFDeEMsWUFBWSxDQUFDLFdBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO1lBQzlDLElBQUksU0FBUyxJQUFJLElBQUk7Z0JBQ25C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RyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsQ0FBQyxFQUE1QyxDQUE0QyxDQUFDLENBQy9ELEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FDVixlQUFlLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQzVFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsT0FBTyxFQUFkLENBQWMsQ0FBQyxDQUNqQyxDQUNGLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgcHJvdmlkZSBzb21lIGhvb2tzIHdoaWNoIGxldmVyYWdlcyBSeEpTIHRvIG1pbWljIFJlZHV4LXRvb2xraXQgKyBSZWR1eC1vYnNlcnZhYmxlXG4gKiB3aGljaCBpcyBzdXBwb3NlZCB0byBiZSB1c2VkIGluZGVwZW5kZW50bHkgd2l0aGluIGFueSBSZWFjdCBjb21wb25lbnQgaW4gY2FzZSB5b3VyIGNvbXBvbmVudCBoYXMgXG4gKiBjb21wbGljYXRlZCBhc3luYyBzdGF0ZSBjaGFuZ2UgbG9naWMuXG4gKiBcbiAqIC0gaXQgaXMgc21hbGwgYW5kIHN1cHBvc2VkIHRvIGJlIHdlbGwgcGVyZm9ybWVkXG4gKiAtIGl0IGRvZXMgbm90IHVzZSBJbW1lckpTLCB5b3Ugc2hvdWxkIHRha2UgY2FyZSBvZiBpbW11dGFiaWxpdHkgb2Ygc3RhdGUgYnkgeW91cnNlbGZcbiAqIC0gYmVjYXVzZSB0aGVyZSBpcyBubyBJbW1lckpTLCB5b3UgY2FuIHB1dCBhbnkgdHlwZSBvZiBPYmplY3QgaW4gc3RhdGUgaW5jbHVkaW5nIHRob3NlIGFyZSBub3QgZnJpZW5kbHkgYnkgSW1tZXJKU1xuICovXG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uPFM+IHtcbiAgdHlwZTogc3RyaW5nO1xuICByZWR1Y2VyPyhvbGQ6IFMpOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXlsb2FkQWN0aW9uPFMsIFAgPSBhbnk+IHtcbiAgdHlwZTogc3RyaW5nO1xuICBwYXlsb2FkOiBQO1xuICByZWR1Y2VyPyhvbGQ6IFMsIHBheWxvYWQ6IFApOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWR1Y2VyczxTPiB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW3R5cGU6IHN0cmluZ106IChzdGF0ZTogUywgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIEFjdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4gOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgdW5rbm93bj47XG59O1xuXG5leHBvcnQgdHlwZSBBY3Rpb25DcmVhdG9yPFMsIFA+ID0gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHwgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+O1xuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiB7XG4gICgpOiBBY3Rpb248Uz47XG4gIHR5cGU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiB7XG4gIChwYXlsb2FkOiBQKTogUGF5bG9hZEFjdGlvbjxTLCBQPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG50eXBlIE91dHB1dEFjdGlvbk9iczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8YW55PiwgSyBleHRlbmRzIGtleW9mIFI+ID1cbiAgcnguT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPiA6IFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBQPiA6IFBheWxvYWRBY3Rpb248UywgdW5rbm93bj4+O1xuICAvLyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBQYXJhbWV0ZXJzPFJbS10+WzFdIGV4dGVuZHMgdW5kZWZpbmVkID8gdm9pZCA6IFBhcmFtZXRlcnM8UltLXT5bMV0sIEs+PjtcblxudHlwZSBPZlR5cGVQaXBlT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBLIGV4dGVuZHMga2V5b2YgUj4gPSAoc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KSA9PiBPdXRwdXRBY3Rpb25PYnM8UywgUiwgSz47XG5cbi8qKiBzYW1lIGFzIG9mUGF5bG9hZEFjdGlvbigpICwgdG8gZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSwgdW5saWtlIG9mUGF5bG9hZEFjdGlvbigpLCBwYXJhbWV0ZXIgaXMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhY3Rpb25DcmVhdG9yICovXG5leHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMT47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMik6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSLCBLMyBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIsIGFjdGlvblR5cGUzOiBLMyk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyIHwgSzM+O1xuICA8SyBleHRlbmRzIGtleW9mIFI+KC4uLmFjdGlvblR5cGVzOiBLW10pOiBPZlR5cGVQaXBlT3A8UywgUiwgSz47XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlPFMsIFI+LCBvZlR5cGU6IE9mVHlwZUZuPFMsIFI+KSA9PiBFcGljPFM+IHwgdm9pZDtcbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZyB8IG51bWJlcjtcbiAgc3RhdGUkOiByeC5CZWhhdmlvclN1YmplY3Q8Uz47XG4gIGFjdGlvbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPFM+PjtcbiAgZGlzcGF0Y2g6IChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pID0+IHZvaWQ7XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgYm91bmQgd2l0aCBkaXNwYXRjaGVyICovXG4gIGFjdGlvbkRpc3BhdGNoZXI6IEFjdGlvbnM8UywgUj47XG4gIC8qKiBBY3Rpb24gY3JlYXRvcnMgKi9cbiAgYWN0aW9uczogQWN0aW9uczxTLCBSPjtcbiAgZGVzdHJveTogKCkgPT4gdm9pZDtcbiAgZGVzdHJveSQ6IHJ4Lk9ic2VydmFibGU8YW55PjtcbiAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOiAoKSA9PiB2b2lkO1xuICBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6ICgpID0+IHZvaWQ7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGdldFN0YXRlKCk6IFM7XG59XG5cbmV4cG9ydCB0eXBlIEVwaWM8UywgQSQgPSByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248UywgYW55PiB8IEFjdGlvbjxTPj4+ID0gKGFjdGlvbnM6IEEkLCBzdGF0ZXM6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPikgPT4gQSQ7XG5cbi8vIHR5cGUgUGF5bG9hZFR5cGVPZkFjdGlvbjxBY3Rpb25DcmVhdG9yVHlwZT4gPSBBY3Rpb25DcmVhdG9yVHlwZSBleHRlbmRzIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxhbnk+ID8gdm9pZCA6XG4vLyAgIEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPGFueSwgaW5mZXIgUD4gPyBQIDogbmV2ZXI7XG5cbi8qKiBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlICovXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFA+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+KTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UywgUD4+O1xuICAvLyAoc291cmNlOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxhbnk+PikgPT4gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIFBheWxvYWRUeXBlT2ZBY3Rpb248QT4+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUCwgUzEsIFAxPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPiwgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFMxLCBQMT4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSAsIFBheWxvYWRBY3Rpb248UywgUD4gfCBQYXlsb2FkQWN0aW9uPFMxLCBQMT4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQLCBTMSwgUDEsIFMyLCBQMj4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4sIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxTMSwgUDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3I8UzIsIFAyPik6XG4gIHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFMsIFA+IHwgUGF5bG9hZEFjdGlvbjxTMSwgUDE+IHwgUGF5bG9hZEFjdGlvbjxTMiwgUDI+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb24oXG4gIC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPGFueSwgYW55PltdKTogcnguT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uQ3JlYXRvcnMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gYWMudHlwZSkpXG4gICAgKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBNYXAgYWN0aW9uIHN0cmVhbSB0byBtdWx0aXBsZSBhY3Rpb24gc3RyZWFtcyBieSB0aGVpcmUgYWN0aW9uIHR5cGUuXG4gKiBUaGlzIGlzIGFuIGFsdGVybmF0aXZlIHdheSB0byBjYXRlZ29yaXplIGFjdGlvbiBzdHJlYW0sIGNvbXBhcmUgdG8gXCJvZlBheWxvYWRBY3Rpb24oKVwiXG4gKiBVc2FnZTpcbmBgYFxuc2xpY2UuYWRkRXBpYyhzbGljZSA9PiBhY3Rpb24kID0+IHtcbiAgY29uc3QgYWN0aW9uc0J5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBhY3Rpb25zQnlUeXBlLlJFRFVDRVJfTkFNRV9BLnBpcGUoXG4gICAgICAuLi5cbiAgICApLFxuICAgIGFjdGlvbnNCeVR5cGUuUkVEVUNFUl9OQU1FX0IucGlwZShcbiAgICAgIC4uLlxuICAgICksXG4gIClcbn0pXG5gYGBcbiAqIEBwYXJhbSBhY3Rpb25DcmVhdG9ycyBcbiAqIEBwYXJhbSBhY3Rpb24kIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FzdEJ5QWN0aW9uVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25zPFMsIFI+LFxuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj4pOlxuICB7W0sgaW4ga2V5b2YgUl06IHJ4Lk9ic2VydmFibGU8UmV0dXJuVHlwZTxBY3Rpb25zPFMsIFI+W0tdPj59IHtcblxuXG4gICAgY29uc3QgbXVsdGljYXNlQWN0aW9uTWFwOiB7W0s6IHN0cmluZ106IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+PiB8IHVuZGVmaW5lZH0gPSB7fTtcbiAgICBjb25zdCBzcGxpdEFjdGlvbnM6IHtbSyBpbiBrZXlvZiBSXT86IHJ4Lk9ic2VydmFibGU8UmV0dXJuVHlwZTxBY3Rpb25zPFMsIFI+W0tdPj59ID0ge307XG5cbiAgICBsZXQgc291cmNlU3ViOiByeC5TdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG4gICAgZm9yIChjb25zdCByZWR1Y2VyTmFtZSBvZiBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycykpIHtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBtdWx0aWNhc2VBY3Rpb25NYXBbYWN0aW9uQ3JlYXRvcnNbcmVkdWNlck5hbWVdLnR5cGVdID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTLCBhbnk+IHwgQWN0aW9uPFM+PigpO1xuXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICBzcGxpdEFjdGlvbnNbcmVkdWNlck5hbWUgYXMga2V5b2YgUl0gPSByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgIGlmIChzb3VyY2VTdWIgPT0gbnVsbClcbiAgICAgICAgICBzb3VyY2VTdWIgPSBzb3VyY2Uuc3Vic2NyaWJlKCk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0LmFzT2JzZXJ2YWJsZSgpIGFzIHJ4Lk9ic2VydmFibGU8YW55PjtcbiAgICAgIH0pLnBpcGUoXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VTdWIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgc291cmNlU3ViID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IGFjdGlvbiQucGlwZShcbiAgICAgIG9wLnNoYXJlKCksXG4gICAgICBvcC5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtdWx0aWNhc2VBY3Rpb25NYXBbYWN0aW9uLnR5cGVdO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICBtYXRjaC5uZXh0KGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gc3BsaXRBY3Rpb25zIGFzIHtbSyBpbiBrZXlvZiBSXTogcnguT2JzZXJ2YWJsZTxSZXR1cm5UeXBlPEFjdGlvbnM8UywgUj5bS10+Pn07XG59XG5cbmNvbnN0IHNsaWNlQ291bnQ0TmFtZToge1tuYW1lOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2VPcHRpb25zPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGluaXRpYWxTdGF0ZTogUztcbiAgcmVkdWNlcnM6IFI7XG4gIC8qKiBHZW5lcmF0ZSB1bmlxdWUgSUQgYXMgcGFydCBvZiBzbGljZSdzIG5hbWUsIGRlZmF1bHQ6IHRydWUgKi9cbiAgZ2VuZXJhdGVJZD86IGJvb2xlYW47XG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgcm9vdFN0b3JlPzogcnguQmVoYXZpb3JTdWJqZWN0PHtbazogc3RyaW5nXTogU30+O1xufVxuXG4vKipcbiAqIFJlZHVjZXJzIGFuZCBpbml0aWFsU3RhdGUgYXJlIHJldXNlZCBjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRcbiAqIFxuICogIFNsaWNlIC0tLSBDb21wb25lbnQgaW5zdGFuY2UgKHN0YXRlLCBhY3Rpb25zKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2U8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihvcHQ6IFNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlPFMsIFI+IHtcbiAgbGV0IG5hbWUgPSBvcHQubmFtZTtcbiAgaWYgKG9wdC5nZW5lcmF0ZUlkID09PSB1bmRlZmluZWQgfHwgb3B0LmdlbmVyYXRlSWQgPT09IHRydWUpIHtcbiAgICBpZiAoc2xpY2VDb3VudDROYW1lW25hbWVdID09IG51bGwpIHtcbiAgICAgIHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9IDA7XG4gICAgfVxuICAgIG9wdC5uYW1lID0gbmFtZSA9IG5hbWUgKyAnLicgKyAoKytzbGljZUNvdW50NE5hbWVbbmFtZV0pO1xuICB9XG4gIGNvbnN0IGFjdGlvbkNyZWF0b3JzID0ge30gYXMgQWN0aW9uczxTLCBSPjtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG5cbiAgZm9yIChjb25zdCBba2V5LCByZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhvcHQucmVkdWNlcnMpKSB7XG4gICAgY29uc3QgdHlwZSA9IG5hbWUgKyAnLycgKyBrZXk7XG4gICAgY29uc3QgY3JlYXRvciA9ICgocGF5bG9hZDogdW5rbm93bikgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0ge3R5cGUsIHBheWxvYWQsIHJlZHVjZXJ9O1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgYW55PjtcbiAgICBjcmVhdG9yLnR5cGUgPSB0eXBlO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25DcmVhdG9yc1trZXkgYXMga2V5b2YgUl0gPSBjcmVhdG9yIGFzIGFueTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgocGF5bG9hZD86IGFueSkgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0gY3JlYXRvcihwYXlsb2FkKTtcbiAgICAgIGRpc3BhdGNoKGFjdGlvbik7XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcblxuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdLnR5cGUgPSBjcmVhdG9yLnR5cGU7XG4gIH1cblxuICBjb25zdCBzdGF0ZSQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PFM+KG9wdC5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB1bnByb2Nlc3NlZEFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuICBjb25zdCBhY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcblxuICBmdW5jdGlvbiBvZlR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4oXG4gICAgLi4uYWN0aW9uVHlwZXM6IFRbXSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvblR5cGVzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IG5hbWUgKyAnLycgKyBhYykpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pIHtcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgbGV0IGFjdGlvbkNvdW50ID0gMDtcbiAgbGV0IGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgLy8gVG8gd2FybiBkZXZlbG9wZXIgdGhhdCBubyBhY3Rpb24gZGlzcGF0Y2hpbmcgc2hvdWQgYmUgY2FsbGVkIGluc2lkZSBhIHJlZHVjZXIsIHRoaXMgaXMgc2lkZS1lZmZlY3RzIGFuZCBcbiAgLy8gd2lsbCBsZWFkcyB0byByZWN1cnNpdmUgcmVkdWNlclxuICBsZXQgaW5SZWR1Y2VyID0gZmFsc2U7XG5cbiAgY29uc3Qgc3ViID0gcngubWVyZ2UoXG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICAvLyBvcC5vYnNlcnZlT24ocngucXVldWVTY2hlZHVsZXIpLCAvLyBBdm9pZCByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBhY3Rpb24gaW5zaWRlIGFuIHJlZHVjZXIsIGJ1dCBub3JtYWxseSByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBzaG91bGQgYmUgd2FybmVkIGFuZCBmb3JiaWRkZW5cbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDphY3Rpb24gYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2ZhZTRmYzsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChhY3Rpb24ucmVkdWNlcikge1xuICAgICAgICAgIGNvbnN0IGN1cnJTdGF0ZSA9IHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgICAgICAgIGNvbnN0IHNoYWxsb3dDb3BpZWQgPSB7Li4uY3VyclN0YXRlLCBfX2FjOiArK2FjdGlvbkNvdW50fTtcbiAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoaW5SZWR1Y2VyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERvIG5vdCBkaXNwYXRjaCBhY3Rpb24gaW5zaWRlIGEgcmVkdWNlciEgKGFjdGlvbjogJHthY3Rpb24udHlwZX0pYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgbGV0IG5ld1N0YXRlOiBTIHwgdm9pZDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbmV3U3RhdGUgPSBhY3Rpb24ucmVkdWNlcihzaGFsbG93Q29waWVkLCAoYWN0aW9uIGFzIFBheWxvYWRBY3Rpb248Uz4pLnBheWxvYWQpO1xuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gaW5SZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgLy8gZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBuZXdTdGF0ZSA/IG5ld1N0YXRlIDogc2hhbGxvd0NvcGllZDtcbiAgICAgICAgICBzdGF0ZSQubmV4dChjaGFuZ2VkKTtcbiAgICAgICAgfVxuICAgICAgICBhY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgICAgIH0pLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ3JlZHVjZXIgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyIGFzIHVua25vd259O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICksXG4gICAgc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDpzdGF0ZSBgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZTk4ZGY1OycsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIG9wdC5yb290U3RvcmUgPyBzdGF0ZSQucGlwZShcbiAgICAgIG9wLnRhcChzdGF0ZSA9PiBvcHQucm9vdFN0b3JlIS5uZXh0KHsuLi5vcHQucm9vdFN0b3JlPy5nZXRWYWx1ZSgpLCBbb3B0Lm5hbWVdOiBzdGF0ZX0pKVxuICAgICApIDogcnguRU1QVFlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGRpc3BhdGNoKHtcbiAgICAgIHR5cGU6ICdfX09uRGVzdHJveSdcbiAgICB9KTtcbiAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEVwaWMkKGVwaWNGYWN0b3J5JDogcnguT2JzZXJ2YWJsZTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KSB7XG4gICAgY29uc3Qgc3ViID0gZXBpY0ZhY3RvcnkkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Auc3dpdGNoTWFwKGZhYyA9PiB7XG4gICAgICAgIGlmIChmYWMpIHtcbiAgICAgICAgICBjb25zdCBlcGljID0gZmFjKHNsaWNlLCBvZlR5cGUgYXMgT2ZUeXBlRm48UywgUj4pO1xuICAgICAgICAgIGlmIChlcGljKVxuICAgICAgICAgICAgcmV0dXJuIGVwaWMoYWN0aW9uJCwgc3RhdGUkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRha2VVbnRpbCh1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSkpLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiBkaXNwYXRjaChhY3Rpb24pKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgZGlzcGF0Y2goe3R5cGU6ICdlcGljIGVycm9yJyxcbiAgICAgICAgICByZWR1Y2VyKHM6IFMpIHtcbiAgICAgICAgICAgIHJldHVybiB7Li4ucywgZXJyb3I6IGVyciBhcyB1bmtub3dufTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIHJldHVybiAoKSA9PiBzdWIudW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGNvbnN0IHNsaWNlOiBTbGljZTxTLCBSPiA9IHtcbiAgICBuYW1lLFxuICAgIHN0YXRlJCxcbiAgICBhY3Rpb24kLFxuICAgIGFjdGlvbnM6IGFjdGlvbkNyZWF0b3JzLFxuICAgIGRpc3BhdGNoLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgZGVzdHJveSxcbiAgICBkZXN0cm95JDogdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpLFxuICAgIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KSB7XG4gICAgICByZXR1cm4gYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlJDtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgaWYgKGV4ZWN1dGluZ1JlZHVjZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUbyBiZSBjb25zaXN0ZW50IHdpdGggUmVkdXhcXCdzIGJlaGF2aW91ciwgc2xpY2UuZ2V0U3RhdGUoKSBpcyBub3QgYWxsb3dlZCB0byBiZSBpbnZva2VkIGluc2lkZSBhIHJlZHVjZXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzbGljZTtcbn1cblxuLyoqXG4gKiBBZGQgYW4gZXBpY0ZhY3RvcnkgdG8gYW5vdGhlciBjb21wb25lbnQncyBzbGljZUhlbHBlclxuICogZS5nLlxuICogYGBgXG4gKiBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX29uQ2hpbGRTbGljZVJlZiksXG4gKiAgY2hpbGRTbGljZU9wKChjaGlsZFNsaWNlKSA9PiB7XG4gKiAgICByZXR1cm4gY2hpbGRBY3Rpb24kID0+IHtcbiAqICAgICAgcmV0dXJuIGNoaWxkQWN0aW9uJC5waXBlKC4uLik7XG4gKiAgICB9O1xuICogIH0pXG4gKiBgYGBcbiAqIEBwYXJhbSBlcGljRmFjdG9yeSBcbiAqL1xuIGV4cG9ydCBmdW5jdGlvbiBzbGljZVJlZkFjdGlvbk9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxQYXlsb2FkQWN0aW9uPGFueSwgU2xpY2U8UywgUj4+LCBQYXlsb2FkQWN0aW9uPGFueSwgYW55Pj4ge1xuICByZXR1cm4gZnVuY3Rpb24oaW4kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4+KSB7XG4gICAgcmV0dXJuIGluJC5waXBlKFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcmVsZWFzZSA9IHBheWxvYWQuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPG5ldmVyPj4oc3ViID0+IHJlbGVhc2UpO1xuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5jb25zdCBkZW1vU2xpY2UgPSBjcmVhdGVTbGljZSh7XG4gIG5hbWU6ICdkZW1vJyxcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyB7b2s/OiBib29sZWFuOyBlcnJvcj86IEVycm9yfSxcbiAgcmVkdWNlcnM6IHtcbiAgICBoZWxsb3cocywgZ3JlZXRpbmc6IHtkYXRhOiBzdHJpbmd9KSB7fSxcbiAgICB3b3JsZChzKSB7fVxuICB9XG59KTtcbmRlbW9TbGljZS5hZGRFcGljKChzbGljZSwgb2ZUeXBlKSA9PiB7XG4gIHJldHVybiAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25TdHJlYW1zLmhlbGxvdy5waXBlKCksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnaGVsbG93JywgJ2hlbGxvdycpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbnMud29ybGQoKSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnd29ybGQnKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhlbGxvdyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gdHlwZW9mIGFjdGlvbi5wYXlsb2FkLmRhdGEgPT09ICdzdHJpbmcnKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93LCBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZClcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcblxuIl19