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
exports.useStoreOfStateFactory = exports.useRtk = exports.useReduxTookit = exports.useReduxTookitWith = exports.ReduxProvider = exports.connect = exports.ofPayloadAction = void 0;
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const react_1 = __importDefault(require("react"));
const state_factory_browser_1 = require("./state-factory-browser");
const helper_1 = require("./helper");
const react_2 = require("react");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
var react_redux_1 = require("react-redux");
Object.defineProperty(exports, "connect", { enumerable: true, get: function () { return react_redux_1.connect; } });
Object.defineProperty(exports, "ReduxProvider", { enumerable: true, get: function () { return react_redux_1.Provider; } });
__exportStar(require("./helper"), exports);
let COMPONENT_ID = 0;
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
function useReduxTookitWith(stateFactory, optsFactory, ...epicFactories) {
    const willUnmountSub = react_1.default.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = react_1.default.useMemo(optsFactory, [optsFactory]);
    const epic$s = react_1.default.useMemo(() => {
        return epicFactories.map(() => new rx.BehaviorSubject(null));
    }, [epicFactories]);
    const [state, setState] = react_1.default.useState(sliceOptions.initialState);
    const helper = react_1.default.useMemo(() => {
        const helper = (0, helper_1.createSliceHelper)(stateFactory, Object.assign(Object.assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), 
        // op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (const epicFac$ of epic$s) {
            helper.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
        return helper;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    react_1.default.useEffect(() => {
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, epicFactories);
    react_1.default.useEffect(() => {
        return () => {
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
function useReduxTookit(optsFactory, ...epicFactories) {
    return useReduxTookitWith(state_factory_browser_1.stateFactory, optsFactory, ...epicFactories);
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
function useRtk(optsFactory, props, ...epicFactories) {
    const extendOptsFactory = react_1.default.useCallback(() => {
        const opts = optsFactory();
        return Object.assign(Object.assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    (0, react_2.useEffect)(() => {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    (0, react_2.useEffect)(() => {
        return () => { stateAndSlice[1].actionDispatcher._willUnmount(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stateAndSlice = useReduxTookitWith(state_factory_browser_1.stateFactory, extendOptsFactory, ...epicFactories);
    return stateAndSlice;
}
exports.useRtk = useRtk;
function withBaseReducers(origReducers) {
    const reducers = Object.assign({ _syncComponentProps(s, { payload }) {
            s.componentProps = Object.assign({}, payload);
        },
        _willUnmount(s) { } }, origReducers);
    return reducers;
}
function useStoreOfStateFactory(stateFactory) {
    const [reduxStore, setReduxStore] = (0, react_2.useState)(undefined);
    (0, react_2.useEffect)(() => {
        stateFactory.store$.subscribe({
            next(store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.store$]);
    return reduxStore;
}
exports.useStoreOfStateFactory = useStoreOfStateFactory;
const demoState = {};
const simpleDemoReducers = {
    hellow(s, payload) { },
    world(s) { }
};
const demoReducers = (0, helper_1.createReducers)(simpleDemoReducers);
const demoSlice = (0, helper_1.createSliceHelper)(state_factory_browser_1.stateFactory, {
    name: '_internal_',
    initialState: demoState,
    reducers: withBaseReducers(demoReducers)
});
demoSlice.addEpic(slice => {
    return action$ => {
        slice.actionDispatcher._willUnmount();
        const actionStreams = (0, helper_1.castByActionType)(slice.actions, action$);
        return rx.merge(actionStreams.hellow, actionStreams._syncComponentProps, action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions.world), op.map(action => action)), action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(slice.actions.hellow), op.map(action => action)));
    };
});
(0, helper_1.action$OfSlice)(demoSlice, 'hellow').pipe(op.tap(action => console.log(action)));
(0, helper_1.action$OfSlice)(demoSlice, 'world').pipe(op.tap(action => console.log(action)));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EseUVBQ29DO0FBUzVCLGdHQVZpQywwQ0FBZSxPQVVqQztBQVJ2QixrREFBMEI7QUFDMUIsbUVBQXFEO0FBQ3JELHFDQUF1SDtBQUV2SCxpQ0FBMEM7QUFFMUMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUVyQywyQ0FBK0Q7QUFBdkQsc0dBQUEsT0FBTyxPQUFBO0FBQUUsNEdBQUEsUUFBUSxPQUFpQjtBQUMxQywyQ0FBeUI7QUFFekIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCOzs7O0dBSUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBb0MsWUFBMEIsRUFDOUYsV0FBMkMsRUFBRSxHQUFHLGFBQTBEO0lBRTFHLE1BQU0sY0FBYyxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLE1BQU0sWUFBWSxHQUFHLGVBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUMvRCxNQUFNLE1BQU0sR0FBRyxlQUFLLENBQUMsT0FBTyxDQUE2RCxHQUFHLEVBQUU7UUFDNUYsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBdUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRXBCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsZUFBSyxDQUFDLFFBQVEsQ0FBSSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFdkUsTUFBTSxNQUFNLEdBQUcsZUFBSyxDQUFDLE9BQU8sQ0FBb0IsR0FBRyxFQUFFO1FBQ25ELE1BQU0sTUFBTSxHQUFHLElBQUEsMEJBQWlCLEVBQUMsWUFBWSxrQ0FBTSxZQUFZLEtBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLFlBQVksRUFBRSxJQUFFLENBQUM7UUFDbEgsWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQ2xDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRTtRQUN6QixrR0FBa0c7UUFDbEcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUNwQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUM3QixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsY0FBYztRQUNkLDJGQUEyRjtRQUMzRiw2RUFBNkU7UUFDN0UsMEZBQTBGO1FBQzFGLDBCQUEwQjtRQUMxQixLQUFLLE1BQU0sUUFBUSxJQUFJLE1BQU0sRUFBRTtZQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsNkVBQTZFO1FBQzdFLGtGQUFrRjtRQUNsRix1Q0FBdUM7UUFDdkMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRCxPQUFPLE1BQU0sQ0FBQztRQUNoQix1REFBdUQ7SUFDdkQsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRVAsZUFBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDbkIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3RCx1REFBdUQ7SUFDdkQsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRWxCLGVBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ25CLE9BQU8sR0FBRyxFQUFFO1lBQ1YsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDO1FBQ0osdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDekIsQ0FBQztBQW5ERCxnREFtREM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsY0FBYyxDQUM1QixXQUEyQyxFQUMzQyxHQUFHLGFBQTBEO0lBRTdELE9BQU8sa0JBQWtCLENBQUMsb0NBQVksRUFBRSxXQUFXLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBTEQsd0NBS0M7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLE1BQU0sQ0FDcEIsV0FBMkMsRUFDM0MsS0FBWSxFQUNaLEdBQUcsYUFBc0U7SUFHekUsTUFBTSxpQkFBaUIsR0FBRyxlQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtRQUMvQyxNQUFNLElBQUksR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUUzQix1Q0FDSyxJQUFJLEtBQ1AsUUFBUSxFQUFFLGdCQUFnQixDQUFpQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQ3pFO1FBQ0osdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLElBQUEsaUJBQVMsRUFBQyxHQUFHLEVBQUU7UUFDWixhQUFhLENBQUMsQ0FBQyxDQUFvRCxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ILHVEQUF1RDtJQUN2RCxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRXpCLElBQUEsaUJBQVMsRUFBQyxHQUFHLEVBQUU7UUFDYixPQUFPLEdBQUcsRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQW9ELENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEgsdURBQXVEO0lBQ3ZELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLG9DQUFZLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUM1RixPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDO0FBNUJELHdCQTRCQztBQWVELFNBQVMsZ0JBQWdCLENBQTZFLFlBQWU7SUFFbkgsTUFBTSxRQUFRLG1CQUNaLG1CQUFtQixDQUFDLENBQUksRUFBRSxFQUFDLE9BQU8sRUFBdUI7WUFDdkQsQ0FBQyxDQUFDLGNBQWMscUJBQU8sT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELFlBQVksQ0FBQyxDQUFJLElBQUcsQ0FBQyxJQUNsQixZQUFZLENBQ2hCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBUUQsU0FBZ0Isc0JBQXNCLENBQUMsWUFBMEI7SUFDL0QsTUFBTSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsR0FBRyxJQUFBLGdCQUFRLEVBQTJDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xHLElBQUEsaUJBQVMsRUFBQyxHQUFHLEVBQUU7UUFDYixZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUM1QixJQUFJLENBQUMsS0FBSztnQkFDUixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUVMLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTFCLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFaRCx3REFZQztBQVNELE1BQU0sU0FBUyxHQUFjLEVBQUUsQ0FBQztBQUVoQyxNQUFNLGtCQUFrQixHQUFHO0lBQ3pCLE1BQU0sQ0FBQyxDQUFZLEVBQUUsT0FBdUIsSUFBRyxDQUFDO0lBQ2hELEtBQUssQ0FBQyxDQUFZLElBQUcsQ0FBQztDQUN2QixDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBQSx1QkFBYyxFQUF1QyxrQkFBa0IsQ0FBQyxDQUFDO0FBRTlGLE1BQU0sU0FBUyxHQUFHLElBQUEsMEJBQWlCLEVBQUMsb0NBQVksRUFBRTtJQUNoRCxJQUFJLEVBQUUsWUFBWTtJQUNsQixZQUFZLEVBQUUsU0FBUztJQUN2QixRQUFRLEVBQUUsZ0JBQWdCLENBQWdELFlBQVksQ0FBQztDQUN4RixDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ3hCLE9BQU8sT0FBTyxDQUFDLEVBQUU7UUFDZixLQUFLLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEMsTUFBTSxhQUFhLEdBQUcsSUFBQSx5QkFBZ0IsRUFBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9ELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FDYixhQUFhLENBQUMsTUFBTSxFQUNwQixhQUFhLENBQUMsbUJBQW1CLEVBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBQSwwQ0FBZSxFQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQy9DLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUEsMENBQWUsRUFBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUNoRCxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDNUIsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBQSx1QkFBYyxFQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQ3RDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3RDLENBQUM7QUFDRixJQUFBLHVCQUFjLEVBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FDckMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDdEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHN9IGZyb20gJ3JlYWN0LXJlZHV4JztcbmltcG9ydCB7U3RhdGVGYWN0b3J5LCBTbGljZUNhc2VSZWR1Y2Vycywgb2ZQYXlsb2FkQWN0aW9uLCBQYXlsb2FkQWN0aW9uXG59IGZyb20gJy4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi9zdGF0ZS1mYWN0b3J5LWJyb3dzZXInO1xuaW1wb3J0IHtjcmVhdGVTbGljZUhlbHBlciwgRXBpY0ZhY3RvcnksIFNsaWNlSGVscGVyLCBjYXN0QnlBY3Rpb25UeXBlLCBjcmVhdGVSZWR1Y2VycywgYWN0aW9uJE9mU2xpY2V9IGZyb20gJy4vaGVscGVyJztcbmltcG9ydCB7Q3JlYXRlU2xpY2VPcHRpb25zLCBEcmFmdH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3VzZUVmZmVjdCwgdXNlU3RhdGV9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEVwaWMgfSBmcm9tICdyZWR1eC1vYnNlcnZhYmxlJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuZXhwb3J0IHtjb25uZWN0LCBQcm92aWRlciBhcyBSZWR1eFByb3ZpZGVyfSBmcm9tICdyZWFjdC1yZWR1eCc7XG5leHBvcnQgKiBmcm9tICcuL2hlbHBlcic7XG5cbmxldCBDT01QT05FTlRfSUQgPSAwO1xuLyoqXG4gKiBVc2UgYSBkZWRpY2F0ZWQgUmVkdXggc2xpY2Ugc3RvcmUgZm9yIHNpbmdsZSBjb21wb25lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSBvcHRzRmFjdG9yeSBcbiAqIEBwYXJhbSBlcGljRmFjdG9yaWVzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUmVkdXhUb29raXRXaXRoPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnksXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4sIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiBbUywgU2xpY2VIZWxwZXI8UywgUj5dIHtcblxuICBjb25zdCB3aWxsVW5tb3VudFN1YiA9IFJlYWN0LnVzZU1lbW8oKCkgPT4gbmV3IHJ4LlJlcGxheVN1YmplY3Q8dm9pZD4oMSksIFtdKTtcbiAgY29uc3Qgc2xpY2VPcHRpb25zID0gUmVhY3QudXNlTWVtbyhvcHRzRmFjdG9yeSwgW29wdHNGYWN0b3J5XSk7XG4gIGNvbnN0IGVwaWMkcyA9IFJlYWN0LnVzZU1lbW88cnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD5bXT4oKCkgPT4ge1xuICAgIHJldHVybiBlcGljRmFjdG9yaWVzLm1hcCgoKSA9PiBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4obnVsbCkpO1xuICB9LCBbZXBpY0ZhY3Rvcmllc10pO1xuXG4gIGNvbnN0IFtzdGF0ZSwgc2V0U3RhdGVdID0gUmVhY3QudXNlU3RhdGU8Uz4oc2xpY2VPcHRpb25zLmluaXRpYWxTdGF0ZSk7XG5cbiAgY29uc3QgaGVscGVyID0gUmVhY3QudXNlTWVtbzxTbGljZUhlbHBlcjxTLCBSPj4oKCkgPT4ge1xuICAgIGNvbnN0IGhlbHBlciA9IGNyZWF0ZVNsaWNlSGVscGVyKHN0YXRlRmFjdG9yeSwgey4uLnNsaWNlT3B0aW9ucywgbmFtZTogc2xpY2VPcHRpb25zLm5hbWUgKyAnLicgKyBDT01QT05FTlRfSUQrK30pO1xuICAgIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGhlbHBlcikucGlwZShcbiAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAvLyBvcC5vYnNlcnZlT24ocnguYW5pbWF0aW9uRnJhbWVTY2hlZHVsZXIpLCAvLyBUbyBhdm9pZCBjaGFuZ2VzIGJlaW5nIGJhdGNoZWQgYnkgUmVhY3Qgc2V0U3RhdGUoKVxuICAgICAgb3AudGFwKGNoYW5nZWQgPT4gc2V0U3RhdGUoY2hhbmdlZCkpLFxuICAgICAgb3AudGFrZVVudGlsKHdpbGxVbm1vdW50U3ViKVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICAvLyBJbXBvcnRhbnQhIVxuICAgIC8vIEVwaWMgbWlnaHQgY29udGFpbiByZWN1cml2ZSBzdGF0ZSBjaGFuZ2luZyBsb2dpYywgbGlrZSBzdWJzY3JpYmluZyBvbiBzdGF0ZSQgc3RyZWFtIGFuZCBcbiAgICAvLyBjaGFuZ2Ugc3RhdGUsIGl0IHR1cm5zIG91dCBhbnkgc3Vic2NyaWJlciB0aGF0IHN1YnNjcmliZSBzdGF0ZSQgbGF0ZXIgdGhhblxuICAgIC8vIGVwaWMgd2lsbCBnZXQgYSBzdGF0ZSBjaGFuZ2UgZXZlbnQgaW4gcmV2ZXJzZWQgb3JkZXIgISEgU28gZXBpYyBtdXN0IGJlIHRoZSBsYXN0IG9uZSB0b1xuICAgIC8vIHN1YnNjcmliZSBzdGF0ZSQgc3RyZWFtXG4gICAgZm9yIChjb25zdCBlcGljRmFjJCBvZiBlcGljJHMpIHtcbiAgICAgIGhlbHBlci5hZGRFcGljJChlcGljRmFjJCk7XG4gICAgfVxuICAgIC8vIExldCdzIGZ1biBlcGljIGZhY3RvcnkgYXMgZWFybGllciBhcyBwb3NzaWJsZSwgc28gdGhhdCBpdCB3aWxsIG5vdCBtaXNzaW5nXG4gICAgLy8gYW55IGFjdGlvbiBkaXNwYXRjaGVkIGZyb20gY2hpbGQgY29tcG9uZW50LCBzaW5jZSBjaGlsZCBjb21wb25lbnQncyB1c2VFZmZlY3QoKVxuICAgIC8vIHJ1bnMgZWFybGllciB0aGFuIHBhcmVudCBjb21wb25lbnQnc1xuICAgIGVwaWNGYWN0b3JpZXMuZm9yRWFjaCgoZmFjLCBpZHgpID0+IGVwaWMkc1tpZHhdLm5leHQoZmFjKSk7XG4gICAgcmV0dXJuIGhlbHBlcjtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBbXSk7XG5cbiAgUmVhY3QudXNlRWZmZWN0KCgpID0+IHtcbiAgICBlcGljRmFjdG9yaWVzLmZvckVhY2goKGZhYywgaWR4KSA9PiBlcGljJHNbaWR4XS5uZXh0KGZhYykpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIGVwaWNGYWN0b3JpZXMpO1xuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbGxVbm1vdW50U3ViLm5leHQoKTtcbiAgICAgIHdpbGxVbm1vdW50U3ViLmNvbXBsZXRlKCk7XG4gICAgICBoZWxwZXIuZGVzdHJveSgpO1xuICAgIH07XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIHJldHVybiBbc3RhdGUsIGhlbHBlcl07XG59XG5cbi8qKlxuICogVXNlIGEgZGVkaWNhdGVkIFJlZHV4IHNsaWNlIHN0b3JlIGZvciBzaW5nbGUgY29tcG9uZW50IGluc3RhbmNlXG4gKiBAcGFyYW0gb3B0c0ZhY3RvcnkgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcmllcyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVJlZHV4VG9va2l0PFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4oXG4gIG9wdHNGYWN0b3J5OiAoKSA9PiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj4sXG4gIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5PFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOiBbUywgU2xpY2VIZWxwZXI8UywgUj5dIHtcblxuICByZXR1cm4gdXNlUmVkdXhUb29raXRXaXRoKHN0YXRlRmFjdG9yeSwgb3B0c0ZhY3RvcnksIC4uLmVwaWNGYWN0b3JpZXMpO1xufVxuXG4vKipcbiAqIFVzZSBhIGRlZGljYXRlZCBSZWR1eCBzbGljZSBzdG9yZSBmb3Igc2luZ2xlIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAqIFVubGlrZSB1c2VSZWR1eFRvb2tpdCwgdXNlUnRrKCkgYWNjZXB0cyBhIFN0YXRlIHdoaWNoIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlLCBcbiAqICB1c2VSdGsoKSB3aWxsIGF1dG9tYXRpY2FsbHkgY3JlYXRlIGFuIGV4dHJhIHJlZHVjZXIgXCJfc3luY0NvbXBvbmVudFByb3BzXCIgZm9yIHNoYWxsb3cgY29waW5nXG4gKiBSZWFjdCBjb21wb25lbnQncyBwcm9wZXJ0aWVzIHRvIHRoaXMgaW50ZXJuYWwgUlRLIHN0b3JlXG4gKiBAcGFyYW0gb3B0c0ZhY3RvcnkgXG4gKiBAcGFyYW0gZXBpY0ZhY3RvcmllcyBcbiAqIEByZXR1cm5zIFtzdGF0ZSwgc2xpY2VIZWxwZXJdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VSdGs8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KFxuICBvcHRzRmFjdG9yeTogKCkgPT4gQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+LFxuICBwcm9wczogUHJvcHMsXG4gIC4uLmVwaWNGYWN0b3JpZXM6IEFycmF5PEVwaWNGYWN0b3J5NENvbXA8UHJvcHMsIFMsIFI+IHwgbnVsbCB8IHVuZGVmaW5lZD4pOlxuICBbUywgU2xpY2VIZWxwZXI8UywgUiAmIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj5dIHtcblxuICBjb25zdCBleHRlbmRPcHRzRmFjdG9yeSA9IFJlYWN0LnVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBjb25zdCBvcHRzID0gb3B0c0ZhY3RvcnkoKTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi5vcHRzLFxuICAgICAgcmVkdWNlcnM6IHdpdGhCYXNlUmVkdWNlcnM8UHJvcHMsIFMsIHR5cGVvZiBvcHRzLnJlZHVjZXJzPihvcHRzLnJlZHVjZXJzKVxuICAgIH07XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgKHN0YXRlQW5kU2xpY2VbMV0gYXMgU2xpY2VIZWxwZXI8UywgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFM+PikuYWN0aW9uRGlzcGF0Y2hlci5fc3luY0NvbXBvbmVudFByb3BzKHByb3BzKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xuICB9LCBPYmplY3QudmFsdWVzKHByb3BzKSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICByZXR1cm4gKCkgPT4geyhzdGF0ZUFuZFNsaWNlWzFdIGFzIFNsaWNlSGVscGVyPFMsIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4pLmFjdGlvbkRpc3BhdGNoZXIuX3dpbGxVbm1vdW50KCk7IH07XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHN0YXRlQW5kU2xpY2UgPSB1c2VSZWR1eFRvb2tpdFdpdGgoc3RhdGVGYWN0b3J5LCBleHRlbmRPcHRzRmFjdG9yeSwgLi4uZXBpY0ZhY3Rvcmllcyk7XG4gIHJldHVybiBzdGF0ZUFuZFNsaWNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VDb21wb25lbnRTdGF0ZTxQcm9wcz4ge1xuICBjb21wb25lbnRQcm9wcz86IFByb3BzO1xufVxuXG5leHBvcnQgdHlwZSBFcGljRmFjdG9yeTRDb21wPFByb3BzLCBTIGV4dGVuZHMgQmFzZUNvbXBvbmVudFN0YXRlPFByb3BzPiwgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9XG4gIChzbGljZTogU2xpY2VIZWxwZXI8UywgUiAmIENvbXBQcm9wc1N5bmNSZWR1Y2VyPFByb3BzLCBTPj4pXG4gID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksIHtbU24gaW4gTmFtZV06IFN9PiB8IHZvaWQ7XG5cbnR5cGUgQ29tcFByb3BzU3luY1JlZHVjZXI8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+PiA9IHtcbiAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTIHwgRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxQcm9wcz4pOiB2b2lkO1xuICBfd2lsbFVubW91bnQoczogUyB8IERyYWZ0PFM+KTogdm9pZDtcbn07XG5cbmZ1bmN0aW9uIHdpdGhCYXNlUmVkdWNlcnM8UHJvcHMsIFMgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8UHJvcHM+LCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KG9yaWdSZWR1Y2VyczogUik6XG5Db21wUHJvcHNTeW5jUmVkdWNlcjxQcm9wcywgUz4gJiBSIHtcbiAgY29uc3QgcmVkdWNlcnMgPSB7XG4gICAgX3N5bmNDb21wb25lbnRQcm9wcyhzOiBTLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UHJvcHM+KSB7XG4gICAgICBzLmNvbXBvbmVudFByb3BzID0gey4uLnBheWxvYWR9O1xuICAgIH0sXG4gICAgX3dpbGxVbm1vdW50KHM6IFMpIHt9LFxuICAgIC4uLm9yaWdSZWR1Y2Vyc1xuICB9O1xuICByZXR1cm4gcmVkdWNlcnM7XG59XG5cbmV4cG9ydCB0eXBlIEluamVjdGVkQ29tcFByb3BzVHlwZTxDb25uZWN0SE9DPiA9XG4gIChDb25uZWN0SE9DIGV4dGVuZHMgSW5mZXJhYmxlQ29tcG9uZW50RW5oYW5jZXJXaXRoUHJvcHM8aW5mZXIgVEluamVjdGVkUHJvcHMsIGFueT4gPyBUSW5qZWN0ZWRQcm9wcyA6IHtbcDogc3RyaW5nXTogdW5rbm93bn0pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7W3A6IHN0cmluZ106IHVua25vd259KTtcblxuXG5leHBvcnQgZnVuY3Rpb24gdXNlU3RvcmVPZlN0YXRlRmFjdG9yeShzdGF0ZUZhY3Rvcnk6IFN0YXRlRmFjdG9yeSkge1xuICBjb25zdCBbcmVkdXhTdG9yZSwgc2V0UmVkdXhTdG9yZV0gPSB1c2VTdGF0ZTxSZXR1cm5UeXBlPFN0YXRlRmFjdG9yeVsnZ2V0Um9vdFN0b3JlJ10+Pih1bmRlZmluZWQpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQoc3RvcmUpIHtcbiAgICAgICAgc2V0UmVkdXhTdG9yZShzdG9yZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSwgW3N0YXRlRmFjdG9yeS5zdG9yZSRdKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cblxuaW50ZXJmYWNlIERlbW9Db21wUHJvcHMge1xuICBjbGFzc05hbWU6IHN0cmluZztcbn1cbmludGVyZmFjZSBEZW1vU3RhdGUgZXh0ZW5kcyBCYXNlQ29tcG9uZW50U3RhdGU8RGVtb0NvbXBQcm9wcz4ge1xuICBvaz86IGJvb2xlYW47XG59XG5cbmNvbnN0IGRlbW9TdGF0ZTogRGVtb1N0YXRlID0ge307XG5cbmNvbnN0IHNpbXBsZURlbW9SZWR1Y2VycyA9IHtcbiAgaGVsbG93KHM6IERlbW9TdGF0ZSwgcGF5bG9hZDoge2RhdGE6IHN0cmluZ30pIHt9LFxuICB3b3JsZChzOiBEZW1vU3RhdGUpIHt9XG59O1xuXG5jb25zdCBkZW1vUmVkdWNlcnMgPSBjcmVhdGVSZWR1Y2VyczxEZW1vU3RhdGUsIHR5cGVvZiBzaW1wbGVEZW1vUmVkdWNlcnM+KHNpbXBsZURlbW9SZWR1Y2Vycyk7XG5cbmNvbnN0IGRlbW9TbGljZSA9IGNyZWF0ZVNsaWNlSGVscGVyKHN0YXRlRmFjdG9yeSwge1xuICBuYW1lOiAnX2ludGVybmFsXycsXG4gIGluaXRpYWxTdGF0ZTogZGVtb1N0YXRlLFxuICByZWR1Y2Vyczogd2l0aEJhc2VSZWR1Y2VyczxEZW1vQ29tcFByb3BzLCBEZW1vU3RhdGUsIHR5cGVvZiBkZW1vUmVkdWNlcnM+KGRlbW9SZWR1Y2Vycylcbn0pO1xuXG5kZW1vU2xpY2UuYWRkRXBpYyhzbGljZSA9PiB7XG4gIHJldHVybiBhY3Rpb24kID0+IHtcbiAgICBzbGljZS5hY3Rpb25EaXNwYXRjaGVyLl93aWxsVW5tb3VudCgpO1xuICAgIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvblN0cmVhbXMuaGVsbG93LFxuICAgICAgYWN0aW9uU3RyZWFtcy5fc3luY0NvbXBvbmVudFByb3BzLFxuICAgICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmxkKSxcbiAgICAgICAgb3AubWFwKGFjdGlvbiA9PiBhY3Rpb24pKSxcbiAgICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5oZWxsb3cpLFxuICAgICAgICBvcC5tYXAoYWN0aW9uID0+IGFjdGlvbikpXG4gICAgKTtcbiAgfTtcbn0pO1xuXG5hY3Rpb24kT2ZTbGljZShkZW1vU2xpY2UsICdoZWxsb3cnKS5waXBlKFxuICBvcC50YXAoYWN0aW9uID0+IGNvbnNvbGUubG9nKGFjdGlvbikpXG4pO1xuYWN0aW9uJE9mU2xpY2UoZGVtb1NsaWNlLCAnd29ybGQnKS5waXBlKFxuICBvcC50YXAoYWN0aW9uID0+IGNvbnNvbGUubG9nKGFjdGlvbikpXG4pO1xuIl19