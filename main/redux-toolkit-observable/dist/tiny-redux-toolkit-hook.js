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
function useTinyReduxTookit(optsFactory) {
    var epicFactories = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        epicFactories[_i - 1] = arguments[_i];
    }
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    var willUnmountSub = react_1.default.useMemo(function () { return new rx.ReplaySubject(1); }, []);
    var sliceOptions = react_1.default.useMemo(optsFactory, []);
    var epic$s = react_1.default.useMemo(function () {
        return epicFactories.map(function () { return new rx.BehaviorSubject(null); });
    }, []);
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
        for (var _i = 0, epic$s_1 = epic$s; _i < epic$s_1.length; _i++) {
            var epicFac$ = epic$s_1[_i];
            slice.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach(function (fac, idx) { return epic$s[idx].next(fac); });
        return slice;
    }, []);
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
    }, []);
    return [state, slice];
}
exports.useTinyReduxTookit = useTinyReduxTookit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQTBCO0FBQzFCLDJEQUE2RjtBQUM3RixpREFBcUM7QUFDckMsdURBQXFDO0FBQ3JDLHVDQUEyQjtBQUUzQjs7OztHQUlHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQXFDO0lBQUUsdUJBQTZEO1NBQTdELFVBQTZELEVBQTdELHFCQUE2RCxFQUE3RCxJQUE2RDtRQUE3RCxzQ0FBNkQ7O0lBR3BHLDRDQUE0QztJQUM1QyxnREFBZ0Q7SUFDaEQsSUFBTSxjQUFjLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFPLENBQUMsQ0FBQyxFQUE3QixDQUE2QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLElBQU0sWUFBWSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELElBQU0sTUFBTSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQTZEO1FBQ3ZGLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxjQUFNLE9BQUEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUF1QyxJQUFJLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQyxDQUFDO0lBQ3JHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVELElBQUEsS0FBb0IsZUFBSyxDQUFDLFFBQVEsQ0FBSSxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQS9ELEtBQUssUUFBQSxFQUFFLFFBQVEsUUFBZ0QsQ0FBQztJQUN2RSwyREFBMkQ7SUFDM0QsSUFBTSxLQUFLLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBYztRQUN2QyxJQUFNLEtBQUssR0FBRyxnQ0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3hDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFqQixDQUFpQixDQUFDLEVBQ3BDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQzdCLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxjQUFjO1FBQ2QsMkZBQTJGO1FBQzNGLDZFQUE2RTtRQUM3RSwwRkFBMEY7UUFDMUYsMEJBQTBCO1FBQzFCLEtBQXVCLFVBQU0sRUFBTixpQkFBTSxFQUFOLG9CQUFNLEVBQU4sSUFBTSxFQUFFO1lBQTFCLElBQU0sUUFBUSxlQUFBO1lBQ2pCLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDMUI7UUFDRCw2RUFBNkU7UUFDN0Usa0ZBQWtGO1FBQ2xGLHVDQUF1QztRQUN2QyxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSyxPQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQztRQUMzRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLGVBQUssQ0FBQyxTQUFTLENBQUM7UUFDZCxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSyxPQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQztJQUM3RCxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFFbEIsZUFBSyxDQUFDLFNBQVMsQ0FBQztRQUNkLGlDQUFpQztRQUNqQywrQkFBK0I7UUFDL0IsdUVBQXVFO1FBQ3ZFLDZCQUE2QjtRQUM3Qiw2RUFBNkU7UUFDN0Usb0RBQW9EO1FBQ3BELG9EQUFvRDtRQUNwRCxpQkFBaUI7UUFDakIsT0FBTztZQUNMLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0QixjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUIscUJBQXFCO1lBQ3JCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUCxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUExREQsZ0RBMERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIFJlZHVjZXJzLCBTbGljZSwgU2xpY2VPcHRpb25zLCBFcGljRmFjdG9yeX0gZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0ICogZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5cbi8qKlxuICogRm9yIHBlcmZvcm1hbmNlIHJlYXNvbiwgYmV0dGVyIGRlZmluZSBvcHRzLnJlZHVjZXJzIG91dHNpZGUgb2YgY29tcG9uZW50IHJlbmRlcmluZyBmdW5jdGlvblxuICogQHBhcmFtIG9wdHMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVRpbnlSZWR1eFRvb2tpdDxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+XG4pOiBbc3RhdGU6IFMsIHNsaWNlOiBTbGljZTxTLCBSPl0ge1xuXG4gIC8vIFRvIGF2b2lkIGEgbXV0YXRhYmxlIHZlcnNpb24gaXMgcGFzc2VkIGluXG4gIC8vIGNvbnN0IGNsb25lZFN0YXRlID0gY2xvbmUob3B0cy5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB3aWxsVW5tb3VudFN1YiA9IFJlYWN0LnVzZU1lbW8oKCkgPT4gbmV3IHJ4LlJlcGxheVN1YmplY3Q8dm9pZD4oMSksIFtdKTtcbiAgY29uc3Qgc2xpY2VPcHRpb25zID0gUmVhY3QudXNlTWVtbyhvcHRzRmFjdG9yeSwgW10pO1xuICBjb25zdCBlcGljJHMgPSBSZWFjdC51c2VNZW1vPHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+W10+KCgpID0+IHtcbiAgICByZXR1cm4gZXBpY0ZhY3Rvcmllcy5tYXAoKCkgPT4gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KG51bGwpKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IFtzdGF0ZSwgc2V0U3RhdGVdID0gUmVhY3QudXNlU3RhdGU8Uz4oc2xpY2VPcHRpb25zLmluaXRpYWxTdGF0ZSk7XG4gIC8vIGNvbnN0IFtzbGljZSwgc2V0U2xpY2VdID0gUmVhY3QudXNlU3RhdGU8U2xpY2U8UywgUj4+KCk7XG4gIGNvbnN0IHNsaWNlID0gUmVhY3QudXNlTWVtbzxTbGljZTxTLCBSPj4oKCkgPT4ge1xuICAgIGNvbnN0IHNsaWNlID0gY3JlYXRlU2xpY2Uoc2xpY2VPcHRpb25zKTtcbiAgICBzbGljZS5zdGF0ZSQucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgc2xpY2UuYWRkRXBpYyQoZXBpY0ZhYyQpO1xuICAgIH1cbiAgICAvLyBMZXQncyBmdW4gZXBpYyBmYWN0b3J5IGFzIGVhcmxpZXIgYXMgcG9zc2libGUsIHNvIHRoYXQgaXQgd2lsbCBub3QgbWlzc2luZ1xuICAgIC8vIGFueSBhY3Rpb24gZGlzcGF0Y2hlZCBmcm9tIGNoaWxkIGNvbXBvbmVudCwgc2luY2UgY2hpbGQgY29tcG9uZW50J3MgdXNlRWZmZWN0KClcbiAgICAvLyBydW5zIGVhcmxpZXIgdGhhbiBwYXJlbnQgY29tcG9uZW50J3NcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICAgIHJldHVybiBzbGljZTtcbiAgfSwgW10pO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZXBpY0ZhY3Rvcmllcy5mb3JFYWNoKChmYWMsIGlkeCkgPT4gZXBpYyRzW2lkeF0ubmV4dChmYWMpKTtcbiAgfSwgZXBpY0ZhY3Rvcmllcyk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICAvLyBjb25zdCBzdWIgPSBzbGljZS5zdGF0ZSQucGlwZShcbiAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICAvLyBJbXBvcnRhbnQhISEgYmVjYXVzZSB0aGlzIHN0cmVhbSBpcyBzdWJzY3JpYmVkIGxhdGVyIHRoYW4gRXBpYyxcbiAgICAvLyAgIC8vIFwiY2hhbmdlZFwiIHZhbHVlIG1pZ2h0XG4gICAgLy8gICAvLyBjb21lIGluIHJldmVyc2VkIG9yZGVyIGluIGNhc2Ugb2YgcmVjdXJzaXZlIHN0YXRlIGNoYW5naW5nIGluIFwiRXBpY1wiLFxuICAgIC8vICAgLy8gc28gYWx3YXlzIHVzZSBnZXRWYWx1ZSgpIHRvIGdldCBsYXRlc3Qgc3RhdGVcbiAgICAvLyAgIG9wLnRhcCgoKSA9PiBzZXRTdGF0ZShzbGljZS5zdGF0ZSQuZ2V0VmFsdWUoKSkpXG4gICAgLy8gKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2lsbFVubW91bnRTdWIubmV4dCgpO1xuICAgICAgd2lsbFVubW91bnRTdWIuY29tcGxldGUoKTtcbiAgICAgIC8vIHN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgc2xpY2UuZGVzdHJveSgpO1xuICAgIH07XG4gIH0sIFtdKTtcbiAgcmV0dXJuIFtzdGF0ZSwgc2xpY2VdO1xufVxuIl19