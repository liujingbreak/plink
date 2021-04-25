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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreOfStateFactory = exports.useReduxTookit = exports.createReducers = exports.ofPayloadAction = void 0;
var react_1 = __importDefault(require("react"));
var state_factory_browser_1 = require("./state-factory-browser");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return state_factory_browser_1.ofPayloadAction; } });
var helper_1 = require("./helper");
Object.defineProperty(exports, "createReducers", { enumerable: true, get: function () { return helper_1.createReducers; } });
var react_2 = require("react");
var rx = __importStar(require("rxjs"));
var op = __importStar(require("rxjs/operators"));
var COMPONENT_ID = 0;
function useReduxTookit(optsFactory, epicFactory) {
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, []);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    var helper = react_1.default.useMemo(function () {
        var helper = helper_1.createSliceHelper(state_factory_browser_1.stateFactory, __assign(__assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        state_factory_browser_1.stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        if (epicFactory) {
            helper.setEpic(epicFactory);
        }
        return helper;
    }, []);
    react_1.default.useEffect(function () {
        return function () {
            willUnmountSub.next();
            willUnmountSub.complete();
            helper.destroy();
        };
    }, []);
    return [state, helper];
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
    }, [stateFactory.getRootStore()]);
    return reduxStore;
}
exports.useStoreOfStateFactory = useStoreOfStateFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLGdEQUEwQjtBQUMxQixpRUFBc0U7QUFTcEMsZ0dBVFosdUNBQWUsT0FTWTtBQVJqRCxtQ0FBcUY7QUFRbEMsK0ZBUkUsdUJBQWMsT0FRRjtBQU5qRSwrQkFBMEM7QUFDMUMsdUNBQTJCO0FBQzNCLGlEQUFxQztBQUVyQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7QUFLckIsU0FBZ0IsY0FBYyxDQUM1QixXQUEyQyxFQUFFLFdBQThCO0lBQzNFLElBQU0sY0FBYyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBTyxDQUFDLENBQUMsRUFBN0IsQ0FBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM5RSxJQUFNLFlBQVksR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUU5QyxJQUFBLEtBQW9CLGVBQUssQ0FBQyxRQUFRLENBQUksWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUEvRCxLQUFLLFFBQUEsRUFBRSxRQUFRLFFBQWdELENBQUM7SUFFdkUsSUFBTSxNQUFNLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBb0I7UUFDOUMsSUFBTSxNQUFNLEdBQUcsMEJBQWlCLENBQUMsb0NBQVksd0JBQU0sWUFBWSxLQUFFLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxZQUFZLEVBQUUsSUFBRSxDQUFDO1FBQ2xILG9DQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDbEMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWpCLENBQWlCLENBQUMsRUFDcEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FDN0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGNBQWM7UUFDZCwyRkFBMkY7UUFDM0YsNkVBQTZFO1FBQzdFLDBGQUEwRjtRQUMxRiwwQkFBMEI7UUFDMUIsSUFBSSxXQUFXLEVBQUU7WUFDZixNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsZUFBSyxDQUFDLFNBQVMsQ0FBQztRQUNkLE9BQU87WUFDTCxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUCxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUFsQ0Qsd0NBa0NDO0FBUUQsU0FBZ0Isc0JBQXNCLENBQUMsWUFBMEI7SUFDekQsSUFBQSxLQUE4QixnQkFBUSxDQUEyQyxTQUFTLENBQUMsRUFBMUYsVUFBVSxRQUFBLEVBQUUsYUFBYSxRQUFpRSxDQUFDO0lBQ2xHLGlCQUFTLENBQUM7UUFDUixZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUM1QixJQUFJLFlBQUMsS0FBSztnQkFDUixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUVMLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFbEMsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQVpELHdEQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wc30gZnJvbSAncmVhY3QtcmVkdXgnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIFNsaWNlQ2FzZVJlZHVjZXJzLy8gLCBFeHRyYVNsaWNlUmVkdWNlcnNcbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7c3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vc3RhdGUtZmFjdG9yeS1icm93c2VyJztcbmltcG9ydCB7Y3JlYXRlU2xpY2VIZWxwZXIsIEVwaWNGYWN0b3J5LCBTbGljZUhlbHBlciwgY3JlYXRlUmVkdWNlcnN9IGZyb20gJy4vaGVscGVyJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7dXNlRWZmZWN0LCB1c2VTdGF0ZX0gZnJvbSAncmVhY3QnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmxldCBDT01QT05FTlRfSUQgPSAwO1xuXG5leHBvcnQge0VwaWNGYWN0b3J5LCBTbGljZUhlbHBlciwgb2ZQYXlsb2FkQWN0aW9uLCBjcmVhdGVSZWR1Y2Vyc307XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVJlZHV4VG9va2l0PFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4sIGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6IFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlSGVscGVyPFMsIFI+XSB7XG4gIGNvbnN0IHdpbGxVbm1vdW50U3ViID0gUmVhY3QudXNlTWVtbygoKSA9PiBuZXcgcnguUmVwbGF5U3ViamVjdDx2b2lkPigxKSwgW10pO1xuICBjb25zdCBzbGljZU9wdGlvbnMgPSBSZWFjdC51c2VNZW1vKG9wdHNGYWN0b3J5LCBbXSk7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcblxuICBjb25zdCBoZWxwZXIgPSBSZWFjdC51c2VNZW1vPFNsaWNlSGVscGVyPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3QgaGVscGVyID0gY3JlYXRlU2xpY2VIZWxwZXIoc3RhdGVGYWN0b3J5LCB7Li4uc2xpY2VPcHRpb25zLCBuYW1lOiBzbGljZU9wdGlvbnMubmFtZSArICcuJyArIENPTVBPTkVOVF9JRCsrfSk7XG4gICAgc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoaGVscGVyKS5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKSxcbiAgICAgIG9wLnRha2VVbnRpbCh3aWxsVW5tb3VudFN1YilcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gSW1wb3J0YW50ISFcbiAgICAvLyBFcGljIG1pZ2h0IGNvbnRhaW4gcmVjdXJpdmUgc3RhdGUgY2hhbmdpbmcgbG9naWMsIGxpa2Ugc3Vic2NyaWJpbmcgb24gc3RhdGUkIHN0cmVhbSBhbmQgXG4gICAgLy8gY2hhbmdlIHN0YXRlLCBpdCB0dXJucyBvdXQgYW55IHN1YnNjcmliZXIgdGhhdCBzdWJzY3JpYmUgc3RhdGUkIGxhdGVyIHRoYW5cbiAgICAvLyBlcGljIHdpbGwgZ2V0IGEgc3RhdGUgY2hhbmdlIGV2ZW50IGluIHJldmVyc2VkIG9yZGVyICEhIFNvIGVwaWMgbXVzdCBiZSB0aGUgbGFzdCBvbmUgdG9cbiAgICAvLyBzdWJzY3JpYmUgc3RhdGUkIHN0cmVhbVxuICAgIGlmIChlcGljRmFjdG9yeSkge1xuICAgICAgaGVscGVyLnNldEVwaWMoZXBpY0ZhY3RvcnkpO1xuICAgIH1cbiAgICByZXR1cm4gaGVscGVyO1xuICB9LCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2lsbFVubW91bnRTdWIubmV4dCgpO1xuICAgICAgd2lsbFVubW91bnRTdWIuY29tcGxldGUoKTtcbiAgICAgIGhlbHBlci5kZXN0cm95KCk7XG4gICAgfTtcbiAgfSwgW10pO1xuICByZXR1cm4gW3N0YXRlLCBoZWxwZXJdO1xufVxuXG5leHBvcnQgdHlwZSBJbmplY3RlZENvbXBQcm9wc1R5cGU8Q29ubmVjdEhPQz4gPVxuICAoQ29ubmVjdEhPQyBleHRlbmRzIEluZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzPGluZmVyIFRJbmplY3RlZFByb3BzLCBhbnk+ID8gVEluamVjdGVkUHJvcHMgOiB7fSlcbiAgJlxuICAoQ29ubmVjdEhPQyBleHRlbmRzIEluZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzPGFueSwgaW5mZXIgVE93blByb3BzPiA/IFRPd25Qcm9wcyA6IHt9KTtcblxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5nZXRSb290U3RvcmUoKV0pO1xuXG4gIHJldHVybiByZWR1eFN0b3JlO1xufVxuIl19