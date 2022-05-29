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
        this.sharedSliceStore$ = new Map();
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
        const slicedStore = this.realtimeState$.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        (0, operators_1.map)(s => s[opt.name]), (0, operators_1.filter)(ss => ss != null), (0, operators_1.distinctUntilChanged)(), (0, operators_1.share)());
        this.sharedSliceStore$.set(opt.name, slicedStore);
        return slice;
    }
    removeSlice(slice) {
        delete this.reducerMap[slice.name];
        if (this.getRootStore()) {
            this.debugLog.next(['[redux-toolkit-obs]', 'remove slice ' + slice.name]);
            const newRootReducer = this.createRootReducer();
            this.getRootStore().replaceReducer(newRootReducer);
            this.sharedSliceStore$.delete(slice.name);
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
        return this.sharedSliceStore$.get(slice.name);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsOENBTTBCO0FBQzFCLHVEQUFzRTtBQUN0RSwrQkFBNkY7QUFDN0YsOENBQXFIO0FBbUJySCxTQUFnQixlQUFlLENBQXNCLEdBQUcsY0FBZ0Q7SUFFdEcsT0FBTyxJQUFBLHlCQUFNLEVBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUErQyxDQUFDO0FBQ2xHLENBQUM7QUFIRCwwQ0FHQztBQU1ELE1BQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBZUYsTUFBYSxZQUFZO0lBMEJ2QixZQUFvQixjQUF1RDtRQUF2RCxtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFuQjNFLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSTVGOztXQUVHO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxvQkFBYSxDQUFxQixFQUFFLENBQUMsQ0FBQztRQUd0RCxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUNqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBS3hDLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1FBaVAzRCwwQkFBcUIsR0FBZSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFD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RSxhQUFhLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ3ZFLG1FQUFtRTtRQUNuRSxRQUFRLENBQUMsUUFBc0QsQ0FBQyxHQUFHLFVBQVMsQ0FBVyxFQUFFLE1BQTBCO1lBQ2pILDZEQUE2RDtZQUM3RCxPQUFPLGFBQWEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBWSxDQUFDO1FBQ3JELENBQVEsQ0FBQztLQUNWO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQVhELDhDQVdDO0FBRUQsTUFBTSxhQUFhLEdBQUc7SUFDcEIsWUFBWSxFQUFFLEVBQWdCO0lBQzlCLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBUSxFQUFFO1FBQ1IsaUJBQWlCLENBQUMsQ0FBYSxFQUFFLEVBQUMsT0FBTyxFQUF1QjtZQUM5RCxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gZXNsaW50LWRpc2FibGUgIG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsIFBheWxvYWRBY3Rpb25DcmVhdG9yLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlLCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWRcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHNoYXJlLCB0YWtlLCB0YWtlVW50aWwsIHRhcCwgY2F0Y2hFcnJvcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQge1BheWxvYWRBY3Rpb24sIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZX07XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiB7XG4gIF9pbml0OiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjx7aXNMYXp5OiBib29sZWFufT4+O1xuICBfY2hhbmdlOiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPj47XG59XG5cbmV4cG9ydCB0eXBlIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsXG4gIEFDUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPj4gPSBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzPFNTLCBBQ1I+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPjtcblxuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgVDEgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4pOlxuT3BlcmF0b3JGdW5jdGlvbjxhbnksIFAxIGV4dGVuZHMgdW5kZWZpbmVkID8ge3R5cGU6IFQxfSA6IFBheWxvYWRBY3Rpb248UDEsIFQxPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMiwgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nPihhY3Rpb25DcmVhdG9yczE6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMSwgVDE+LCBhY3Rpb25DcmVhdG9yczI6IEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxQMiwgVDI+KTpcbk9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAxIHwgUDIsIFQxIHwgVDI+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFAyLCBQMywgVDEgZXh0ZW5kcyBzdHJpbmcsIFQyIGV4dGVuZHMgc3RyaW5nLCBUMyBleHRlbmRzIHN0cmluZz4oYWN0aW9uQ3JlYXRvcnMxOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDEsIFQxPixcbiAgYWN0aW9uQ3JlYXRvcnMyOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDIsIFQyPiwgYWN0aW9uQ3JlYXRvcnMzOiBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8UDMsIFQzPik6XG5PcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQMSB8IFAyIHwgUDMsIFQxIHwgVDIgfCBUMz4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQLCBUIGV4dGVuZHMgc3RyaW5nPiguLi5hY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+W10pOlxuT3BlcmF0b3JGdW5jdGlvbjxhbnksIFBheWxvYWRBY3Rpb248UCwgVD4+IHtcbiAgcmV0dXJuIG9mVHlwZSguLi5hY3Rpb25DcmVhdG9ycy5tYXAoYyA9PiBjLnR5cGUpKSBhcyBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQLCBUPj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JTdGF0ZSB7XG4gIGFjdGlvbkVycm9yPzogRXJyb3I7XG59XG5cbmNvbnN0IGRlZmF1bHRTbGljZVJlZHVjZXJzOiBQYXJ0aWFsPEV4dHJhU2xpY2VSZWR1Y2Vyczxhbnk+PiA9IHtcbiAgX2NoYW5nZTogKHN0YXRlLCBhY3Rpb24pID0+IHtcbiAgICBhY3Rpb24ucGF5bG9hZChzdGF0ZSk7XG4gIH1cbn07XG5cbnR5cGUgSW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9IE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZSBleHRlbmRzIENyZWF0ZVNsaWNlT3B0aW9uczxpbmZlciBTLCBhbnksIHN0cmluZz4gPyBTIDogdW5rbm93bjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4gPVxuICBTbGljZTxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+LFxuICAoTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGFueSwgaW5mZXIgX0Nhc2VSZWR1Y2VyLCBzdHJpbmc+ID8gX0Nhc2VSZWR1Y2VyIDogU2xpY2VDYXNlUmVkdWNlcnM8SW5mZXJTdGF0ZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPj4pICZcbiAgRXh0cmFTbGljZVJlZHVjZXJzPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4+LFxuICBzdHJpbmc+O1xuXG4vKiogQSBIZWxwZXIgaW5mZXIgdHlwZSAqL1xuZXhwb3J0IHR5cGUgSW5mZXJBY3Rpb25zVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID1cbkluZmVyU2xpY2VUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT5bJ2FjdGlvbnMnXTtcblxuZXhwb3J0IGNsYXNzIFN0YXRlRmFjdG9yeSB7XG4gIC8qKlxuICAgKiBXaHkgSSBkb24ndCB1c2UgRXBpYydzIHN0YXRlJCBwYXJhbWV0ZXI6XG4gICAqIFxuICAgKiBSZWR1eC1vYnNlcnZhYmxlJ3Mgc3RhdGUkIGRvZXMgbm90IG5vdGlmeSBzdGF0ZSBjaGFuZ2UgZXZlbnQgd2hlbiBhIGxhenkgbG9hZGVkIChyZXBsYWNlZCkgc2xpY2UgaW5pdGlhbGl6ZSBzdGF0ZSBcbiAgICovXG4gIHJlYWx0aW1lU3RhdGUkOiBCZWhhdmlvclN1YmplY3Q8dW5rbm93bj47XG4gIHN0b3JlJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RW5oYW5jZWRTdG9yZTxhbnksIFBheWxvYWRBY3Rpb248YW55Pj4gfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gIGxvZyQ6IE9ic2VydmFibGU8YW55W10+O1xuXG4gIHJvb3RTdG9yZVJlYWR5OiBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+PjtcbiAgLyoqXG4gICAqIHNhbWUgYXMgc3RvcmUuZGlzcGF0Y2goYWN0aW9uKSwgYnV0IHRoaXMgb25lIGdvZXMgdGhyb3VnaCBSZWR1eC1vYnNlcnZhYmxlJ3MgZXBpYyBtaWRkbGV3YXJlXG4gICAqL1xuICBhY3Rpb25zVG9EaXNwYXRjaCA9IG5ldyBSZXBsYXlTdWJqZWN0PFBheWxvYWRBY3Rpb248YW55Pj4oMjApO1xuICByZXBvcnRBY3Rpb25FcnJvcjogKGVycjogRXJyb3IpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBlcGljU2VxID0gMDtcbiAgLy8gcHJpdmF0ZSBnbG9iYWxDaGFuZ2VBY3Rpb25DcmVhdG9yID0gY3JlYXRlQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxhbnk+KSA9PiB2b2lkPignX19nbG9iYWxfY2hhbmdlJyk7XG4gIHByaXZhdGUgZGVidWdMb2cgPSBuZXcgUmVwbGF5U3ViamVjdDxhbnlbXT4oMTUpO1xuICBwcml2YXRlIHJlZHVjZXJNYXA6IFJlZHVjZXJzTWFwT2JqZWN0PGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PjtcbiAgcHJpdmF0ZSBlcGljV2l0aFVuc3ViJDogU3ViamVjdDxbRXBpYzxQYXlsb2FkQWN0aW9uPHVua25vd24+Piwgc3RyaW5nLCBTdWJqZWN0PHN0cmluZz5dPjtcbiAgcHJpdmF0ZSBlcnJvclNsaWNlOiBJbmZlclNsaWNlVHlwZTx0eXBlb2YgZXJyb3JTbGljZU9wdD47XG5cbiAgcHJpdmF0ZSBzaGFyZWRTbGljZVN0b3JlJCA9IG5ldyBNYXA8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcHJlbG9hZGVkU3RhdGU6IENvbmZpZ3VyZVN0b3JlT3B0aW9uc1sncHJlbG9hZGVkU3RhdGUnXSkge1xuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHVua25vd24+KHByZWxvYWRlZFN0YXRlKTtcbiAgICB0aGlzLmVwaWNXaXRoVW5zdWIkID0gbmV3IFJlcGxheVN1YmplY3Q8W0VwaWM8UGF5bG9hZEFjdGlvbjx1bmtub3duPj4sIHN0cmluZywgU3ViamVjdDxzdHJpbmc+XT4oKTtcbiAgICB0aGlzLmxvZyQgPSB0aGlzLmRlYnVnTG9nLmFzT2JzZXJ2YWJsZSgpO1xuICAgIHRoaXMucmVkdWNlck1hcCA9IHt9O1xuXG4gICAgdGhpcy5yb290U3RvcmVSZWFkeSA9IHRoaXMuc3RvcmUkLnBpcGUoXG4gICAgICBmaWx0ZXIoc3RvcmUgPT4gc3RvcmUgIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKSBhcyBQcm9taXNlPEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPj47XG5cbiAgICBjb25zdCBlcnJvclNsaWNlID0gdGhpcy5uZXdTbGljZShlcnJvclNsaWNlT3B0KTtcblxuICAgIHRoaXMuZXJyb3JTbGljZSA9IGVycm9yU2xpY2U7XG5cbiAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yID0gdGhpcy5iaW5kQWN0aW9uQ3JlYXRvcnMoZXJyb3JTbGljZSkucmVwb3J0QWN0aW9uRXJyb3I7XG4gIH1cblxuICAvLyBjb25maWd1cmVTdG9yZShtaWRkbGV3YXJlcz86IE1pZGRsZXdhcmVbXSk6IHRoaXM7XG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIG9wdCBCZSBhd2FyZSwgdHVybiBvZmYgb3B0aW9uIFwic2VyaWFsaXphYmxlQ2hlY2tcIiBhbmQgXCJpbW11dGFibGVDaGVja1wiIGZyb20gUmVkdXggZGVmYXVsdCBtaWRkbGV3YXJlc1xuICAgKi9cbiAgY29uZmlndXJlU3RvcmUob3B0Pzoge1trZXkgaW4gRXhjbHVkZTwncmVkdWNlcicsIGtleW9mIENvbmZpZ3VyZVN0b3JlT3B0aW9uczx1bmtub3duLCBQYXlsb2FkQWN0aW9uPHVua25vd24+Pj5dOiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj5ba2V5XX0pIHtcbiAgICBpZiAodGhpcy5zdG9yZSQuZ2V0VmFsdWUoKSlcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyID0gdGhpcy5jcmVhdGVSb290UmVkdWNlcigpO1xuICAgIGNvbnN0IGVwaWNNaWRkbGV3YXJlID0gY3JlYXRlRXBpY01pZGRsZXdhcmU8UGF5bG9hZEFjdGlvbjxhbnk+PigpO1xuXG4gICAgbGV0IGNmZ09wdCA9IG9wdCBhcyBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj47XG4gICAgY29uc3Qgb3VyTWlkZGx3YXJlcyA9IFt0aGlzLmVycm9ySGFuZGxlTWlkZGxld2FyZSwgZXBpY01pZGRsZXdhcmVdO1xuICAgIGlmIChjZmdPcHQpIHtcbiAgICAgIGNmZ09wdC5yZWR1Y2VyID0gcm9vdFJlZHVjZXI7XG4gICAgICBjZmdPcHQuZGV2VG9vbHMgPSBmYWxzZTtcbiAgICAgIGlmIChjZmdPcHQubWlkZGxld2FyZSkge1xuICAgICAgICBjb25zdCBleGl0aW5nTWlkID0gY2ZnT3B0Lm1pZGRsZXdhcmU7XG4gICAgICAgIGlmICh0eXBlb2YgZXhpdGluZ01pZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBbLi4uZXhpdGluZ01pZChnZXREZWZhdWx0KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IFsuLi5leGl0aW5nTWlkLCAuLi5vdXJNaWRkbHdhcmVzXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSAoZ2V0RGVmYXVsdCkgPT4ge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNmZ09wdCA9IHtcbiAgICAgICAgcmVkdWNlcjogcm9vdFJlZHVjZXIsXG4gICAgICAgIG1pZGRsZXdhcmUoZ2V0RGVmYXVsdCkge1xuICAgICAgICAgIHJldHVybiBbLi4uZ2V0RGVmYXVsdCh7c2VyaWFsaXphYmxlQ2hlY2s6IGZhbHNlLCBpbW11dGFibGVDaGVjazogZmFsc2V9KSwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH0sXG4gICAgICAgIGRldlRvb2xzOiBmYWxzZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlKGNmZ09wdCk7XG4gICAgdGhpcy5zdG9yZSQubmV4dChzdG9yZSk7XG5cbiAgICBzdG9yZS5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgY29uc3Qgc3RhdGUgPSBzdG9yZS5nZXRTdGF0ZSgpO1xuICAgICAgdGhpcy5yZWFsdGltZVN0YXRlJC5uZXh0KHN0YXRlKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAvLyB0YXAoKCkgPT4gY29uc29sZS5sb2coJ3N0YXRlIGNoYW5nZWQnKSksXG4gICAgICB0YXAoc3RhdGUgPT4gdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnc3RhdGUnLCBzdGF0ZV0pKVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICBlcGljTWlkZGxld2FyZS5ydW4oKGFjdGlvbiQsIHN0YXRlJCwgZGVwZW5kZW5jaWVzKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5lcGljV2l0aFVuc3ViJC5waXBlKFxuICAgICAgICB0YXAoKFtlcGljLCBlcGljSWQsIHVuc3ViXSkgPT4ge1xuICAgICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbYFtyZWR1eC10b29sa2l0LW9ic10gJHtlcGljSWR9IGlzIGFib3V0IHRvIGJlIHN1YnNjcmliZWRgXSk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coYFtyZWR1eC10b29sa2l0LW9ic10gJHtlcGljSWR9IGlzIGFib3V0IHRvIGJlIHN1YnNjcmliZWRgKTtcbiAgICAgICAgfSksXG4gICAgICAgIG1lcmdlTWFwKChbZXBpYywgZXBpY0lkLCB1bnN1Yl0pID0+IChlcGljKGFjdGlvbiQsIHN0YXRlJCwgZGVwZW5kZW5jaWVzKSlcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIC8vIHRhcChhY3Rpb24gPT4gY29uc29sZS5sb2coJ2FjdGlvbjogJywgYWN0aW9uLnR5cGUpKSxcbiAgICAgICAgICAgIHRha2VVbnRpbCh1bnN1Yi5waXBlKFxuICAgICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgICBtYXAoZXBpY0lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgYHVuc3Vic2NyaWJlIGZyb20gJHtlcGljSWR9YF0pO1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbcmVkdXgtdG9vbGtpdC1vYnNdIHVuc3Vic2NyaWJlICR7ZXBpY0lkfWApO1xuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBjYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVycik7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApLFxuICAgICAgICB0YWtlVW50aWwoYWN0aW9uJC5waXBlKFxuICAgICAgICAgIG9mVHlwZSgnU1RPUF9FUElDJyksXG4gICAgICAgICAgdGFwKCgpID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCAnU3RvcCBhbGwgZXBpY3MnXSkpXG4gICAgICAgICkpXG4gICAgICApO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkRXBpYygoYWN0aW9uJCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2g7XG4gICAgfSwgJ2ludGVybmFsRGlzcGF0Y2hlcicpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIG91ciBzcGVjaWFsIHNsaWNlIHdpdGggYSBkZWZhdWx0IHJlZHVjZXIgYWN0aW9uOiBcbiAgICogLSBgY2hhbmdlKHN0YXRlOiBEcmFmdDxTPiwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPChkcmFmdFN0YXRlOiBEcmFmdDxTUz4pID0+IHZvaWQ+KWBcbiAgICogLSBpbml0aWFsU3RhdGUgaXMgbG9hZGVkIGZyb20gU3RhdGVGYWN0b3J5J3MgcGFydGlhbCBwcmVsb2FkZWRTdGF0ZVxuICAgKi9cbiAgbmV3U2xpY2U8UywgX0Nhc2VSZWR1Y2VyIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIG9wdDogQ3JlYXRlU2xpY2VPcHRpb25zPFMsIF9DYXNlUmVkdWNlciwgTmFtZT4pOlxuICAgIFNsaWNlPFMsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPiwgTmFtZT4ge1xuXG4gICAgY29uc3QgX29wdCA9IG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPjtcbiAgICBjb25zdCByZWR1Y2VycyA9IF9vcHQucmVkdWNlcnMgYXMgUmVkdWNlcldpdGhEZWZhdWx0QWN0aW9uczxTLCBfQ2FzZVJlZHVjZXI+O1xuXG4gICAgaWYgKHJlZHVjZXJzLl9jaGFuZ2UgPT0gbnVsbClcbiAgICAgIE9iamVjdC5hc3NpZ24oX29wdC5yZWR1Y2VycywgZGVmYXVsdFNsaWNlUmVkdWNlcnMpO1xuXG4gICAgaWYgKHJlZHVjZXJzLl9pbml0ID09IG51bGwpIHtcbiAgICAgIHJlZHVjZXJzLl9pbml0ID0gKGRyYWZ0LCBhY3Rpb24pID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGBzbGljZSBcIiR7b3B0Lm5hbWV9XCIgaXMgY3JlYXRlZCAke2FjdGlvbi5wYXlsb2FkLmlzTGF6eSA/ICdsYXppbHknIDogJyd9YF0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcmVsb2FkZWRTdGF0ZSAmJiB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHQuaW5pdGlhbFN0YXRlLCB0aGlzLnByZWxvYWRlZFN0YXRlW29wdC5uYW1lXSk7XG4gICAgfVxuICAgIGNvbnN0IHNsaWNlID0gcmVkdXhDcmVhdGVTbGljZShcbiAgICAgIG9wdCBhcyBDcmVhdGVTbGljZU9wdGlvbnM8UywgX0Nhc2VSZWR1Y2VyICYgRXh0cmFTbGljZVJlZHVjZXJzPFM+LCBOYW1lPik7XG5cbiAgICB0aGlzLmFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcihzbGljZSk7XG4gICAgY29uc3Qgc2xpY2VkU3RvcmUgPSAodGhpcy5yZWFsdGltZVN0YXRlJCBhcyBTdWJqZWN0PFJlY29yZDxzdHJpbmcsIGFueT4+KS5waXBlKFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gICAgICBtYXAocyA9PiBzW29wdC5uYW1lXSksXG4gICAgICBmaWx0ZXIoc3MgPT4gc3MgIT0gbnVsbCksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmUoKVxuICAgICk7XG4gICAgdGhpcy5zaGFyZWRTbGljZVN0b3JlJC5zZXQob3B0Lm5hbWUsIHNsaWNlZFN0b3JlKTtcbiAgICByZXR1cm4gc2xpY2U7XG4gIH1cblxuICByZW1vdmVTbGljZShzbGljZToge25hbWU6IHN0cmluZ30pIHtcbiAgICBkZWxldGUgdGhpcy5yZWR1Y2VyTWFwW3NsaWNlLm5hbWVdO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ3JlbW92ZSBzbGljZSAnKyBzbGljZS5uYW1lXSk7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICAgIHRoaXMuc2hhcmVkU2xpY2VTdG9yZSQuZGVsZXRlKHNsaWNlLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGZyb20gdGhpcyBlcGljXG4gICAqIEBwYXJhbSBlcGljIFxuICAgKiBAcGFyYW0gZXBpY05hbWUgYSBuYW1lIGZvciBkZWJ1ZyBhbmQgbG9nZ2luZyBwdXJwb3NlXG4gICAqL1xuICBhZGRFcGljPFNMID0gU2xpY2U8YW55LCBhbnksIHN0cmluZz4+KFxuICAgIGVwaWM6IEVwaWM8XG4gICAgUGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksXG4gICAge1xuICAgICAgW2tleSBpbiBTTCBleHRlbmRzIFNsaWNlPGFueSwgYW55LCBpbmZlciBOYW1lPiA/IE5hbWUgOiBzdHJpbmddOlxuICAgICAgU0wgZXh0ZW5kcyBTbGljZTxpbmZlciBTLCBhbnksIGFueT4gPyBTIDogYW55XG4gICAgfVxuICAgID4sXG4gICAgZXBpY05hbWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBlcGljSWQgPSAnRXBpYy0nICsgKGVwaWNOYW1lIHx8ICsrdGhpcy5lcGljU2VxKTtcbiAgICBjb25zdCB1bnN1YnNjcmliZUVwaWMgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFtgW3JlZHV4LXRvb2xraXQtb2JzXSAke2VwaWNJZH0gaXMgYWRkZWRgXSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJC5uZXh0KFtlcGljLCBlcGljSWQsIHVuc3Vic2NyaWJlRXBpY10pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZUVwaWMubmV4dChlcGljSWQpO1xuICAgICAgdW5zdWJzY3JpYmVFcGljLmNvbXBsZXRlKCk7XG4gICAgfTtcbiAgfVxuXG4gIHNsaWNlU3RhdGU8U1MsIENhc2VSZWR1Y2VycyBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiA9IFNsaWNlQ2FzZVJlZHVjZXJzPFNTPiwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFNTLCBDYXNlUmVkdWNlcnMsIE5hbWU+KTogU1Mge1xuICAgIGNvbnN0IHN0b3JlID0gdGhpcy5nZXRSb290U3RvcmUoKTtcbiAgICByZXR1cm4gc3RvcmUgPyBzdG9yZS5nZXRTdGF0ZSgpW3NsaWNlLm5hbWVdIGFzIFNTIDoge30gYXMgU1M7XG4gIH1cblxuICBzbGljZVN0b3JlPFNTPihzbGljZTogU2xpY2U8U1M+KTogT2JzZXJ2YWJsZTxTUz4ge1xuICAgIHJldHVybiB0aGlzLnNoYXJlZFNsaWNlU3RvcmUkLmdldChzbGljZS5uYW1lKSBhcyBPYnNlcnZhYmxlPFNTPjtcbiAgfVxuXG4gIGdldEVycm9yU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdGF0ZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZ2V0RXJyb3JTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZVN0b3JlKHRoaXMuZXJyb3JTbGljZSk7XG4gIH1cblxuICBkaXNwYXRjaDxUPihhY3Rpb246IFBheWxvYWRBY3Rpb248VD4pIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZGlzcGF0Y2gnLCBhY3Rpb24udHlwZSk7XG4gICAgdGhpcy5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogVW5saW5rIFJlZHV4J3MgYmluZEFjdGlvbkNyZWF0b3JzLCBvdXIgc3RvcmUgaXMgbGF6aWx5IGNyZWF0ZWQsIGRpc3BhdGNoIGlzIG5vdCBhdmFpbGFibGUgYXQgYmVnaW5uaW5nLlxuICAgKiBQYXJhbWV0ZXIgaXMgYSBTbGljZSBpbnN0ZWFkIG9mIGFjdGlvbiBtYXBcbiAgICovXG4gIGJpbmRBY3Rpb25DcmVhdG9yczxBPihzbGljZToge2FjdGlvbnM6IEF9KVxuICAgIDogQSB7XG5cbiAgICBjb25zdCBhY3Rpb25NYXAgPSB7fSBhcyBBO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGFjdGlvbkNyZWF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNsaWNlLmFjdGlvbnMpKSB7XG4gICAgICBjb25zdCBkb0FjdGlvbiA9ICguLi5wYXJhbTogYW55W10pID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFjdGlvbkNyZWF0b3IoLi4ucGFyYW0pO1xuICAgICAgICB0aGlzLmRpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb24gYXMgdW5rbm93bjtcbiAgICAgIH07XG4gICAgICAoZG9BY3Rpb24gYXMgdW5rbm93biBhcyB7dHlwZTogc3RyaW5nfSkudHlwZSA9IChhY3Rpb25DcmVhdG9yIGFzIFBheWxvYWRBY3Rpb25DcmVhdG9yKS50eXBlO1xuICAgICAgYWN0aW9uTWFwW25hbWVdID0gZG9BY3Rpb24gYXMgdW5rbm93bjtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbk1hcDtcbiAgfVxuXG4gIHN0b3BBbGxFcGljcygpIHtcbiAgICB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgdGFwKHN0b3JlID0+IHtcbiAgICAgICAgaWYgKHN0b3JlKVxuICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHtwYXlsb2FkOiBudWxsLCB0eXBlOiAnU1RPUF9FUElDJ30pO1xuICAgICAgfSksXG4gICAgICB0YWtlKDEpXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGdldFJvb3RTdG9yZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZSQuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVNaWRkbGV3YXJlOiBNaWRkbGV3YXJlID0gKGFwaSkgPT4ge1xuICAgIHJldHVybiAobmV4dCkgPT4ge1xuICAgICAgcmV0dXJuIChhY3Rpb246IFBheWxvYWRBY3Rpb24pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnYWN0aW9uIGluIGVycm9ySGFuZGxlTWlkZGxld2FyZScsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoWydhY3Rpb24nLCBhY3Rpb24gIT0gbnVsbCA/IGFjdGlvbi50eXBlIDogYWN0aW9uXSk7XG4gICAgICAgICAgY29uc3QgcmV0ID0gbmV4dChhY3Rpb24pO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gZmFpbGVkIGFjdGlvbicsIGFjdGlvbik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlXSBhY3Rpb24gZGlzcGF0Y2ggZXJyb3InLCBlcnIpO1xuICAgICAgICAgIHRoaXMucmVwb3J0QWN0aW9uRXJyb3IoZXJyIGFzIEVycm9yKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgfTtcblxuICBwcml2YXRlIGFkZFNsaWNlTWF5YmVSZXBsYWNlUmVkdWNlcjxTdGF0ZSwgTmFtZSBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oXG4gICAgc2xpY2U6IFNsaWNlPFN0YXRlLCBTbGljZUNhc2VSZWR1Y2VyczxTdGF0ZT4gJiBFeHRyYVNsaWNlUmVkdWNlcnM8U3RhdGU+LCBOYW1lPlxuICApIHtcbiAgICB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV0gPSBzbGljZS5yZWR1Y2VyO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogZmFsc2V9KSk7XG4gICAgfVxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdFJlZHVjZXIoKTogUmVkdWNlcjxhbnksIFBheWxvYWRBY3Rpb24+IHtcbiAgICBjb25zdCBjb21iaW5lZCA9IGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyOiBSZWR1Y2VyPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiA9IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgICBpZiAoYWN0aW9uLnR5cGUgPT09ICc6OnN5bmNTdGF0ZScpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgICByZXR1cm4gYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gICAgICAgIHJldHVybiBjb21iaW5lZChzdGF0ZSwgYWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiByb290UmVkdWNlcjtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXlsb2FkQ2FzZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSB7XG4gIFtUIGluIGtleW9mIFJdOiBSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID9cbiAgICAoc3RhdGU6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGluZmVyIFA+KSA9PiBhbnkgP1xuICAgICAgKHN0YXRlOiBEcmFmdDxTPiwgcGF5bG9hZDogUCkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6IChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IHVua25vd24pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIFNpbXBsaWZ5IHJlZHVjZXJzIHN0cnVjdHVyZSByZXF1aXJlZCBpbiBTbGljZSBjcmVhdGlvbiBvcHRpb24uXG4gKiBcbiAqIE5vcm1hbGx5LCB0byBjcmVhdGUgYSBzbGljZSwgeW91IG5lZWQgdG8gcHJvdmlkZSBhIHNsaWNlIG9wdGlvbiBwYXJhbXRlciBsaWtlOlxuICoge25hbWU6IDxuYW1lPiwgaW5pdGlhbFN0YXRlOiA8dmFsdWU+LCByZWR1Y2Vyczoge1xuICogIGNhc2VSZWR1Y2VyKHN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGF5bG9hZFR5cGU+KSB7XG4gKiAgICAvLyBtYW5pcHVsYXRlIHN0YXRlIGRyYWZ0IHdpdGggZGVzdHJ1Y3RvcmVkIHBheWxvYWQgZGF0YVxuICogIH1cbiAqIH19XG4gKiBcbiAqIFVuY29udmVuaWVudCB0aGluZyBpcyB0aGUgXCJQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPlwiIHBhcnQgd2hpY2ggc3BlY2lmaWVkIGFzIHNlY29uZCBwYXJhbWV0ZXIgaW4gZXZlcnkgY2FzZSByZWR1Y2VyIGRlZmluaXRpb24sXG4gKiBhY3R1YWxseSB3ZSBvbmx5IGNhcmUgYWJvdXQgdGhlIFBheWxvYWQgdHlwZSBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBQYXlsb2FkQWN0aW9uIGluIGNhc2UgcmVkdWNlci5cbiAqIFxuICogdGhpcyBmdW5jdGlvbiBhY2NlcHQgYSBzaW1wbGlmaWVkIHZlcnNpb24gb2YgXCJjYXNlIHJlZHVjZXJcIiBpbiBmb3JtIG9mOiBcbiAqIHtcbiAqICAgIFtjYXNlTmFtZV06IChEcmFmdDxTdGF0ZT4sIHBheWxvYWQ6IGFueSkgPT4gRHJhZnQ8U3RhdGU+IHwgdm9pZDtcbiAqIH1cbiAqIFxuICogcmV0dXJuIGEgcmVndWxhciBDYXNlIHJlZHVjZXJzLCBub3QgbG9uZ2VyIG5lZWRzIHRvIFwiZGVzdHJ1Y3RvclwiIGFjdGlvbiBwYXJhbXRlciB0byBnZXQgcGF5bG9hZCBkYXRhLlxuICogXG4gKiBAcGFyYW0gcGF5bG9hZFJlZHVjZXJzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tUGF5bG9kUmVkdWNlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHBheWxvYWRSZWR1Y2VyczogUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSPik6XG5DcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ10ge1xuICBjb25zdCByZWR1Y2VycyA9IHt9IGFzIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXTtcbiAgZm9yIChjb25zdCBbY2FzZU5hbWUsIHNpbXBsZVJlZHVjZXJdIG9mIE9iamVjdC5lbnRyaWVzKHBheWxvYWRSZWR1Y2VycykpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgcmVkdWNlcnNbY2FzZU5hbWUgYXMga2V5b2YgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddXSA9IGZ1bmN0aW9uKHM6IERyYWZ0PFM+LCBhY3Rpb246IFBheWxvYWRBY3Rpb248YW55Pikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgcmV0dXJuIHNpbXBsZVJlZHVjZXIocywgYWN0aW9uLnBheWxvYWQpIGFzIHVua25vd247XG4gICAgfSBhcyBhbnk7XG4gIH1cbiAgcmV0dXJuIHJlZHVjZXJzO1xufVxuXG5jb25zdCBlcnJvclNsaWNlT3B0ID0ge1xuICBpbml0aWFsU3RhdGU6IHt9IGFzIEVycm9yU3RhdGUsXG4gIG5hbWU6ICdlcnJvcicsXG4gIHJlZHVjZXJzOiB7XG4gICAgcmVwb3J0QWN0aW9uRXJyb3IoczogRXJyb3JTdGF0ZSwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPEVycm9yPikge1xuICAgICAgcy5hY3Rpb25FcnJvciA9IHBheWxvYWQ7XG4gICAgfVxuICB9XG59O1xuXG5pZiAobW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmRlY2xpbmUoKTtcbn1cbiJdfQ==