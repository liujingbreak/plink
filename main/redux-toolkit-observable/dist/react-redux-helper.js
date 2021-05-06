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
function useReduxTookit(optsFactory) {
    var epicFactories = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        epicFactories[_i - 1] = arguments[_i];
    }
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, []);
    var epic$s = react_1.default.useMemo(function () {
        return epicFactories.map(function () { return new rx.BehaviorSubject(null); });
    }, []);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    var helper = react_1.default.useMemo(function () {
        var helper = helper_1.createSliceHelper(state_factory_browser_1.stateFactory, __assign(__assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        state_factory_browser_1.stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (var _i = 0, epic$s_1 = epic$s; _i < epic$s_1.length; _i++) {
            var epicFac$ = epic$s_1[_i];
            helper.addEpic$(epicFac$);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLGdEQUEwQjtBQUMxQixpRUFBc0U7QUFTcEMsZ0dBVFosdUNBQWUsT0FTWTtBQVJqRCxtQ0FBcUY7QUFRbEMsK0ZBUkUsdUJBQWMsT0FRRjtBQU5qRSwrQkFBMEM7QUFDMUMsdUNBQTJCO0FBQzNCLGlEQUFxQztBQUVyQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7QUFJckIsU0FBZ0IsY0FBYyxDQUM1QixXQUEyQztJQUFFLHVCQUE2RDtTQUE3RCxVQUE2RCxFQUE3RCxxQkFBNkQsRUFBN0QsSUFBNkQ7UUFBN0Qsc0NBQTZEOztJQUMxRyxJQUFNLGNBQWMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQU8sQ0FBQyxDQUFDLEVBQTdCLENBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUUsSUFBTSxZQUFZLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEQsSUFBTSxNQUFNLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBNkQ7UUFDdkYsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQXVDLElBQUksQ0FBQyxFQUFsRSxDQUFrRSxDQUFDLENBQUM7SUFDckcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRUQsSUFBQSxLQUFvQixlQUFLLENBQUMsUUFBUSxDQUFJLFlBQVksQ0FBQyxZQUFZLENBQUMsRUFBL0QsS0FBSyxRQUFBLEVBQUUsUUFBUSxRQUFnRCxDQUFDO0lBRXZFLElBQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQW9CO1FBQzlDLElBQU0sTUFBTSxHQUFHLDBCQUFpQixDQUFDLG9DQUFZLHdCQUFNLFlBQVksS0FBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsWUFBWSxFQUFFLElBQUUsQ0FBQztRQUNsSCxvQ0FBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQ2xDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFqQixDQUFpQixDQUFDLEVBQ3BDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQzdCLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxjQUFjO1FBQ2QsMkZBQTJGO1FBQzNGLDZFQUE2RTtRQUM3RSwwRkFBMEY7UUFDMUYsMEJBQTBCO1FBQzFCLEtBQXVCLFVBQU0sRUFBTixpQkFBTSxFQUFOLG9CQUFNLEVBQU4sSUFBTSxFQUFFO1lBQTFCLElBQU0sUUFBUSxlQUFBO1lBQ2pCLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDM0I7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCxlQUFLLENBQUMsU0FBUyxDQUFDO1FBQ2QsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBRSxHQUFHLElBQUssT0FBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDN0QsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRWxCLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDZCxPQUFPO1lBQ0wsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBMUNELHdDQTBDQztBQVFELFNBQWdCLHNCQUFzQixDQUFDLFlBQTBCO0lBQ3pELElBQUEsS0FBOEIsZ0JBQVEsQ0FBMkMsU0FBUyxDQUFDLEVBQTFGLFVBQVUsUUFBQSxFQUFFLGFBQWEsUUFBaUUsQ0FBQztJQUNsRyxpQkFBUyxDQUFDO1FBQ1IsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDNUIsSUFBSSxZQUFDLEtBQUs7Z0JBQ1IsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7U0FDRixDQUFDLENBQUM7SUFFTCxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWxDLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFaRCx3REFZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHN9IGZyb20gJ3JlYWN0LXJlZHV4JztcbmltcG9ydCB7U3RhdGVGYWN0b3J5LCBTbGljZUNhc2VSZWR1Y2Vycy8vICwgRXh0cmFTbGljZVJlZHVjZXJzXG59IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuL3N0YXRlLWZhY3RvcnktYnJvd3Nlcic7XG5pbXBvcnQge2NyZWF0ZVNsaWNlSGVscGVyLCBFcGljRmFjdG9yeSwgU2xpY2VIZWxwZXIsIGNyZWF0ZVJlZHVjZXJzfSBmcm9tICcuL2hlbHBlcic7XG5pbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9uc30gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3VzZUVmZmVjdCwgdXNlU3RhdGV9IGZyb20gJ3JlYWN0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5sZXQgQ09NUE9ORU5UX0lEID0gMDtcblxuZXhwb3J0IHtFcGljRmFjdG9yeSwgU2xpY2VIZWxwZXIsIG9mUGF5bG9hZEFjdGlvbiwgY3JlYXRlUmVkdWNlcnN9O1xuXG5leHBvcnQgZnVuY3Rpb24gdXNlUmVkdXhUb29raXQ8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PihcbiAgb3B0c0ZhY3Rvcnk6ICgpID0+IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPiwgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPik6IFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlSGVscGVyPFMsIFI+XSB7XG4gIGNvbnN0IHdpbGxVbm1vdW50U3ViID0gUmVhY3QudXNlTWVtbygoKSA9PiBuZXcgcnguUmVwbGF5U3ViamVjdDx2b2lkPigxKSwgW10pO1xuICBjb25zdCBzbGljZU9wdGlvbnMgPSBSZWFjdC51c2VNZW1vKG9wdHNGYWN0b3J5LCBbXSk7XG4gIGNvbnN0IGVwaWMkcyA9IFJlYWN0LnVzZU1lbW88cnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5bXT4oKCkgPT4ge1xuICAgIHJldHVybiBlcGljRmFjdG9yaWVzLm1hcCgoKSA9PiBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4obnVsbCkpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcblxuICBjb25zdCBoZWxwZXIgPSBSZWFjdC51c2VNZW1vPFNsaWNlSGVscGVyPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3QgaGVscGVyID0gY3JlYXRlU2xpY2VIZWxwZXIoc3RhdGVGYWN0b3J5LCB7Li4uc2xpY2VPcHRpb25zLCBuYW1lOiBzbGljZU9wdGlvbnMubmFtZSArICcuJyArIENPTVBPTkVOVF9JRCsrfSk7XG4gICAgc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoaGVscGVyKS5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKSxcbiAgICAgIG9wLnRha2VVbnRpbCh3aWxsVW5tb3VudFN1YilcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gSW1wb3J0YW50ISFcbiAgICAvLyBFcGljIG1pZ2h0IGNvbnRhaW4gcmVjdXJpdmUgc3RhdGUgY2hhbmdpbmcgbG9naWMsIGxpa2Ugc3Vic2NyaWJpbmcgb24gc3RhdGUkIHN0cmVhbSBhbmQgXG4gICAgLy8gY2hhbmdlIHN0YXRlLCBpdCB0dXJucyBvdXQgYW55IHN1YnNjcmliZXIgdGhhdCBzdWJzY3JpYmUgc3RhdGUkIGxhdGVyIHRoYW5cbiAgICAvLyBlcGljIHdpbGwgZ2V0IGEgc3RhdGUgY2hhbmdlIGV2ZW50IGluIHJldmVyc2VkIG9yZGVyICEhIFNvIGVwaWMgbXVzdCBiZSB0aGUgbGFzdCBvbmUgdG9cbiAgICAvLyBzdWJzY3JpYmUgc3RhdGUkIHN0cmVhbVxuICAgIGZvciAoY29uc3QgZXBpY0ZhYyQgb2YgZXBpYyRzKSB7XG4gICAgICBoZWxwZXIuYWRkRXBpYyQoZXBpY0ZhYyQpO1xuICAgIH1cbiAgICByZXR1cm4gaGVscGVyO1xuICB9LCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICB9LCBlcGljRmFjdG9yaWVzKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5uZXh0KCk7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5jb21wbGV0ZSgpO1xuICAgICAgaGVscGVyLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIFtzdGF0ZSwgaGVscGVyXTtcbn1cblxuZXhwb3J0IHR5cGUgSW5qZWN0ZWRDb21wUHJvcHNUeXBlPENvbm5lY3RIT0M+ID1cbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxpbmZlciBUSW5qZWN0ZWRQcm9wcywgYW55PiA/IFRJbmplY3RlZFByb3BzIDoge30pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7fSk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVN0b3JlT2ZTdGF0ZUZhY3Rvcnkoc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnkpIHtcbiAgY29uc3QgW3JlZHV4U3RvcmUsIHNldFJlZHV4U3RvcmVdID0gdXNlU3RhdGU8UmV0dXJuVHlwZTxTdGF0ZUZhY3RvcnlbJ2dldFJvb3RTdG9yZSddPj4odW5kZWZpbmVkKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzdGF0ZUZhY3Rvcnkuc3RvcmUkLnN1YnNjcmliZSh7XG4gICAgICBuZXh0KHN0b3JlKSB7XG4gICAgICAgIHNldFJlZHV4U3RvcmUoc3RvcmUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH0sIFtzdGF0ZUZhY3RvcnkuZ2V0Um9vdFN0b3JlKCldKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cbiJdfQ==