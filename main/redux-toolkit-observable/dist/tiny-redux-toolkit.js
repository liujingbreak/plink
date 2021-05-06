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
exports.createSlice = exports.ofPayloadAction = void 0;
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
    var sub = rx.merge(unprocessedAction$.pipe(op.tap(function (action) {
        if (opt.debug) {
            // tslint:disable-next-line: no-console
            console.log("%c " + name + " internal:action ", 'color: black; background: #fae4fc;', action.type);
        }
    }), op.tap(function (action) {
        if (action.reducer) {
            var currState = state$.getValue();
            var shallowCopied = __assign(__assign({}, currState), { __ac: ++actionCount });
            executingReducer = true;
            var newState = action.reducer(shallowCopied, action.payload);
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
        epicFactory$.pipe(op.distinctUntilChanged(), op.switchMap(function (fac) {
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
    }
    var slice = {
        name: name,
        state$: state$,
        actions: actionCreators,
        dispatch: dispatch,
        actionDispatcher: actionDispatcher,
        destroy: destroy,
        addEpic: function (epicFactory) {
            addEpic$(rx.of(epicFactory));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztHQVFHO0FBQ0gsdUNBQTJCO0FBQzNCLGlEQUFxQztBQTZFckMsU0FBZ0IsZUFBZTtJQUM3Qix3QkFBc0I7U0FBdEIsVUFBc0IsRUFBdEIscUJBQXNCLEVBQXRCLElBQXNCO1FBQXRCLG1DQUFzQjs7SUFFdEIsT0FBTyxVQUFTLEdBQXNDO1FBQ3BELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFBdkIsQ0FBdUIsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQ3hFLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBUkQsMENBUUM7QUFFRCxJQUFNLGVBQWUsR0FBNkIsRUFBRSxDQUFDO0FBWXJEOzs7O0dBSUc7QUFDSCxTQUFnQixXQUFXLENBQW1ELEdBQXVCO0lBQ25HLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDcEIsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtRQUMzRCxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDakMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMzQjtRQUNELEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFD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QSxNQUFNLENBQUMsT0FBTyxFQUFkLENBQWMsQ0FBQyxDQUNqQyxDQUNGLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgcHJvdmlkZSBzb21lIGhvb2tzIHdoaWNoIGxldmVyYWdlcyBSeEpTIHRvIG1pbWljIFJlZHV4LXRvb2xraXQgKyBSZWR1eC1vYnNlcnZhYmxlXG4gKiB3aGljaCBpcyBzdXBwb3NlZCB0byBiZSB1c2VkIGluZGVwZW5kZW50bHkgd2l0aGluIGFueSBSZWFjdCBjb21wb25lbnQgaW4gY2FzZSB5b3VyIGNvbXBvbmVudCBoYXMgXG4gKiBjb21wbGljYXRlZCBhc3luYyBzdGF0ZSBjaGFuZ2UgbG9naWMuXG4gKiBcbiAqIC0gaXQgaXMgc21hbGwgYW5kIHN1cHBvc2VkIHRvIGJlIHdlbGwgcGVyZm9ybWVkXG4gKiAtIGl0IGRvZXMgbm90IHVzZSBJbW1lckpTLCB5b3Ugc2hvdWxkIHRha2UgY2FyZSBvZiBpbW11dGFiaWxpdHkgb2Ygc3RhdGUgYnkgeW91cnNlbGZcbiAqIC0gYmVjYXVzZSB0aGVyZSBpcyBubyBJbW1lckpTLCB5b3UgY2FuIHB1dCBhbnkgdHlwZSBvZiBPYmplY3QgaW4gc3RhdGUgaW5jbHVkaW5nIHRob3NlIGFyZSBub3QgZnJpZW5kbHkgYnkgSW1tZXJKU1xuICovXG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uPFM+IHtcbiAgdHlwZTogc3RyaW5nO1xuICByZWR1Y2VyPyhvbGQ6IFMpOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXlsb2FkQWN0aW9uPFMsIFAgPSBhbnk+IHtcbiAgdHlwZTogc3RyaW5nO1xuICBwYXlsb2FkOiBQO1xuICByZWR1Y2VyPyhvbGQ6IFMsIHBheWxvYWQ6IFApOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWR1Y2VyczxTPiB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW3R5cGU6IHN0cmluZ106IChzdGF0ZTogUywgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIEFjdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IHtcbiAgW0sgaW4ga2V5b2YgUl06IFJbS10gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgPyBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8Uz4gOlxuICAgIFJbS10gZXh0ZW5kcyAoczogYW55LCBwYXlsb2FkOiBpbmZlciBQKSA9PiBhbnkgPyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgUD4gOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgdW5rbm93bj47XG59O1xuXG5leHBvcnQgdHlwZSBBY3Rpb25DcmVhdG9yPFMsIFA+ID0gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFM+IHwgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFMsIFA+O1xuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxTPiB7XG4gICgpOiBBY3Rpb248Uz47XG4gIHR5cGU6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxTLCBQPiB7XG4gIChwYXlsb2FkOiBQKTogUGF5bG9hZEFjdGlvbjxTLCBQPjtcbiAgdHlwZTogc3RyaW5nO1xufVxuXG50eXBlIE91dHB1dEFjdGlvbk9iczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8YW55PiwgSyBleHRlbmRzIGtleW9mIFI+ID1cbiAgcnguT2JzZXJ2YWJsZTxSW0tdIGV4dGVuZHMgKHM6IFMpID0+IGFueSA/IEFjdGlvbjxTPiA6IFJbS10gZXh0ZW5kcyAoczogUywgcGF5bG9hZDogaW5mZXIgUCkgPT4gYW55ID8gUGF5bG9hZEFjdGlvbjxTLCBQPiA6IFBheWxvYWRBY3Rpb248UywgdW5rbm93bj4+O1xuICAvLyByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55LCBQYXJhbWV0ZXJzPFJbS10+WzFdIGV4dGVuZHMgdW5kZWZpbmVkID8gdm9pZCA6IFBhcmFtZXRlcnM8UltLXT5bMV0sIEs+PjtcblxudHlwZSBPZlR5cGVQaXBlT3A8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+LCBLIGV4dGVuZHMga2V5b2YgUj4gPSAoc3JjOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KSA9PiBPdXRwdXRBY3Rpb25PYnM8UywgUiwgSz47XG5cbi8qKiBzYW1lIGFzIG9mUGF5bG9hZEFjdGlvbigpICwgdG8gZmlsdGVyIGFjdGlvbiBzdHJlYW0gYnkgdHlwZSwgdW5saWtlIG9mUGF5bG9hZEFjdGlvbigpLCBwYXJhbWV0ZXIgaXMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhY3Rpb25DcmVhdG9yICovXG5leHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ge1xuICA8SzEgZXh0ZW5kcyBrZXlvZiBSPihhY3Rpb25UeXBlOiBLMSk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMT47XG4gIDxLMSBleHRlbmRzIGtleW9mIFIsIEsyIGV4dGVuZHMga2V5b2YgUj4oYWN0aW9uVHlwZTogSzEsIGFjdGlvblR5cGUyOiBLMik6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyPjtcbiAgPEsxIGV4dGVuZHMga2V5b2YgUiwgSzIgZXh0ZW5kcyBrZXlvZiBSLCBLMyBleHRlbmRzIGtleW9mIFI+KGFjdGlvblR5cGU6IEsxLCBhY3Rpb25UeXBlMjogSzIsIGFjdGlvblR5cGUzOiBLMyk6IE9mVHlwZVBpcGVPcDxTLCBSLCBLMSB8IEsyIHwgSzM+O1xuICA8SyBleHRlbmRzIGtleW9mIFI+KC4uLmFjdGlvblR5cGVzOiBLW10pOiBPZlR5cGVQaXBlT3A8UywgUiwgSz47XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5PFMsIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPSAoc2xpY2U6IFNsaWNlPFMsIFI+LCBvZlR5cGU6IE9mVHlwZUZuPFMsIFI+KSA9PiBFcGljPFM+IHwgdm9pZDtcbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2U8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZyB8IG51bWJlcjtcbiAgc3RhdGUkOiByeC5CZWhhdmlvclN1YmplY3Q8Uz47XG4gIGRpc3BhdGNoOiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+KSA9PiB2b2lkO1xuICAvKiogQWN0aW9uIGNyZWF0b3JzIGJvdW5kIHdpdGggZGlzcGF0Y2hlciAqL1xuICBhY3Rpb25EaXNwYXRjaGVyOiBBY3Rpb25zPFMsIFI+O1xuICAvKiogQWN0aW9uIGNyZWF0b3JzICovXG4gIGFjdGlvbnM6IEFjdGlvbnM8UywgUj47XG4gIGRlc3Ryb3k6ICgpID0+IHZvaWQ7XG4gIGFkZEVwaWMoZXBpY0ZhY3Rvcnk6IEVwaWNGYWN0b3J5PFMsIFI+KTogdm9pZDtcbiAgYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiB2b2lkO1xuICBnZXRTdG9yZSgpOiByeC5PYnNlcnZhYmxlPFM+O1xuICBnZXRTdGF0ZSgpOiBTO1xufVxuXG5leHBvcnQgdHlwZSBFcGljPFM+ID0gKGFjdGlvbnM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+IHwgQWN0aW9uPGFueT4+LCBzdGF0ZXM6IHJ4LkJlaGF2aW9yU3ViamVjdDxTPikgPT4gcnguT2JzZXJ2YWJsZTxBY3Rpb248YW55Pj47XG5cbnR5cGUgUGF5bG9hZFR5cGVPZkFjdGlvbjxBY3Rpb25DcmVhdG9yVHlwZT4gPSBBY3Rpb25DcmVhdG9yVHlwZSBleHRlbmRzIEFjdGlvbkNyZWF0b3JXaXRob3V0UGF5bG9hZDxhbnk+ID8gdm9pZCA6XG4gIEFjdGlvbkNyZWF0b3JUeXBlIGV4dGVuZHMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPGFueSwgaW5mZXIgUD4gPyBQIDogbmV2ZXI7XG5cbi8qKiBmaWx0ZXIgYWN0aW9uIHN0cmVhbSBieSB0eXBlICovXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIEEgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yPFMsIGFueT4+KGFjdGlvbkNyZWF0b3JzOiBBKTpcbiAgKHNvdXJjZTogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBQYXlsb2FkVHlwZU9mQWN0aW9uPEE+Pj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIEEgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yPFMsIGFueT4sIFMxLCBBMSBleHRlbmRzIEFjdGlvbkNyZWF0b3I8UzEsIGFueT4+KGFjdGlvbkNyZWF0b3JzOiBBLCBhY3Rpb25DcmVhdG9yczE6IEExKTpcbiAgKHNvdXJjZTogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBQYXlsb2FkVHlwZU9mQWN0aW9uPEE+PiB8IFBheWxvYWRBY3Rpb248UzEsIFBheWxvYWRUeXBlT2ZBY3Rpb248QTE+Pj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFMsIEEgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yPFMsIGFueT4sIFMxLCBBMSBleHRlbmRzIEFjdGlvbkNyZWF0b3I8UzEsIGFueT4sIFMyLCBBMiBleHRlbmRzIEFjdGlvbkNyZWF0b3I8UzIsIGFueT4+KGFjdGlvbkNyZWF0b3JzOiBBLCBhY3Rpb25DcmVhdG9yczE6IEExLCBhY3Rpb25DcmVhdG9yczI6IEEyKTpcbiAgKHNvdXJjZTogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4gfCBBY3Rpb248YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxTLCBQYXlsb2FkVHlwZU9mQWN0aW9uPEE+PiB8IFBheWxvYWRBY3Rpb248UzEsIFBheWxvYWRUeXBlT2ZBY3Rpb248QTE+PiB8IFBheWxvYWRBY3Rpb248UzIsIFBheWxvYWRUeXBlT2ZBY3Rpb248QTI+Pj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPEEgZXh0ZW5kcyBBY3Rpb25DcmVhdG9yPGFueSwgYW55Pj4oXG4gIC4uLmFjdGlvbkNyZWF0b3JzOiBBW10pOlxuICAoc291cmNlOiByeC5PYnNlcnZhYmxlPFBheWxvYWRBY3Rpb248YW55PiB8IEFjdGlvbjxhbnk+PikgPT4gcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPHVua25vd24sIFBheWxvYWRUeXBlT2ZBY3Rpb248QT4+PiB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IHJ4Lk9ic2VydmFibGU8UGF5bG9hZEFjdGlvbjxhbnk+Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uQ3JlYXRvcnMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gYWMudHlwZSkpXG4gICAgKTtcbiAgfTtcbn1cblxuY29uc3Qgc2xpY2VDb3VudDROYW1lOiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBTbGljZU9wdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiB7XG4gIG5hbWU6IHN0cmluZztcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgLyoqIEdlbmVyYXRlIHVuaXF1ZSBJRCBhcyBwYXJ0IG9mIHNsaWNlJ3MgbmFtZSwgZGVmYXVsdDogdHJ1ZSAqL1xuICBnZW5lcmF0ZUlkPzogYm9vbGVhbjtcbiAgZGVidWc/OiBib29sZWFuO1xuICByb290U3RvcmU/OiByeC5CZWhhdmlvclN1YmplY3Q8e1trOiBzdHJpbmddOiBTfT47XG59XG5cbi8qKlxuICogUmVkdWNlcnMgYW5kIGluaXRpYWxTdGF0ZSBhcmUgcmV1c2VkIGNyb3NzIG11bHRpcGxlIGNvbXBvbmVudFxuICogXG4gKiAgU2xpY2UgLS0tIENvbXBvbmVudCBpbnN0YW5jZSAoc3RhdGUsIGFjdGlvbnMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTbGljZTxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9wdDogU2xpY2VPcHRpb25zPFMsIFI+KTogU2xpY2U8UywgUj4ge1xuICBsZXQgbmFtZSA9IG9wdC5uYW1lO1xuICBpZiAob3B0LmdlbmVyYXRlSWQgPT09IHVuZGVmaW5lZCB8fCBvcHQuZ2VuZXJhdGVJZCA9PT0gdHJ1ZSkge1xuICAgIGlmIChzbGljZUNvdW50NE5hbWVbbmFtZV0gPT0gbnVsbCkge1xuICAgICAgc2xpY2VDb3VudDROYW1lW25hbWVdID0gMDtcbiAgICB9XG4gICAgb3B0Lm5hbWUgPSBuYW1lID0gbmFtZSArICcuJyArICgrK3NsaWNlQ291bnQ0TmFtZVtuYW1lXSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ3JlYXRvcnMgPSB7fSBhcyBBY3Rpb25zPFMsIFI+O1xuICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0ge30gYXMgQWN0aW9uczxTLCBSPjtcblxuICBmb3IgKGNvbnN0IFtrZXksIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKG9wdC5yZWR1Y2VycykpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZSArICcvJyArIGtleTtcbiAgICBjb25zdCBjcmVhdG9yID0gKChwYXlsb2FkOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHt0eXBlLCBwYXlsb2FkLCByZWR1Y2VyfTtcbiAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfSkgYXMgYW55O1xuICAgIGNyZWF0b3IudHlwZSA9IHR5cGU7XG4gICAgYWN0aW9uQ3JlYXRvcnNba2V5IGFzIGtleW9mIFJdID0gY3JlYXRvcjtcblxuICAgIGFjdGlvbkRpc3BhdGNoZXJba2V5IGFzIGtleW9mIFJdID0gKChwYXlsb2FkPzogYW55KSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSAoY3JlYXRvciBhcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UywgYW55PikocGF5bG9hZCk7XG4gICAgICBkaXNwYXRjaChhY3Rpb24pO1xuICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9KSBhcyBhbnk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlcltrZXkgYXMga2V5b2YgUl0udHlwZSA9IGNyZWF0b3IudHlwZTtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Uz4ob3B0LmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHVucHJvY2Vzc2VkQWN0aW9uJCA9IG5ldyByeC5TdWJqZWN0PFBheWxvYWRBY3Rpb248Uz4gfCBBY3Rpb248Uz4+KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxQYXlsb2FkQWN0aW9uPFM+IHwgQWN0aW9uPFM+PigpO1xuXG4gIGZ1bmN0aW9uIG9mVHlwZTxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4sIFQgZXh0ZW5kcyBrZXlvZiBSPihcbiAgICAuLi5hY3Rpb25UeXBlczogVFtdKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHNyYzogcnguT2JzZXJ2YWJsZTxQYXlsb2FkQWN0aW9uPGFueT4+KSB7XG4gICAgICByZXR1cm4gc3JjLnBpcGUoXG4gICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uVHlwZXMuc29tZShhYyA9PiBhY3Rpb24udHlwZSA9PT0gbmFtZSArICcvJyArIGFjKSlcbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoKGFjdGlvbjogUGF5bG9hZEFjdGlvbjxTPiB8IEFjdGlvbjxTPikge1xuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICBsZXQgYWN0aW9uQ291bnQgPSAwO1xuICBsZXQgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuXG4gIGNvbnN0IHN1YiA9IHJ4Lm1lcmdlKFxuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChvcHQuZGVidWcpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgJWMgJHtuYW1lfSBpbnRlcm5hbDphY3Rpb24gYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2ZhZTRmYzsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChhY3Rpb24ucmVkdWNlcikge1xuICAgICAgICAgIGNvbnN0IGN1cnJTdGF0ZSA9IHN0YXRlJC5nZXRWYWx1ZSgpO1xuICAgICAgICAgIGNvbnN0IHNoYWxsb3dDb3BpZWQgPSB7Li4uY3VyclN0YXRlLCBfX2FjOiArK2FjdGlvbkNvdW50fTtcbiAgICAgICAgICBleGVjdXRpbmdSZWR1Y2VyID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGFjdGlvbi5yZWR1Y2VyKHNoYWxsb3dDb3BpZWQsIChhY3Rpb24gYXMgUGF5bG9hZEFjdGlvbjxTPikucGF5bG9hZCk7XG4gICAgICAgICAgZXhlY3V0aW5nUmVkdWNlciA9IGZhbHNlO1xuICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBuZXdTdGF0ZSA/IG5ld1N0YXRlIDogc2hhbGxvd0NvcGllZDtcbiAgICAgICAgICBzdGF0ZSQubmV4dChjaGFuZ2VkKTtcbiAgICAgICAgfVxuICAgICAgICBhY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgICAgIH0pLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ3JlZHVjZXIgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLFxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKG9wdC5kZWJ1Zykge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke25hbWV9IGludGVybmFsOnN0YXRlIGAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNlOThkZjU7Jywgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgb3B0LnJvb3RTdG9yZSA/IHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IG9wdC5yb290U3RvcmUhLm5leHQoey4uLm9wdC5yb290U3RvcmU/LmdldFZhbHVlKCksIFtvcHQubmFtZV06IHN0YXRlfSkpXG4gICAgICkgOiByeC5FTVBUWVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgZGlzcGF0Y2goe1xuICAgICAgdHlwZTogJ19fT25EZXN0cm95J1xuICAgIH0pO1xuICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkRXBpYyQoZXBpY0ZhY3RvcnkkOiByeC5PYnNlcnZhYmxlPEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pIHtcbiAgICBlcGljRmFjdG9yeSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5zd2l0Y2hNYXAoZmFjID0+IHtcbiAgICAgICAgaWYgKGZhYykge1xuICAgICAgICAgIGNvbnN0IGVwaWMgPSBmYWMoc2xpY2UsIG9mVHlwZSBhcyBPZlR5cGVGbjxTLCBSPik7XG4gICAgICAgICAgaWYgKGVwaWMpXG4gICAgICAgICAgICByZXR1cm4gZXBpYyhhY3Rpb24kLCBzdGF0ZSQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFrZVVudGlsKHVucHJvY2Vzc2VkQWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IGRpc3BhdGNoKGFjdGlvbikpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ2VwaWMgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIoczogUykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgc2xpY2U6IFNsaWNlPFMsIFI+ID0ge1xuICAgIG5hbWUsXG4gICAgc3RhdGUkLFxuICAgIGFjdGlvbnM6IGFjdGlvbkNyZWF0b3JzLFxuICAgIGRpc3BhdGNoLFxuICAgIGFjdGlvbkRpc3BhdGNoZXIsXG4gICAgZGVzdHJveSxcbiAgICBhZGRFcGljKGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPikge1xuICAgICAgYWRkRXBpYyQocngub2YoZXBpY0ZhY3RvcnkpKTtcbiAgICB9LFxuICAgIGFkZEVwaWMkLFxuICAgIGdldFN0b3JlKCkge1xuICAgICAgcmV0dXJuIHN0YXRlJDtcbiAgICB9LFxuICAgIGdldFN0YXRlKCkge1xuICAgICAgaWYgKGV4ZWN1dGluZ1JlZHVjZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUbyBiZSBjb25zaXN0ZW50IHdpdGggUmVkdXhcXCdzIGJlaGF2aW91ciwgc2xpY2UuZ2V0U3RhdGUoKSBpcyBub3QgYWxsb3dlZCB0byBiZSBpbnZva2VkIGluc2lkZSBhIHJlZHVjZXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGF0ZSQuZ2V0VmFsdWUoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBzbGljZTtcbn1cblxuY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2Uoe1xuICBuYW1lOiAnZGVtbycsXG4gIGluaXRpYWxTdGF0ZToge30gYXMge29rPzogYm9vbGVhbjsgZXJyb3I/OiBFcnJvcjt9LFxuICByZWR1Y2Vyczoge1xuICAgIGhlbGxvdyhzLCBncmVldGluZzoge2RhdGE6IHN0cmluZ30pIHt9LFxuICAgIHdvcmxkKHMpIHt9XG4gIH1cbn0pO1xuZGVtb1NsaWNlLmFkZEVwaWMoKHNsaWNlLCBvZlR5cGUpID0+IHtcbiAgcmV0dXJuIChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnaGVsbG93JywgJ2hlbGxvdycpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbnMud29ybGQoKSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnd29ybGQnKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLmhlbGxvdyh7ZGF0YTogJ3llcyd9KSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhlbGxvdyksXG4gICAgICAgIG9wLnRhcChhY3Rpb24gPT4gdHlwZW9mIGFjdGlvbi5wYXlsb2FkLmRhdGEgPT09ICdzdHJpbmcnKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ybGQpLFxuICAgICAgICBvcC50YXAoYWN0aW9uID0+IHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93KHtkYXRhOiAneWVzJ30pKVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuaGVsbG93LCBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLndvcmxkKSxcbiAgICAgICAgb3AudGFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZClcbiAgICAgIClcbiAgICApLnBpcGUob3AuaWdub3JlRWxlbWVudHMoKSk7XG4gIH07XG59KTtcblxuIl19