"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const tiny_redux_toolkit_1 = require("./tiny-redux-toolkit");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlueS1yZWR1eC10b29sa2l0LWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90aW55LXJlZHV4LXRvb2xraXQtaG9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUEwQjtBQUMxQixtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLDZEQUE2RztBQUM3Ryx1REFBcUM7QUFZckMsU0FBUyxnQkFBZ0IsQ0FBb0UsWUFBZTtJQUUxRyxNQUFNLFFBQVEsbUJBQ1osbUJBQW1CLENBQUMsQ0FBSSxFQUFFLE9BQWM7WUFDdEMsQ0FBQyxDQUFDLGNBQWMscUJBQU8sT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELFlBQVksQ0FBQyxDQUFJLElBQUcsQ0FBQyxJQUNsQixZQUFZLENBQ2hCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBS0Q7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFnQixVQUFVLENBQ3RCLFdBQXFDLEVBQUUsS0FBWSxFQUFFLEdBQUcsYUFBc0U7SUFHOUgsTUFBTSxpQkFBaUIsR0FBRyxlQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtRQUMvQyxNQUFNLElBQUksR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUUzQix1Q0FDSyxJQUFJLEtBQ1AsUUFBUSxFQUFFLGdCQUFnQixDQUFpQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQ3pFO1FBQ0osdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLGVBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFO1FBQ3hCLGFBQWEsQ0FBQyxDQUFDLENBQThDLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDakcsdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFD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RCxvREFBb0Q7UUFDcEQsaUJBQWlCO1FBQ2pCLE9BQU8sR0FBRyxFQUFFO1lBQ1YsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixxQkFBcUI7WUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQztRQUNKLHVEQUF1RDtJQUN2RCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUCxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUE5REQsZ0RBOERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgUmVkdWNlcnMsIFNsaWNlLCBTbGljZU9wdGlvbnMsIEVwaWNGYWN0b3J5LCBPZlR5cGVGbiwgRXBpY30gZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuZXhwb3J0ICogZnJvbSAnLi90aW55LXJlZHV4LXRvb2xraXQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4ge1xuICBjb21wb25lbnRQcm9wcz86IFByb3BzO1xuICBlcnJvcj86IEVycm9yO1xufVxuXG50eXBlIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPj4gPSB7XG4gIF9zeW5jQ29tcG9uZW50UHJvcHMoczogUywgcGF5bG9hZDogUHJvcHMpOiB2b2lkO1xuICBfd2lsbFVubW91bnQoczogUyk6IHZvaWQ7XG59O1xuXG5mdW5jdGlvbiB3aXRoQmFzZVJlZHVjZXJzPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihvcmlnUmVkdWNlcnM6IFIpOlxuQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+ICYgUiB7XG4gIGNvbnN0IHJlZHVjZXJzID0ge1xuICAgIF9zeW5jQ29tcG9uZW50UHJvcHMoczogUywgcGF5bG9hZDogUHJvcHMpIHtcbiAgICAgIHMuY29tcG9uZW50UHJvcHMgPSB7Li4ucGF5bG9hZH07XG4gICAgfSxcbiAgICBfd2lsbFVubW91bnQoczogUykge30sXG4gICAgLi4ub3JpZ1JlZHVjZXJzXG4gIH07XG4gIHJldHVybiByZWR1Y2Vycztcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk0Q29tcDxQcm9wcywgUyBleHRlbmRzIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4sIFIgZXh0ZW5kcyBSZWR1Y2VyczxTPj4gPVxuICAoc2xpY2U6IFNsaWNlPFMsIFIgJiBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+LCBvZlR5cGU6IE9mVHlwZUZuPFMsIFIgJiBDb21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4+KSA9PiBFcGljPFM+IHwgdm9pZDtcblxuLyoqXG4gKiBVbmxpa2UgdXNlVGlueVJlZHV4VG9va2l0LCB1c2VUaW55UnRrKCkgYWNjZXB0cyBhIFN0YXRlIHdoaWNoIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlLCBcbiAqICB1c2VUaW55UnRrKCkgd2lsbCBhdXRvbWF0aWNhbGx5IGNyZWF0ZSBhbiBleHRyYSByZWR1Y2VyIFwiX3N5bmNDb21wb25lbnRQcm9wc1wiIGZvciBzaGFsbG93IGNvcGluZ1xuICogUmVhY3QgY29tcG9uZW50J3MgcHJvcGVydGllcyB0byB0aGlzIGludGVybmFsIFJUSyBzdG9yZVxuICogQHBhcmFtIG9wdHNGYWN0b3J5IFxuICogQHBhcmFtIHByb3BzIFxuICogQHBhcmFtIGVwaWNGYWN0b3JpZXMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVRpbnlSdGs8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgUmVkdWNlcnM8Uz4+KFxuICAgIG9wdHNGYWN0b3J5OiAoKSA9PiBTbGljZU9wdGlvbnM8UywgUj4sIHByb3BzOiBQcm9wcywgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk0Q29tcDxQcm9wcywgUywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPlxuICApOiBbc3RhdGU6IFMsIHNsaWNlOiBTbGljZTxTLCBSICYgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+Pl0ge1xuXG4gICAgY29uc3QgZXh0ZW5kT3B0c0ZhY3RvcnkgPSBSZWFjdC51c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgICBjb25zdCBvcHRzID0gb3B0c0ZhY3RvcnkoKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4ub3B0cyxcbiAgICAgICAgcmVkdWNlcnM6IHdpdGhCYXNlUmVkdWNlcnM8UHJvcHMsIFMsIHR5cGVvZiBvcHRzLnJlZHVjZXJzPihvcHRzLnJlZHVjZXJzKVxuICAgICAgfTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gICAgfSwgW10pO1xuXG4gICAgUmVhY3QudXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICAgIChzdGF0ZUFuZFNsaWNlWzFdIGFzIFNsaWNlPFMsIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4pLmFjdGlvbkRpc3BhdGNoZXIuX3dpbGxVbm1vdW50KCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICAgIH0sIFtdKTtcblxuICAgIGNvbnN0IHN0YXRlQW5kU2xpY2UgPSB1c2VUaW55UmVkdXhUb29raXQoZXh0ZW5kT3B0c0ZhY3RvcnksIC4uLmVwaWNGYWN0b3JpZXMpO1xuXG4gICAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICAgIHN0YXRlQW5kU2xpY2VbMV0uYWN0aW9uRGlzcGF0Y2hlci5fc3luY0NvbXBvbmVudFByb3BzKHByb3BzKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gICAgfSwgT2JqZWN0LnZhbHVlcyhwcm9wcykpO1xuXG4gICAgcmV0dXJuIHN0YXRlQW5kU2xpY2U7XG59XG4vKipcbiAqIEZvciBwZXJmb3JtYW5jZSByZWFzb24sIGJldHRlciBkZWZpbmUgb3B0cy5yZWR1Y2VycyBvdXRzaWRlIG9mIGNvbXBvbmVudCByZW5kZXJpbmcgZnVuY3Rpb25cbiAqIEBwYXJhbSBvcHRzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VUaW55UmVkdXhUb29raXQ8UyBleHRlbmRzIHtlcnJvcj86IEVycm9yfSwgUiBleHRlbmRzIFJlZHVjZXJzPFM+PihcbiAgb3B0c0ZhY3Rvcnk6ICgpID0+IFNsaWNlT3B0aW9uczxTLCBSPiwgLi4uZXBpY0ZhY3RvcmllczogQXJyYXk8RXBpY0ZhY3Rvcnk8UywgUj4gfCBudWxsIHwgdW5kZWZpbmVkPlxuKTogW3N0YXRlOiBTLCBzbGljZTogU2xpY2U8UywgUj5dIHtcblxuICAvLyBUbyBhdm9pZCBhIG11dGF0YWJsZSB2ZXJzaW9uIGlzIHBhc3NlZCBpblxuICAvLyBjb25zdCBjbG9uZWRTdGF0ZSA9IGNsb25lKG9wdHMuaW5pdGlhbFN0YXRlKTtcbiAgY29uc3Qgd2lsbFVubW91bnRTdWIgPSBSZWFjdC51c2VNZW1vKCgpID0+IG5ldyByeC5SZXBsYXlTdWJqZWN0PHZvaWQ+KDEpLCBbXSk7XG4gIGNvbnN0IHNsaWNlT3B0aW9ucyA9IFJlYWN0LnVzZU1lbW8ob3B0c0ZhY3RvcnksIFtvcHRzRmFjdG9yeV0pO1xuICBjb25zdCBlcGljJHMgPSBSZWFjdC51c2VNZW1vPHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+W10+KCgpID0+IHtcbiAgICByZXR1cm4gZXBpY0ZhY3Rvcmllcy5tYXAoKCkgPT4gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxFcGljRmFjdG9yeTxTLCBSPiB8IG51bGwgfCB1bmRlZmluZWQ+KG51bGwpKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSBSZWFjdC51c2VTdGF0ZTxTPihzbGljZU9wdGlvbnMuaW5pdGlhbFN0YXRlKTtcbiAgLy8gY29uc3QgW3NsaWNlLCBzZXRTbGljZV0gPSBSZWFjdC51c2VTdGF0ZTxTbGljZTxTLCBSPj4oKTtcbiAgY29uc3Qgc2xpY2UgPSBSZWFjdC51c2VNZW1vPFNsaWNlPFMsIFI+PigoKSA9PiB7XG4gICAgY29uc3Qgc2xpY2UgPSBjcmVhdGVTbGljZShzbGljZU9wdGlvbnMpO1xuICAgIHNsaWNlLnN0YXRlJC5waXBlKFxuICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIG9wLm9ic2VydmVPbihyeC5hbmltYXRpb25GcmFtZVNjaGVkdWxlciksIC8vIFRvIGF2b2lkIGNoYW5nZXMgYmVpbmcgYmF0Y2hlZCBieSBSZWFjdCBzZXRTdGF0ZSgpXG4gICAgICBvcC50YXAoY2hhbmdlZCA9PiBzZXRTdGF0ZShjaGFuZ2VkKSksXG4gICAgICBvcC50YWtlVW50aWwod2lsbFVubW91bnRTdWIpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIC8vIEltcG9ydGFudCEhXG4gICAgLy8gRXBpYyBtaWdodCBjb250YWluIHJlY3VyaXZlIHN0YXRlIGNoYW5naW5nIGxvZ2ljLCBsaWtlIHN1YnNjcmliaW5nIG9uIHN0YXRlJCBzdHJlYW0gYW5kIFxuICAgIC8vIGNoYW5nZSBzdGF0ZSwgaXQgdHVybnMgb3V0IGFueSBzdWJzY3JpYmVyIHRoYXQgc3Vic2NyaWJlIHN0YXRlJCBsYXRlciB0aGFuXG4gICAgLy8gZXBpYyB3aWxsIGdldCBhIHN0YXRlIGNoYW5nZSBldmVudCBpbiByZXZlcnNlZCBvcmRlciAhISBTbyBlcGljIG11c3QgYmUgdGhlIGxhc3Qgb25lIHRvXG4gICAgLy8gc3Vic2NyaWJlIHN0YXRlJCBzdHJlYW1cbiAgICBmb3IgKGNvbnN0IGVwaWNGYWMkIG9mIGVwaWMkcykge1xuICAgICAgc2xpY2UuYWRkRXBpYyQoZXBpY0ZhYyQpO1xuICAgIH1cbiAgICAvLyBMZXQncyBmdW4gZXBpYyBmYWN0b3J5IGFzIGVhcmxpZXIgYXMgcG9zc2libGUsIHNvIHRoYXQgaXQgd2lsbCBub3QgbWlzc2luZ1xuICAgIC8vIGFueSBhY3Rpb24gZGlzcGF0Y2hlZCBmcm9tIGNoaWxkIGNvbXBvbmVudCwgc2luY2UgY2hpbGQgY29tcG9uZW50J3MgdXNlRWZmZWN0KClcbiAgICAvLyBydW5zIGVhcmxpZXIgdGhhbiBwYXJlbnQgY29tcG9uZW50J3NcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICAgIHJldHVybiBzbGljZTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICB9LCBbZXBpYyRzLCBlcGljRmFjdG9yaWVzXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICAvLyBjb25zdCBzdWIgPSBzbGljZS5zdGF0ZSQucGlwZShcbiAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICAvLyBJbXBvcnRhbnQhISEgYmVjYXVzZSB0aGlzIHN0cmVhbSBpcyBzdWJzY3JpYmVkIGxhdGVyIHRoYW4gRXBpYyxcbiAgICAvLyAgIC8vIFwiY2hhbmdlZFwiIHZhbHVlIG1pZ2h0XG4gICAgLy8gICAvLyBjb21lIGluIHJldmVyc2VkIG9yZGVyIGluIGNhc2Ugb2YgcmVjdXJzaXZlIHN0YXRlIGNoYW5naW5nIGluIFwiRXBpY1wiLFxuICAgIC8vICAgLy8gc28gYWx3YXlzIHVzZSBnZXRWYWx1ZSgpIHRvIGdldCBsYXRlc3Qgc3RhdGVcbiAgICAvLyAgIG9wLnRhcCgoKSA9PiBzZXRTdGF0ZShzbGljZS5zdGF0ZSQuZ2V0VmFsdWUoKSkpXG4gICAgLy8gKS5zdWJzY3JpYmUoKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2lsbFVubW91bnRTdWIubmV4dCgpO1xuICAgICAgd2lsbFVubW91bnRTdWIuY29tcGxldGUoKTtcbiAgICAgIC8vIHN1Yi51bnN1YnNjcmliZSgpO1xuICAgICAgc2xpY2UuZGVzdHJveSgpO1xuICAgIH07XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuICByZXR1cm4gW3N0YXRlLCBzbGljZV07XG59XG4iXX0=