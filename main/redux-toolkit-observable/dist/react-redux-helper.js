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
    }, []);
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
    }, []);
    react_1.default.useEffect(function () {
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
    }, epicFactories);
    react_1.default.useEffect(function () {
        return function () {
            willUnmountSub.next();
            willUnmountSub.complete();
            helper.destroy();
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1RUFDb0M7QUFRNUIsZ0dBVGlDLDBDQUFlLE9BU2pDO0FBUHZCLGdEQUEwQjtBQUMxQixpRUFBcUQ7QUFDckQsbUNBQXFFO0FBRXJFLCtCQUEwQztBQUMxQyx1Q0FBMkI7QUFDM0IsaURBQXFDO0FBRXJDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUVyQiwyQ0FBeUI7QUFFekI7Ozs7R0FJRztBQUNILFNBQWdCLGtCQUFrQixDQUFvQyxZQUEwQixFQUM5RixXQUEyQztJQUFFLHVCQUE2RDtTQUE3RCxVQUE2RCxFQUE3RCxxQkFBNkQsRUFBN0QsSUFBNkQ7UUFBN0Qsc0NBQTZEOztJQUUxRyxJQUFNLGNBQWMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQU8sQ0FBQyxDQUFDLEVBQTdCLENBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUUsSUFBTSxZQUFZLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQy9ELElBQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQTZEO1FBQ3ZGLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUF1QyxJQUFJLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQyxDQUFDO0lBQ3JHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVELElBQUEsS0FBb0IsZUFBSyxDQUFDLFFBQVEsQ0FBSSxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQS9ELEtBQUssUUFBQSxFQUFFLFFBQVEsUUFBZ0QsQ0FBQztJQUV2RSxJQUFNLE1BQU0sR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFvQjtRQUM5QyxJQUFNLE1BQU0sR0FBRywwQkFBaUIsQ0FBQyxZQUFZLHdCQUFNLFlBQVksS0FBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsWUFBWSxFQUFFLElBQUUsQ0FBQztRQUNsSCxZQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDbEMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWpCLENBQWlCLENBQUMsRUFDcEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FDN0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGNBQWM7UUFDZCwyRkFBMkY7UUFDM0YsNkVBQTZFO1FBQzdFLDBGQUEwRjtRQUMxRiwwQkFBMEI7UUFDMUIsS0FBdUIsVUFBTSxFQUFOLGlCQUFNLEVBQU4sb0JBQU0sRUFBTixJQUFNLEVBQUU7WUFBMUIsSUFBTSxRQUFRLGVBQUE7WUFDakIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMzQjtRQUNELDZFQUE2RTtRQUM3RSxrRkFBa0Y7UUFDbEYsdUNBQXVDO1FBQ3ZDLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQyxHQUFHLEVBQUUsR0FBRyxJQUFLLE9BQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBckIsQ0FBcUIsQ0FBQyxDQUFDO1FBQzNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDZCxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSyxPQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQztJQUM3RCxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFFbEIsZUFBSyxDQUFDLFNBQVMsQ0FBQztRQUNkLE9BQU87WUFDTCxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUEvQ0QsZ0RBK0NDO0FBR0Q7Ozs7R0FJRztBQUNILFNBQWdCLGNBQWMsQ0FDNUIsV0FBMkM7SUFBRSx1QkFBNkQ7U0FBN0QsVUFBNkQsRUFBN0QscUJBQTZELEVBQTdELElBQTZEO1FBQTdELHNDQUE2RDs7SUFDMUcsT0FBTyxrQkFBa0IsK0JBQUMsb0NBQVksRUFBRSxXQUFXLEdBQUssYUFBYSxHQUFFO0FBQ3pFLENBQUM7QUFIRCx3Q0FHQztBQVFELFNBQWdCLHNCQUFzQixDQUFDLFlBQTBCO0lBQ3pELElBQUEsS0FBOEIsZ0JBQVEsQ0FBMkMsU0FBUyxDQUFDLEVBQTFGLFVBQVUsUUFBQSxFQUFFLGFBQWEsUUFBaUUsQ0FBQztJQUNsRyxpQkFBUyxDQUFDO1FBQ1IsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDNUIsSUFBSSxZQUFDLEtBQUs7Z0JBQ1IsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7U0FDRixDQUFDLENBQUM7SUFFTCxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUUxQixPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBWkQsd0RBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0luZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzfSBmcm9tICdyZWFjdC1yZWR1eCc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgU2xpY2VDYXNlUmVkdWNlcnMsIG9mUGF5bG9hZEFjdGlvblxufSBmcm9tICcuL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4vc3RhdGUtZmFjdG9yeS1icm93c2VyJztcbmltcG9ydCB7Y3JlYXRlU2xpY2VIZWxwZXIsIEVwaWNGYWN0b3J5LCBTbGljZUhlbHBlcn0gZnJvbSAnLi9oZWxwZXInO1xuaW1wb3J0IHtDcmVhdGVTbGljZU9wdGlvbnN9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHt1c2VFZmZlY3QsIHVzZVN0YXRlfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcbmxldCBDT01QT05FTlRfSUQgPSAwO1xuXG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcic7XG5cbi8qKlxuICogVXNlIGEgZGVkaWNhdGVkIFJlZHV4IHNsaWNlIHN0b3JlIGZvciBzaW5nbGUgY29tcG9uZW50IGluc3RhbmNlXG4gKiBAcGFyYW0gb3B0c0ZhY3RvcnkgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcmllcyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVJlZHV4VG9va2l0V2l0aDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHN0YXRlRmFjdG9yeTogU3RhdGVGYWN0b3J5LFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogW1MsIFNsaWNlSGVscGVyPFMsIFI+XSB7XG5cbiAgY29uc3Qgd2lsbFVubW91bnRTdWIgPSBSZWFjdC51c2VNZW1vKCgpID0+IG5ldyByeC5SZXBsYXlTdWJqZWN0PHZvaWQ+KDEpLCBbXSk7XG4gIGNvbnN0IHNsaWNlT3B0aW9ucyA9IFJlYWN0LnVzZU1lbW8ob3B0c0ZhY3RvcnksIFtvcHRzRmFjdG9yeV0pO1xuICBjb25zdCBlcGljJHMgPSBSZWFjdC51c2VNZW1vPHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+W10+KCgpID0+IHtcbiAgICByZXR1cm4gZXBpY0ZhY3Rvcmllcy5tYXAoKCkgPT4gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KG51bGwpKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IFtzdGF0ZSwgc2V0U3RhdGVdID0gUmVhY3QudXNlU3RhdGU8Uz4oc2xpY2VPcHRpb25zLmluaXRpYWxTdGF0ZSk7XG5cbiAgY29uc3QgaGVscGVyID0gUmVhY3QudXNlTWVtbzxTbGljZUhlbHBlcjxTLCBSPj4oKCkgPT4ge1xuICAgIGNvbnN0IGhlbHBlciA9IGNyZWF0ZVNsaWNlSGVscGVyKHN0YXRlRmFjdG9yeSwgey4uLnNsaWNlT3B0aW9ucywgbmFtZTogc2xpY2VPcHRpb25zLm5hbWUgKyAnLicgKyBDT01QT05FTlRfSUQrK30pO1xuICAgIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGhlbHBlcikucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgaGVscGVyLmFkZEVwaWMkKGVwaWNGYWMkKTtcbiAgICB9XG4gICAgLy8gTGV0J3MgZnVuIGVwaWMgZmFjdG9yeSBhcyBlYXJsaWVyIGFzIHBvc3NpYmxlLCBzbyB0aGF0IGl0IHdpbGwgbm90IG1pc3NpbmdcbiAgICAvLyBhbnkgYWN0aW9uIGRpc3BhdGNoZWQgZnJvbSBjaGlsZCBjb21wb25lbnQsIHNpbmNlIGNoaWxkIGNvbXBvbmVudCdzIHVzZUVmZmVjdCgpXG4gICAgLy8gcnVucyBlYXJsaWVyIHRoYW4gcGFyZW50IGNvbXBvbmVudCdzXG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgICByZXR1cm4gaGVscGVyO1xuICB9LCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICB9LCBlcGljRmFjdG9yaWVzKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5uZXh0KCk7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5jb21wbGV0ZSgpO1xuICAgICAgaGVscGVyLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIFtzdGF0ZSwgaGVscGVyXTtcbn1cblxuXG4vKipcbiAqIFVzZSBhIGRlZGljYXRlZCBSZWR1eCBzbGljZSBzdG9yZSBmb3Igc2luZ2xlIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VSZWR1eFRvb2tpdDxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KTogW1MsIFNsaWNlSGVscGVyPFMsIFI+XSB7XG4gIHJldHVybiB1c2VSZWR1eFRvb2tpdFdpdGgoc3RhdGVGYWN0b3J5LCBvcHRzRmFjdG9yeSwgLi4uZXBpY0ZhY3Rvcmllcyk7XG59XG5cbmV4cG9ydCB0eXBlIEluamVjdGVkQ29tcFByb3BzVHlwZTxDb25uZWN0SE9DPiA9XG4gIChDb25uZWN0SE9DIGV4dGVuZHMgSW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHM8aW5mZXIgVEluamVjdGVkUHJvcHMsIGFueT4gPyBUSW5qZWN0ZWRQcm9wcyA6IHtbcDogc3RyaW5nXTogdW5rbm93bn0pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7W3A6IHN0cmluZ106IHVua25vd259KTtcblxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5zdG9yZSRdKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cbiJdfQ==