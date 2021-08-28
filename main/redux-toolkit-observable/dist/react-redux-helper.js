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
exports.useStoreOfStateFactory = exports.useRtk = exports.useReduxTookit = exports.useReduxTookitWith = exports.ofPayloadAction = void 0;
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
        stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
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
/**
 * Use a dedicated Redux slice store for single component instance.
 * Unlike useReduxTookit, useRtk() accepts a State which extends BaseComponentState,
 *  useRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param epicFactories
 * @returns [state, sliceHelper]
 */
function useRtk(optsFactory, props) {
    var epicFactories = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        epicFactories[_i - 2] = arguments[_i];
    }
    var extendOptsFactory = react_1.default.useCallback(function () {
        var opts = optsFactory();
        return __assign(__assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_2.useEffect(function () {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    react_2.useEffect(function () {
        return function () { stateAndSlice[1].actionDispatcher._willUnmount(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var stateAndSlice = useReduxTookitWith.apply(void 0, __spreadArrays([state_factory_browser_1.stateFactory, extendOptsFactory], epicFactories));
    return stateAndSlice;
}
exports.useRtk = useRtk;
function withBaseReducers(origReducers) {
    var reducers = __assign({ _syncComponentProps: function (s, _a) {
            var payload = _a.payload;
            s.componentProps = __assign({}, payload);
        },
        _willUnmount: function (s) { } }, origReducers);
    return reducers;
}
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
var simpleDemoReducers = {
    hellow: function (s, payload) { }
};
var demoReducers = helper_1.createReducers(simpleDemoReducers);
var demoSlice = helper_1.createSliceHelper(state_factory_browser_1.stateFactory, {
    name: '_internal_',
    initialState: demoState,
    reducers: withBaseReducers(demoReducers)
});
demoSlice.addEpic(function (slice) {
    return function (action$) {
        slice.actionDispatcher._willUnmount();
        var actionStreams = helper_1.castByActionType(slice.actions, action$);
        return rx.merge(actionStreams.hellow, actionStreams._syncComponentProps);
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1RUFDb0M7QUFTNUIsZ0dBVmlDLDBDQUFlLE9BVWpDO0FBUnZCLGdEQUEwQjtBQUMxQixpRUFBcUQ7QUFDckQsbUNBQXVHO0FBRXZHLCtCQUEwQztBQUUxQyx1Q0FBMkI7QUFDM0IsaURBQXFDO0FBRXJDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUVyQiwyQ0FBeUI7QUFFekI7Ozs7R0FJRztBQUNILFNBQWdCLGtCQUFrQixDQUFvQyxZQUEwQixFQUM5RixXQUEyQztJQUFFLHVCQUE2RDtTQUE3RCxVQUE2RCxFQUE3RCxxQkFBNkQsRUFBN0QsSUFBNkQ7UUFBN0Qsc0NBQTZEOztJQUUxRyxJQUFNLGNBQWMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQU8sQ0FBQyxDQUFDLEVBQTdCLENBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUUsSUFBTSxZQUFZLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQy9ELElBQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQTZEO1FBQ3ZGLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUF1QyxJQUFJLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQyxDQUFDO0lBQ3JHLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFZCxJQUFBLEtBQW9CLGVBQUssQ0FBQyxRQUFRLENBQUksWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUEvRCxLQUFLLFFBQUEsRUFBRSxR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RSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTFCLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFaRCx3REFZQztBQVNELElBQU0sU0FBUyxHQUFjLEVBQUUsQ0FBQztBQUVoQyxJQUFNLGtCQUFrQixHQUFHO0lBQ3pCLE1BQU0sRUFBTixVQUFPLENBQVksRUFBRSxPQUF1QixJQUFHLENBQUM7Q0FDakQsQ0FBQztBQUVGLElBQU0sWUFBWSxHQUFHLHVCQUFjLENBQXVDLGtCQUFrQixDQUFDLENBQUM7QUFFOUYsSUFBTSxTQUFTLEdBQUcsMEJBQWlCLENBQUMsb0NBQVksRUFBRTtJQUNoRCxJQUFJLEVBQUUsWUFBWTtJQUNsQixZQUFZLEVBQUUsU0FBUztJQUN2QixRQUFRLEVBQUUsZ0JBQWdCLENBQWdELFlBQVksQ0FBQztDQUN4RixDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztJQUNyQixPQUFPLFVBQUEsT0FBTztRQUNaLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QyxJQUFNLGFBQWEsR0FBRyx5QkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9ELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzNFLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wc30gZnJvbSAncmVhY3QtcmVkdXgnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIFNsaWNlQ2FzZVJlZHVjZXJzLCBvZlBheWxvYWRBY3Rpb24sIFBheWxvYWRBY3Rpb25cbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuL3N0YXRlLWZhY3RvcnktYnJvd3Nlcic7XG5pbXBvcnQge2NyZWF0ZVNsaWNlSGVscGVyLCBFcGljRmFjdG9yeSwgU2xpY2VIZWxwZXIsIGNhc3RCeUFjdGlvblR5cGUsIGNyZWF0ZVJlZHVjZXJzfSBmcm9tICcuL2hlbHBlcic7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9ucywgRHJhZnR9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHt1c2VFZmZlY3QsIHVzZVN0YXRlfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBFcGljIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcbmxldCBDT01QT05FTlRfSUQgPSAwO1xuXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcic7XG5cbi8qKlxuICogVXNlIGEgZGVkaWNhdGVkIFJlZHV4IHNsaWNlIHN0b3JlIGZvciBzaW5nbGUgY29tcG9uZW50IGluc3RhbmNlXG4gKiBAcGFyYW0gb3B0c0ZhY3RvcnkgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcmllcyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVJlZHV4VG9va2l0V2l0aDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogW1MsIFNsaWNlSGVscGVyPFMsIFI+XSB7XG5cbiAgY29uc3Qgd2lsbFVubW91bnRTdWIgPSBSZWFjdC51c2VNZW1vKCgpID0+IG5ldyByeC5SZXBsYXlTdWJqZWN0PHZvaWQ+KDEpLCBbXSk7XG4gIGNvbnN0IHNsaWNlT3B0aW9ucyA9IFJlYWN0LnVzZU1lbW8ob3B0c0ZhY3RvcnksIFtvcHRzRmFjdG9yeV0pO1xuICBjb25zdCBlcGljJHMgPSBSZWFjdC51c2VNZW1vPHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+W10+KCgpID0+IHtcbiAgICByZXR1cm4gZXBpY0ZhY3Rvcmllcy5tYXAoKCkgPT4gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KG51bGwpKTtcbiAgfSwgW2VwaWNGYWN0b3JpZXNdKTtcblxuICBjb25zdCBbc3RhdGUsIHNldFN0YXRlXSA9IFJlYWN0LnVzZVN0YXRlPFM+KHNsaWNlT3B0aW9ucy5pbml0aWFsU3RhdGUpO1xuXG4gIGNvbnN0IGhlbHBlciA9IFJlYWN0LnVzZU1lbW88U2xpY2VIZWxwZXI8UywgUj4+KCgpID0+IHtcbiAgICBjb25zdCBoZWxwZXIgPSBjcmVhdGVTbGljZUhlbHBlcihzdGF0ZUZhY3RvcnksIHsuLi5zbGljZU9wdGlvbnMsIG5hbWU6IHNsaWNlT3B0aW9ucy5uYW1lICsgJy4nICsgQ09NUE9ORU5UX0lEKyt9KTtcbiAgICBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShoZWxwZXIpLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3Aub2JzZXJ2ZU9uKHJ4LmFuaW1hdGlvbkZyYW1lU2NoZWR1bGVyKSwgLy8gVG8gYXZvaWQgY2hhbmdlcyBiZWluZyBiYXRjaGVkIGJ5IFJlYWN0IHNldFN0YXRlKClcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKSxcbiAgICAgIG9wLnRha2VVbnRpbCh3aWxsVW5tb3VudFN1YilcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gSW1wb3J0YW50ISFcbiAgICAvLyBFcGljIG1pZ2h0IGNvbnRhaW4gcmVjdXJpdmUgc3RhdGUgY2hhbmdpbmcgbG9naWMsIGxpa2Ugc3Vic2NyaWJpbmcgb24gc3RhdGUkIHN0cmVhbSBhbmQgXG4gICAgLy8gY2hhbmdlIHN0YXRlLCBpdCB0dXJucyBvdXQgYW55IHN1YnNjcmliZXIgdGhhdCBzdWJzY3JpYmUgc3RhdGUkIGxhdGVyIHRoYW5cbiAgICAvLyBlcGljIHdpbGwgZ2V0IGEgc3RhdGUgY2hhbmdlIGV2ZW50IGluIHJldmVyc2VkIG9yZGVyICEhIFNvIGVwaWMgbXVzdCBiZSB0aGUgbGFzdCBvbmUgdG9cbiAgICAvLyBzdWJzY3JpYmUgc3RhdGUkIHN0cmVhbVxuICAgIGZvciAoY29uc3QgZXBpY0ZhYyQgb2YgZXBpYyRzKSB7XG4gICAgICBoZWxwZXIuYWRkRXBpYyQoZXBpY0ZhYyQpO1xuICAgIH1cbiAgICAvLyBMZXQncyBmdW4gZXBpYyBmYWN0b3J5IGFzIGVhcmxpZXIgYXMgcG9zc2libGUsIHNvIHRoYXQgaXQgd2lsbCBub3QgbWlzc2luZ1xuICAgIC8vIGFueSBhY3Rpb24gZGlzcGF0Y2hlZCBmcm9tIGNoaWxkIGNvbXBvbmVudCwgc2luY2UgY2hpbGQgY29tcG9uZW50J3MgdXNlRWZmZWN0KClcbiAgICAvLyBydW5zIGVhcmxpZXIgdGhhbiBwYXJlbnQgY29tcG9uZW50J3NcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICAgIHJldHVybiBoZWxwZXI7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBlcGljRmFjdG9yaWVzKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5uZXh0KCk7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5jb21wbGV0ZSgpO1xuICAgICAgaGVscGVyLmRlc3Ryb3koKTtcbiAgICB9O1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICByZXR1cm4gW3N0YXRlLCBoZWxwZXJdO1xufVxuXG4vKipcbiAqIFVzZSBhIGRlZGljYXRlZCBSZWR1eCBzbGljZSBzdG9yZSBmb3Igc2luZ2xlIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VSZWR1eFRvb2tpdDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LFxuICAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogW1MsIFNsaWNlSGVscGVyPFMsIFI+XSB7XG5cbiAgcmV0dXJuIHVzZVJlZHV4VG9va2l0V2l0aChzdGF0ZUZhY3RvcnksIG9wdHNGYWN0b3J5LCAuLi5lcGljRmFjdG9yaWVzKTtcbn1cblxuLyoqXG4gKiBVc2UgYSBkZWRpY2F0ZWQgUmVkdXggc2xpY2Ugc3RvcmUgZm9yIHNpbmdsZSBjb21wb25lbnQgaW5zdGFuY2UuXG4gKiBVbmxpa2UgdXNlUmVkdXhUb29raXQsIHVzZVJ0aygpIGFjY2VwdHMgYSBTdGF0ZSB3aGljaCBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZSwgXG4gKiAgdXNlUnRrKCkgd2lsbCBhdXRvbWF0aWNhbGx5IGNyZWF0ZSBhbiBleHRyYSByZWR1Y2VyIFwiX3N5bmNDb21wb25lbnRQcm9wc1wiIGZvciBzaGFsbG93IGNvcGluZ1xuICogUmVhY3QgY29tcG9uZW50J3MgcHJvcGVydGllcyB0byB0aGlzIGludGVybmFsIFJUSyBzdG9yZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKiBAcmV0dXJucyBbc3RhdGUsIHNsaWNlSGVscGVyXVxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUnRrPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiwgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgb3B0c0ZhY3Rvcnk6ICgpID0+IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPixcbiAgcHJvcHM6IFByb3BzLFxuICAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTRDb21wPFByb3BzLCBTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTpcbiAgW1MsIFNsaWNlSGVscGVyPFMsIFIgJiBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+XSB7XG5cbiAgY29uc3QgZXh0ZW5kT3B0c0ZhY3RvcnkgPSBSZWFjdC51c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdHNGYWN0b3J5KCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4ub3B0cyxcbiAgICAgIHJlZHVjZXJzOiB3aXRoQmFzZVJlZHVjZXJzPFByb3BzLCBTLCB0eXBlb2Ygb3B0cy5yZWR1Y2Vycz4ob3B0cy5yZWR1Y2VycylcbiAgICB9O1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIChzdGF0ZUFuZFNsaWNlWzFdIGFzIFNsaWNlSGVscGVyPFMsIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4pLmFjdGlvbkRpc3BhdGNoZXIuX3N5bmNDb21wb25lbnRQcm9wcyhwcm9wcyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgT2JqZWN0LnZhbHVlcyhwcm9wcykpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgcmV0dXJuICgpID0+IHsoc3RhdGVBbmRTbGljZVsxXSBhcyBTbGljZUhlbHBlcjxTLCBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+KS5hY3Rpb25EaXNwYXRjaGVyLl93aWxsVW5tb3VudCgpOyB9O1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICBjb25zdCBzdGF0ZUFuZFNsaWNlID0gdXNlUmVkdXhUb29raXRXaXRoKHN0YXRlRmFjdG9yeSwgZXh0ZW5kT3B0c0ZhY3RvcnksIC4uLmVwaWNGYWN0b3JpZXMpO1xuICByZXR1cm4gc3RhdGVBbmRTbGljZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+IHtcbiAgY29tcG9uZW50UHJvcHM/OiBQcm9wcztcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk0Q29tcDxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPVxuICAoc2xpY2U6IFNsaWNlSGVscGVyPFMsIFIgJiBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+KVxuICA9PiBFcGljPFBheWxvYWRBY3Rpb248YW55PiwgYW55LCB1bmtub3duPiB8IHZvaWQ7XG5cbnR5cGUgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+PiA9IHtcbiAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTIHwgRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQcm9wcz4pOiB2b2lkO1xuICBfd2lsbFVubW91bnQoczogUyB8IERyYWZ0PFM+KTogdm9pZDtcbn07XG5cbmZ1bmN0aW9uIHdpdGhCYXNlUmVkdWNlcnM8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KG9yaWdSZWR1Y2VyczogUik6XG5Db21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4gJiBSIHtcbiAgY29uc3QgcmVkdWNlcnMgPSB7XG4gICAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UHJvcHM+KSB7XG4gICAgICBzLmNvbXBvbmVudFByb3BzID0gey4uLnBheWxvYWR9O1xuICAgIH0sXG4gICAgX3dpbGxVbm1vdW50KHM6IFMpIHt9LFxuICAgIC4uLm9yaWdSZWR1Y2Vyc1xuICB9O1xuICByZXR1cm4gcmVkdWNlcnM7XG59XG5cbmV4cG9ydCB0eXBlIEluamVjdGVkQ29tcFByb3BzVHlwZTxDb25uZWN0SE9DPiA9XG4gIChDb25uZWN0SE9DIGV4dGVuZHMgSW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHM8aW5mZXIgVEluamVjdGVkUHJvcHMsIGFueT4gPyBUSW5qZWN0ZWRQcm9wcyA6IHtbcDogc3RyaW5nXTogdW5rbm93bn0pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7W3A6IHN0cmluZ106IHVua25vd259KTtcblxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5zdG9yZSRdKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cblxuaW50ZXJmYWNlIERlbW9Db21wUHJvcHMge1xuICBjbGFzc05hbWU6IHN0cmluZztcbn1cbmludGVyZmFjZSBEZW1vU3RhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8RGVtb0NvbXBQcm9wcz4ge1xuICBvaz86IGJvb2xlYW47XG59XG5cbmNvbnN0IGRlbW9TdGF0ZTogRGVtb1N0YXRlID0ge307XG5cbmNvbnN0IHNpbXBsZURlbW9SZWR1Y2VycyA9IHtcbiAgaGVsbG93KHM6IERlbW9TdGF0ZSwgcGF5bG9hZDoge2RhdGE6IHN0cmluZ30pIHt9XG59O1xuXG5jb25zdCBkZW1vUmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2VyczxEZW1vU3RhdGUsIHR5cGVvZiBzaW1wbGVEZW1vUmVkdWNlcnM+KHNpbXBsZURlbW9SZWR1Y2Vycyk7XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlSGVscGVyKHN0YXRlRmFjdG9yeSwge1xuICBuYW1lOiAnX2ludGVybmFsXycsXG4gIGluaXRpYWxTdGF0ZTogZGVtb1N0YXRlLFxuICByZWR1Y2Vyczogd2l0aEJhc2VSZWR1Y2VyczxEZW1vQ29tcFByb3BzLCBEZW1vU3RhdGUsIHR5cGVvZiBkZW1vUmVkdWNlcnM+KGRlbW9SZWR1Y2Vycylcbn0pO1xuXG5kZW1vU2xpY2UuYWRkRXBpYyhzbGljZSA9PiB7XG4gIHJldHVybiBhY3Rpb24kID0+IHtcbiAgICBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl93aWxsVW5tb3VudCgpO1xuICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIHJldHVybiByeC5tZXJnZShhY3Rpb25TdHJlYW1zLmhlbGxvdywgYWN0aW9uU3RyZWFtcy5fc3luY0NvbXBvbmVudFByb3BzKTtcbiAgfTtcbn0pO1xuIl19