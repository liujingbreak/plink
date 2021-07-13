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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreOfStateFactory = exports.useReduxTookit = exports.useReduxTookitWith = exports.ofPayloadAction = void 0;
var redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
var react_1 = __importDefault(require("react"));
var state_factory_browser_1 = require("./state-factory-browser");
var helper_1 = require("./helper");
var react_2 = require("react");
var rx = __importStar(require("rxjs"));
var op = __importStar(require("rxjs/operators"));
var COMPONENT_ID = 0;
__exportStar(require("./helper"), exports);
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
function useReduxTookitWith(stateFactory, optsFactory) {
    var epicFactories = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        epicFactories[_i - 2] = arguments[_i];
    }
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, [optsFactory]);
    var epic$s = react_1.default.useMemo(function () {
        return epicFactories.map(function () { return new rx.BehaviorSubject(null); });
    }, [epicFactories]);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    var helper = react_1.default.useMemo(function () {
        var helper = helper_1.createSliceHelper(stateFactory, __assign(__assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (var _i = 0, epic$s_1 = epic$s; _i < epic$s_1.length; _i++) {
            var epicFac$ = epic$s_1[_i];
            helper.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
        return helper;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(function () {
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, epicFactories);
    react_1.default.useEffect(function () {
        return function () {
            willUnmountSub.next();
            willUnmountSub.complete();
            helper.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [state, helper];
}
exports.useReduxTookitWith = useReduxTookitWith;
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
function useReduxTookit(optsFactory) {
    var epicFactories = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        epicFactories[_i - 1] = arguments[_i];
    }
    return useReduxTookitWith.apply(void 0, __spreadArrays([state_factory_browser_1.stateFactory, optsFactory], epicFactories));
}
exports.useReduxTookit = useReduxTookit;
function useStoreOfStateFactory(stateFactory) {
    var _a = react_2.useState(undefined), reduxStore = _a[0], setReduxStore = _a[1];
    react_2.useEffect(function () {
        stateFactory.store$.subscribe({
            next: function (store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.store$]);
    return reduxStore;
}
exports.useStoreOfStateFactory = useStoreOfStateFactory;
var demoState = {};
var demoReducer = {
    hellow: function (s, payload) { }
};
var demoSlice = helper_1.createSliceHelper(state_factory_browser_1.stateFactory, {
    name: '_internal_',
    initialState: demoState,
    reducers: demoReducer
});
demoSlice.addEpic(function (slice) {
    return function (action$) {
        var actionStreams = helper_1.castByActionType(slice.actions, action$);
        return actionStreams.hellow;
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1RUFDb0M7QUFRNUIsZ0dBVGlDLDBDQUFlLE9BU2pDO0FBUHZCLGdEQUEwQjtBQUMxQixpRUFBcUQ7QUFDckQsbUNBQXVGO0FBRXZGLCtCQUEwQztBQUMxQyx1Q0FBMkI7QUFDM0IsaURBQXFDO0FBRXJDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUVyQiwyQ0FBeUI7QUFFekI7Ozs7R0FJRztBQUNILFNBQWdCLGtCQUFrQixDQUFvQyxZQUEwQixFQUM5RixXQUEyQztJQUFFLHVCQUE2RDtTQUE3RCxVQUE2RCxFQUE3RCxxQkFBNkQsRUFBN0QsSUFBNkQ7UUFBN0Qsc0NBQTZEOztJQUUxRyxJQUFNLGNBQWMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQU8sQ0FBQyxDQUFDLEVBQTdCLENBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUUsSUFBTSxZQUFZLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQy9ELElBQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQTZEO1FBQ3ZGLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUF1QyxJQUFJLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQyxDQUFDO0lBQ3JHLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFZCxJQUFBLEtBQW9CLGVBQUssQ0FBQyxRQUFRLENBQUksWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUEvRCxLQUFLLFFBQUEsRUFBRSxR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O0lBQ2xCLE1BQU0sRUFBTixVQUFPLENBQVksRUFBRSxPQUFzQyxJQUFHLENBQUM7Q0FDaEUsQ0FBQztBQUVGLElBQU0sU0FBUyxHQUFHLDBCQUFpQixDQUFDLG9DQUFZLEVBQUU7SUFDaEQsSUFBSSxFQUFFLFlBQVk7SUFDbEIsWUFBWSxFQUFFLFNBQVM7SUFDdkIsUUFBUSxFQUFFLFdBQVc7Q0FDdEIsQ0FBQyxDQUFDO0FBRUgsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7SUFDckIsT0FBTyxVQUFBLE9BQU87UUFDWixJQUFNLGFBQWEsR0FBRyx5QkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9ELE9BQU8sYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHN9IGZyb20gJ3JlYWN0LXJlZHV4JztcbmltcG9ydCB7U3RhdGVGYWN0b3J5LCBTbGljZUNhc2VSZWR1Y2Vycywgb2ZQYXlsb2FkQWN0aW9uLCBQYXlsb2FkQWN0aW9uXG59IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi9zdGF0ZS1mYWN0b3J5LWJyb3dzZXInO1xuaW1wb3J0IHtjcmVhdGVTbGljZUhlbHBlciwgRXBpY0ZhY3RvcnksIFNsaWNlSGVscGVyLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICcuL2hlbHBlcic7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9uc30gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3VzZUVmZmVjdCwgdXNlU3RhdGV9IGZyb20gJ3JlYWN0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xubGV0IENPTVBPTkVOVF9JRCA9IDA7XG5cbmV4cG9ydCAqIGZyb20gJy4vaGVscGVyJztcblxuLyoqXG4gKiBVc2UgYSBkZWRpY2F0ZWQgUmVkdXggc2xpY2Ugc3RvcmUgZm9yIHNpbmdsZSBjb21wb25lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSBvcHRzRmFjdG9yeSBcbiAqIEBwYXJhbSBlcGljRmFjdG9yaWVzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUmVkdXhUb29raXRXaXRoPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4sIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiBbUywgU2xpY2VIZWxwZXI8UywgUj5dIHtcblxuICBjb25zdCB3aWxsVW5tb3VudFN1YiA9IFJlYWN0LnVzZU1lbW8oKCkgPT4gbmV3IHJ4LlJlcGxheVN1YmplY3Q8dm9pZD4oMSksIFtdKTtcbiAgY29uc3Qgc2xpY2VPcHRpb25zID0gUmVhY3QudXNlTWVtbyhvcHRzRmFjdG9yeSwgW29wdHNGYWN0b3J5XSk7XG4gIGNvbnN0IGVwaWMkcyA9IFJlYWN0LnVzZU1lbW88cnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5bXT4oKCkgPT4ge1xuICAgIHJldHVybiBlcGljRmFjdG9yaWVzLm1hcCgoKSA9PiBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4obnVsbCkpO1xuICB9LCBbZXBpY0ZhY3Rvcmllc10pO1xuXG4gIGNvbnN0IFtzdGF0ZSwgc2V0U3RhdGVdID0gUmVhY3QudXNlU3RhdGU8Uz4oc2xpY2VPcHRpb25zLmluaXRpYWxTdGF0ZSk7XG5cbiAgY29uc3QgaGVscGVyID0gUmVhY3QudXNlTWVtbzxTbGljZUhlbHBlcjxTLCBSPj4oKCkgPT4ge1xuICAgIGNvbnN0IGhlbHBlciA9IGNyZWF0ZVNsaWNlSGVscGVyKHN0YXRlRmFjdG9yeSwgey4uLnNsaWNlT3B0aW9ucywgbmFtZTogc2xpY2VPcHRpb25zLm5hbWUgKyAnLicgKyBDT01QT05FTlRfSUQrK30pO1xuICAgIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGhlbHBlcikucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgaGVscGVyLmFkZEVwaWMkKGVwaWNGYWMkKTtcbiAgICB9XG4gICAgLy8gTGV0J3MgZnVuIGVwaWMgZmFjdG9yeSBhcyBlYXJsaWVyIGFzIHBvc3NpYmxlLCBzbyB0aGF0IGl0IHdpbGwgbm90IG1pc3NpbmdcbiAgICAvLyBhbnkgYWN0aW9uIGRpc3BhdGNoZWQgZnJvbSBjaGlsZCBjb21wb25lbnQsIHNpbmNlIGNoaWxkIGNvbXBvbmVudCdzIHVzZUVmZmVjdCgpXG4gICAgLy8gcnVucyBlYXJsaWVyIHRoYW4gcGFyZW50IGNvbXBvbmVudCdzXG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgICByZXR1cm4gaGVscGVyO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgZXBpY0ZhY3Rvcmllcyk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2lsbFVubW91bnRTdWIubmV4dCgpO1xuICAgICAgd2lsbFVubW91bnRTdWIuY29tcGxldGUoKTtcbiAgICAgIGhlbHBlci5kZXN0cm95KCk7XG4gICAgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIFtzdGF0ZSwgaGVscGVyXTtcbn1cblxuXG4vKipcbiAqIFVzZSBhIGRlZGljYXRlZCBSZWR1eCBzbGljZSBzdG9yZSBmb3Igc2luZ2xlIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VSZWR1eFRvb2tpdDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogW1MsIFNsaWNlSGVscGVyPFMsIFI+XSB7XG4gIHJldHVybiB1c2VSZWR1eFRvb2tpdFdpdGgoc3RhdGVGYWN0b3J5LCBvcHRzRmFjdG9yeSwgLi4uZXBpY0ZhY3Rvcmllcyk7XG59XG5cbmV4cG9ydCB0eXBlIEluamVjdGVkQ29tcFByb3BzVHlwZTxDb25uZWN0SE9DPiA9XG4gIChDb25uZWN0SE9DIGV4dGVuZHMgSW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHM8aW5mZXIgVEluamVjdGVkUHJvcHMsIGFueT4gPyBUSW5qZWN0ZWRQcm9wcyA6IHtbcDogc3RyaW5nXTogdW5rbm93bn0pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7W3A6IHN0cmluZ106IHVua25vd259KTtcblxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5zdG9yZSRdKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cblxuXG5pbnRlcmZhY2UgRGVtb1N0YXRlIHtcbiAgb2s/OiBib29sZWFuO1xufVxuXG5jb25zdCBkZW1vU3RhdGU6IERlbW9TdGF0ZSA9IHt9O1xuXG5jb25zdCBkZW1vUmVkdWNlciA9IHtcbiAgaGVsbG93KHM6IERlbW9TdGF0ZSwgcGF5bG9hZDogUGF5bG9hZEFjdGlvbjx7ZGF0YTogc3RyaW5nfT4pIHt9XG59O1xuXG5jb25zdCBkZW1vU2xpY2UgPSBjcmVhdGVTbGljZUhlbHBlcihzdGF0ZUZhY3RvcnksIHtcbiAgbmFtZTogJ19pbnRlcm5hbF8nLFxuICBpbml0aWFsU3RhdGU6IGRlbW9TdGF0ZSxcbiAgcmVkdWNlcnM6IGRlbW9SZWR1Y2VyXG59KTtcblxuZGVtb1NsaWNlLmFkZEVwaWMoc2xpY2UgPT4ge1xuICByZXR1cm4gYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgcmV0dXJuIGFjdGlvblN0cmVhbXMuaGVsbG93O1xuICB9O1xufSk7XG4iXX0=