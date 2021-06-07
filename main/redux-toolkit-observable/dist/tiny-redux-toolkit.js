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
exports.sliceRefActionOp = exports.createSlice = exports.ofPayloadAction = void 0;
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
    var _loop_1 = function (key, reducer) {
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
        _loop_1(key, reducer);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQStFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBNEM7U0FBNUMsVUFBNEMsRUFBNUMscUJBQTRDLEVBQTVDLElBQTRDO1FBQTVDLG1DQUE0Qzs7SUFDNUMsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUEQsMENBT0M7QUFFRCxJQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO0FBWXJEOzs7O0dBSUc7QUFDSCxTQUFnQixXQUFXLENBQW1ELEdBQXVCO0lBQ25HLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDcEIsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtRQUMzRCxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDakMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMzQjtRQUNELEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFD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QztJQUM5QixDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhpcyBmaWxlIHByb3ZpZGUgc29tZSBob29rcyB3aGljaCBsZXZlcmFnZXMgUnhKUyB0byBtaW1pYyBSZWR1eC10b29sa2l0ICsgUmVkdXgtb2JzZXJ2YWJsZVxuICogd2hpY2ggaXMgc3VwcG9zZWQgdG8gYmUgdXNlZCBpbmRlcGVuZGVudGx5IHdpdGhpbiBhbnkgUmVhY3QgY29tcG9uZW50IGluIGNhc2UgeW91ciBjb21wb25lbnQgaGFzIFxuICogY29tcGxpY2F0ZWQgYXN5bmMgc3RhdGUgY2hhbmdlIGxvZ2ljLlxuICogXG4gKiAtIGl0IGlzIHNtYWxsIGFuZCBzdXBwb3NlZCB0byBiZSB3ZWxsIHBlcmZvcm1lZFxuICogLSBpdCBkb2VzIG5vdCB1c2UgSW1tZXJKUywgeW91IHNob3VsZCB0YWtlIGNhcmUgb2YgaW1tdXRhYmlsaXR5IG9mIHN0YXRlIGJ5IHlvdXJzZWxmXG4gKiAtIGJlY2F1c2UgdGhlcmUgaXMgbm8gSW1tZXJKUywgeW91IGNhbiBwdXQgYW55IHR5cGUgb2YgT2JqZWN0IGluIHN0YXRlIGluY2x1ZGluZyB0aG9zZSBhcmUgbm90IGZyaWVuZGx5IGJ5IEltbWVySlNcbiAqL1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbjxTPiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcmVkdWNlcj8ob2xkOiBTKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF5bG9hZEFjdGlvbjxTLCBQID0gYW55PiB7XG4gIHR5cGU6IHN0cmluZztcbiAgcGF5bG9hZDogUDtcbiAgcmVkdWNlcj8ob2xkOiBTLCBwYXlsb2FkOiBQKTogUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdWNlcnM8Uz4ge1xuICAvKiogUmV0dXJuaW5nIGB1bmRlZmluZWQgLyB2b2lkYCBoYXMgc2FtZSBlZmZlY3Qgb2YgcmV0dXJuaW5nIG9sZCBzdGF0ZSByZWZlcmVuY2UsXG4gICAqIFJldHVybmluZyBhIGJyYW5kIG5ldyBzdGF0ZSBvYmplY3QgZm9yIGltbXV0YWJpbGl0eSBpbiBub3JtYWwgY2FzZS5cbiAgICovXG4gIFt0eXBlOiBzdHJpbmddOiAoc3RhdGU6IFMsIHBheWxvYWQ/OiBhbnkpID0+IFMgfCB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSBBY3Rpb25zPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSB7XG4gIFtLIGluIGtleW9mIFJdOiBSW0tdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID8gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IDpcbiAgICBSW0tdIGV4dGVuZHMgKHM6IGFueSwgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+IDogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIHVua25vd24+O1xufTtcblxuZXhwb3J0IHR5cGUgQWN0aW9uQ3JlYXRvcjxTLCBQPiA9IEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiB8IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPjtcbmludGVyZmFjZSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4ge1xuICAoKTogQWN0aW9uPFM+O1xuICB0eXBlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4ge1xuICAocGF5bG9hZDogUCk6IFBheWxvYWRBY3Rpb248UywgUD47XG4gIHR5cGU6IHN0cmluZztcbn1cblxudHlwZSBPdXRwdXRBY3Rpb25PYnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPGFueT4sIEsgZXh0ZW5kcyBrZXlvZiBSPiA9XG4gIHJ4Lk9ic2VydmFibGU8UltLXSBleHRlbmRzIChzOiBTKSA9PiBhbnkgPyBBY3Rpb248Uz4gOiBSW0tdIGV4dGVuZHMgKHM6IFMsIHBheWxvYWQ6IGluZmVyIFApID0+IGFueSA/IFBheWxvYWRBY3Rpb248UywgUD4gOiBQYXlsb2FkQWN0aW9uPFMsIHVua25vd24+PjtcbiAgLy8gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueSwgUGFyYW1ldGVyczxSW0tdPlsxXSBleHRlbmRzIHVuZGVmaW5lZCA/IHZvaWQgOiBQYXJhbWV0ZXJzPFJbS10+WzFdLCBLPj47XG5cbnR5cGUgT2ZUeXBlUGlwZU9wPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPiwgSyBleHRlbmRzIGtleW9mIFI+ID0gKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PikgPT4gT3V0cHV0QWN0aW9uT2JzPFMsIFIsIEs+O1xuXG4vKiogc2FtZSBhcyBvZlBheWxvYWRBY3Rpb24oKSAsIHRvIGZpbHRlciBhY3Rpb24gc3RyZWFtIGJ5IHR5cGUsIHVubGlrZSBvZlBheWxvYWRBY3Rpb24oKSwgcGFyYW1ldGVyIGlzIGEgc3RyaW5nIGluc3RlYWQgb2YgYWN0aW9uQ3JlYXRvciAqL1xuZXhwb3J0IGludGVyZmFjZSBPZlR5cGVGbjxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzE+O1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSLCBLMiBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMj47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUiwgSzMgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSwgYWN0aW9uVHlwZTI6IEsyLCBhY3Rpb25UeXBlMzogSzMpOiBPZlR5cGVQaXBlT3A8UywgUiwgSzEgfCBLMiB8IEszPjtcbiAgPEsgZXh0ZW5kcyBrZXlvZiBSPiguLi5hY3Rpb25UeXBlczogS1tdKTogT2ZUeXBlUGlwZU9wPFMsIFIsIEs+O1xufVxuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID0gKHNsaWNlOiBTbGljZTxTLCBSPiwgb2ZUeXBlOiBPZlR5cGVGbjxTLCBSPikgPT4gRXBpYzxTPiB8IHZvaWQ7XG5leHBvcnQgaW50ZXJmYWNlIFNsaWNlPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmcgfCBudW1iZXI7XG4gIHN0YXRlJDogcnguQmVoYXZpb3JTdWJqZWN0PFM+O1xuICBhY3Rpb24kOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxTPj47XG4gIGRpc3BhdGNoOiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSA9PiB2b2lkO1xuICAvKiogQWN0aW9uIGNyZWF0b3JzIGJvdW5kIHdpdGggZGlzcGF0Y2hlciAqL1xuICBhY3Rpb25EaXNwYXRjaGVyOiBBY3Rpb25zPFMsIFI+O1xuICAvKiogQWN0aW9uIGNyZWF0b3JzICovXG4gIGFjdGlvbnM6IEFjdGlvbnM8UywgUj47XG4gIGRlc3Ryb3k6ICgpID0+IHZvaWQ7XG4gIGRlc3Ryb3kkOiByeC5PYnNlcnZhYmxlPGFueT47XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogKCkgPT4gdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiAoKSA9PiB2b2lkO1xuICBnZXRTdG9yZSgpOiByeC5PYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufVxuXG5leHBvcnQgdHlwZSBFcGljPFMsIEEkID0gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPFMsIGFueT4gfCBBY3Rpb248Uz4+PiA9IChhY3Rpb25zOiBBJCwgc3RhdGVzOiByeC5CZWhhdmlvclN1YmplY3Q8Uz4pID0+IEEkO1xuXG4vLyB0eXBlIFBheWxvYWRUeXBlT2ZBY3Rpb248QWN0aW9uQ3JlYXRvclR5cGU+ID0gQWN0aW9uQ3JlYXRvclR5cGUgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8YW55PiA/IHZvaWQgOlxuLy8gICBBY3Rpb25DcmVhdG9yVHlwZSBleHRlbmRzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxhbnksIGluZmVyIFA+ID8gUCA6IG5ldmVyO1xuXG4vKiogZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxTLCBQPihhY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxTLCBQPik6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFMsIFA+PjtcbiAgLy8gKHNvdXJjZTogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBQYXlsb2FkVHlwZU9mQWN0aW9uPEE+Pj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIFAsIFMxLCBQMT4oYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UywgUD4sIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxTMSwgUDE+KTpcbiAgcnguT3BlcmF0b3JGdW5jdGlvbjxhbnkgLCBQYXlsb2FkQWN0aW9uPFMsIFA+IHwgUGF5bG9hZEFjdGlvbjxTMSwgUDE+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UywgUCwgUzEsIFAxLCBTMiwgUDI+KGFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yPFMsIFA+LCBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UzEsIFAxPiwgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yPFMyLCBQMj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxTLCBQPiB8IFBheWxvYWRBY3Rpb248UzEsIFAxPiB8IFBheWxvYWRBY3Rpb248UzIsIFAyPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uKFxuICAuLi5hY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcjxhbnksIGFueT5bXSk6IHJ4Lk9wZXJhdG9yRnVuY3Rpb248dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duLCB1bmtub3duPj4ge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55Pj4pIHtcbiAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbkNyZWF0b3JzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IGFjLnR5cGUpKVxuICAgICk7XG4gIH07XG59XG5cbmNvbnN0IHNsaWNlQ291bnQ0TmFtZToge1tuYW1lOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2VPcHRpb25zPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGluaXRpYWxTdGF0ZTogUztcbiAgcmVkdWNlcnM6IFI7XG4gIC8qKiBHZW5lcmF0ZSB1bmlxdWUgSUQgYXMgcGFydCBvZiBzbGljZSdzIG5hbWUsIGRlZmF1bHQ6IHRydWUgKi9cbiAgZ2VuZXJhdGVJZD86IGJvb2xlYW47XG4gIGRlYnVnPzogYm9vbGVhbjtcbiAgcm9vdFN0b3JlPzogcnguQmVoYXZpb3JTdWJqZWN0PHtbazogc3RyaW5nXTogU30+O1xufVxuXG4vKipcbiAqIFJlZHVjZXJzIGFuZCBpbml0aWFsU3RhdGUgYXJlIHJldXNlZCBjcm9zcyBtdWx0aXBsZSBjb21wb25lbnRcbiAqIFxuICogIFNsaWNlIC0tLSBDb21wb25lbnQgaW5zdGFuY2UgKHN0YXRlLCBhY3Rpb25zKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2xpY2U8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihvcHQ6IFNsaWNlT3B0aW9uczxTLCBSPik6IFNsaWNlPFMsIFI+IHtcbiAgbGV0IG5hbWUgPSBvcHQubmFtZTtcbiAgaWYgKG9wdC5nZW5lcmF0ZUlkID09PSB1bmRlZmluZWQgfHwgb3B0LmdlbmVyYXRlSWQgPT09IHRydWUpIHtcbiAgICBpZiAoc2xpY2VDb3VudDROYW1lW25hbWVdID09IG51bGwpIHtcbiAgICAgIHNsaWNlQ291bnQ0TmFtZVtuYW1lXSA9IDA7XG4gICAgfVxuICAgIG9wdC5uYW1lID0gbmFtZSA9IG5hbWUgKyAnLicgKyAoKytzbGljZUNvdW50NE5hbWVbbmFtZV0pO1xuICB9XG4gIGNvbnN0IGFjdGlvbkNyZWF0b3JzID0ge30gYXMgQWN0aW9uczxTLCBSPjtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHt9IGFzIEFjdGlvbnM8UywgUj47XG5cbiAgZm9yIChjb25zdCBba2V5LCByZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhvcHQucmVkdWNlcnMpKSB7XG4gICAgY29uc3QgdHlwZSA9IG5hbWUgKyAnLycgKyBrZXk7XG4gICAgY29uc3QgY3JlYXRvciA9ICgocGF5bG9hZDogYW55KSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7dHlwZSwgcGF5bG9hZCwgcmVkdWNlcn07XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0pIGFzIGFueTtcbiAgICBjcmVhdG9yLnR5cGUgPSB0eXBlO1xuICAgIGFjdGlvbkNyZWF0b3JzW2tleSBhcyBrZXlvZiBSXSA9IGNyZWF0b3I7XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyW2tleSBhcyBrZXlvZiBSXSA9ICgocGF5bG9hZD86IGFueSkgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0gKGNyZWF0b3IgYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIGFueT4pKHBheWxvYWQpO1xuICAgICAgZGlzcGF0Y2goYWN0aW9uKTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdLnR5cGUgPSBjcmVhdG9yLnR5cGU7XG4gIH1cblxuICBjb25zdCBzdGF0ZSQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PFM+KG9wdC5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB1bnByb2Nlc3NlZEFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuICBjb25zdCBhY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8UGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPj4oKTtcblxuICBmdW5jdGlvbiBvZlR5cGU8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBUIGV4dGVuZHMga2V5b2YgUj4oXG4gICAgLi4uYWN0aW9uVHlwZXM6IFRbXSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvblR5cGVzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IG5hbWUgKyAnLycgKyBhYykpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb246IFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4pIHtcbiAgICB1bnByb2Nlc3NlZEFjdGlvbiQubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgbGV0IGFjdGlvbkNvdW50ID0gMDtcbiAgbGV0IGV4ZWN1dGluZ1JlZHVjZXIgPSBmYWxzZTtcbiAgLy8gVG8gd2FybiBkZXZlbG9wZXIgdGhhdCBubyBhY3Rpb24gZGlzcGF0Y2hpbmcgc2hvdWQgYmUgY2FsbGVkIGluc2lkZSBhIHJlZHVjZXIsIHRoaXMgaXMgc2lkZS1lZmZlY3RzIGFuZCBcbiAgLy8gd2lsbCBsZWFkcyB0byByZWN1cnNpdmUgcmVkdWNlclxuICBsZXQgaW5SZWR1Y2VyID0gZmFsc2U7XG5cbiAgY29uc3Qgc3ViID0gcngubWVyZ2UoXG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICAvLyBvcC5vYnNlcnZlT24ocngucXVldWVTY2hlZHVsZXIpLCAvLyBBdm9pZCByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBhY3Rpb24gaW5zaWRlIGFuIHJlZHVjZXIsIGJ1dCBub3JtYWxseSByZWN1cnNpdmVseSBkaXNwYXRjaGluZyBzaG91bGQgYmUgd2FybmVkIGFuZCBmb3JiaWRkZW5cbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6YWN0aW9uIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNmYWU0ZmM7JywgYWN0aW9uLnR5cGUpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoYWN0aW9uLnJlZHVjZXIpIHtcbiAgICAgICAgICBjb25zdCBjdXJyU3RhdGUgPSBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICBjb25zdCBzaGFsbG93Q29waWVkID0gey4uLmN1cnJTdGF0ZSwgX19hYzogKythY3Rpb25Db3VudH07XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IHRydWU7XG4gICAgICAgICAgaWYgKGluUmVkdWNlcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEbyBub3QgZGlzcGF0Y2ggYWN0aW9uIGluc2lkZSBhIHJlZHVjZXIhIChhY3Rpb246ICR7YWN0aW9uLnR5cGV9KWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpblJlZHVjZXIgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc2hhbGxvd0NvcGllZCwgKGFjdGlvbiBhcyBQYXlsb2FkQWN0aW9uPFM+KS5wYXlsb2FkKTtcbiAgICAgICAgICBpblJlZHVjZXIgPSBmYWxzZTtcbiAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gZmFsc2U7XG4gICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1N0YXRlID8gbmV3U3RhdGUgOiBzaGFsbG93Q29waWVkO1xuICAgICAgICAgIHN0YXRlJC5uZXh0KGNoYW5nZWQpO1xuICAgICAgICB9XG4gICAgICAgIGFjdGlvbiQubmV4dChhY3Rpb24pO1xuICAgICAgfSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAncmVkdWNlciBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnJ9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICksXG4gICAgc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4ge1xuICAgICAgICBpZiAob3B0LmRlYnVnKSB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYCVjICR7bmFtZX0gaW50ZXJuYWw6c3RhdGUgYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2U5OGRmNTsnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBvcHQucm9vdFN0b3JlID8gc3RhdGUkLnBpcGUoXG4gICAgICBvcC50YXAoc3RhdGUgPT4gb3B0LnJvb3RTdG9yZSEubmV4dCh7Li4ub3B0LnJvb3RTdG9yZT8uZ2V0VmFsdWUoKSwgW29wdC5uYW1lXTogc3RhdGV9KSlcbiAgICAgKSA6IHJ4LkVNUFRZXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljJChlcGljRmFjdG9yeSQ6IHJ4Lk9ic2VydmFibGU8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPikge1xuICAgIGNvbnN0IHN1YiA9IGVwaWNGYWN0b3J5JC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnN3aXRjaE1hcChmYWMgPT4ge1xuICAgICAgICBpZiAoZmFjKSB7XG4gICAgICAgICAgY29uc3QgZXBpYyA9IGZhYyhzbGljZSwgb2ZUeXBlIGFzIE9mVHlwZUZuPFMsIFI+KTtcbiAgICAgICAgICBpZiAoZXBpYylcbiAgICAgICAgICAgIHJldHVybiBlcGljKGFjdGlvbiQsIHN0YXRlJCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfSksXG4gICAgICBvcC50YWtlVW50aWwodW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ19fT25EZXN0cm95JyksIG9wLnRha2UoMSkpKSxcbiAgICAgIG9wLnRhcChhY3Rpb24gPT4gZGlzcGF0Y2goYWN0aW9uKSksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnZXBpYyBlcnJvcicsXG4gICAgICAgICAgcmVkdWNlcihzOiBTKSB7XG4gICAgICAgICAgICByZXR1cm4gey4uLnMsIGVycm9yOiBlcnJ9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgc2xpY2U6IFNsaWNlPFMsIFI+ID0ge1xuICAgIG5hbWUsXG4gICAgc3RhdGUkLFxuICAgIGFjdGlvbiQsXG4gICAgYWN0aW9uczogYWN0aW9uQ3JlYXRvcnMsXG4gICAgZGlzcGF0Y2gsXG4gICAgYWN0aW9uRGlzcGF0Y2hlcixcbiAgICBkZXN0cm95LFxuICAgIGRlc3Ryb3kkOiB1bnByb2Nlc3NlZEFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnX19PbkRlc3Ryb3knKSwgb3AudGFrZSgxKSksXG4gICAgYWRkRXBpYyhlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pIHtcbiAgICAgIHJldHVybiBhZGRFcGljJChyeC5vZihlcGljRmFjdG9yeSkpO1xuICAgIH0sXG4gICAgYWRkRXBpYyQsXG4gICAgZ2V0U3RvcmUoKSB7XG4gICAgICByZXR1cm4gc3RhdGUkO1xuICAgIH0sXG4gICAgZ2V0U3RhdGUoKSB7XG4gICAgICBpZiAoZXhlY3V0aW5nUmVkdWNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvIGJlIGNvbnNpc3RlbnQgd2l0aCBSZWR1eFxcJ3MgYmVoYXZpb3VyLCBzbGljZS5nZXRTdGF0ZSgpIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGludm9rZWQgaW5zaWRlIGEgcmVkdWNlcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHNsaWNlO1xufVxuXG4vKipcbiAqIEFkZCBhbiBlcGljRmFjdG9yeSB0byBhbm90aGVyIGNvbXBvbmVudCdzIHNsaWNlSGVscGVyXG4gKiBlLmcuXG4gKiBgYGBcbiAqIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fb25DaGlsZFNsaWNlUmVmKSxcbiAqICBjaGlsZFNsaWNlT3AoKGNoaWxkU2xpY2UpID0+IHtcbiAqICAgIHJldHVybiBjaGlsZEFjdGlvbiQgPT4ge1xuICogICAgICByZXR1cm4gY2hpbGRBY3Rpb24kLnBpcGUoLi4uKTtcbiAqICAgIH07XG4gKiAgfSlcbiAqIGBgYFxuICogQHBhcmFtIGVwaWNGYWN0b3J5IFxuICovXG4gZXhwb3J0IGZ1bmN0aW9uIHNsaWNlUmVmQWN0aW9uT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihlcGljRmFjdG9yeTogRXBpY0ZhY3Rvcnk8UywgUj4pOlxuICByeC5PcGVyYXRvckZ1bmN0aW9uPFBheWxvYWRBY3Rpb248YW55LCBTbGljZTxTLCBSPj4sIFBheWxvYWRBY3Rpb248YW55LCBhbnk+PiB7XG4gIHJldHVybiBmdW5jdGlvbihpbiQ6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnksIFNsaWNlPFMsIFI+Pj4pIHtcbiAgICByZXR1cm4gaW4kLnBpcGUoXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCByZWxlYXNlID0gcGF5bG9hZC5hZGRFcGljKGVwaWNGYWN0b3J5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248bmV2ZXI+PihzdWIgPT4gcmVsZWFzZSk7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlKHtcbiAgbmFtZTogJ2RlbW8nLFxuICBpbml0aWFsU3RhdGU6IHt9IGFzIHtvaz86IGJvb2xlYW47IGVycm9yPzogRXJyb3I7fSxcbiAgcmVkdWNlcnM6IHtcbiAgICBoZWxsb3cocywgZ3JlZXRpbmc6IHtkYXRhOiBzdHJpbmd9KSB7fSxcbiAgICB3b3JsZChzKSB7fVxuICB9XG59KTtcbmRlbW9TbGljZS5hZGRFcGljKChzbGljZSwgb2ZUeXBlKSA9PiB7XG4gIHJldHVybiAoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ2hlbGxvdycsICdoZWxsb3cnKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25zLndvcmxkKCkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ3dvcmxkJyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5oZWxsb3coe2RhdGE6ICd5ZXMnfSkpXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHR5cGVvZiBhY3Rpb24ucGF5bG9hZC5kYXRhID09PSAnc3RyaW5nJylcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdywgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci53b3JsZCksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQpXG4gICAgICApXG4gICAgKS5waXBlKG9wLmlnbm9yZUVsZW1lbnRzKCkpO1xuICB9O1xufSk7XG5cbiJdfQ==