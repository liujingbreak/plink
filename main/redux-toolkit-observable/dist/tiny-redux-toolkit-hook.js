"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTinyReduxTookit = void 0;
var react_1 = __importDefault(require("react"));
var tiny_redux_toolkit_1 = require("./tiny-redux-toolkit");
var op = __importStar(require("rxjs/operators"));
__exportStar(require("./tiny-redux-toolkit"), exports);
var rx = __importStar(require("rxjs"));
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
function useTinyReduxTookit(optsFactory, epicFactory) {
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, []);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    var slice = react_1.default.useMemo(function () {
        var slice = tiny_redux_toolkit_1.createSlice(sliceOptions);
        slice.state$.pipe(op.distinctUntilChanged(), op.tap(function (changed) { return setState(changed); }), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        if (epicFactory) {
            slice.addEpic(epicFactory);
        }
        return slice;
    }, []);
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
    }, []);
    return [state, slice];
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQTBCO0FBQzFCLDJEQUE2RjtBQUM3RixpREFBcUM7QUFDckMsdURBQXFDO0FBQ3JDLHVDQUEyQjtBQUUzQjs7OztHQUlHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQXFDLEVBQUUsV0FBOEI7SUFHckUsNENBQTRDO0lBQzVDLGdEQUFnRDtJQUNoRCxJQUFNLGNBQWMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLGNBQU0sT0FBQSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQU8sQ0FBQyxDQUFDLEVBQTdCLENBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUUsSUFBTSxZQUFZLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFOUMsSUFBQSxLQUFvQixlQUFLLENBQUMsUUFBUSxDQUFJLFlBQVksQ0FBQyxZQUFZLENBQUMsRUFBL0QsS0FBSyxRQUFBLEVBQUUsUUFBUSxRQUFnRCxDQUFDO0lBQ3ZFLDJEQUEyRDtJQUMzRCxJQUFNLEtBQUssR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFjO1FBQ3ZDLElBQU0sS0FBSyxHQUFHLGdDQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2YsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWpCLENBQWlCLENBQUMsRUFDcEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FDN0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLGNBQWM7UUFDZCwyRkFBMkY7UUFDM0YsNkVBQTZFO1FBQzdFLDBGQUEwRjtRQUMxRiwwQkFBMEI7UUFDMUIsSUFBSSxXQUFXLEVBQUU7WUFDZixLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCxlQUFLLENBQUMsU0FBUyxDQUFDO1FBQ2QsaUNBQWlDO1FBQ2pDLCtCQUErQjtRQUMvQix1RUFBdUU7UUFDdkUsNkJBQTZCO1FBQzdCLDZFQUE2RTtRQUM3RSxvREFBb0Q7UUFDcEQsb0RBQW9EO1FBQ3BELGlCQUFpQjtRQUNqQixPQUFPO1lBQ0wsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixxQkFBcUI7WUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQztJQUNKLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNQLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQS9DRCxnREErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgUmVkdWNlcnMsIFNsaWNlLCBTbGljZU9wdGlvbnMsIEVwaWNGYWN0b3J5fSBmcm9tICcuL3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5leHBvcnQgKiBmcm9tICcuL3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcblxuLyoqXG4gKiBGb3IgcGVyZm9ybWFuY2UgcmVhc29uLCBiZXR0ZXIgZGVmaW5lIG9wdHMucmVkdWNlcnMgb3V0c2lkZSBvZiBjb21wb25lbnQgcmVuZGVyaW5nIGZ1bmN0aW9uXG4gKiBAcGFyYW0gb3B0cyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlVGlueVJlZHV4VG9va2l0PFMgZXh0ZW5kcyB7ZXJyb3I/OiBFcnJvcn0sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBTbGljZU9wdGlvbnM8UywgUj4sIGVwaWNGYWN0b3J5OiBFcGljRmFjdG9yeTxTLCBSPik6XG4gIFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlPFMsIFI+XSB7XG5cbiAgLy8gVG8gYXZvaWQgYSBtdXRhdGFibGUgdmVyc2lvbiBpcyBwYXNzZWQgaW5cbiAgLy8gY29uc3QgY2xvbmVkU3RhdGUgPSBjbG9uZShvcHRzLmluaXRpYWxTdGF0ZSk7XG4gIGNvbnN0IHdpbGxVbm1vdW50U3ViID0gUmVhY3QudXNlTWVtbygoKSA9PiBuZXcgcnguUmVwbGF5U3ViamVjdDx2b2lkPigxKSwgW10pO1xuICBjb25zdCBzbGljZU9wdGlvbnMgPSBSZWFjdC51c2VNZW1vKG9wdHNGYWN0b3J5LCBbXSk7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcbiAgLy8gY29uc3QgW3NsaWNlLCBzZXRTbGljZV0gPSBSZWFjdC51c2VTdGF0ZTxTbGljZTxTLCBSPj4oKTtcbiAgY29uc3Qgc2xpY2UgPSBSZWFjdC51c2VNZW1vPFNsaWNlPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3Qgc2xpY2UgPSBjcmVhdGVTbGljZShzbGljZU9wdGlvbnMpO1xuICAgIHNsaWNlLnN0YXRlJC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKSxcbiAgICAgIG9wLnRha2VVbnRpbCh3aWxsVW5tb3VudFN1YilcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gSW1wb3J0YW50ISFcbiAgICAvLyBFcGljIG1pZ2h0IGNvbnRhaW4gcmVjdXJpdmUgc3RhdGUgY2hhbmdpbmcgbG9naWMsIGxpa2Ugc3Vic2NyaWJpbmcgb24gc3RhdGUkIHN0cmVhbSBhbmQgXG4gICAgLy8gY2hhbmdlIHN0YXRlLCBpdCB0dXJucyBvdXQgYW55IHN1YnNjcmliZXIgdGhhdCBzdWJzY3JpYmUgc3RhdGUkIGxhdGVyIHRoYW5cbiAgICAvLyBlcGljIHdpbGwgZ2V0IGEgc3RhdGUgY2hhbmdlIGV2ZW50IGluIHJldmVyc2VkIG9yZGVyICEhIFNvIGVwaWMgbXVzdCBiZSB0aGUgbGFzdCBvbmUgdG9cbiAgICAvLyBzdWJzY3JpYmUgc3RhdGUkIHN0cmVhbVxuICAgIGlmIChlcGljRmFjdG9yeSkge1xuICAgICAgc2xpY2UuYWRkRXBpYyhlcGljRmFjdG9yeSk7XG4gICAgfVxuICAgIHJldHVybiBzbGljZTtcbiAgfSwgW10pO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gY29uc3Qgc3ViID0gc2xpY2Uuc3RhdGUkLnBpcGUoXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgLy8gSW1wb3J0YW50ISEhIGJlY2F1c2UgdGhpcyBzdHJlYW0gaXMgc3Vic2NyaWJlZCBsYXRlciB0aGFuIEVwaWMsXG4gICAgLy8gICAvLyBcImNoYW5nZWRcIiB2YWx1ZSBtaWdodFxuICAgIC8vICAgLy8gY29tZSBpbiByZXZlcnNlZCBvcmRlciBpbiBjYXNlIG9mIHJlY3Vyc2l2ZSBzdGF0ZSBjaGFuZ2luZyBpbiBcIkVwaWNcIixcbiAgICAvLyAgIC8vIHNvIGFsd2F5cyB1c2UgZ2V0VmFsdWUoKSB0byBnZXQgbGF0ZXN0IHN0YXRlXG4gICAgLy8gICBvcC50YXAoKCkgPT4gc2V0U3RhdGUoc2xpY2Uuc3RhdGUkLmdldFZhbHVlKCkpKVxuICAgIC8vICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbGxVbm1vdW50U3ViLm5leHQoKTtcbiAgICAgIHdpbGxVbm1vdW50U3ViLmNvbXBsZXRlKCk7XG4gICAgICAvLyBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgIHNsaWNlLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9LCBbXSk7XG4gIHJldHVybiBbc3RhdGUsIHNsaWNlXTtcbn1cbiJdfQ==