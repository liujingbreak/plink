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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTinyReduxTookit = exports.useTinyRtk = void 0;
var react_1 = __importDefault(require("react"));
var tiny_redux_toolkit_1 = require("./tiny-redux-toolkit");
var op = __importStar(require("rxjs/operators"));
var rx = __importStar(require("rxjs"));
__exportStar(require("./tiny-redux-toolkit"), exports);
function withBaseReducers(origReducers) {
    var reducers = __assign({ _syncComponentProps: function (s, payload) {
            s.componentProps = __assign({}, payload);
        }, _willUnmount: function (s) { } }, origReducers);
    return reducers;
}
/**
 * Unlike useTinyReduxTookit, useTinyRtk() accepts a State which extends BaseComponentState,
 *  useTinyRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param props
 * @param epicFactories
 * @returns
 */
function useTinyRtk(optsFactory, props) {
    var epicFactories = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        epicFactories[_i - 2] = arguments[_i];
    }
    var extendOptsFactory = react_1.default.useCallback(function () {
        var opts = optsFactory();
        return __assign(__assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(function () { return function () {
        stateAndSlice[1].actionDispatcher._willUnmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }; }, []);
    var stateAndSlice = useTinyReduxTookit.apply(void 0, __spreadArray([extendOptsFactory], epicFactories, false));
    react_1.default.useEffect(function () {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    return stateAndSlice;
}
exports.useTinyRtk = useTinyRtk;
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
function useTinyReduxTookit(optsFactory) {
    var epicFactories = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        epicFactories[_i - 1] = arguments[_i];
    }
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, [optsFactory]);
    var epic$s = react_1.default.useMemo(function () {
        return epicFactories.map(function () { return new rx.BehaviorSubject(null); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    var slice = react_1.default.useMemo(function () {
        var slice = (0, tiny_redux_toolkit_1.createSlice)(sliceOptions);
        slice.state$.pipe(op.distinctUntilChanged(), op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (var _i = 0, epic$s_1 = epic$s; _i < epic$s_1.length; _i++) {
            var epicFac$ = epic$s_1[_i];
            slice.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
        return slice;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(function () {
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
    }, [epic$s, epicFactories]);
    react_1.default.useEffect(function () {
        // const sub = slice.state$.pipe(
        //   op.distinctUntilChanged(),
        //   // Important!!! because this stream is subscribed later than Epic,
        //   // "changed" value might
        //   // come in reversed order in case of recursive state changing in "Epic",
        //   // so always use getValue() to get latest state
        //   op.tap(() => setState(slice.state$.getValue()))
        // ).subscribe();
        return function () {
            willUnmountSub.next();
            willUnmountSub.complete();
            // sub.unsubscribe();
            slice.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [state, slice];
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBMEI7QUFDMUIsMkRBQTZHO0FBQzdHLGlEQUFxQztBQUNyQyx1Q0FBMkI7QUFDM0IsdURBQXFDO0FBWXJDLFNBQVMsZ0JBQWdCLENBQW9FLFlBQWU7SUFFMUcsSUFBTSxRQUFRLGNBQ1osbUJBQW1CLEVBQW5CLFVBQW9CLENBQUksRUFBRSxPQUFjO1lBQ3RDLENBQUMsQ0FBQyxjQUFjLGdCQUFPLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLENBQUMsRUFDRCxZQUFZLEVBQVosVUFBYSxDQUFJLElBQUcsQ0FBQyxJQUNsQixZQUFZLENBQ2hCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBS0Q7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFnQixVQUFVLENBQ3RCLFdBQXFDLEVBQUUsS0FBWTtJQUFFLHVCQUF5RTtTQUF6RSxVQUF5RSxFQUF6RSxxQkFBeUUsRUFBekUsSUFBeUU7UUFBekUsc0NBQXlFOztJQUc5SCxJQUFNLGlCQUFpQixHQUFHLGVBQUssQ0FBQyxXQUFXLENBQUM7UUFDMUMsSUFBTSxJQUFJLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFFM0IsNkJBQ0ssSUFBSSxLQUNQLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBaUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUN6RTtRQUNKLHVEQUF1RDtJQUN2RCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCxlQUFLLENBQUMsU0FBUyxDQUFDLGNBQU0sT0FBQTtRQUNuQixhQUFhLENBQUMsQ0FBQyxDQUE4QyxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2pHLHVEQUF1RDtJQUN2RCxDQUFDLEVB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Q0FBQyxFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDN0QsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFNUIsZUFBSyxDQUFDLFNBQVMsQ0FBQztRQUNkLGlDQUFpQztRQUNqQywrQkFBK0I7UUFDL0IsdUVBQXVFO1FBQ3ZFLDZCQUE2QjtRQUM3Qiw2RUFBNkU7UUFDN0Usb0RBQW9EO1FBQ3BELG9EQUFvRDtRQUNwRCxpQkFBaUI7UUFDakIsT0FBTztZQUNMLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0QixjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUIscUJBQXFCO1lBQ3JCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUM7UUFDSix1REFBdUQ7SUFDdkQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ1AsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBOURELGdEQThEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBSZWR1Y2VycywgU2xpY2UsIFNsaWNlT3B0aW9ucywgRXBpY0ZhY3RvcnksIE9mVHlwZUZuLCBFcGljfSBmcm9tICcuL3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmV4cG9ydCAqIGZyb20gJy4vdGlueS1yZWR1eC10b29sa2l0JztcblxuZXhwb3J0IGludGVyZmFjZSBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+IHtcbiAgY29tcG9uZW50UHJvcHM/OiBQcm9wcztcbiAgZXJyb3I/OiBFcnJvcjtcbn1cblxudHlwZSBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4+ID0ge1xuICBfc3luY0NvbXBvbmVudFByb3BzKHM6IFMsIHBheWxvYWQ6IFByb3BzKTogdm9pZDtcbiAgX3dpbGxVbm1vdW50KHM6IFMpOiB2b2lkO1xufTtcblxuZnVuY3Rpb24gd2l0aEJhc2VSZWR1Y2VyczxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4ob3JpZ1JlZHVjZXJzOiBSKTpcbkNvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPiAmIFIge1xuICBjb25zdCByZWR1Y2VycyA9IHtcbiAgICBfc3luY0NvbXBvbmVudFByb3BzKHM6IFMsIHBheWxvYWQ6IFByb3BzKSB7XG4gICAgICBzLmNvbXBvbmVudFByb3BzID0gey4uLnBheWxvYWR9O1xuICAgIH0sXG4gICAgX3dpbGxVbm1vdW50KHM6IFMpIHt9LFxuICAgIC4uLm9yaWdSZWR1Y2Vyc1xuICB9O1xuICByZXR1cm4gcmVkdWNlcnM7XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5NENvbXA8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+ID1cbiAgKHNsaWNlOiBTbGljZTxTLCBSICYgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+Piwgb2ZUeXBlOiBPZlR5cGVGbjxTLCBSICYgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+PikgPT4gRXBpYzxTPiB8IHZvaWQ7XG5cbi8qKlxuICogVW5saWtlIHVzZVRpbnlSZWR1eFRvb2tpdCwgdXNlVGlueVJ0aygpIGFjY2VwdHMgYSBTdGF0ZSB3aGljaCBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZSwgXG4gKiAgdXNlVGlueVJ0aygpIHdpbGwgYXV0b21hdGljYWxseSBjcmVhdGUgYW4gZXh0cmEgcmVkdWNlciBcIl9zeW5jQ29tcG9uZW50UHJvcHNcIiBmb3Igc2hhbGxvdyBjb3BpbmdcbiAqIFJlYWN0IGNvbXBvbmVudCdzIHByb3BlcnRpZXMgdG8gdGhpcyBpbnRlcm5hbCBSVEsgc3RvcmVcbiAqIEBwYXJhbSBvcHRzRmFjdG9yeSBcbiAqIEBwYXJhbSBwcm9wcyBcbiAqIEBwYXJhbSBlcGljRmFjdG9yaWVzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VUaW55UnRrPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihcbiAgICBvcHRzRmFjdG9yeTogKCkgPT4gU2xpY2VPcHRpb25zPFMsIFI+LCBwcm9wczogUHJvcHMsIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5NENvbXA8UHJvcHMsIFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5cbiAgKTogW3N0YXRlOiBTLCBzbGljZTogU2xpY2U8UywgUiAmIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj5dIHtcblxuICAgIGNvbnN0IGV4dGVuZE9wdHNGYWN0b3J5ID0gUmVhY3QudXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgICAgY29uc3Qgb3B0cyA9IG9wdHNGYWN0b3J5KCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLm9wdHMsXG4gICAgICAgIHJlZHVjZXJzOiB3aXRoQmFzZVJlZHVjZXJzPFByb3BzLCBTLCB0eXBlb2Ygb3B0cy5yZWR1Y2Vycz4ob3B0cy5yZWR1Y2VycylcbiAgICAgIH07XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICAgIH0sIFtdKTtcblxuICAgIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiAoKSA9PiB7XG4gICAgICAoc3RhdGVBbmRTbGljZVsxXSBhcyBTbGljZTxTLCBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+KS5hY3Rpb25EaXNwYXRjaGVyLl93aWxsVW5tb3VudCgpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgICB9LCBbXSk7XG5cbiAgICBjb25zdCBzdGF0ZUFuZFNsaWNlID0gdXNlVGlueVJlZHV4VG9va2l0KGV4dGVuZE9wdHNGYWN0b3J5LCAuLi5lcGljRmFjdG9yaWVzKTtcblxuICAgIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICBzdGF0ZUFuZFNsaWNlWzFdLmFjdGlvbkRpc3BhdGNoZXIuX3N5bmNDb21wb25lbnRQcm9wcyhwcm9wcyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICAgIH0sIE9iamVjdC52YWx1ZXMocHJvcHMpKTtcblxuICAgIHJldHVybiBzdGF0ZUFuZFNsaWNlO1xufVxuLyoqXG4gKiBGb3IgcGVyZm9ybWFuY2UgcmVhc29uLCBiZXR0ZXIgZGVmaW5lIG9wdHMucmVkdWNlcnMgb3V0c2lkZSBvZiBjb21wb25lbnQgcmVuZGVyaW5nIGZ1bmN0aW9uXG4gKiBAcGFyYW0gb3B0cyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlVGlueVJlZHV4VG9va2l0PFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBTbGljZU9wdGlvbnM8UywgUj4sIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5cbik6IFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlPFMsIFI+XSB7XG5cbiAgLy8gVG8gYXZvaWQgYSBtdXRhdGFibGUgdmVyc2lvbiBpcyBwYXNzZWQgaW5cbiAgLy8gY29uc3QgY2xvbmVkU3RhdGUgPSBjbG9uZShvcHRzLmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHdpbGxVbm1vdW50U3ViID0gUmVhY3QudXNlTWVtbygoKSA9PiBuZXcgcnguUmVwbGF5U3ViamVjdDx2b2lkPigxKSwgW10pO1xuICBjb25zdCBzbGljZU9wdGlvbnMgPSBSZWFjdC51c2VNZW1vKG9wdHNGYWN0b3J5LCBbb3B0c0ZhY3RvcnldKTtcbiAgY29uc3QgZXBpYyRzID0gUmVhY3QudXNlTWVtbzxyeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPltdPigoKSA9PiB7XG4gICAgcmV0dXJuIGVwaWNGYWN0b3JpZXMubWFwKCgpID0+IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPihudWxsKSk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIGNvbnN0IFtzdGF0ZSwgc2V0U3RhdGVdID0gUmVhY3QudXNlU3RhdGU8Uz4oc2xpY2VPcHRpb25zLmluaXRpYWxTdGF0ZSk7XG4gIC8vIGNvbnN0IFtzbGljZSwgc2V0U2xpY2VdID0gUmVhY3QudXNlU3RhdGU8U2xpY2U8UywgUj4+KCk7XG4gIGNvbnN0IHNsaWNlID0gUmVhY3QudXNlTWVtbzxTbGljZTxTLCBSPj4oKCkgPT4ge1xuICAgIGNvbnN0IHNsaWNlID0gY3JlYXRlU2xpY2Uoc2xpY2VPcHRpb25zKTtcbiAgICBzbGljZS5zdGF0ZSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5vYnNlcnZlT24ocnguYW5pbWF0aW9uRnJhbWVTY2hlZHVsZXIpLCAvLyBUbyBhdm9pZCBjaGFuZ2VzIGJlaW5nIGJhdGNoZWQgYnkgUmVhY3Qgc2V0U3RhdGUoKVxuICAgICAgb3AudGFwKGNoYW5nZWQgPT4gc2V0U3RhdGUoY2hhbmdlZCkpLFxuICAgICAgb3AudGFrZVVudGlsKHdpbGxVbm1vdW50U3ViKVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICAvLyBJbXBvcnRhbnQhIVxuICAgIC8vIEVwaWMgbWlnaHQgY29udGFpbiByZWN1cml2ZSBzdGF0ZSBjaGFuZ2luZyBsb2dpYywgbGlrZSBzdWJzY3JpYmluZyBvbiBzdGF0ZSQgc3RyZWFtIGFuZCBcbiAgICAvLyBjaGFuZ2Ugc3RhdGUsIGl0IHR1cm5zIG91dCBhbnkgc3Vic2NyaWJlciB0aGF0IHN1YnNjcmliZSBzdGF0ZSQgbGF0ZXIgdGhhblxuICAgIC8vIGVwaWMgd2lsbCBnZXQgYSBzdGF0ZSBjaGFuZ2UgZXZlbnQgaW4gcmV2ZXJzZWQgb3JkZXIgISEgU28gZXBpYyBtdXN0IGJlIHRoZSBsYXN0IG9uZSB0b1xuICAgIC8vIHN1YnNjcmliZSBzdGF0ZSQgc3RyZWFtXG4gICAgZm9yIChjb25zdCBlcGljRmFjJCBvZiBlcGljJHMpIHtcbiAgICAgIHNsaWNlLmFkZEVwaWMkKGVwaWNGYWMkKTtcbiAgICB9XG4gICAgLy8gTGV0J3MgZnVuIGVwaWMgZmFjdG9yeSBhcyBlYXJsaWVyIGFzIHBvc3NpYmxlLCBzbyB0aGF0IGl0IHdpbGwgbm90IG1pc3NpbmdcbiAgICAvLyBhbnkgYWN0aW9uIGRpc3BhdGNoZWQgZnJvbSBjaGlsZCBjb21wb25lbnQsIHNpbmNlIGNoaWxkIGNvbXBvbmVudCdzIHVzZUVmZmVjdCgpXG4gICAgLy8gcnVucyBlYXJsaWVyIHRoYW4gcGFyZW50IGNvbXBvbmVudCdzXG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgICByZXR1cm4gc2xpY2U7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgfSwgW2VwaWMkcywgZXBpY0ZhY3Rvcmllc10pO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gY29uc3Qgc3ViID0gc2xpY2Uuc3RhdGUkLnBpcGUoXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgLy8gSW1wb3J0YW50ISEhIGJlY2F1c2UgdGhpcyBzdHJlYW0gaXMgc3Vic2NyaWJlZCBsYXRlciB0aGFuIEVwaWMsXG4gICAgLy8gICAvLyBcImNoYW5nZWRcIiB2YWx1ZSBtaWdodFxuICAgIC8vICAgLy8gY29tZSBpbiByZXZlcnNlZCBvcmRlciBpbiBjYXNlIG9mIHJlY3Vyc2l2ZSBzdGF0ZSBjaGFuZ2luZyBpbiBcIkVwaWNcIixcbiAgICAvLyAgIC8vIHNvIGFsd2F5cyB1c2UgZ2V0VmFsdWUoKSB0byBnZXQgbGF0ZXN0IHN0YXRlXG4gICAgLy8gICBvcC50YXAoKCkgPT4gc2V0U3RhdGUoc2xpY2Uuc3RhdGUkLmdldFZhbHVlKCkpKVxuICAgIC8vICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbGxVbm1vdW50U3ViLm5leHQoKTtcbiAgICAgIHdpbGxVbm1vdW50U3ViLmNvbXBsZXRlKCk7XG4gICAgICAvLyBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgIHNsaWNlLmRlc3Ryb3koKTtcbiAgICB9O1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcbiAgcmV0dXJuIFtzdGF0ZSwgc2xpY2VdO1xufVxuIl19