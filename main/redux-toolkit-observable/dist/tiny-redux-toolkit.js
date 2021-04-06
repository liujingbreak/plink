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
exports.ofAction = void 0;
var rx = __importStar(require("rxjs"));
var op = __importStar(require("rxjs/operators"));
function ofAction() {
    var actionCreators = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        actionCreators[_i] = arguments[_i];
    }
    return function (src) {
        return src.pipe(op.filter(function (action) { return actionCreators.some(function (ac) { return action.type === ac.type; }); }));
    };
}
exports.ofAction = ofAction;
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
function createTinyReduxToolkit(_a) {
    var initialState = _a.initialState, reducers = _a.reducers, logPrefix = _a.logPrefix, onStateChange = _a.onStateChange;
    // const [state, setState] = React.useState<S>(initialState);
    var state$ = new rx.BehaviorSubject(initialState);
    var unprocessedAction$ = new rx.Subject();
    var action$ = new rx.Subject();
    var bindActions = {};
    var _loop_1 = function (type, reducer) {
        var creator = function (payload) {
            var action = { type: type, payload: payload, reducer: reducer };
            unprocessedAction$.next(action);
            return action;
        };
        creator.type = type;
        bindActions[type] = creator;
    };
    for (var _i = 0, _b = Object.entries(reducers); _i < _b.length; _i++) {
        var _c = _b[_i], type = _c[0], reducer = _c[1];
        _loop_1(type, reducer);
    }
    var actionDispatcher = bindActions;
    var sub = rx.merge(state$.pipe(op.tap(function (state) {
        if (logPrefix) {
            // tslint:disable-next-line: no-console
            console.log("%c " + logPrefix + " internal:state", 'color: black; background: #e98df5;', state);
        }
    }), op.distinctUntilChanged(), 
    // op.tap(() => {
    //   if (logPrefix) {
    //     // tslint:disable-next-line: no-console
    //     console.log(`%c ${logPrefix} sync to React State`, 'color: black; background: #e98df5;');
    //   }
    // }),
    op.tap(function (state) { return onStateChange(state); })), unprocessedAction$.pipe(op.tap(function (action) {
        if (logPrefix) {
            // tslint:disable-next-line: no-console
            console.log("%c " + logPrefix + " internal:action", 'color: black; background: #fae4fc;', action.type);
        }
    }), op.tap(function (action) {
        if (action.reducer) {
            var newState = action.reducer(state$.getValue(), action.payload);
            if (newState !== undefined)
                state$.next(newState);
        }
        action$.next(action);
    }), op.catchError(function (err, caught) {
        console.error(err);
        dispatch({ type: 'reducer error', reducer: function (s) {
                return __assign(__assign({}, s), { error: err });
            }
        });
        return caught;
    }))).subscribe();
    function destroy() {
        dispatch({
            type: '__OnDestroy'
        });
        sub.unsubscribe();
    }
    function addEpic(epic) {
        epic(action$, state$).pipe(op.takeUntil(action$.pipe(op.filter(function (action) { return action.type === '__OnDestroy'; }), op.take(1))), op.tap(function (action) { return dispatch(action); }), op.catchError(function (err, caught) {
            console.error(err);
            dispatch({ type: 'epic error', reducer: function (s) {
                    return __assign(__assign({}, s), { error: err });
                }
            });
            return caught;
        })).subscribe();
    }
    function dispatch(action) {
        unprocessedAction$.next(action);
    }
    return {
        addEpic: addEpic,
        dispatch: dispatch,
        destroy: destroy,
        actionDispatcher: actionDispatcher
        // state$,
        // action$
    };
}
exports.default = createTinyReduxToolkit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdGlueS1yZWR1eC10b29sa2l0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUEyQjtBQUMzQixpREFBcUM7QUFrRHJDLFNBQWdCLFFBQVE7SUFDdEIsd0JBQXdDO1NBQXhDLFVBQXdDLEVBQXhDLHFCQUF3QyxFQUF4QyxJQUF3QztRQUF4QyxtQ0FBd0M7O0lBQ3hDLE9BQU8sVUFBUyxHQUEwQztRQUN4RCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQXZCLENBQXVCLENBQUMsRUFBbEQsQ0FBa0QsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUxELDRCQUtDO0FBUUQ7Ozs7Ozs7O0dBUUc7QUFDSCxTQUF3QixzQkFBc0IsQ0FDNUMsRUFBdUU7UUFBdEUsWUFBWSxrQkFBQSxFQUFFLFFBQVEsY0FBQSxFQUFFLFNBQVMsZUFBQSxFQUFFLGFBQWEsbUJBQUE7SUFDakQsNkRBQTZEO0lBQzdELElBQU0sTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBSSxZQUFZLENBQUMsQ0FBQztJQUN2RCxJQUFNLGtCQUFrQixHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBd0IsQ0FBQztJQUNsRSxJQUFNLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQXdCLENBQUM7SUFFdkQsSUFBTSxXQUFXLEdBQTJCLEVBQUUsQ0FBQzs0QkFFbkMsSUFBSSxFQUFFLE9BQU87UUFDdkIsSUFBTSxPQUFPLEdBQXlDLFVBQVMsT0FBYTtZQUMxRSxJQUFNLE1B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LEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBN0IsQ0FBNkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMxRixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFoQixDQUFnQixDQUFDLEVBQ2xDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBQyxHQUFHLEVBQUUsTUFBTTtZQUN4QixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLFFBQVEsQ0FBQyxFQUFDLElBQUksRUFBRSxZQUFZLEVBQzFCLE9BQU8sWUFBQyxDQUFDO29CQUNQLDZCQUFXLENBQUMsS0FBRSxLQUFLLEVBQUUsR0FBRyxJQUFFO2dCQUM1QixDQUFDO2FBQ0YsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxRQUFRLENBQUMsTUFBNEI7UUFDNUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxPQUFPO1FBQ0wsT0FBTyxTQUFBO1FBQ1AsUUFBUSxVQUFBO1FBQ1IsT0FBTyxTQUFBO1FBQ1AsZ0JBQWdCLGtCQUFBO1FBQ2hCLFVBQVU7UUFDVixVQUFVO0tBQ1gsQ0FBQztBQUNKLENBQUM7QUFuR0QseUNBbUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uV2l0aFJlZHVjZXI8UywgUCA9IGFueSwgVCA9IGFueT4ge1xuICB0eXBlOiBUO1xuICBwYXlsb2FkPzogUDtcbiAgLyoqIFJldHVybmluZyBgdW5kZWZpbmVkIC8gdm9pZGAgaGFzIHNhbWUgZWZmZWN0IG9mIHJldHVybmluZyBvbGQgc3RhdGUgcmVmZXJlbmNlLFxuICAgKiBSZXR1cm5pbmcgYSBicmFuZCBuZXcgc3RhdGUgb2JqZWN0IGZvciBpbW11dGFiaWxpdHkgaW4gbm9ybWFsIGNhc2UuXG4gICAqL1xuICByZWR1Y2VyPyhvbGQ6IFMsIHBheWxvYWQ6IFApOiBTIHwgdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWR1Y2VyczxTPiB7XG4gIC8qKiBSZXR1cm5pbmcgYHVuZGVmaW5lZCAvIHZvaWRgIGhhcyBzYW1lIGVmZmVjdCBvZiByZXR1cm5pbmcgb2xkIHN0YXRlIHJlZmVyZW5jZSxcbiAgICogUmV0dXJuaW5nIGEgYnJhbmQgbmV3IHN0YXRlIG9iamVjdCBmb3IgaW1tdXRhYmlsaXR5IGluIG5vcm1hbCBjYXNlLlxuICAgKi9cbiAgW3R5cGU6IHN0cmluZ106IChzdGF0ZTogUywgcGF5bG9hZD86IGFueSkgPT4gUyB8IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIEFjdGlvbnM8UywgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9IHtcbiAgW1R5cGUgaW4ga2V5b2YgUl06IC8vIFBhcmFtZXRlcnM8UltUeXBlXT5bMV0gZXh0ZW5kcyB2b2lkID8gQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFR5cGU+IDpcbiAgICBBY3Rpb25DcmVhdG9yPFBhcmFtZXRlcnM8UltUeXBlXT5bMV0gZXh0ZW5kcyB1bmRlZmluZWQgPyB2b2lkIDogUGFyYW1ldGVyczxSW1R5cGVdPlsxXSwgVHlwZT47XG59O1xuXG5cbi8vIGV4cG9ydCB0eXBlIEFjdGlvbkNyZWF0b3I8UCwgVHlwZT4gPSBQIGV4dGVuZHMgdW5kZWZpbmVkIHwgbmV2ZXIgfCB2b2lkID9cbi8vICAgQWN0aW9uQ3JlYXRvcldpdGhvdXRQYXlsb2FkPFR5cGU+IDogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFR5cGU+O1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbkNyZWF0b3I8UCwgVHlwZT4ge1xuICAocGF5bG9hZDogUCk6IHt0eXBlOiBUeXBlOyBwYXlsb2FkOiBQfTtcbiAgdHlwZTogVHlwZTtcbn1cblxuLy8gZXhwb3J0IGludGVyZmFjZSBBY3Rpb25DcmVhdG9yV2l0aG91dFBheWxvYWQ8VHlwZT4ge1xuLy8gICAoKTogKHt0eXBlOiBUeXBlOyBwYXlsb2FkOiB1bmRlZmluZWQ7fSk7XG4vLyAgIHR5cGU6IFR5cGU7XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiBvZkFjdGlvbjxQMSwgVDE+KFxuICBhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3I8UDEsIFQxPik6XG4gIChzcmM6IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55LCBQMSwgVDE+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZkFjdGlvbjxQMSwgUDIsIFQxLCBUMj4oXG4gIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxQMSwgVDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3I8UDIsIFQyPik6XG4gIChzcmM6IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55LCBQMSB8IFAyLCBUMSB8IFQyPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZBY3Rpb248UDEsIFAyLCBQMywgVDEsIFQyLCBUMz4oXG4gICAgYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yPFAxLCBUMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcjxQMiwgVDI+LCBhY3Rpb25DcmVhdG9yczM6IEFjdGlvbkNyZWF0b3I8UDMsIFQzPik6XG4gICAgKHNyYzogcnguT2JzZXJ2YWJsZTxBY3Rpb25XaXRoUmVkdWNlcjxhbnk+PikgPT4gcnguT2JzZXJ2YWJsZTxBY3Rpb25XaXRoUmVkdWNlcjxhbnksIFAxIHwgUDIgfCBQMywgVDEgfCBUMiB8IFQzPj47XG5cbiAgICBleHBvcnQgZnVuY3Rpb24gb2ZBY3Rpb248UDEsIFAyLCBQMywgUDQsIFQxLCBUMiwgVDMsIFQ0PihcbiAgICAgIGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcjxQMSwgVDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3I8UDIsIFQyPiwgYWN0aW9uQ3JlYXRvcnMzOiBBY3Rpb25DcmVhdG9yPFAzLCBUMz4sIGFjdGlvbkNyZWF0b3JzNDogQWN0aW9uQ3JlYXRvcjxQNCwgVDQ+KTpcbiAgICAgIChzcmM6IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55Pj4pID0+IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8YW55LCBQMSB8IFAyIHwgUDMgfCBQNCwgVDEgfCBUMiB8IFQzIHwgVDQ+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZkFjdGlvbjxQLCBUPihcbiAgLi4uYWN0aW9uQ3JlYXRvcnM6IEFjdGlvbkNyZWF0b3I8UCwgVD5bXSkge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiByeC5PYnNlcnZhYmxlPEFjdGlvbldpdGhSZWR1Y2VyPGFueT4+KTogcnguT2JzZXJ2YWJsZTxBY3Rpb25XaXRoUmVkdWNlcjxULCBQPj4ge1xuICAgIHJldHVybiBzcmMucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbkNyZWF0b3JzLnNvbWUoYWMgPT4gYWN0aW9uLnR5cGUgPT09IGFjLnR5cGUpKSk7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlT3B0aW9uczxTLCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+IHtcbiAgaW5pdGlhbFN0YXRlOiBTO1xuICByZWR1Y2VyczogUjtcbiAgbG9nUHJlZml4Pzogc3RyaW5nO1xuICBvblN0YXRlQ2hhbmdlKHNuYXBzaG90OiBTKTogdm9pZDtcbn1cbi8qKlxuICogVGhpcyBmaWxlIHByb3ZpZGUgc29tZSBob29rcyB3aGljaCBsZXZlcmFnZXMgUnhKUyB0byBtaW1pYyBSZWR1eC10b29sa2l0ICsgUmVkdXgtb2JzZXJ2YWJsZVxuICogd2hpY2ggaXMgc3VwcG9zZWQgdG8gYmUgdXNlZCBpbmRlcGVuZGVudGx5IHdpdGhpbiBhbnkgUmVhY3QgY29tcG9uZW50IGluIGNhc2UgeW91ciBjb21wb25lbnQgaGFzIFxuICogY29tcGxpY2F0ZWQgYXN5bmMgc3RhdGUgY2hhbmdlIGxvZ2ljLlxuICogXG4gKiAtIGl0IGlzIHNtYWxsIGFuZCBzdXBwb3NlZCB0byBiZSB3ZWxsIHBlcmZvcm1lZFxuICogLSBpdCBkb2VzIG5vdCB1c2UgSW1tZXJKUywgeW91IHNob3VsZCB0YWtlIGNhcmUgb2YgaW1tdXRhYmlsaXR5IG9mIHN0YXRlIGJ5IHlvdXJzZWxmXG4gKiAtIGJlY2F1c2UgdGhlcmUgaXMgbm8gSW1tZXJKUywgeW91IGNhbiBwdXQgYW55IHR5cGUgb2YgT2JqZWN0IGluIHN0YXRlIGluY2x1ZGluZyB0aG9zZSBhcmUgbm90IGZyaWVuZGx5IGJ5IEltbWVySlNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlVGlueVJlZHV4VG9vbGtpdDxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KFxuICB7aW5pdGlhbFN0YXRlLCByZWR1Y2VycywgbG9nUHJlZml4LCBvblN0YXRlQ2hhbmdlfTogQ3JlYXRlT3B0aW9uczxTLCBSPikge1xuICAvLyBjb25zdCBbc3RhdGUsIHNldFN0YXRlXSA9IFJlYWN0LnVzZVN0YXRlPFM+KGluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHN0YXRlJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Uz4oaW5pdGlhbFN0YXRlKTtcbiAgY29uc3QgdW5wcm9jZXNzZWRBY3Rpb24kID0gbmV3IHJ4LlN1YmplY3Q8QWN0aW9uV2l0aFJlZHVjZXI8Uz4+KCk7XG4gIGNvbnN0IGFjdGlvbiQgPSBuZXcgcnguU3ViamVjdDxBY3Rpb25XaXRoUmVkdWNlcjxTPj4oKTtcblxuICBjb25zdCBiaW5kQWN0aW9uczogUGFydGlhbDxBY3Rpb25zPFMsIFI+PiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW3R5cGUsIHJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHJlZHVjZXJzKSkge1xuICAgIGNvbnN0IGNyZWF0b3I6IFBhcnRpYWw8QWN0aW9uQ3JlYXRvcjxhbnksIGtleW9mIFI+PiA9IGZ1bmN0aW9uKHBheWxvYWQ/OiBhbnkpIHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHt0eXBlLCBwYXlsb2FkLCByZWR1Y2VyfTtcbiAgICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH07XG4gICAgY3JlYXRvci50eXBlID0gdHlwZTtcbiAgICBiaW5kQWN0aW9uc1t0eXBlIGFzIGtleW9mIFJdID0gY3JlYXRvciBhcyBhbnk7XG4gIH1cbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9ICBiaW5kQWN0aW9ucyBhcyBBY3Rpb25zPFMsIFI+O1xuXG4gIGNvbnN0IHN1YiA9IHJ4Lm1lcmdlKFxuICAgIHN0YXRlJC5waXBlKFxuICAgICAgb3AudGFwKHN0YXRlID0+IHtcbiAgICAgICAgaWYgKGxvZ1ByZWZpeCkge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke2xvZ1ByZWZpeH0gaW50ZXJuYWw6c3RhdGVgLCAnY29sb3I6IGJsYWNrOyBiYWNrZ3JvdW5kOiAjZTk4ZGY1OycsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gb3AudGFwKCgpID0+IHtcbiAgICAgIC8vICAgaWYgKGxvZ1ByZWZpeCkge1xuICAgICAgLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGAlYyAke2xvZ1ByZWZpeH0gc3luYyB0byBSZWFjdCBTdGF0ZWAsICdjb2xvcjogYmxhY2s7IGJhY2tncm91bmQ6ICNlOThkZjU7Jyk7XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH0pLFxuICAgICAgb3AudGFwKHN0YXRlID0+IG9uU3RhdGVDaGFuZ2Uoc3RhdGUpKVxuICAgICksXG4gICAgdW5wcm9jZXNzZWRBY3Rpb24kLnBpcGUoXG4gICAgICBvcC50YXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKGxvZ1ByZWZpeCkge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGAlYyAke2xvZ1ByZWZpeH0gaW50ZXJuYWw6YWN0aW9uYCwgJ2NvbG9yOiBibGFjazsgYmFja2dyb3VuZDogI2ZhZTRmYzsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgb3AudGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChhY3Rpb24ucmVkdWNlcikge1xuICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gYWN0aW9uLnJlZHVjZXIoc3RhdGUkLmdldFZhbHVlKCksIGFjdGlvbi5wYXlsb2FkKTtcbiAgICAgICAgICBpZiAobmV3U3RhdGUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHN0YXRlJC5uZXh0KG5ld1N0YXRlKTtcbiAgICAgICAgfVxuICAgICAgICBhY3Rpb24kLm5leHQoYWN0aW9uKTtcbiAgICAgIH0pLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ3JlZHVjZXIgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIocykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBkaXNwYXRjaCh7XG4gICAgICB0eXBlOiAnX19PbkRlc3Ryb3knXG4gICAgfSk7XG4gICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRFcGljKGVwaWM6IChhY3Rpb25zOiByeC5PYnNlcnZhYmxlPEFjdGlvbldpdGhSZWR1Y2VyPFM+Piwgc3RhdGVzOiByeC5CZWhhdmlvclN1YmplY3Q8Uz4pID0+IHJ4Lk9ic2VydmFibGU8QWN0aW9uV2l0aFJlZHVjZXI8Uz4+KSB7XG4gICAgZXBpYyhhY3Rpb24kLCBzdGF0ZSQpLnBpcGUoXG4gICAgICBvcC50YWtlVW50aWwoYWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdfX09uRGVzdHJveScpLCBvcC50YWtlKDEpKSksXG4gICAgICBvcC50YXAoYWN0aW9uID0+IGRpc3BhdGNoKGFjdGlvbikpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICBkaXNwYXRjaCh7dHlwZTogJ2VwaWMgZXJyb3InLFxuICAgICAgICAgIHJlZHVjZXIocykge1xuICAgICAgICAgICAgcmV0dXJuIHsuLi5zLCBlcnJvcjogZXJyfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2F1Z2h0O1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uOiBBY3Rpb25XaXRoUmVkdWNlcjxTPikge1xuICAgIHVucHJvY2Vzc2VkQWN0aW9uJC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFkZEVwaWMsXG4gICAgZGlzcGF0Y2gsXG4gICAgZGVzdHJveSxcbiAgICBhY3Rpb25EaXNwYXRjaGVyXG4gICAgLy8gc3RhdGUkLFxuICAgIC8vIGFjdGlvbiRcbiAgfTtcbn1cbiJdfQ==