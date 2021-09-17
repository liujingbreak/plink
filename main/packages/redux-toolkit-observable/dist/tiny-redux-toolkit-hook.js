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
exports.useTinyReduxTookit = exports.useTinyRtk = void 0;
const react_1 = __importDefault(require("react"));
const tiny_redux_toolkit_1 = require("./tiny-redux-toolkit");
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
__exportStar(require("./tiny-redux-toolkit"), exports);
function withBaseReducers(origReducers) {
    const reducers = Object.assign({ _syncComponentProps(s, payload) {
            s.componentProps = Object.assign({}, payload);
        },
        _willUnmount(s) { } }, origReducers);
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
function useTinyRtk(optsFactory, props, ...epicFactories) {
    const extendOptsFactory = react_1.default.useCallback(() => {
        const opts = optsFactory();
        return Object.assign(Object.assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(() => () => {
        stateAndSlice[1].actionDispatcher._willUnmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stateAndSlice = useTinyReduxTookit(extendOptsFactory, ...epicFactories);
    react_1.default.useEffect(() => {
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
function useTinyReduxTookit(optsFactory, ...epicFactories) {
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    const willUnmountSub = react_1.default.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = react_1.default.useMemo(optsFactory, [optsFactory]);
    const epic$s = react_1.default.useMemo(() => {
        return epicFactories.map(() => new rx.BehaviorSubject(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [state, setState] = react_1.default.useState(sliceOptions.initialState);
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    const slice = react_1.default.useMemo(() => {
        const slice = (0, tiny_redux_toolkit_1.createSlice)(sliceOptions);
        slice.state$.pipe(op.distinctUntilChanged(), 
        // op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (const epicFac$ of epic$s) {
            slice.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
        return slice;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(() => {
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
    }, [epic$s, epicFactories]);
    react_1.default.useEffect(() => {
        // const sub = slice.state$.pipe(
        //   op.distinctUntilChanged(),
        //   // Important!!! because this stream is subscribed later than Epic,
        //   // "changed" value might
        //   // come in reversed order in case of recursive state changing in "Epic",
        //   // so always use getValue() to get latest state
        //   op.tap(() => setState(slice.state$.getValue()))
        // ).subscribe();
        return () => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLDZEQUE2RztBQUM3RyxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLHVEQUFxQztBQVlyQyxTQUFTLGdCQUFnQixDQUFvRSxZQUFlO0lBRTFHLE1BQU0sUUFBUSxtQkFDWixtQkFBbUIsQ0FBQyxDQUFJLEVBQUUsT0FBYztZQUN0QyxDQUFDLENBQUMsY0FBYyxxQkFBTyxPQUFPLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsWUFBWSxDQUFDLENBQUksSUFBRyxDQUFDLElBQ2xCLFlBQVksQ0FDaEIsQ0FBQztJQUNGLE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFLRDs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLFVBQVUsQ0FDdEIsV0FBcUMsRUFBRSxLQUFZLEVBQUUsR0FBRyxhQUFzRTtJQUc5SCxNQUFNLGlCQUFpQixHQUFHLGVBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1FBQy9DLE1BQU0sSUFBSSxHQUFHLFdBQVcsRUFBRSxDQUFDO1FBRTNCLHVDQUNLLElBQUksS0FDUCxRQUFRLEVBQUUsZ0JBQWdCLENBQWlDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFDekU7UUFDSix1REFBdUQ7SUFDdkQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsZUFBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUU7UUFDeEIsYUFBYSxDQUFDLENBQUMsQ0FBOEMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNqRyx1REFBdUQ7SUFDdkQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsaUJB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QUFvRDtRQUNwRCxpQkFBaUI7UUFDakIsT0FBTyxHQUFHLEVBQUU7WUFDVixjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFCLHFCQUFxQjtZQUNyQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDO1FBQ0osdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNQLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQTlERCxnREE4REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgUmVkdWNlcnMsIFNsaWNlLCBTbGljZU9wdGlvbnMsIEVwaWNGYWN0b3J5LCBPZlR5cGVGbiwgRXBpY30gZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5leHBvcnQgKiBmcm9tICcuL3RpbnktcmVkdXgtdG9vbGtpdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiB7XG4gIGNvbXBvbmVudFByb3BzPzogUHJvcHM7XG4gIGVycm9yPzogRXJyb3I7XG59XG5cbnR5cGUgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+PiA9IHtcbiAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTLCBwYXlsb2FkOiBQcm9wcyk6IHZvaWQ7XG4gIF93aWxsVW5tb3VudChzOiBTKTogdm9pZDtcbn07XG5cbmZ1bmN0aW9uIHdpdGhCYXNlUmVkdWNlcnM8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KG9yaWdSZWR1Y2VyczogUik6XG5Db21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4gJiBSIHtcbiAgY29uc3QgcmVkdWNlcnMgPSB7XG4gICAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTLCBwYXlsb2FkOiBQcm9wcykge1xuICAgICAgcy5jb21wb25lbnRQcm9wcyA9IHsuLi5wYXlsb2FkfTtcbiAgICB9LFxuICAgIF93aWxsVW5tb3VudChzOiBTKSB7fSxcbiAgICAuLi5vcmlnUmVkdWNlcnNcbiAgfTtcbiAgcmV0dXJuIHJlZHVjZXJzO1xufVxuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTRDb21wPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PiA9XG4gIChzbGljZTogU2xpY2U8UywgUiAmIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4sIG9mVHlwZTogT2ZUeXBlRm48UywgUiAmIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4pID0+IEVwaWM8Uz4gfCB2b2lkO1xuXG4vKipcbiAqIFVubGlrZSB1c2VUaW55UmVkdXhUb29raXQsIHVzZVRpbnlSdGsoKSBhY2NlcHRzIGEgU3RhdGUgd2hpY2ggZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGUsIFxuICogIHVzZVRpbnlSdGsoKSB3aWxsIGF1dG9tYXRpY2FsbHkgY3JlYXRlIGFuIGV4dHJhIHJlZHVjZXIgXCJfc3luY0NvbXBvbmVudFByb3BzXCIgZm9yIHNoYWxsb3cgY29waW5nXG4gKiBSZWFjdCBjb21wb25lbnQncyBwcm9wZXJ0aWVzIHRvIHRoaXMgaW50ZXJuYWwgUlRLIHN0b3JlXG4gKiBAcGFyYW0gb3B0c0ZhY3RvcnkgXG4gKiBAcGFyYW0gcHJvcHMgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcmllcyBcbiAqIEByZXR1cm5zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlVGlueVJ0azxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4oXG4gICAgb3B0c0ZhY3Rvcnk6ICgpID0+IFNsaWNlT3B0aW9uczxTLCBSPiwgcHJvcHM6IFByb3BzLCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTRDb21wPFByb3BzLCBTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+XG4gICk6IFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlPFMsIFIgJiBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+XSB7XG5cbiAgICBjb25zdCBleHRlbmRPcHRzRmFjdG9yeSA9IFJlYWN0LnVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRzRmFjdG9yeSgpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5vcHRzLFxuICAgICAgICByZWR1Y2Vyczogd2l0aEJhc2VSZWR1Y2VyczxQcm9wcywgUywgdHlwZW9mIG9wdHMucmVkdWNlcnM+KG9wdHMucmVkdWNlcnMpXG4gICAgICB9O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgICB9LCBbXSk7XG5cbiAgICBSZWFjdC51c2VFZmZlY3QoKCkgPT4gKCkgPT4ge1xuICAgICAgKHN0YXRlQW5kU2xpY2VbMV0gYXMgU2xpY2U8UywgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+PikuYWN0aW9uRGlzcGF0Y2hlci5fd2lsbFVubW91bnQoKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gICAgfSwgW10pO1xuXG4gICAgY29uc3Qgc3RhdGVBbmRTbGljZSA9IHVzZVRpbnlSZWR1eFRvb2tpdChleHRlbmRPcHRzRmFjdG9yeSwgLi4uZXBpY0ZhY3Rvcmllcyk7XG5cbiAgICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgc3RhdGVBbmRTbGljZVsxXS5hY3Rpb25EaXNwYXRjaGVyLl9zeW5jQ29tcG9uZW50UHJvcHMocHJvcHMpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgICB9LCBPYmplY3QudmFsdWVzKHByb3BzKSk7XG5cbiAgICByZXR1cm4gc3RhdGVBbmRTbGljZTtcbn1cbi8qKlxuICogRm9yIHBlcmZvcm1hbmNlIHJlYXNvbiwgYmV0dGVyIGRlZmluZSBvcHRzLnJlZHVjZXJzIG91dHNpZGUgb2YgY29tcG9uZW50IHJlbmRlcmluZyBmdW5jdGlvblxuICogQHBhcmFtIG9wdHMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVRpbnlSZWR1eFRvb2tpdDxTIGV4dGVuZHMge2Vycm9yPzogRXJyb3J9LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gU2xpY2VPcHRpb25zPFMsIFI+LCAuLi5lcGljRmFjdG9yaWVzOiBBcnJheTxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+XG4pOiBbc3RhdGU6IFMsIHNsaWNlOiBTbGljZTxTLCBSPl0ge1xuXG4gIC8vIFRvIGF2b2lkIGEgbXV0YXRhYmxlIHZlcnNpb24gaXMgcGFzc2VkIGluXG4gIC8vIGNvbnN0IGNsb25lZFN0YXRlID0gY2xvbmUob3B0cy5pbml0aWFsU3RhdGUpO1xuICBjb25zdCB3aWxsVW5tb3VudFN1YiA9IFJlYWN0LnVzZU1lbW8oKCkgPT4gbmV3IHJ4LlJlcGxheVN1YmplY3Q8dm9pZD4oMSksIFtdKTtcbiAgY29uc3Qgc2xpY2VPcHRpb25zID0gUmVhY3QudXNlTWVtbyhvcHRzRmFjdG9yeSwgW29wdHNGYWN0b3J5XSk7XG4gIGNvbnN0IGVwaWMkcyA9IFJlYWN0LnVzZU1lbW88cnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5bXT4oKCkgPT4ge1xuICAgIHJldHVybiBlcGljRmFjdG9yaWVzLm1hcCgoKSA9PiBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4obnVsbCkpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICBjb25zdCBbc3RhdGUsIHNldFN0YXRlXSA9IFJlYWN0LnVzZVN0YXRlPFM+KHNsaWNlT3B0aW9ucy5pbml0aWFsU3RhdGUpO1xuICAvLyBjb25zdCBbc2xpY2UsIHNldFNsaWNlXSA9IFJlYWN0LnVzZVN0YXRlPFNsaWNlPFMsIFI+PigpO1xuICBjb25zdCBzbGljZSA9IFJlYWN0LnVzZU1lbW88U2xpY2U8UywgUj4+KCgpID0+IHtcbiAgICBjb25zdCBzbGljZSA9IGNyZWF0ZVNsaWNlKHNsaWNlT3B0aW9ucyk7XG4gICAgc2xpY2Uuc3RhdGUkLnBpcGUoXG4gICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gb3Aub2JzZXJ2ZU9uKHJ4LmFuaW1hdGlvbkZyYW1lU2NoZWR1bGVyKSwgLy8gVG8gYXZvaWQgY2hhbmdlcyBiZWluZyBiYXRjaGVkIGJ5IFJlYWN0IHNldFN0YXRlKClcbiAgICAgIG9wLnRhcChjaGFuZ2VkID0+IHNldFN0YXRlKGNoYW5nZWQpKSxcbiAgICAgIG9wLnRha2VVbnRpbCh3aWxsVW5tb3VudFN1YilcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgLy8gSW1wb3J0YW50ISFcbiAgICAvLyBFcGljIG1pZ2h0IGNvbnRhaW4gcmVjdXJpdmUgc3RhdGUgY2hhbmdpbmcgbG9naWMsIGxpa2Ugc3Vic2NyaWJpbmcgb24gc3RhdGUkIHN0cmVhbSBhbmQgXG4gICAgLy8gY2hhbmdlIHN0YXRlLCBpdCB0dXJucyBvdXQgYW55IHN1YnNjcmliZXIgdGhhdCBzdWJzY3JpYmUgc3RhdGUkIGxhdGVyIHRoYW5cbiAgICAvLyBlcGljIHdpbGwgZ2V0IGEgc3RhdGUgY2hhbmdlIGV2ZW50IGluIHJldmVyc2VkIG9yZGVyICEhIFNvIGVwaWMgbXVzdCBiZSB0aGUgbGFzdCBvbmUgdG9cbiAgICAvLyBzdWJzY3JpYmUgc3RhdGUkIHN0cmVhbVxuICAgIGZvciAoY29uc3QgZXBpY0ZhYyQgb2YgZXBpYyRzKSB7XG4gICAgICBzbGljZS5hZGRFcGljJChlcGljRmFjJCk7XG4gICAgfVxuICAgIC8vIExldCdzIGZ1biBlcGljIGZhY3RvcnkgYXMgZWFybGllciBhcyBwb3NzaWJsZSwgc28gdGhhdCBpdCB3aWxsIG5vdCBtaXNzaW5nXG4gICAgLy8gYW55IGFjdGlvbiBkaXNwYXRjaGVkIGZyb20gY2hpbGQgY29tcG9uZW50LCBzaW5jZSBjaGlsZCBjb21wb25lbnQncyB1c2VFZmZlY3QoKVxuICAgIC8vIHJ1bnMgZWFybGllciB0aGFuIHBhcmVudCBjb21wb25lbnQnc1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gICAgcmV0dXJuIHNsaWNlO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtdKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gIH0sIFtlcGljJHMsIGVwaWNGYWN0b3JpZXNdKTtcblxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIC8vIGNvbnN0IHN1YiA9IHNsaWNlLnN0YXRlJC5waXBlKFxuICAgIC8vICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgIC8vIEltcG9ydGFudCEhISBiZWNhdXNlIHRoaXMgc3RyZWFtIGlzIHN1YnNjcmliZWQgbGF0ZXIgdGhhbiBFcGljLFxuICAgIC8vICAgLy8gXCJjaGFuZ2VkXCIgdmFsdWUgbWlnaHRcbiAgICAvLyAgIC8vIGNvbWUgaW4gcmV2ZXJzZWQgb3JkZXIgaW4gY2FzZSBvZiByZWN1cnNpdmUgc3RhdGUgY2hhbmdpbmcgaW4gXCJFcGljXCIsXG4gICAgLy8gICAvLyBzbyBhbHdheXMgdXNlIGdldFZhbHVlKCkgdG8gZ2V0IGxhdGVzdCBzdGF0ZVxuICAgIC8vICAgb3AudGFwKCgpID0+IHNldFN0YXRlKHNsaWNlLnN0YXRlJC5nZXRWYWx1ZSgpKSlcbiAgICAvLyApLnN1YnNjcmliZSgpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5uZXh0KCk7XG4gICAgICB3aWxsVW5tb3VudFN1Yi5jb21wbGV0ZSgpO1xuICAgICAgLy8gc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgICBzbGljZS5kZXN0cm95KCk7XG4gICAgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG4gIHJldHVybiBbc3RhdGUsIHNsaWNlXTtcbn1cbiJdfQ==