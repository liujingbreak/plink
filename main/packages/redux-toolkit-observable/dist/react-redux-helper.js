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
        var helper = (0, helper_1.createSliceHelper)(stateFactory, __assign(__assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
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
    return useReduxTookitWith.apply(void 0, __spreadArray([state_factory_browser_1.stateFactory, optsFactory], epicFactories, false));
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
    (0, react_2.useEffect)(function () {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    (0, react_2.useEffect)(function () {
        return function () { stateAndSlice[1].actionDispatcher._willUnmount(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var stateAndSlice = useReduxTookitWith.apply(void 0, __spreadArray([state_factory_browser_1.stateFactory, extendOptsFactory], epicFactories, false));
    return stateAndSlice;
}
exports.useRtk = useRtk;
function withBaseReducers(origReducers) {
    var reducers = __assign({ _syncComponentProps: function (s, _a) {
            var payload = _a.payload;
            s.componentProps = __assign({}, payload);
        }, _willUnmount: function (s) { } }, origReducers);
    return reducers;
}
function useStoreOfStateFactory(stateFactory) {
    var _a = (0, react_2.useState)(undefined), reduxStore = _a[0], setReduxStore = _a[1];
    (0, react_2.useEffect)(function () {
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
    hellow: function (s, payload) { },
    world: function (s) { }
};
var demoReducers = (0, helper_1.createReducers)(simpleDemoReducers);
var demoSlice = (0, helper_1.createSliceHelper)(state_factory_browser_1.stateFactory, {
    name: '_internal_',
    initialState: demoState,
    reducers: withBaseReducers(demoReducers)
});
demoSlice.addEpic(function (slice) {
    return function (action$) {
        slice.actionDispatcher._willUnmount();
        var actionStreams = (0, helper_1.castByActionType)(slice.actions, action$);
        return rx.merge(actionStreams.hellow, actionStreams._syncComponentProps, action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions.world), op.map(function (action) { return action; })), action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions.hellow), op.map(function (action) { return action; })));
    };
});
(0, helper_1.action$OfSlice)(demoSlice, 'hellow').pipe(op.tap(function (action) { return console.log(action); }));
(0, helper_1.action$OfSlice)(demoSlice, 'world').pipe(op.tap(function (action) { return console.log(action); }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVFQUNvQztBQVM1QixnR0FWaUMsMENBQWUsT0FVakM7QUFSdkIsZ0RBQTBCO0FBQzFCLGlFQUFxRDtBQUNyRCxtQ0FBdUg7QUFFdkgsK0JBQTBDO0FBRTFDLHVDQUEyQjtBQUMzQixpREFBcUM7QUFFckMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBRXJCLDJDQUF5QjtBQUV6Qjs7OztHQUlHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQW9DLFlBQTBCLEVBQzlGLFdBQTJDO0lBQUUsdUJBQTZEO1NBQTdELFVBQTZELEVBQTdELHFCQUE2RCxFQUE3RCxJQUE2RDtRQUE3RCxzQ0FBNkQ7O0lBRTFHLElBQU0sY0FBYyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBTyxDQUFDLENBQUMsRUFBN0IsQ0FBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM5RSxJQUFNLFlBQVksR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDL0QsSUFBTSxNQUFNLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBNkQ7UUFDdkYsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQXVDLElBQUksQ0FBQyxFQUFsRSxDQUFrRSxDQUFDLENBQUM7SUFDckcsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUVkLElBQUEsS0FBb0IsZUFBSyxDQUFDLFFBQVEsQ0FBSSxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQS9ELEtBQUssUUFBQSxFQUFF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QUFNLENBQUMsRUFDaEQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sRUFBTixDQUFNLENBQUMsQ0FBQyxDQUM1QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFBLHVCQUFjLEVBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FDdEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQW5CLENBQW1CLENBQUMsQ0FDdEMsQ0FBQztBQUNGLElBQUEsdUJBQWMsRUFBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUNyQyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBbkIsQ0FBbUIsQ0FBQyxDQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wc30gZnJvbSAncmVhY3QtcmVkdXgnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIFNsaWNlQ2FzZVJlZHVjZXJzLCBvZlBheWxvYWRBY3Rpb24sIFBheWxvYWRBY3Rpb25cbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuL3N0YXRlLWZhY3RvcnktYnJvd3Nlcic7XG5pbXBvcnQge2NyZWF0ZVNsaWNlSGVscGVyLCBFcGljRmFjdG9yeSwgU2xpY2VIZWxwZXIsIGNhc3RCeUFjdGlvblR5cGUsIGNyZWF0ZVJlZHVjZXJzLCBhY3Rpb24kT2ZTbGljZX0gZnJvbSAnLi9oZWxwZXInO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnMsIERyYWZ0fSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7dXNlRWZmZWN0LCB1c2VTdGF0ZX0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgRXBpYyB9IGZyb20gJ3JlZHV4LW9ic2VydmFibGUnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQge29mUGF5bG9hZEFjdGlvbn07XG5sZXQgQ09NUE9ORU5UX0lEID0gMDtcblxuZXhwb3J0ICogZnJvbSAnLi9oZWxwZXInO1xuXG4vKipcbiAqIFVzZSBhIGRlZGljYXRlZCBSZWR1eCBzbGljZSBzdG9yZSBmb3Igc2luZ2xlIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VSZWR1eFRvb2tpdFdpdGg8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSxcbiAgb3B0c0ZhY3Rvcnk6ICgpID0+IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPiwgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6IFtTLCBTbGljZUhlbHBlcjxTLCBSPl0ge1xuXG4gIGNvbnN0IHdpbGxVbm1vdW50U3ViID0gUmVhY3QudXNlTWVtbygoKSA9PiBuZXcgcnguUmVwbGF5U3ViamVjdDx2b2lkPigxKSwgW10pO1xuICBjb25zdCBzbGljZU9wdGlvbnMgPSBSZWFjdC51c2VNZW1vKG9wdHNGYWN0b3J5LCBbb3B0c0ZhY3RvcnldKTtcbiAgY29uc3QgZXBpYyRzID0gUmVhY3QudXNlTWVtbzxyeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPltdPigoKSA9PiB7XG4gICAgcmV0dXJuIGVwaWNGYWN0b3JpZXMubWFwKCgpID0+IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPihudWxsKSk7XG4gIH0sIFtlcGljRmFjdG9yaWVzXSk7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcblxuICBjb25zdCBoZWxwZXIgPSBSZWFjdC51c2VNZW1vPFNsaWNlSGVscGVyPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3QgaGVscGVyID0gY3JlYXRlU2xpY2VIZWxwZXIoc3RhdGVGYWN0b3J5LCB7Li4uc2xpY2VPcHRpb25zLCBuYW1lOiBzbGljZU9wdGlvbnMubmFtZSArICcuJyArIENPTVBPTkVOVF9JRCsrfSk7XG4gICAgc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoaGVscGVyKS5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm9ic2VydmVPbihyeC5hbmltYXRpb25GcmFtZVNjaGVkdWxlciksIC8vIFRvIGF2b2lkIGNoYW5nZXMgYmVpbmcgYmF0Y2hlZCBieSBSZWFjdCBzZXRTdGF0ZSgpXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgaGVscGVyLmFkZEVwaWMkKGVwaWNGYWMkKTtcbiAgICB9XG4gICAgLy8gTGV0J3MgZnVuIGVwaWMgZmFjdG9yeSBhcyBlYXJsaWVyIGFzIHBvc3NpYmxlLCBzbyB0aGF0IGl0IHdpbGwgbm90IG1pc3NpbmdcbiAgICAvLyBhbnkgYWN0aW9uIGRpc3BhdGNoZWQgZnJvbSBjaGlsZCBjb21wb25lbnQsIHNpbmNlIGNoaWxkIGNvbXBvbmVudCdzIHVzZUVmZmVjdCgpXG4gICAgLy8gcnVucyBlYXJsaWVyIHRoYW4gcGFyZW50IGNvbXBvbmVudCdzXG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgICByZXR1cm4gaGVscGVyO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgZXBpY0ZhY3Rvcmllcyk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2lsbFVubW91bnRTdWIubmV4dCgpO1xuICAgICAgd2lsbFVubW91bnRTdWIuY29tcGxldGUoKTtcbiAgICAgIGhlbHBlci5kZXN0cm95KCk7XG4gICAgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIFtzdGF0ZSwgaGVscGVyXTtcbn1cblxuLyoqXG4gKiBVc2UgYSBkZWRpY2F0ZWQgUmVkdXggc2xpY2Ugc3RvcmUgZm9yIHNpbmdsZSBjb21wb25lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSBvcHRzRmFjdG9yeSBcbiAqIEBwYXJhbSBlcGljRmFjdG9yaWVzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUmVkdXhUb29raXQ8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgb3B0c0ZhY3Rvcnk6ICgpID0+IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPixcbiAgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6IFtTLCBTbGljZUhlbHBlcjxTLCBSPl0ge1xuXG4gIHJldHVybiB1c2VSZWR1eFRvb2tpdFdpdGgoc3RhdGVGYWN0b3J5LCBvcHRzRmFjdG9yeSwgLi4uZXBpY0ZhY3Rvcmllcyk7XG59XG5cbi8qKlxuICogVXNlIGEgZGVkaWNhdGVkIFJlZHV4IHNsaWNlIHN0b3JlIGZvciBzaW5nbGUgY29tcG9uZW50IGluc3RhbmNlLlxuICogVW5saWtlIHVzZVJlZHV4VG9va2l0LCB1c2VSdGsoKSBhY2NlcHRzIGEgU3RhdGUgd2hpY2ggZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGUsIFxuICogIHVzZVJ0aygpIHdpbGwgYXV0b21hdGljYWxseSBjcmVhdGUgYW4gZXh0cmEgcmVkdWNlciBcIl9zeW5jQ29tcG9uZW50UHJvcHNcIiBmb3Igc2hhbGxvdyBjb3BpbmdcbiAqIFJlYWN0IGNvbXBvbmVudCdzIHByb3BlcnRpZXMgdG8gdGhpcyBpbnRlcm5hbCBSVEsgc3RvcmVcbiAqIEBwYXJhbSBvcHRzRmFjdG9yeSBcbiAqIEBwYXJhbSBlcGljRmFjdG9yaWVzIFxuICogQHJldHVybnMgW3N0YXRlLCBzbGljZUhlbHBlcl1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVJ0azxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4sXG4gIHByb3BzOiBQcm9wcyxcbiAgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk0Q29tcDxQcm9wcywgUywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6XG4gIFtTLCBTbGljZUhlbHBlcjxTLCBSICYgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+Pl0ge1xuXG4gIGNvbnN0IGV4dGVuZE9wdHNGYWN0b3J5ID0gUmVhY3QudXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRzRmFjdG9yeSgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLm9wdHMsXG4gICAgICByZWR1Y2Vyczogd2l0aEJhc2VSZWR1Y2VyczxQcm9wcywgUywgdHlwZW9mIG9wdHMucmVkdWNlcnM+KG9wdHMucmVkdWNlcnMpXG4gICAgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAoc3RhdGVBbmRTbGljZVsxXSBhcyBTbGljZUhlbHBlcjxTLCBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+KS5hY3Rpb25EaXNwYXRjaGVyLl9zeW5jQ29tcG9uZW50UHJvcHMocHJvcHMpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIE9iamVjdC52YWx1ZXMocHJvcHMpKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHJldHVybiAoKSA9PiB7KHN0YXRlQW5kU2xpY2VbMV0gYXMgU2xpY2VIZWxwZXI8UywgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+PikuYWN0aW9uRGlzcGF0Y2hlci5fd2lsbFVubW91bnQoKTsgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc3RhdGVBbmRTbGljZSA9IHVzZVJlZHV4VG9va2l0V2l0aChzdGF0ZUZhY3RvcnksIGV4dGVuZE9wdHNGYWN0b3J5LCAuLi5lcGljRmFjdG9yaWVzKTtcbiAgcmV0dXJuIHN0YXRlQW5kU2xpY2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiB7XG4gIGNvbXBvbmVudFByb3BzPzogUHJvcHM7XG59XG5cbmV4cG9ydCB0eXBlIEVwaWNGYWN0b3J5NENvbXA8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+ID1cbiAgKHNsaWNlOiBTbGljZUhlbHBlcjxTLCBSICYgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+PilcbiAgPT4gRXBpYzxQYXlsb2FkQWN0aW9uPGFueT4sIGFueSwge1tTbiBpbiBOYW1lXTogU30+IHwgdm9pZDtcblxudHlwZSBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4+ID0ge1xuICBfc3luY0NvbXBvbmVudFByb3BzKHM6IFMgfCBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFByb3BzPik6IHZvaWQ7XG4gIF93aWxsVW5tb3VudChzOiBTIHwgRHJhZnQ8Uz4pOiB2b2lkO1xufTtcblxuZnVuY3Rpb24gd2l0aEJhc2VSZWR1Y2VyczxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4ob3JpZ1JlZHVjZXJzOiBSKTpcbkNvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPiAmIFIge1xuICBjb25zdCByZWR1Y2VycyA9IHtcbiAgICBfc3luY0NvbXBvbmVudFByb3BzKHM6IFMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQcm9wcz4pIHtcbiAgICAgIHMuY29tcG9uZW50UHJvcHMgPSB7Li4ucGF5bG9hZH07XG4gICAgfSxcbiAgICBfd2lsbFVubW91bnQoczogUykge30sXG4gICAgLi4ub3JpZ1JlZHVjZXJzXG4gIH07XG4gIHJldHVybiByZWR1Y2Vycztcbn1cblxuZXhwb3J0IHR5cGUgSW5qZWN0ZWRDb21wUHJvcHNUeXBlPENvbm5lY3RIT0M+ID1cbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxpbmZlciBUSW5qZWN0ZWRQcm9wcywgYW55PiA/IFRJbmplY3RlZFByb3BzIDoge1twOiBzdHJpbmddOiB1bmtub3dufSlcbiAgJlxuICAoQ29ubmVjdEhPQyBleHRlbmRzIEluZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzPGFueSwgaW5mZXIgVE93blByb3BzPiA/IFRPd25Qcm9wcyA6IHtbcDogc3RyaW5nXTogdW5rbm93bn0pO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VTdG9yZU9mU3RhdGVGYWN0b3J5KHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5KSB7XG4gIGNvbnN0IFtyZWR1eFN0b3JlLCBzZXRSZWR1eFN0b3JlXSA9IHVzZVN0YXRlPFJldHVyblR5cGU8U3RhdGVGYWN0b3J5WydnZXRSb290U3RvcmUnXT4+KHVuZGVmaW5lZCk7XG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc3RhdGVGYWN0b3J5LnN0b3JlJC5zdWJzY3JpYmUoe1xuICAgICAgbmV4dChzdG9yZSkge1xuICAgICAgICBzZXRSZWR1eFN0b3JlKHN0b3JlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICB9LCBbc3RhdGVGYWN0b3J5LnN0b3JlJF0pO1xuXG4gIHJldHVybiByZWR1eFN0b3JlO1xufVxuXG5pbnRlcmZhY2UgRGVtb0NvbXBQcm9wcyB7XG4gIGNsYXNzTmFtZTogc3RyaW5nO1xufVxuaW50ZXJmYWNlIERlbW9TdGF0ZSBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxEZW1vQ29tcFByb3BzPiB7XG4gIG9rPzogYm9vbGVhbjtcbn1cblxuY29uc3QgZGVtb1N0YXRlOiBEZW1vU3RhdGUgPSB7fTtcblxuY29uc3Qgc2ltcGxlRGVtb1JlZHVjZXJzID0ge1xuICBoZWxsb3coczogRGVtb1N0YXRlLCBwYXlsb2FkOiB7ZGF0YTogc3RyaW5nfSkge30sXG4gIHdvcmxkKHM6IERlbW9TdGF0ZSkge31cbn07XG5cbmNvbnN0IGRlbW9SZWR1Y2VycyA9IGNyZWF0ZVJlZHVjZXJzPERlbW9TdGF0ZSwgdHlwZW9mIHNpbXBsZURlbW9SZWR1Y2Vycz4oc2ltcGxlRGVtb1JlZHVjZXJzKTtcblxuY29uc3QgZGVtb1NsaWNlID0gY3JlYXRlU2xpY2VIZWxwZXIoc3RhdGVGYWN0b3J5LCB7XG4gIG5hbWU6ICdfaW50ZXJuYWxfJyxcbiAgaW5pdGlhbFN0YXRlOiBkZW1vU3RhdGUsXG4gIHJlZHVjZXJzOiB3aXRoQmFzZVJlZHVjZXJzPERlbW9Db21wUHJvcHMsIERlbW9TdGF0ZSwgdHlwZW9mIGRlbW9SZWR1Y2Vycz4oZGVtb1JlZHVjZXJzKVxufSk7XG5cbmRlbW9TbGljZS5hZGRFcGljKHNsaWNlID0+IHtcbiAgcmV0dXJuIGFjdGlvbiQgPT4ge1xuICAgIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX3dpbGxVbm1vdW50KCk7XG4gICAgY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uU3RyZWFtcy5oZWxsb3csXG4gICAgICBhY3Rpb25TdHJlYW1zLl9zeW5jQ29tcG9uZW50UHJvcHMsXG4gICAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ybGQpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IGFjdGlvbikpLFxuICAgICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhlbGxvdyksXG4gICAgICAgIG9wLm1hcChhY3Rpb24gPT4gYWN0aW9uKSlcbiAgICApO1xuICB9O1xufSk7XG5cbmFjdGlvbiRPZlNsaWNlKGRlbW9TbGljZSwgJ2hlbGxvdycpLnBpcGUoXG4gIG9wLnRhcChhY3Rpb24gPT4gY29uc29sZS5sb2coYWN0aW9uKSlcbik7XG5hY3Rpb24kT2ZTbGljZShkZW1vU2xpY2UsICd3b3JsZCcpLnBpcGUoXG4gIG9wLnRhcChhY3Rpb24gPT4gY29uc29sZS5sb2coYWN0aW9uKSlcbik7XG4iXX0=