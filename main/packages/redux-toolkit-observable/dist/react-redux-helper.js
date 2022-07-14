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
//# sourceMappingURL=react-redux-helper.js.map