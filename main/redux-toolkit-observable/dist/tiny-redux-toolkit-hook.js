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
var rx = __importStar(require("rxjs"));
__exportStar(require("./tiny-redux-toolkit"), exports);
var EMPTY_ARR = [];
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
    var sliceOptions = react_1.default.useMemo(optsFactory, EMPTY_ARR);
    var epic$s = react_1.default.useMemo(function () {
        return epicFactories.map(function () { return new rx.BehaviorSubject(null); });
    }, EMPTY_ARR);
    var _a = react_1.default.useState(sliceOptions.initialState), state = _a[0], setState = _a[1];
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    var slice = react_1.default.useMemo(function () {
        var slice = tiny_redux_toolkit_1.createSlice(sliceOptions);
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
    }, EMPTY_ARR);
    react_1.default.useEffect(function () {
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
    }, epicFactories);
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
    }, EMPTY_ARR);
    return [state, slice];
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQTBCO0FBQzFCLDJEQUE2RjtBQUM3RixpREFBcUM7QUFDckMsdUNBQTJCO0FBQzNCLHVEQUFxQztBQUVyQyxJQUFNLFNBQVMsR0FBRyxFQUFXLENBQUM7QUFDOUI7Ozs7R0FJRztBQUNILFNBQWdCLGtCQUFrQixDQUNoQyxXQUFxQztJQUFFLHVCQUE2RDtTQUE3RCxVQUE2RCxFQUE3RCxxQkFBNkQsRUFBN0QsSUFBNkQ7UUFBN0Qsc0NBQTZEOztJQUdwRyw0Q0FBNEM7SUFDNUMsZ0RBQWdEO0lBQ2hELElBQU0sY0FBYyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBTyxDQUFDLENBQUMsRUFBN0IsQ0FBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM5RSxJQUFNLFlBQVksR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMzRCxJQUFNLE1BQU0sR0FBRyxlQUFLLENBQUMsT0FBTyxDQUE2RDtRQUN2RixPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsY0FBTSxPQUFBLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBdUMsSUFBSSxDQUFDLEVBQWxFLENBQWtFLENBQUMsQ0FBQztJQUNyRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFUixJQUFBLEtBQW9CLGVBQUssQ0FBQyxRQUFRLENBQUksWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUEvRCxLQUFLLFFBQUEsRUFBRSxRQUFRLFFBQWdELENBQUM7SUFDdkUsMkRBQTJEO0lBQzNELElBQU0sS0FBSyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQWM7UUFDdkMsSUFBTSxLQUFLLEdBQUcsZ0NBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN4QyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZixFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxxREFBcUQ7UUFDL0YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE9BQU8sSUFBSSxPQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBakIsQ0FBaUIsQ0FBQyxFQUNwQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUM3QixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsY0FBYztRQUNkLDJGQUEyRjtRQUMzRiw2RUFBNkU7UUFDN0UsMEZBQTBGO1FBQzFGLDBCQUEwQjtRQUMxQixLQUF1QixVQUFNLEVBQU4saUJBQU0sRUFBTixvQkFBTSxFQUFOLElBQU0sRUFBRTtZQUExQixJQUFNLFFBQVEsZUFBQTtZQUNqQixLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsNkVBQTZFO1FBQzdFLGtGQUFrRjtRQUNsRix1Q0FBdUM7UUFDdkMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBRSxHQUFHLElBQUssT0FBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFyQixDQUFxQixDQUFDLENBQUM7UUFDM0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFZCxlQUFLLENBQUMsU0FBUyxDQUFDO1FBQ2QsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBRSxHQUFHLElBQUssT0FBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDN0QsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRWxCLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDZCxpQ0FBaUM7UUFDakMsK0JBQStCO1FBQy9CLHVFQUF1RTtRQUN2RSw2QkFBNkI7UUFDN0IsNkVBQTZFO1FBQzdFLG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsaUJBQWlCO1FBQ2pCLE9BQU87WUFDTCxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFCLHFCQUFxQjtZQUNyQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2QsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBM0RELGdEQTJEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBSZWR1Y2VycywgU2xpY2UsIFNsaWNlT3B0aW9ucywgRXBpY0ZhY3Rvcnl9IGZyb20gJy4vdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuZXhwb3J0ICogZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuXG5jb25zdCBFTVBUWV9BUlIgPSBbXSBhcyBhbnlbXTtcbi8qKlxuICogRm9yIHBlcmZvcm1hbmNlIHJlYXNvbiwgYmV0dGVyIGRlZmluZSBvcHRzLnJlZHVjZXJzIG91dHNpZGUgb2YgY29tcG9uZW50IHJlbmRlcmluZyBmdW5jdGlvblxuICogQHBhcmFtIG9wdHMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVRpbnlSZWR1eFRvb2tpdDxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+XG4pOiBbc3RhdGU6IFMsIHNsaWNlOiBTbGljZTxTLCBSPl0ge1xuXG4gIC8vIFRvIGF2b2lkIGEgbXV0YXRhYmxlIHZlcnNpb24gaXMgcGFzc2VkIGluXG4gIC8vIGNvbnN0IGNsb25lZFN0YXRlID0gY2xvbmUob3B0cy5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB3aWxsVW5tb3VudFN1YiA9IFJlYWN0LnVzZU1lbW8oKCkgPT4gbmV3IHJ4LlJlcGxheVN1YmplY3Q8dm9pZD4oMSksIFtdKTtcbiAgY29uc3Qgc2xpY2VPcHRpb25zID0gUmVhY3QudXNlTWVtbyhvcHRzRmFjdG9yeSwgRU1QVFlfQVJSKTtcbiAgY29uc3QgZXBpYyRzID0gUmVhY3QudXNlTWVtbzxyeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPltdPigoKSA9PiB7XG4gICAgcmV0dXJuIGVwaWNGYWN0b3JpZXMubWFwKCgpID0+IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPihudWxsKSk7XG4gIH0sIEVNUFRZX0FSUik7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcbiAgLy8gY29uc3QgW3NsaWNlLCBzZXRTbGljZV0gPSBSZWFjdC51c2VTdGF0ZTxTbGljZTxTLCBSPj4oKTtcbiAgY29uc3Qgc2xpY2UgPSBSZWFjdC51c2VNZW1vPFNsaWNlPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3Qgc2xpY2UgPSBjcmVhdGVTbGljZShzbGljZU9wdGlvbnMpO1xuICAgIHNsaWNlLnN0YXRlJC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm9ic2VydmVPbihyeC5hbmltYXRpb25GcmFtZVNjaGVkdWxlciksIC8vIFRvIGF2b2lkIGNoYW5nZXMgYmVpbmcgYmF0Y2hlZCBieSBSZWFjdCBzZXRTdGF0ZSgpXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgc2xpY2UuYWRkRXBpYyQoZXBpY0ZhYyQpO1xuICAgIH1cbiAgICAvLyBMZXQncyBmdW4gZXBpYyBmYWN0b3J5IGFzIGVhcmxpZXIgYXMgcG9zc2libGUsIHNvIHRoYXQgaXQgd2lsbCBub3QgbWlzc2luZ1xuICAgIC8vIGFueSBhY3Rpb24gZGlzcGF0Y2hlZCBmcm9tIGNoaWxkIGNvbXBvbmVudCwgc2luY2UgY2hpbGQgY29tcG9uZW50J3MgdXNlRWZmZWN0KClcbiAgICAvLyBydW5zIGVhcmxpZXIgdGhhbiBwYXJlbnQgY29tcG9uZW50J3NcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICAgIHJldHVybiBzbGljZTtcbiAgfSwgRU1QVFlfQVJSKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gIH0sIGVwaWNGYWN0b3JpZXMpO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gY29uc3Qgc3ViID0gc2xpY2Uuc3RhdGUkLnBpcGUoXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgLy8gSW1wb3J0YW50ISEhIGJlY2F1c2UgdGhpcyBzdHJlYW0gaXMgc3Vic2NyaWJlZCBsYXRlciB0aGFuIEVwaWMsXG4gICAgLy8gICAvLyBcImNoYW5nZWRcIiB2YWx1ZSBtaWdodFxuICAgIC8vICAgLy8gY29tZSBpbiByZXZlcnNlZCBvcmRlciBpbiBjYXNlIG9mIHJlY3Vyc2l2ZSBzdGF0ZSBjaGFuZ2luZyBpbiBcIkVwaWNcIixcbiAgICAvLyAgIC8vIHNvIGFsd2F5cyB1c2UgZ2V0VmFsdWUoKSB0byBnZXQgbGF0ZXN0IHN0YXRlXG4gICAgLy8gICBvcC50YXAoKCkgPT4gc2V0U3RhdGUoc2xpY2Uuc3RhdGUkLmdldFZhbHVlKCkpKVxuICAgIC8vICkuc3Vic2NyaWJlKCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbGxVbm1vdW50U3ViLm5leHQoKTtcbiAgICAgIHdpbGxVbm1vdW50U3ViLmNvbXBsZXRlKCk7XG4gICAgICAvLyBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICAgIHNsaWNlLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9LCBFTVBUWV9BUlIpO1xuICByZXR1cm4gW3N0YXRlLCBzbGljZV07XG59XG4iXX0=