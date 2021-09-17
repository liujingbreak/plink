"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromPaylodReducer = exports.StateFactory = exports.ofPayloadAction = void 0;
/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// eslint-disable  max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
const toolkit_1 = require("@reduxjs/toolkit");
const redux_observable_1 = require("redux-observable");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function ofPayloadAction(...actionCreators) {
    return (0, redux_observable_1.ofType)(...actionCreators.map(c => c.type));
}
exports.ofPayloadAction = ofPayloadAction;
const defaultSliceReducers = {
    _change: (state, action) => {
        action.payload(state);
    }
};
class StateFactory {
    constructor(preloadedState) {
        this.preloadedState = preloadedState;
        this.store$ = new rxjs_1.BehaviorSubject(undefined);
        /**
         * same as store.dispatch(action), but this one goes through Redux-observable's epic middleware
         */
        this.actionsToDispatch = new rxjs_1.ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new rxjs_1.ReplaySubject(15);
        this.errorHandleMiddleware = (api) => {
            return (next) => {
                return (action) => {
                    try {
                        // console.log('action in errorHandleMiddleware', action.type);
                        this.debugLog.next(['action', action != null ? action.type : action]);
                        const ret = next(action);
                        return ret;
                    }
                    catch (err) {
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] failed action', action);
                        // tslint:disable-next-line no-console
                        console.error('[redux-toolkit-observable] action dispatch error', err);
                        this.reportActionError(err);
                        throw err;
                    }
                };
            };
        };
        this.realtimeState$ = new rxjs_1.BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new rxjs_1.ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe((0, operators_1.filter)(store => store != null), (0, operators_1.take)(1)).toPromise();
        const errorSlice = this.newSlice(errorSliceOpt);
        this.errorSlice = errorSlice;
        this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
    }
    // configureStore(middlewares?: Middleware[]): this;
    /**
     *
     * @param opt Be aware, turn off option "serializableCheck" and "immutableCheck" from Redux default middlewares
     */
    configureStore(opt) {
        if (this.store$.getValue())
            return this;
        const rootReducer = this.createRootReducer();
        const epicMiddleware = (0, redux_observable_1.createEpicMiddleware)();
        let cfgOpt = opt;
        const ourMiddlwares = [this.errorHandleMiddleware, epicMiddleware];
        if (cfgOpt) {
            cfgOpt.reducer = rootReducer;
            cfgOpt.devTools = false;
            if (cfgOpt.middleware) {
                const exitingMid = cfgOpt.middleware;
                if (typeof exitingMid === 'function') {
                    cfgOpt.middleware = (getDefault) => {
                        return [...exitingMid(getDefault), ...ourMiddlwares];
                    };
                }
                else {
                    cfgOpt.middleware = [...exitingMid, ...ourMiddlwares];
                }
            }
            else {
                cfgOpt.middleware = (getDefault) => {
                    return [...getDefault({ serializableCheck: false, immutableCheck: false }), ...ourMiddlwares];
                };
            }
        }
        else {
            cfgOpt = {
                reducer: rootReducer,
                middleware(getDefault) {
                    return [...getDefault({ serializableCheck: false, immutableCheck: false }), ...ourMiddlwares];
                },
                devTools: false
            };
        }
        const store = (0, toolkit_1.configureStore)(cfgOpt);
        this.store$.next(store);
        store.subscribe(() => {
            const state = store.getState();
            this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe((0, operators_1.distinctUntilChanged)(), 
        // tap(() => console.log('state changed')),
        (0, operators_1.tap)(state => this.debugLog.next(['state', state]))).subscribe();
        epicMiddleware.run((action$, state$, dependencies) => {
            return this.epicWithUnsub$.pipe((0, operators_1.tap)(([epic, epicId, unsub]) => {
                this.debugLog.next([`[redux-toolkit-obs] ${epicId} is about to be subscribed`]);
                // console.log(`[redux-toolkit-obs] ${epicId} is about to be subscribed`);
            }), (0, operators_1.mergeMap)(([epic, epicId, unsub]) => (epic(action$, state$, dependencies))
                .pipe(
            // tap(action => console.log('action: ', action.type)),
            (0, operators_1.takeUntil)(unsub.pipe((0, operators_1.take)(1), (0, operators_1.map)(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
                // console.log(`[redux-toolkit-obs] unsubscribe ${epicId}`);
            }))), (0, operators_1.catchError)((err, src) => {
                this.reportActionError(err);
                console.error(err);
                return src;
            }))), (0, operators_1.takeUntil)(action$.pipe((0, redux_observable_1.ofType)('STOP_EPIC'), (0, operators_1.tap)(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics'])))));
        });
        this.addEpic((action$) => {
            return this.actionsToDispatch;
        }, 'internalDispatcher');
        return this;
    }
    /**
     * Create our special slice with a default reducer action:
     * - `change(state: Draft<S>, action: PayloadAction<(draftState: Draft<SS>) => void>)`
     * - initialState is loaded from StateFactory's partial preloadedState
     */
    newSlice(opt) {
        const _opt = opt;
        const reducers = _opt.reducers;
        if (reducers._change == null)
            Object.assign(_opt.reducers, defaultSliceReducers);
        if (reducers._init == null) {
            reducers._init = (draft, action) => {
                this.debugLog.next(['[redux-toolkit-obs]', `slice "${opt.name}" is created ${action.payload.isLazy ? 'lazily' : ''}`]);
            };
        }
        if (this.preloadedState && this.preloadedState[opt.name]) {
            Object.assign(opt.initialState, this.preloadedState[opt.name]);
        }
        const slice = (0, toolkit_1.createSlice)(opt);
        this.addSliceMaybeReplaceReducer(slice);
        return slice;
    }
    removeSlice(slice) {
        delete this.reducerMap[slice.name];
        if (this.getRootStore()) {
            this.debugLog.next(['[redux-toolkit-obs]', 'remove slice ' + slice.name]);
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
        }
    }
    /**
     * @returns a function to unsubscribe from this epic
     * @param epic
     * @param epicName a name for debug and logging purpose
     */
    addEpic(epic, epicName) {
        const epicId = 'Epic-' + (epicName || ++this.epicSeq);
        const unsubscribeEpic = new rxjs_1.Subject();
        this.debugLog.next([`[redux-toolkit-obs] ${epicId} is added`]);
        this.epicWithUnsub$.next([epic, epicId, unsubscribeEpic]);
        return () => {
            unsubscribeEpic.next(epicId);
            unsubscribeEpic.complete();
        };
    }
    sliceState(slice) {
        const store = this.getRootStore();
        return store ? store.getState()[slice.name] : {};
    }
    sliceStore(slice) {
        return this.realtimeState$.pipe((0, operators_1.map)(s => s[slice.name]), (0, operators_1.filter)(ss => ss != null), (0, operators_1.distinctUntilChanged)());
    }
    getErrorState() {
        return this.sliceState(this.errorSlice);
    }
    getErrorStore() {
        return this.sliceStore(this.errorSlice);
    }
    dispatch(action) {
        // console.log('dispatch', action.type);
        this.actionsToDispatch.next(action);
    }
    /**
     * Unlink Redux's bindActionCreators, our store is lazily created, dispatch is not available at beginning.
     * Parameter is a Slice instead of action map
     */
    bindActionCreators(slice) {
        const actionMap = {};
        for (const [name, actionCreator] of Object.entries(slice.actions)) {
            const doAction = (...param) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const action = actionCreator(...param);
                this.dispatch(action);
                return action;
            };
            doAction.type = actionCreator.type;
            actionMap[name] = doAction;
        }
        return actionMap;
    }
    stopAllEpics() {
        this.store$.pipe((0, operators_1.tap)(store => {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), (0, operators_1.take)(1)).subscribe();
    }
    getRootStore() {
        return this.store$.getValue();
    }
    addSliceMaybeReplaceReducer(slice) {
        this.reducerMap[slice.name] = slice.reducer;
        if (this.getRootStore()) {
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
            this.dispatch(slice.actions._init({ isLazy: true }));
        }
        else {
            this.dispatch(slice.actions._init({ isLazy: false }));
        }
        return slice;
    }
    createRootReducer() {
        const combined = (0, toolkit_1.combineReducers)(this.reducerMap);
        const rootReducer = (state, action) => {
            if (action.type === '::syncState') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
                return action.payload(state);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return combined(state, action);
            }
        };
        return rootReducer;
    }
}
exports.StateFactory = StateFactory;
/**
 * Simplify reducers structure required in Slice creation option.
 *
 * Normally, to create a slice, you need to provide a slice option paramter like:
 * {name: <name>, initialState: <value>, reducers: {
 *  caseReducer(state, {payload}: PayloadAction<PayloadType>) {
 *    // manipulate state draft with destructored payload data
 *  }
 * }}
 *
 * Unconvenient thing is the "PayloadAction<PayloadType>" part which specified as second parameter in every case reducer definition,
 * actually we only care about the Payload type instead of the whole PayloadAction in case reducer.
 *
 * this function accept a simplified version of "case reducer" in form of:
 * {
 *    [caseName]: (Draft<State>, payload: any) => Draft<State> | void;
 * }
 *
 * return a regular Case reducers, not longer needs to "destructor" action paramter to get payload data.
 *
 * @param payloadReducers
 * @returns
 */
function fromPaylodReducer(payloadReducers) {
    const reducers = {};
    for (const [caseName, simpleReducer] of Object.entries(payloadReducers)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reducers[caseName] = function (s, action) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return simpleReducer(s, action.payload);
        };
    }
    return reducers;
}
exports.fromPaylodReducer = fromPaylodReducer;
const errorSliceOpt = {
    initialState: {},
    name: 'error',
    reducers: {
        reportActionError(s, { payload }) {
            s.actionError = payload;
        }
    }
};
if (module.hot) {
    module.hot.decline();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsOENBTTBCO0FBQzFCLHVEQUFzRTtBQUN0RSwrQkFBNkY7QUFDN0YsOENBQThHO0FBbUI5RyxTQUFnQixlQUFlLENBQXNCLEdBQUcsY0FBZ0Q7SUFFdEcsT0FBTyxJQUFBLHlCQUFNLEVBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUErQyxDQUFDO0FBQ2xHLENBQUM7QUFIRCwwQ0FHQztBQU1ELE1BQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBZUYsTUFBYSxZQUFZO0lBd0J2QixZQUFvQixjQUF1RDtRQUF2RCxtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFqQjNFLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSTVGOztXQUVHO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxvQkFBYSxDQUFxQixFQUFFLENBQUMsQ0FBQztRQUd0RCxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUNqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBZ1B4QywwQkFBcUIsR0FBZSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDZCxPQUFPLENBQUMsTUFBcUIsRUFBRSxFQUFFO29CQUMvQixJQUFJ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QWdCO0lBQzlCLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBUSxFQUFFO1FBQ1IsaUJBQWlCLENBQUMsQ0FBYSxFQUFFLEVBQUMsT0FBTyxFQUF1QjtZQUM5RCxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gZXNsaW50LWRpc2FibGUgIG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsIFBheWxvYWRBY3Rpb25DcmVhdG9yLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlLCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWRcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VVbnRpbCwgdGFwLCBjYXRjaEVycm9yfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB7UGF5bG9hZEFjdGlvbiwgU2xpY2VDYXNlUmVkdWNlcnMsIFNsaWNlfTtcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+IHtcbiAgX2luaXQ6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPHtpc0xhenk6IGJvb2xlYW59Pj47XG4gIF9jaGFuZ2U6IENhc2VSZWR1Y2VyPFNTLCBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+Pjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTUyxcbiAgQUNSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8U1M+PiA9IFZhbGlkYXRlU2xpY2VDYXNlUmVkdWNlcnM8U1MsIEFDUj4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U1M+O1xuXG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBUMSBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQMSBleHRlbmRzIHVuZGVmaW5lZCA/IHt0eXBlOiBUMX0gOiBQYXlsb2FkQWN0aW9uPFAxLCBUMT4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgUDIsIFQxIGV4dGVuZHMgc3RyaW5nLCBUMiBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPiwgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAxIHwgUDIsIFQxIHwgVDI+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFAyLCBQMywgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nLCBUMyBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPixcbiAgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPiwgYWN0aW9uQ3JlYXRvcnMzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDMsIFQzPik6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAxIHwgUDIgfCBQMywgVDEgfCBUMiB8IFQzPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAsIFQgZXh0ZW5kcyBzdHJpbmc+KC4uLmFjdGlvbkNyZWF0b3JzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UCwgVD5bXSk6XG4gIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAsIFQ+PiB7XG4gIHJldHVybiBvZlR5cGUoLi4uYWN0aW9uQ3JlYXRvcnMubWFwKGMgPT4gYy50eXBlKSkgYXMgT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UCwgVD4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yU3RhdGUge1xuICBhY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5jb25zdCBkZWZhdWx0U2xpY2VSZWR1Y2VyczogUGFydGlhbDxFeHRyYVNsaWNlUmVkdWNlcnM8YW55Pj4gPSB7XG4gIF9jaGFuZ2U6IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICB9XG59O1xuXG50eXBlIEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPSBNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8aW5mZXIgUywgYW55LCBzdHJpbmc+ID8gUyA6IHVua25vd247XG5cbi8qKiBBIEhlbHBlciBpbmZlciB0eXBlICovXG5leHBvcnQgdHlwZSBJbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbiAgU2xpY2U8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPixcbiAgKE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxhbnksIGluZmVyIF9DYXNlUmVkdWNlciwgc3RyaW5nPiA/IF9DYXNlUmVkdWNlciA6IFNsaWNlQ2FzZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+KSAmXG4gICAgRXh0cmFTbGljZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+LFxuICBzdHJpbmc+O1xuXG4vKiogQSBIZWxwZXIgaW5mZXIgdHlwZSAqL1xuZXhwb3J0IHR5cGUgSW5mZXJBY3Rpb25zVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbkluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT5bJ2FjdGlvbnMnXTtcblxuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj47XG4gIHN0b3JlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gIGxvZyQ6IE9ic2VydmFibGU8YW55W10+O1xuXG4gIHJvb3RTdG9yZVJlYWR5OiBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PjtcbiAgLyoqXG4gICAqIHNhbWUgYXMgc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSwgYnV0IHRoaXMgb25lIGdvZXMgdGhyb3VnaCBSZWR1eC1vYnNlcnZhYmxlJ3MgZXBpYyBtaWRkbGV3YXJlXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuICByZXBvcnRBY3Rpb25FcnJvcjogKGVycjogRXJyb3IpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBlcGljU2VxID0gMDtcbiAgLy8gcHJpdmF0ZSBnbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yID0gY3JlYXRlQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxhbnk+KSA9PiB2b2lkPignX19nbG9iYWxfY2hhbmdlJyk7XG4gIHByaXZhdGUgZGVidWdMb2cgPSBuZXcgUmVwbGF5U3ViamVjdDxhbnlbXT4oMTUpO1xuICBwcml2YXRlIHJlZHVjZXJNYXA6IFJlZHVjZXJzTWFwT2JqZWN0PGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PjtcbiAgcHJpdmF0ZSBlcGljV2l0aFVuc3ViJDogU3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPjtcbiAgcHJpdmF0ZSBlcnJvclNsaWNlOiBJbmZlclNsaWNlVHlwZTx0eXBlb2YgZXJyb3JTbGljZU9wdD47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwcmVsb2FkZWRTdGF0ZTogQ29uZmlndXJlU3RvcmVPcHRpb25zWydwcmVsb2FkZWRTdGF0ZSddKSB7XG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj4ocHJlbG9hZGVkU3RhdGUpO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQgPSBuZXcgUmVwbGF5U3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPigpO1xuICAgIHRoaXMubG9nJCA9IHRoaXMuZGVidWdMb2cuYXNPYnNlcnZhYmxlKCk7XG4gICAgdGhpcy5yZWR1Y2VyTWFwID0ge307XG5cbiAgICB0aGlzLnJvb3RTdG9yZVJlYWR5ID0gdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIGZpbHRlcihzdG9yZSA9PiBzdG9yZSAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpIGFzIFByb21pc2U8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb24+PjtcblxuICAgIGNvbnN0IGVycm9yU2xpY2UgPSB0aGlzLm5ld1NsaWNlKGVycm9yU2xpY2VPcHQpO1xuXG4gICAgdGhpcy5lcnJvclNsaWNlID0gZXJyb3JTbGljZTtcblxuICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IgPSB0aGlzLmJpbmRBY3Rpb25DcmVhdG9ycyhlcnJvclNsaWNlKS5yZXBvcnRBY3Rpb25FcnJvcjtcbiAgfVxuXG4gIC8vIGNvbmZpZ3VyZVN0b3JlKG1pZGRsZXdhcmVzPzogTWlkZGxld2FyZVtdKTogdGhpcztcbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gb3B0IEJlIGF3YXJlLCB0dXJuIG9mZiBvcHRpb24gXCJzZXJpYWxpemFibGVDaGVja1wiIGFuZCBcImltbXV0YWJsZUNoZWNrXCIgZnJvbSBSZWR1eCBkZWZhdWx0IG1pZGRsZXdhcmVzXG4gICAqL1xuICBjb25maWd1cmVTdG9yZShvcHQ/OiB7W2tleSBpbiBFeGNsdWRlPCdyZWR1Y2VyJywga2V5b2YgQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+Pl06IENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PltrZXldfSkge1xuICAgIGlmICh0aGlzLnN0b3JlJC5nZXRWYWx1ZSgpKVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgY29uc3QgZXBpY01pZGRsZXdhcmUgPSBjcmVhdGVFcGljTWlkZGxld2FyZTxQYXlsb2FkQWN0aW9uPGFueT4+KCk7XG5cbiAgICBsZXQgY2ZnT3B0ID0gb3B0IGFzIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+PjtcbiAgICBjb25zdCBvdXJNaWRkbHdhcmVzID0gW3RoaXMuZXJyb3JIYW5kbGVNaWRkbGV3YXJlLCBlcGljTWlkZGxld2FyZV07XG4gICAgaWYgKGNmZ09wdCkge1xuICAgICAgY2ZnT3B0LnJlZHVjZXIgPSByb290UmVkdWNlcjtcbiAgICAgIGNmZ09wdC5kZXZUb29scyA9IGZhbHNlO1xuICAgICAgaWYgKGNmZ09wdC5taWRkbGV3YXJlKSB7XG4gICAgICAgIGNvbnN0IGV4aXRpbmdNaWQgPSBjZmdPcHQubWlkZGxld2FyZTtcbiAgICAgICAgaWYgKHR5cGVvZiBleGl0aW5nTWlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi5leGl0aW5nTWlkKGdldERlZmF1bHQpLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gWy4uLmV4aXRpbmdNaWQsIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IChnZXREZWZhdWx0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY2ZnT3B0ID0ge1xuICAgICAgICByZWR1Y2VyOiByb290UmVkdWNlcixcbiAgICAgICAgbWlkZGxld2FyZShnZXREZWZhdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIFsuLi5nZXREZWZhdWx0KHtzZXJpYWxpemFibGVDaGVjazogZmFsc2UsIGltbXV0YWJsZUNoZWNrOiBmYWxzZX0pLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfSxcbiAgICAgICAgZGV2VG9vbHM6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0b3JlID0gY29uZmlndXJlU3RvcmUoY2ZnT3B0KTtcbiAgICB0aGlzLnN0b3JlJC5uZXh0KHN0b3JlKTtcblxuICAgIHN0b3JlLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldFN0YXRlKCk7XG4gICAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLm5leHQoc3RhdGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFsdGltZVN0YXRlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIC8vIHRhcCgoKSA9PiBjb25zb2xlLmxvZygnc3RhdGUgY2hhbmdlZCcpKSxcbiAgICAgIHRhcChzdGF0ZSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydzdGF0ZScsIHN0YXRlXSkpXG4gICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIGVwaWNNaWRkbGV3YXJlLnJ1bigoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmVwaWNXaXRoVW5zdWIkLnBpcGUoXG4gICAgICAgIHRhcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGBdKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWJvdXQgdG8gYmUgc3Vic2NyaWJlZGApO1xuICAgICAgICB9KSxcbiAgICAgICAgbWVyZ2VNYXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4gKGVwaWMoYWN0aW9uJCwgc3RhdGUkLCBkZXBlbmRlbmNpZXMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgLy8gdGFwKGFjdGlvbiA9PiBjb25zb2xlLmxvZygnYWN0aW9uOiAnLCBhY3Rpb24udHlwZSkpLFxuICAgICAgICAgICAgdGFrZVVudGlsKHVuc3ViLnBpcGUoXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIG1hcChlcGljSWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgdW5zdWJzY3JpYmUgZnJvbSAke2VwaWNJZH1gXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gdW5zdWJzY3JpYmUgJHtlcGljSWR9YCk7XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICAgIHRha2VVbnRpbChhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgb2ZUeXBlKCdTVE9QX0VQSUMnKSxcbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdTdG9wIGFsbCBlcGljcyddKSlcbiAgICAgICAgKSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zVG9EaXNwYXRjaDtcbiAgICB9LCAnaW50ZXJuYWxEaXNwYXRjaGVyJyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgb3VyIHNwZWNpYWwgc2xpY2Ugd2l0aCBhIGRlZmF1bHQgcmVkdWNlciBhY3Rpb246IFxuICAgKiAtIGBjaGFuZ2Uoc3RhdGU6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248KGRyYWZ0U3RhdGU6IERyYWZ0PFNTPikgPT4gdm9pZD4pYFxuICAgKiAtIGluaXRpYWxTdGF0ZSBpcyBsb2FkZWQgZnJvbSBTdGF0ZUZhY3RvcnkncyBwYXJ0aWFsIHByZWxvYWRlZFN0YXRlXG4gICAqL1xuICBuZXdTbGljZTxTLCBfQ2FzZVJlZHVjZXIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgb3B0OiBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyLCBOYW1lPik6XG4gICAgU2xpY2U8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPiB7XG5cbiAgICBjb25zdCBfb3B0ID0gb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+O1xuICAgIGNvbnN0IHJlZHVjZXJzID0gX29wdC5yZWR1Y2VycyBhcyBSZWR1Y2VyV2l0aERlZmF1bHRBY3Rpb25zPFMsIF9DYXNlUmVkdWNlcj47XG5cbiAgICBpZiAocmVkdWNlcnMuX2NoYW5nZSA9PSBudWxsKVxuICAgICAgT2JqZWN0LmFzc2lnbihfb3B0LnJlZHVjZXJzLCBkZWZhdWx0U2xpY2VSZWR1Y2Vycyk7XG5cbiAgICBpZiAocmVkdWNlcnMuX2luaXQgPT0gbnVsbCkge1xuICAgICAgcmVkdWNlcnMuX2luaXQgPSAoZHJhZnQsIGFjdGlvbikgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHNsaWNlIFwiJHtvcHQubmFtZX1cIiBpcyBjcmVhdGVkICR7YWN0aW9uLnBheWxvYWQuaXNMYXp5ID8gJ2xhemlseScgOiAnJ31gXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByZWxvYWRlZFN0YXRlICYmIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdC5pbml0aWFsU3RhdGUsIHRoaXMucHJlbG9hZGVkU3RhdGVbb3B0Lm5hbWVdKTtcbiAgICB9XG4gICAgY29uc3Qgc2xpY2UgPSByZWR1eENyZWF0ZVNsaWNlKFxuICAgICAgb3B0IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+KTtcblxuICAgIHRoaXMuYWRkU2xpY2VNYXliZVJlcGxhY2VSZWR1Y2VyKHNsaWNlKTtcblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHJlbW92ZVNsaWNlKHNsaWNlOiB7bmFtZTogc3RyaW5nfSkge1xuICAgIGRlbGV0ZSB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV07XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAncmVtb3ZlIHNsaWNlICcrIHNsaWNlLm5hbWVdKTtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFNMID0gU2xpY2U8YW55LCBhbnksIHN0cmluZz4+KFxuICAgIGVwaWM6IEVwaWM8XG4gICAgICBQYXlsb2FkQWN0aW9uPGFueT4sIGFueSxcbiAgICAgIHtcbiAgICAgICAgW2tleSBpbiBTTCBleHRlbmRzIFNsaWNlPGFueSwgYW55LCBpbmZlciBOYW1lPiA/IE5hbWUgOiBzdHJpbmddOlxuICAgICAgICBTTCBleHRlbmRzIFNsaWNlPGluZmVyIFMsIGFueSwgYW55PiA/IFMgOiBhbnlcbiAgICAgIH1cbiAgICAgID4sXG4gICAgZXBpY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKGVwaWNOYW1lIHx8ICsrdGhpcy5lcGljU2VxKTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWRkZWRgXSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCBlcGljSWQsIHVuc3Vic2NyaWJlRXBpY10pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZUVwaWMubmV4dChlcGljSWQpO1xuICAgICAgdW5zdWJzY3JpYmVFcGljLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgfVxuXG4gIHNsaWNlU3RhdGU8U1MsIENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFNTLCBDYXNlUmVkdWNlcnMsIE5hbWU+KTogU1Mge1xuICAgIGNvbnN0IHN0b3JlID0gdGhpcy5nZXRSb290U3RvcmUoKTtcbiAgICByZXR1cm4gc3RvcmUgPyBzdG9yZS5nZXRTdGF0ZSgpW3NsaWNlLm5hbWVdIGFzIFNTIDoge30gYXMgU1M7XG4gIH1cblxuICBzbGljZVN0b3JlPFNTPihzbGljZTogU2xpY2U8U1M+KTogT2JzZXJ2YWJsZTxTUz4ge1xuICAgIHJldHVybiAodGhpcy5yZWFsdGltZVN0YXRlJCBhcyBTdWJqZWN0PHtba2V5OiBzdHJpbmddOiBTU30+KS5waXBlKFxuICAgICAgbWFwKHMgPT4gc1tzbGljZS5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpXG4gICAgKTtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZGlzcGF0Y2gnLCBhY3Rpb24udHlwZSk7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBPihzbGljZToge2FjdGlvbnM6IEF9KVxuICAgIDogQSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyBBO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBkb0FjdGlvbiA9ICguLi5wYXJhbTogYW55W10pID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFjdGlvbkNyZWF0b3IoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb24gYXMgdW5rbm93bjtcbiAgICAgIH07XG4gICAgICAoZG9BY3Rpb24gYXMgdW5rbm93biBhcyB7dHlwZTogc3RyaW5nfSkudHlwZSA9IChhY3Rpb25DcmVhdG9yIGFzIFBheWxvYWRBY3Rpb25DcmVhdG9yKS50eXBlO1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb24gYXMgdW5rbm93bjtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbk1hcDtcbiAgfVxuXG4gIHN0b3BBbGxFcGljcygpIHtcbiAgICB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgdGFwKHN0b3JlID0+IHtcbiAgICAgICAgaWYgKHN0b3JlKVxuICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHtwYXlsb2FkOiBudWxsLCB0eXBlOiAnU1RPUF9FUElDJ30pO1xuICAgICAgfSksXG4gICAgICB0YWtlKDEpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVNaWRkbGV3YXJlOiBNaWRkbGV3YXJlID0gKGFwaSkgPT4ge1xuICAgIHJldHVybiAobmV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChhY3Rpb246IFBheWxvYWRBY3Rpb24pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnYWN0aW9uIGluIGVycm9ySGFuZGxlTWlkZGxld2FyZScsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydhY3Rpb24nLCBhY3Rpb24gIT0gbnVsbCA/IGFjdGlvbi50eXBlIDogYWN0aW9uXSk7XG4gICAgICAgICAgY29uc3QgcmV0ID0gbmV4dChhY3Rpb24pO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gZmFpbGVkIGFjdGlvbicsIGFjdGlvbik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBhY3Rpb24gZGlzcGF0Y2ggZXJyb3InLCBlcnIpO1xuICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyIGFzIEVycm9yKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgfTtcblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICAgICkge1xuICAgIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXSA9IHNsaWNlLnJlZHVjZXI7XG4gICAgaWYgKHRoaXMuZ2V0Um9vdFN0b3JlKCkpIHtcbiAgICAgIGNvbnN0IG5ld1Jvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgICAgdGhpcy5nZXRSb290U3RvcmUoKSEucmVwbGFjZVJlZHVjZXIobmV3Um9vdFJlZHVjZXIpO1xuICAgICAgdGhpcy5kaXNwYXRjaChzbGljZS5hY3Rpb25zLl9pbml0KHtpc0xhenk6IHRydWV9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiBmYWxzZX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSb290UmVkdWNlcigpOiBSZWR1Y2VyPGFueSwgUGF5bG9hZEFjdGlvbj4ge1xuICAgIGNvbnN0IGNvbWJpbmVkID0gY29tYmluZVJlZHVjZXJzKHRoaXMucmVkdWNlck1hcCk7XG4gICAgY29uc3Qgcm9vdFJlZHVjZXI6IFJlZHVjZXI8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+ID0gKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICAgIGlmIChhY3Rpb24udHlwZSA9PT0gJzo6c3luY1N0YXRlJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICAgIHJldHVybiBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm5cbiAgICAgICAgcmV0dXJuIGNvbWJpbmVkKHN0YXRlLCBhY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHJvb3RSZWR1Y2VyO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFBheWxvYWRDYXNlUmVkdWNlcnM8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+PiA9IHtcbiAgW1QgaW4ga2V5b2YgUl06IFJbVF0gZXh0ZW5kcyAoczogYW55KSA9PiBhbnkgP1xuICAgIChzdGF0ZTogRHJhZnQ8Uz4pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz4gOlxuICAgIFJbVF0gZXh0ZW5kcyAoczogYW55LCBhY3Rpb246IFBheWxvYWRBY3Rpb248aW5mZXIgUD4pID0+IGFueSA/XG4gICAgICAoc3RhdGU6IERyYWZ0PFM+LCBwYXlsb2FkOiBQKSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDogKHN0YXRlOiBEcmFmdDxTPiwgcGF5bG9hZDogdW5rbm93bikgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPjtcbn07XG5cbi8qKlxuICogU2ltcGxpZnkgcmVkdWNlcnMgc3RydWN0dXJlIHJlcXVpcmVkIGluIFNsaWNlIGNyZWF0aW9uIG9wdGlvbi5cbiAqIFxuICogTm9ybWFsbHksIHRvIGNyZWF0ZSBhIHNsaWNlLCB5b3UgbmVlZCB0byBwcm92aWRlIGEgc2xpY2Ugb3B0aW9uIHBhcmFtdGVyIGxpa2U6XG4gKiB7bmFtZTogPG5hbWU+LCBpbml0aWFsU3RhdGU6IDx2YWx1ZT4sIHJlZHVjZXJzOiB7XG4gKiAgY2FzZVJlZHVjZXIoc3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQYXlsb2FkVHlwZT4pIHtcbiAqICAgIC8vIG1hbmlwdWxhdGUgc3RhdGUgZHJhZnQgd2l0aCBkZXN0cnVjdG9yZWQgcGF5bG9hZCBkYXRhXG4gKiAgfVxuICogfX1cbiAqIFxuICogVW5jb252ZW5pZW50IHRoaW5nIGlzIHRoZSBcIlBheWxvYWRBY3Rpb248UGF5bG9hZFR5cGU+XCIgcGFydCB3aGljaCBzcGVjaWZpZWQgYXMgc2Vjb25kIHBhcmFtZXRlciBpbiBldmVyeSBjYXNlIHJlZHVjZXIgZGVmaW5pdGlvbixcbiAqIGFjdHVhbGx5IHdlIG9ubHkgY2FyZSBhYm91dCB0aGUgUGF5bG9hZCB0eXBlIGluc3RlYWQgb2YgdGhlIHdob2xlIFBheWxvYWRBY3Rpb24gaW4gY2FzZSByZWR1Y2VyLlxuICogXG4gKiB0aGlzIGZ1bmN0aW9uIGFjY2VwdCBhIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBcImNhc2UgcmVkdWNlclwiIGluIGZvcm0gb2Y6IFxuICoge1xuICogICAgW2Nhc2VOYW1lXTogKERyYWZ0PFN0YXRlPiwgcGF5bG9hZDogYW55KSA9PiBEcmFmdDxTdGF0ZT4gfCB2b2lkO1xuICogfVxuICogXG4gKiByZXR1cm4gYSByZWd1bGFyIENhc2UgcmVkdWNlcnMsIG5vdCBsb25nZXIgbmVlZHMgdG8gXCJkZXN0cnVjdG9yXCIgYWN0aW9uIHBhcmFtdGVyIHRvIGdldCBwYXlsb2FkIGRhdGEuXG4gKiBcbiAqIEBwYXJhbSBwYXlsb2FkUmVkdWNlcnMgXG4gKiBAcmV0dXJucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21QYXlsb2RSZWR1Y2VyPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4ocGF5bG9hZFJlZHVjZXJzOiBQYXlsb2FkQ2FzZVJlZHVjZXJzPFMsIFI+KTpcbiAgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddIHtcbiAgY29uc3QgcmVkdWNlcnMgPSB7fSBhcyBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ107XG4gIGZvciAoY29uc3QgW2Nhc2VOYW1lLCBzaW1wbGVSZWR1Y2VyXSBvZiBPYmplY3QuZW50cmllcyhwYXlsb2FkUmVkdWNlcnMpKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIHJlZHVjZXJzW2Nhc2VOYW1lIGFzIGtleW9mIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXV0gPSBmdW5jdGlvbihzOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueT4pIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgIHJldHVybiBzaW1wbGVSZWR1Y2VyKHMsIGFjdGlvbi5wYXlsb2FkKSBhcyB1bmtub3duO1xuICAgIH0gYXMgYW55O1xuICB9XG4gIHJldHVybiByZWR1Y2Vycztcbn1cblxuY29uc3QgZXJyb3JTbGljZU9wdCA9IHtcbiAgaW5pdGlhbFN0YXRlOiB7fSBhcyBFcnJvclN0YXRlLFxuICBuYW1lOiAnZXJyb3InLFxuICByZWR1Y2Vyczoge1xuICAgIHJlcG9ydEFjdGlvbkVycm9yKHM6IEVycm9yU3RhdGUsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxFcnJvcj4pIHtcbiAgICAgIHMuYWN0aW9uRXJyb3IgPSBwYXlsb2FkO1xuICAgIH1cbiAgfVxufTtcblxuaWYgKG1vZHVsZS5ob3QpIHtcbiAgbW9kdWxlLmhvdC5kZWNsaW5lKCk7XG59XG4iXX0=