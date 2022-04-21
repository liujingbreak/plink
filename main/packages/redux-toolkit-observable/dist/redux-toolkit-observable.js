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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsOENBTTBCO0FBQzFCLHVEQUFzRTtBQUN0RSwrQkFBNkY7QUFDN0YsOENBQXFIO0FBbUJySCxTQUFnQixlQUFlLENBQXNCLEdBQUcsY0FBZ0Q7SUFFdEcsT0FBTyxJQUFBLHlCQUFNLEVBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUErQyxDQUFDO0FBQ2xHLENBQUM7QUFIRCwwQ0FHQztBQU1ELE1BQU0sb0JBQW9CLEdBQXFDO0lBQzdELE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRixDQUFDO0FBZUYsTUFBYSxZQUFZO0lBMEJ2QixZQUFvQixjQUF1RDtRQUF2RCxtQkFBYyxHQUFkLGNBQWMsQ0FBeUM7UUFuQjNFLFdBQU0sR0FBRyxJQUFJLHNCQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSTVGOztXQUVHO1FBQ0gsc0JBQWlCLEdBQUcsSUFBSSxvQkFBYSxDQUFxQixFQUFFLENBQUMsQ0FBQztRQUd0RCxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHlHQUF5RztRQUNqRyxhQUFRLEdBQUcsSUFBSSxvQkFBYSxDQUFRLEVBQUUsQ0FBQyxDQUFDO1FBS3hDLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1FBaVAzRCwwQkFBcUIsR0FBZSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFD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RSxhQUFhLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ3ZFLG1FQUFtRTtRQUNuRSxRQUFRLENBQUMsUUFBc0QsQ0FBQyxHQUFHLFVBQVMsQ0FBVyxFQUFFLE1BQTBCO1lBQ2pILDZEQUE2RDtZQUM3RCxPQUFPLGFBQWEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBWSxDQUFDO1FBQ3JELENBQVEsQ0FBQztLQUNWO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQVhELDhDQVdDO0FBRUQsTUFBTSxhQUFhLEdBQUc7SUFDcEIsWUFBWSxFQUFFLEVBQWdCO0lBQzlCLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBUSxFQUFFO1FBQ1IsaUJBQWlCLENBQUMsQ0FBYSxFQUFFLEVBQUMsT0FBTyxFQUF1QjtZQUM5RCxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUMxQixDQUFDO0tBQ0Y7Q0FDRixDQUFDO0FBRUYsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUN0QiIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cImVzMjAxN1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9obXItbW9kdWxlLmQudHNcIiAvPlxuLy8gZXNsaW50LWRpc2FibGUgIG1heC1saW5lLWxlbmd0aCBtZW1iZXItb3JkZXJpbmdcbi8qKlxuICogQSBjb21ibyBzZXQgZm9yIHVzaW5nIFJlZHV4LXRvb2xraXQgYWxvbmcgd2l0aCByZWR1eC1vYnNlcnZhYmxlXG4gKi9cbmltcG9ydCB7XG4gIENhc2VSZWR1Y2VyLCBjb21iaW5lUmVkdWNlcnMsIGNvbmZpZ3VyZVN0b3JlLFxuICBDb25maWd1cmVTdG9yZU9wdGlvbnMsIGNyZWF0ZVNsaWNlIGFzIHJlZHV4Q3JlYXRlU2xpY2UsIENyZWF0ZVNsaWNlT3B0aW9ucyxcbiAgRHJhZnQsIEVuaGFuY2VkU3RvcmUsIFBheWxvYWRBY3Rpb24sIFJlZHVjZXJzTWFwT2JqZWN0LFxuICBTbGljZSwgU2xpY2VDYXNlUmVkdWNlcnMsIFJlZHVjZXIsIFBheWxvYWRBY3Rpb25DcmVhdG9yLFxuICBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzLCBNaWRkbGV3YXJlLCBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWRcbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBjcmVhdGVFcGljTWlkZGxld2FyZSwgRXBpYywgb2ZUeXBlIH0gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFJlcGxheVN1YmplY3QsIFN1YmplY3QsIE9wZXJhdG9yRnVuY3Rpb24gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgbWVyZ2VNYXAsIHNoYXJlLCB0YWtlLCB0YWtlVW50aWwsIHRhcCwgY2F0Y2hFcnJvcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQge1BheWxvYWRBY3Rpb24sIFNsaWNlQ2FzZVJlZHVjZXJzLCBTbGljZX07XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFTbGljZVJlZHVjZXJzPFNTPiB7XG4gIF9pbml0OiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjx7aXNMYXp5OiBib29sZWFufT4+O1xuICBfY2hhbmdlOiBDYXNlUmVkdWNlcjxTUywgUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPj47XG59XG5cbmV4cG9ydCB0eXBlIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8U1MsXG4gIEFDUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFNTPj4gPSBWYWxpZGF0ZVNsaWNlQ2FzZVJlZHVjZXJzPFNTLCBBQ1I+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFNTPjtcblxuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQMSwgVDEgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUDEgZXh0ZW5kcyB1bmRlZmluZWQgPyB7dHlwZTogVDF9IDogUGF5bG9hZEFjdGlvbjxQMSwgVDE+PjtcbmV4cG9ydCBmdW5jdGlvbiBvZlBheWxvYWRBY3Rpb248UDEsIFAyLCBUMSBleHRlbmRzIHN0cmluZywgVDIgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4sIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAyLCBUMj4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQMSB8IFAyLCBUMSB8IFQyPj47XG5leHBvcnQgZnVuY3Rpb24gb2ZQYXlsb2FkQWN0aW9uPFAxLCBQMiwgUDMsIFQxIGV4dGVuZHMgc3RyaW5nLCBUMiBleHRlbmRzIHN0cmluZywgVDMgZXh0ZW5kcyBzdHJpbmc+KGFjdGlvbkNyZWF0b3JzMTogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAxLCBUMT4sXG4gIGFjdGlvbkNyZWF0b3JzMjogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAyLCBUMj4sIGFjdGlvbkNyZWF0b3JzMzogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAzLCBUMz4pOlxuICBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQMSB8IFAyIHwgUDMsIFQxIHwgVDIgfCBUMz4+O1xuZXhwb3J0IGZ1bmN0aW9uIG9mUGF5bG9hZEFjdGlvbjxQLCBUIGV4dGVuZHMgc3RyaW5nPiguLi5hY3Rpb25DcmVhdG9yczogQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPFAsIFQ+W10pOlxuICBPcGVyYXRvckZ1bmN0aW9uPGFueSwgUGF5bG9hZEFjdGlvbjxQLCBUPj4ge1xuICByZXR1cm4gb2ZUeXBlKC4uLmFjdGlvbkNyZWF0b3JzLm1hcChjID0+IGMudHlwZSkpIGFzIE9wZXJhdG9yRnVuY3Rpb248YW55LCBQYXlsb2FkQWN0aW9uPFAsIFQ+Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN0YXRlIHtcbiAgYWN0aW9uRXJyb3I/OiBFcnJvcjtcbn1cblxuY29uc3QgZGVmYXVsdFNsaWNlUmVkdWNlcnM6IFBhcnRpYWw8RXh0cmFTbGljZVJlZHVjZXJzPGFueT4+ID0ge1xuICBfY2hhbmdlOiAoc3RhdGUsIGFjdGlvbikgPT4ge1xuICAgIGFjdGlvbi5wYXlsb2FkKHN0YXRlKTtcbiAgfVxufTtcblxudHlwZSBJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+ID0gTXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlIGV4dGVuZHMgQ3JlYXRlU2xpY2VPcHRpb25zPGluZmVyIFMsIGFueSwgc3RyaW5nPiA/IFMgOiB1bmtub3duO1xuXG4vKiogQSBIZWxwZXIgaW5mZXIgdHlwZSAqL1xuZXhwb3J0IHR5cGUgSW5mZXJTbGljZVR5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9XG4gIFNsaWNlPEluZmVyU3RhdGVUeXBlPE15Q3JlYXRlU2xpY2VPcHRpb25zVHlwZT4sXG4gIChNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGUgZXh0ZW5kcyBDcmVhdGVTbGljZU9wdGlvbnM8YW55LCBpbmZlciBfQ2FzZVJlZHVjZXIsIHN0cmluZz4gPyBfQ2FzZVJlZHVjZXIgOiBTbGljZUNhc2VSZWR1Y2VyczxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+PikgJlxuICAgIEV4dHJhU2xpY2VSZWR1Y2VyczxJbmZlclN0YXRlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+PixcbiAgc3RyaW5nPjtcblxuLyoqIEEgSGVscGVyIGluZmVyIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEluZmVyQWN0aW9uc1R5cGU8TXlDcmVhdGVTbGljZU9wdGlvbnNUeXBlPiA9XG5JbmZlclNsaWNlVHlwZTxNeUNyZWF0ZVNsaWNlT3B0aW9uc1R5cGU+WydhY3Rpb25zJ107XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZUZhY3Rvcnkge1xuICAvKipcbiAgICogV2h5IEkgZG9uJ3QgdXNlIEVwaWMncyBzdGF0ZSQgcGFyYW1ldGVyOlxuICAgKiBcbiAgICogUmVkdXgtb2JzZXJ2YWJsZSdzIHN0YXRlJCBkb2VzIG5vdCBub3RpZnkgc3RhdGUgY2hhbmdlIGV2ZW50IHdoZW4gYSBsYXp5IGxvYWRlZCAocmVwbGFjZWQpIHNsaWNlIGluaXRpYWxpemUgc3RhdGUgXG4gICAqL1xuICByZWFsdGltZVN0YXRlJDogQmVoYXZpb3JTdWJqZWN0PHVua25vd24+O1xuICBzdG9yZSQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEVuaGFuY2VkU3RvcmU8YW55LCBQYXlsb2FkQWN0aW9uPGFueT4+IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBsb2ckOiBPYnNlcnZhYmxlPGFueVtdPjtcblxuICByb290U3RvcmVSZWFkeTogUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+Pj47XG4gIC8qKlxuICAgKiBzYW1lIGFzIHN0b3JlLmRpc3BhdGNoKGFjdGlvbiksIGJ1dCB0aGlzIG9uZSBnb2VzIHRocm91Z2ggUmVkdXgtb2JzZXJ2YWJsZSdzIGVwaWMgbWlkZGxld2FyZVxuICAgKi9cbiAgYWN0aW9uc1RvRGlzcGF0Y2ggPSBuZXcgUmVwbGF5U3ViamVjdDxQYXlsb2FkQWN0aW9uPGFueT4+KDIwKTtcbiAgcmVwb3J0QWN0aW9uRXJyb3I6IChlcnI6IEVycm9yKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgZXBpY1NlcSA9IDA7XG4gIC8vIHByaXZhdGUgZ2xvYmFsQ2hhbmdlQWN0aW9uQ3JlYXRvciA9IGNyZWF0ZUFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8YW55PikgPT4gdm9pZD4oJ19fZ2xvYmFsX2NoYW5nZScpO1xuICBwcml2YXRlIGRlYnVnTG9nID0gbmV3IFJlcGxheVN1YmplY3Q8YW55W10+KDE1KTtcbiAgcHJpdmF0ZSByZWR1Y2VyTWFwOiBSZWR1Y2Vyc01hcE9iamVjdDxhbnksIFBheWxvYWRBY3Rpb248YW55Pj47XG4gIHByaXZhdGUgZXBpY1dpdGhVbnN1YiQ6IFN1YmplY3Q8W0VwaWM8UGF5bG9hZEFjdGlvbjx1bmtub3duPj4sIHN0cmluZywgU3ViamVjdDxzdHJpbmc+XT47XG4gIHByaXZhdGUgZXJyb3JTbGljZTogSW5mZXJTbGljZVR5cGU8dHlwZW9mIGVycm9yU2xpY2VPcHQ+O1xuXG4gIHByaXZhdGUgc2hhcmVkU2xpY2VTdG9yZSQgPSBuZXcgTWFwPHN0cmluZywgT2JzZXJ2YWJsZTx1bmtub3duPj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHByZWxvYWRlZFN0YXRlOiBDb25maWd1cmVTdG9yZU9wdGlvbnNbJ3ByZWxvYWRlZFN0YXRlJ10pIHtcbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkID0gbmV3IEJlaGF2aW9yU3ViamVjdDx1bmtub3duPihwcmVsb2FkZWRTdGF0ZSk7XG4gICAgdGhpcy5lcGljV2l0aFVuc3ViJCA9IG5ldyBSZXBsYXlTdWJqZWN0PFtFcGljPFBheWxvYWRBY3Rpb248dW5rbm93bj4+LCBzdHJpbmcsIFN1YmplY3Q8c3RyaW5nPl0+KCk7XG4gICAgdGhpcy5sb2ckID0gdGhpcy5kZWJ1Z0xvZy5hc09ic2VydmFibGUoKTtcbiAgICB0aGlzLnJlZHVjZXJNYXAgPSB7fTtcblxuICAgIHRoaXMucm9vdFN0b3JlUmVhZHkgPSB0aGlzLnN0b3JlJC5waXBlKFxuICAgICAgZmlsdGVyKHN0b3JlID0+IHN0b3JlICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCkgYXMgUHJvbWlzZTxFbmhhbmNlZFN0b3JlPGFueSwgUGF5bG9hZEFjdGlvbj4+O1xuXG4gICAgY29uc3QgZXJyb3JTbGljZSA9IHRoaXMubmV3U2xpY2UoZXJyb3JTbGljZU9wdCk7XG5cbiAgICB0aGlzLmVycm9yU2xpY2UgPSBlcnJvclNsaWNlO1xuXG4gICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvciA9IHRoaXMuYmluZEFjdGlvbkNyZWF0b3JzKGVycm9yU2xpY2UpLnJlcG9ydEFjdGlvbkVycm9yO1xuICB9XG5cbiAgLy8gY29uZmlndXJlU3RvcmUobWlkZGxld2FyZXM/OiBNaWRkbGV3YXJlW10pOiB0aGlzO1xuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSBvcHQgQmUgYXdhcmUsIHR1cm4gb2ZmIG9wdGlvbiBcInNlcmlhbGl6YWJsZUNoZWNrXCIgYW5kIFwiaW1tdXRhYmxlQ2hlY2tcIiBmcm9tIFJlZHV4IGRlZmF1bHQgbWlkZGxld2FyZXNcbiAgICovXG4gIGNvbmZpZ3VyZVN0b3JlKG9wdD86IHtba2V5IGluIEV4Y2x1ZGU8J3JlZHVjZXInLCBrZXlvZiBDb25maWd1cmVTdG9yZU9wdGlvbnM8dW5rbm93biwgUGF5bG9hZEFjdGlvbjx1bmtub3duPj4+XTogQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+W2tleV19KSB7XG4gICAgaWYgKHRoaXMuc3RvcmUkLmdldFZhbHVlKCkpXG4gICAgICByZXR1cm4gdGhpcztcbiAgICBjb25zdCByb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICBjb25zdCBlcGljTWlkZGxld2FyZSA9IGNyZWF0ZUVwaWNNaWRkbGV3YXJlPFBheWxvYWRBY3Rpb248YW55Pj4oKTtcblxuICAgIGxldCBjZmdPcHQgPSBvcHQgYXMgQ29uZmlndXJlU3RvcmVPcHRpb25zPHVua25vd24sIFBheWxvYWRBY3Rpb248dW5rbm93bj4+O1xuICAgIGNvbnN0IG91ck1pZGRsd2FyZXMgPSBbdGhpcy5lcnJvckhhbmRsZU1pZGRsZXdhcmUsIGVwaWNNaWRkbGV3YXJlXTtcbiAgICBpZiAoY2ZnT3B0KSB7XG4gICAgICBjZmdPcHQucmVkdWNlciA9IHJvb3RSZWR1Y2VyO1xuICAgICAgY2ZnT3B0LmRldlRvb2xzID0gZmFsc2U7XG4gICAgICBpZiAoY2ZnT3B0Lm1pZGRsZXdhcmUpIHtcbiAgICAgICAgY29uc3QgZXhpdGluZ01pZCA9IGNmZ09wdC5taWRkbGV3YXJlO1xuICAgICAgICBpZiAodHlwZW9mIGV4aXRpbmdNaWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBjZmdPcHQubWlkZGxld2FyZSA9IChnZXREZWZhdWx0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLmV4aXRpbmdNaWQoZ2V0RGVmYXVsdCksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2ZnT3B0Lm1pZGRsZXdhcmUgPSBbLi4uZXhpdGluZ01pZCwgLi4ub3VyTWlkZGx3YXJlc107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNmZ09wdC5taWRkbGV3YXJlID0gKGdldERlZmF1bHQpID0+IHtcbiAgICAgICAgICByZXR1cm4gWy4uLmdldERlZmF1bHQoe3NlcmlhbGl6YWJsZUNoZWNrOiBmYWxzZSwgaW1tdXRhYmxlQ2hlY2s6IGZhbHNlfSksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjZmdPcHQgPSB7XG4gICAgICAgIHJlZHVjZXI6IHJvb3RSZWR1Y2VyLFxuICAgICAgICBtaWRkbGV3YXJlKGdldERlZmF1bHQpIHtcbiAgICAgICAgICByZXR1cm4gWy4uLmdldERlZmF1bHQoe3NlcmlhbGl6YWJsZUNoZWNrOiBmYWxzZSwgaW1tdXRhYmxlQ2hlY2s6IGZhbHNlfSksIC4uLm91ck1pZGRsd2FyZXNdO1xuICAgICAgICB9LFxuICAgICAgICBkZXZUb29sczogZmFsc2VcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3Qgc3RvcmUgPSBjb25maWd1cmVTdG9yZShjZmdPcHQpO1xuICAgIHRoaXMuc3RvcmUkLm5leHQoc3RvcmUpO1xuXG4gICAgc3RvcmUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gc3RvcmUuZ2V0U3RhdGUoKTtcbiAgICAgIHRoaXMucmVhbHRpbWVTdGF0ZSQubmV4dChzdGF0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlYWx0aW1lU3RhdGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgLy8gdGFwKCgpID0+IGNvbnNvbGUubG9nKCdzdGF0ZSBjaGFuZ2VkJykpLFxuICAgICAgdGFwKHN0YXRlID0+IHRoaXMuZGVidWdMb2cubmV4dChbJ3N0YXRlJywgc3RhdGVdKSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZXBpY01pZGRsZXdhcmUucnVuKChhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXBpY1dpdGhVbnN1YiQucGlwZShcbiAgICAgICAgdGFwKChbZXBpYywgZXBpY0lkLCB1bnN1Yl0pID0+IHtcbiAgICAgICAgICB0aGlzLmRlYnVnTG9nLm5leHQoW2BbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYF0pO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbcmVkdXgtdG9vbGtpdC1vYnNdICR7ZXBpY0lkfSBpcyBhYm91dCB0byBiZSBzdWJzY3JpYmVkYCk7XG4gICAgICAgIH0pLFxuICAgICAgICBtZXJnZU1hcCgoW2VwaWMsIGVwaWNJZCwgdW5zdWJdKSA9PiAoZXBpYyhhY3Rpb24kLCBzdGF0ZSQsIGRlcGVuZGVuY2llcykpXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAvLyB0YXAoYWN0aW9uID0+IGNvbnNvbGUubG9nKCdhY3Rpb246ICcsIGFjdGlvbi50eXBlKSksXG4gICAgICAgICAgICB0YWtlVW50aWwodW5zdWIucGlwZShcbiAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgbWFwKGVwaWNJZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsIGB1bnN1YnNjcmliZSBmcm9tICR7ZXBpY0lkfWBdKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW3JlZHV4LXRvb2xraXQtb2JzXSB1bnN1YnNjcmliZSAke2VwaWNJZH1gKTtcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5yZXBvcnRBY3Rpb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgdGFrZVVudGlsKGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlR5cGUoJ1NUT1BfRVBJQycpLFxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmRlYnVnTG9nLm5leHQoWydbcmVkdXgtdG9vbGtpdC1vYnNdJywgJ1N0b3AgYWxsIGVwaWNzJ10pKVxuICAgICAgICApKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEVwaWMoKGFjdGlvbiQpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFjdGlvbnNUb0Rpc3BhdGNoO1xuICAgIH0sICdpbnRlcm5hbERpc3BhdGNoZXInKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBvdXIgc3BlY2lhbCBzbGljZSB3aXRoIGEgZGVmYXVsdCByZWR1Y2VyIGFjdGlvbjogXG4gICAqIC0gYGNoYW5nZShzdGF0ZTogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjwoZHJhZnRTdGF0ZTogRHJhZnQ8U1M+KSA9PiB2b2lkPilgXG4gICAqIC0gaW5pdGlhbFN0YXRlIGlzIGxvYWRlZCBmcm9tIFN0YXRlRmFjdG9yeSdzIHBhcnRpYWwgcHJlbG9hZGVkU3RhdGVcbiAgICovXG4gIG5ld1NsaWNlPFMsIF9DYXNlUmVkdWNlciBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihcbiAgICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBfQ2FzZVJlZHVjZXIsIE5hbWU+KTpcbiAgICBTbGljZTxTLCBfQ2FzZVJlZHVjZXIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+IHtcblxuICAgIGNvbnN0IF9vcHQgPSBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPiwgTmFtZT47XG4gICAgY29uc3QgcmVkdWNlcnMgPSBfb3B0LnJlZHVjZXJzIGFzIFJlZHVjZXJXaXRoRGVmYXVsdEFjdGlvbnM8UywgX0Nhc2VSZWR1Y2VyPjtcblxuICAgIGlmIChyZWR1Y2Vycy5fY2hhbmdlID09IG51bGwpXG4gICAgICBPYmplY3QuYXNzaWduKF9vcHQucmVkdWNlcnMsIGRlZmF1bHRTbGljZVJlZHVjZXJzKTtcblxuICAgIGlmIChyZWR1Y2Vycy5faW5pdCA9PSBudWxsKSB7XG4gICAgICByZWR1Y2Vycy5faW5pdCA9IChkcmFmdCwgYWN0aW9uKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2cubmV4dChbJ1tyZWR1eC10b29sa2l0LW9ic10nLCBgc2xpY2UgXCIke29wdC5uYW1lfVwiIGlzIGNyZWF0ZWQgJHthY3Rpb24ucGF5bG9hZC5pc0xhenkgPyAnbGF6aWx5JyA6ICcnfWBdKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHJlbG9hZGVkU3RhdGUgJiYgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0LmluaXRpYWxTdGF0ZSwgdGhpcy5wcmVsb2FkZWRTdGF0ZVtvcHQubmFtZV0pO1xuICAgIH1cbiAgICBjb25zdCBzbGljZSA9IHJlZHV4Q3JlYXRlU2xpY2UoXG4gICAgICBvcHQgYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIF9DYXNlUmVkdWNlciAmIEV4dHJhU2xpY2VSZWR1Y2VyczxTPiwgTmFtZT4pO1xuXG4gICAgdGhpcy5hZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXIoc2xpY2UpO1xuICAgIGNvbnN0IHNsaWNlZFN0b3JlID0gKHRoaXMucmVhbHRpbWVTdGF0ZSQgYXMgU3ViamVjdDxSZWNvcmQ8c3RyaW5nLCBhbnk+PikucGlwZShcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgICAgbWFwKHMgPT4gc1tvcHQubmFtZV0pLFxuICAgICAgZmlsdGVyKHNzID0+IHNzICE9IG51bGwpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlKClcbiAgICApO1xuICAgIHRoaXMuc2hhcmVkU2xpY2VTdG9yZSQuc2V0KG9wdC5uYW1lLCBzbGljZWRTdG9yZSk7XG4gICAgcmV0dXJuIHNsaWNlO1xuICB9XG5cbiAgcmVtb3ZlU2xpY2Uoc2xpY2U6IHtuYW1lOiBzdHJpbmd9KSB7XG4gICAgZGVsZXRlIHRoaXMucmVkdWNlck1hcFtzbGljZS5uYW1lXTtcbiAgICBpZiAodGhpcy5nZXRSb290U3RvcmUoKSkge1xuICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnW3JlZHV4LXRvb2xraXQtb2JzXScsICdyZW1vdmUgc2xpY2UgJysgc2xpY2UubmFtZV0pO1xuICAgICAgY29uc3QgbmV3Um9vdFJlZHVjZXIgPSB0aGlzLmNyZWF0ZVJvb3RSZWR1Y2VyKCk7XG4gICAgICB0aGlzLmdldFJvb3RTdG9yZSgpIS5yZXBsYWNlUmVkdWNlcihuZXdSb290UmVkdWNlcik7XG4gICAgICB0aGlzLnNoYXJlZFNsaWNlU3RvcmUkLmRlbGV0ZShzbGljZS5uYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgYSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSBmcm9tIHRoaXMgZXBpY1xuICAgKiBAcGFyYW0gZXBpYyBcbiAgICogQHBhcmFtIGVwaWNOYW1lIGEgbmFtZSBmb3IgZGVidWcgYW5kIGxvZ2dpbmcgcHVycG9zZVxuICAgKi9cbiAgYWRkRXBpYzxTTCA9IFNsaWNlPGFueSwgYW55LCBzdHJpbmc+PihcbiAgICBlcGljOiBFcGljPFxuICAgICAgUGF5bG9hZEFjdGlvbjxhbnk+LCBhbnksXG4gICAgICB7XG4gICAgICAgIFtrZXkgaW4gU0wgZXh0ZW5kcyBTbGljZTxhbnksIGFueSwgaW5mZXIgTmFtZT4gPyBOYW1lIDogc3RyaW5nXTpcbiAgICAgICAgU0wgZXh0ZW5kcyBTbGljZTxpbmZlciBTLCBhbnksIGFueT4gPyBTIDogYW55XG4gICAgICB9XG4gICAgICA+LFxuICAgIGVwaWNOYW1lPzogc3RyaW5nKSB7XG4gICAgY29uc3QgZXBpY0lkID0gJ0VwaWMtJyArIChlcGljTmFtZSB8fCArK3RoaXMuZXBpY1NlcSk7XG4gICAgY29uc3QgdW5zdWJzY3JpYmVFcGljID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgIHRoaXMuZGVidWdMb2cubmV4dChbYFtyZWR1eC10b29sa2l0LW9ic10gJHtlcGljSWR9IGlzIGFkZGVkYF0pO1xuICAgIHRoaXMuZXBpY1dpdGhVbnN1YiQubmV4dChbZXBpYywgZXBpY0lkLCB1bnN1YnNjcmliZUVwaWNdKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVFcGljLm5leHQoZXBpY0lkKTtcbiAgICAgIHVuc3Vic2NyaWJlRXBpYy5jb21wbGV0ZSgpO1xuICAgIH07XG4gIH1cblxuICBzbGljZVN0YXRlPFNTLCBDYXNlUmVkdWNlcnMgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTUz4gPSBTbGljZUNhc2VSZWR1Y2VyczxTUz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTUywgQ2FzZVJlZHVjZXJzLCBOYW1lPik6IFNTIHtcbiAgICBjb25zdCBzdG9yZSA9IHRoaXMuZ2V0Um9vdFN0b3JlKCk7XG4gICAgcmV0dXJuIHN0b3JlID8gc3RvcmUuZ2V0U3RhdGUoKVtzbGljZS5uYW1lXSBhcyBTUyA6IHt9IGFzIFNTO1xuICB9XG5cbiAgc2xpY2VTdG9yZTxTUz4oc2xpY2U6IFNsaWNlPFNTPik6IE9ic2VydmFibGU8U1M+IHtcbiAgICByZXR1cm4gdGhpcy5zaGFyZWRTbGljZVN0b3JlJC5nZXQoc2xpY2UubmFtZSkgYXMgT2JzZXJ2YWJsZTxTUz47XG4gIH1cblxuICBnZXRFcnJvclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlU3RhdGUodGhpcy5lcnJvclNsaWNlKTtcbiAgfVxuXG4gIGdldEVycm9yU3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2VTdG9yZSh0aGlzLmVycm9yU2xpY2UpO1xuICB9XG5cbiAgZGlzcGF0Y2g8VD4oYWN0aW9uOiBQYXlsb2FkQWN0aW9uPFQ+KSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2Rpc3BhdGNoJywgYWN0aW9uLnR5cGUpO1xuICAgIHRoaXMuYWN0aW9uc1RvRGlzcGF0Y2gubmV4dChhY3Rpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVubGluayBSZWR1eCdzIGJpbmRBY3Rpb25DcmVhdG9ycywgb3VyIHN0b3JlIGlzIGxhemlseSBjcmVhdGVkLCBkaXNwYXRjaCBpcyBub3QgYXZhaWxhYmxlIGF0IGJlZ2lubmluZy5cbiAgICogUGFyYW1ldGVyIGlzIGEgU2xpY2UgaW5zdGVhZCBvZiBhY3Rpb24gbWFwXG4gICAqL1xuICBiaW5kQWN0aW9uQ3JlYXRvcnM8QT4oc2xpY2U6IHthY3Rpb25zOiBBfSlcbiAgICA6IEEge1xuXG4gICAgY29uc3QgYWN0aW9uTWFwID0ge30gYXMgQTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBhY3Rpb25DcmVhdG9yXSBvZiBPYmplY3QuZW50cmllcyhzbGljZS5hY3Rpb25zKSkge1xuICAgICAgY29uc3QgZG9BY3Rpb24gPSAoLi4ucGFyYW06IGFueVtdKSA9PiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgICBjb25zdCBhY3Rpb24gPSBhY3Rpb25DcmVhdG9yKC4uLnBhcmFtKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xuICAgICAgICByZXR1cm4gYWN0aW9uIGFzIHVua25vd247XG4gICAgICB9O1xuICAgICAgKGRvQWN0aW9uIGFzIHVua25vd24gYXMge3R5cGU6IHN0cmluZ30pLnR5cGUgPSAoYWN0aW9uQ3JlYXRvciBhcyBQYXlsb2FkQWN0aW9uQ3JlYXRvcikudHlwZTtcbiAgICAgIGFjdGlvbk1hcFtuYW1lXSA9IGRvQWN0aW9uIGFzIHVua25vd247XG4gICAgfVxuICAgIHJldHVybiBhY3Rpb25NYXA7XG4gIH1cblxuICBzdG9wQWxsRXBpY3MoKSB7XG4gICAgdGhpcy5zdG9yZSQucGlwZShcbiAgICAgIHRhcChzdG9yZSA9PiB7XG4gICAgICAgIGlmIChzdG9yZSlcbiAgICAgICAgICBzdG9yZS5kaXNwYXRjaCh7cGF5bG9hZDogbnVsbCwgdHlwZTogJ1NUT1BfRVBJQyd9KTtcbiAgICAgIH0pLFxuICAgICAgdGFrZSgxKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBnZXRSb290U3RvcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RvcmUkLmdldFZhbHVlKCk7XG4gIH1cblxuICBwcml2YXRlIGVycm9ySGFuZGxlTWlkZGxld2FyZTogTWlkZGxld2FyZSA9IChhcGkpID0+IHtcbiAgICByZXR1cm4gKG5leHQpID0+IHtcbiAgICAgIHJldHVybiAoYWN0aW9uOiBQYXlsb2FkQWN0aW9uKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2FjdGlvbiBpbiBlcnJvckhhbmRsZU1pZGRsZXdhcmUnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgICAgdGhpcy5kZWJ1Z0xvZy5uZXh0KFsnYWN0aW9uJywgYWN0aW9uICE9IG51bGwgPyBhY3Rpb24udHlwZSA6IGFjdGlvbl0pO1xuICAgICAgICAgIGNvbnN0IHJldCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tyZWR1eC10b29sa2l0LW9ic2VydmFibGVdIGZhaWxlZCBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZV0gYWN0aW9uIGRpc3BhdGNoIGVycm9yJywgZXJyKTtcbiAgICAgICAgICB0aGlzLnJlcG9ydEFjdGlvbkVycm9yKGVyciBhcyBFcnJvcik7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG4gIH07XG5cbiAgcHJpdmF0ZSBhZGRTbGljZU1heWJlUmVwbGFjZVJlZHVjZXI8U3RhdGUsIE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KFxuICAgIHNsaWNlOiBTbGljZTxTdGF0ZSwgU2xpY2VDYXNlUmVkdWNlcnM8U3RhdGU+ICYgRXh0cmFTbGljZVJlZHVjZXJzPFN0YXRlPiwgTmFtZT5cbiAgICApIHtcbiAgICB0aGlzLnJlZHVjZXJNYXBbc2xpY2UubmFtZV0gPSBzbGljZS5yZWR1Y2VyO1xuICAgIGlmICh0aGlzLmdldFJvb3RTdG9yZSgpKSB7XG4gICAgICBjb25zdCBuZXdSb290UmVkdWNlciA9IHRoaXMuY3JlYXRlUm9vdFJlZHVjZXIoKTtcbiAgICAgIHRoaXMuZ2V0Um9vdFN0b3JlKCkhLnJlcGxhY2VSZWR1Y2VyKG5ld1Jvb3RSZWR1Y2VyKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2goc2xpY2UuYWN0aW9ucy5faW5pdCh7aXNMYXp5OiB0cnVlfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luaXQoe2lzTGF6eTogZmFsc2V9KSk7XG4gICAgfVxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUm9vdFJlZHVjZXIoKTogUmVkdWNlcjxhbnksIFBheWxvYWRBY3Rpb24+IHtcbiAgICBjb25zdCBjb21iaW5lZCA9IGNvbWJpbmVSZWR1Y2Vycyh0aGlzLnJlZHVjZXJNYXApO1xuICAgIGNvbnN0IHJvb3RSZWR1Y2VyOiBSZWR1Y2VyPGFueSwgUGF5bG9hZEFjdGlvbjxhbnk+PiA9IChzdGF0ZSwgYWN0aW9uKSA9PiB7XG4gICAgICBpZiAoYWN0aW9uLnR5cGUgPT09ICc6OnN5bmNTdGF0ZScpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgICByZXR1cm4gYWN0aW9uLnBheWxvYWQoc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gICAgICAgIHJldHVybiBjb21iaW5lZChzdGF0ZSwgYWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiByb290UmVkdWNlcjtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXlsb2FkQ2FzZVJlZHVjZXJzPFMsIFIgZXh0ZW5kcyBTbGljZUNhc2VSZWR1Y2VyczxTPj4gPSB7XG4gIFtUIGluIGtleW9mIFJdOiBSW1RdIGV4dGVuZHMgKHM6IGFueSkgPT4gYW55ID9cbiAgICAoc3RhdGU6IERyYWZ0PFM+KSA9PiBTIHwgdm9pZCB8IERyYWZ0PFM+IDpcbiAgICBSW1RdIGV4dGVuZHMgKHM6IGFueSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGluZmVyIFA+KSA9PiBhbnkgP1xuICAgICAgKHN0YXRlOiBEcmFmdDxTPiwgcGF5bG9hZDogUCkgPT4gUyB8IHZvaWQgfCBEcmFmdDxTPiA6IChzdGF0ZTogRHJhZnQ8Uz4sIHBheWxvYWQ6IHVua25vd24pID0+IFMgfCB2b2lkIHwgRHJhZnQ8Uz47XG59O1xuXG4vKipcbiAqIFNpbXBsaWZ5IHJlZHVjZXJzIHN0cnVjdHVyZSByZXF1aXJlZCBpbiBTbGljZSBjcmVhdGlvbiBvcHRpb24uXG4gKiBcbiAqIE5vcm1hbGx5LCB0byBjcmVhdGUgYSBzbGljZSwgeW91IG5lZWQgdG8gcHJvdmlkZSBhIHNsaWNlIG9wdGlvbiBwYXJhbXRlciBsaWtlOlxuICoge25hbWU6IDxuYW1lPiwgaW5pdGlhbFN0YXRlOiA8dmFsdWU+LCByZWR1Y2Vyczoge1xuICogIGNhc2VSZWR1Y2VyKHN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGF5bG9hZFR5cGU+KSB7XG4gKiAgICAvLyBtYW5pcHVsYXRlIHN0YXRlIGRyYWZ0IHdpdGggZGVzdHJ1Y3RvcmVkIHBheWxvYWQgZGF0YVxuICogIH1cbiAqIH19XG4gKiBcbiAqIFVuY29udmVuaWVudCB0aGluZyBpcyB0aGUgXCJQYXlsb2FkQWN0aW9uPFBheWxvYWRUeXBlPlwiIHBhcnQgd2hpY2ggc3BlY2lmaWVkIGFzIHNlY29uZCBwYXJhbWV0ZXIgaW4gZXZlcnkgY2FzZSByZWR1Y2VyIGRlZmluaXRpb24sXG4gKiBhY3R1YWxseSB3ZSBvbmx5IGNhcmUgYWJvdXQgdGhlIFBheWxvYWQgdHlwZSBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBQYXlsb2FkQWN0aW9uIGluIGNhc2UgcmVkdWNlci5cbiAqIFxuICogdGhpcyBmdW5jdGlvbiBhY2NlcHQgYSBzaW1wbGlmaWVkIHZlcnNpb24gb2YgXCJjYXNlIHJlZHVjZXJcIiBpbiBmb3JtIG9mOiBcbiAqIHtcbiAqICAgIFtjYXNlTmFtZV06IChEcmFmdDxTdGF0ZT4sIHBheWxvYWQ6IGFueSkgPT4gRHJhZnQ8U3RhdGU+IHwgdm9pZDtcbiAqIH1cbiAqIFxuICogcmV0dXJuIGEgcmVndWxhciBDYXNlIHJlZHVjZXJzLCBub3QgbG9uZ2VyIG5lZWRzIHRvIFwiZGVzdHJ1Y3RvclwiIGFjdGlvbiBwYXJhbXRlciB0byBnZXQgcGF5bG9hZCBkYXRhLlxuICogXG4gKiBAcGFyYW0gcGF5bG9hZFJlZHVjZXJzIFxuICogQHJldHVybnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tUGF5bG9kUmVkdWNlcjxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+KHBheWxvYWRSZWR1Y2VyczogUGF5bG9hZENhc2VSZWR1Y2VyczxTLCBSPik6XG4gIENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSPlsncmVkdWNlcnMnXSB7XG4gIGNvbnN0IHJlZHVjZXJzID0ge30gYXMgQ3JlYXRlU2xpY2VPcHRpb25zPFMsIFI+WydyZWR1Y2VycyddO1xuICBmb3IgKGNvbnN0IFtjYXNlTmFtZSwgc2ltcGxlUmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMocGF5bG9hZFJlZHVjZXJzKSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICByZWR1Y2Vyc1tjYXNlTmFtZSBhcyBrZXlvZiBDcmVhdGVTbGljZU9wdGlvbnM8UywgUj5bJ3JlZHVjZXJzJ11dID0gZnVuY3Rpb24oczogRHJhZnQ8Uz4sIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxhbnk+KSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICByZXR1cm4gc2ltcGxlUmVkdWNlcihzLCBhY3Rpb24ucGF5bG9hZCkgYXMgdW5rbm93bjtcbiAgICB9IGFzIGFueTtcbiAgfVxuICByZXR1cm4gcmVkdWNlcnM7XG59XG5cbmNvbnN0IGVycm9yU2xpY2VPcHQgPSB7XG4gIGluaXRpYWxTdGF0ZToge30gYXMgRXJyb3JTdGF0ZSxcbiAgbmFtZTogJ2Vycm9yJyxcbiAgcmVkdWNlcnM6IHtcbiAgICByZXBvcnRBY3Rpb25FcnJvcihzOiBFcnJvclN0YXRlLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248RXJyb3I+KSB7XG4gICAgICBzLmFjdGlvbkVycm9yID0gcGF5bG9hZDtcbiAgICB9XG4gIH1cbn07XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGVjbGluZSgpO1xufVxuIl19