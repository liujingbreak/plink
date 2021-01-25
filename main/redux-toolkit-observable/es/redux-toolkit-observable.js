/// <reference lib="es2017" />
/// <reference path="./hmr-module.d.ts" />
// tslint:disable: max-line-length member-ordering
/**
 * A combo set for using Redux-toolkit along with redux-observable
 */
import { combineReducers, configureStore, createSlice as reduxCreateSlice } from '@reduxjs/toolkit';
// import {Action} from 'redux';
import { createEpicMiddleware, ofType } from 'redux-observable';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, take, takeUntil, tap, catchError } from 'rxjs/operators';
export function ofPayloadAction(...actionCreators) {
    return ofType(...actionCreators.map(c => c.type));
}
const defaultSliceReducers = {
    _change: (state, action) => {
        action.payload(state);
    }
};
export class StateFactory {
    constructor(preloadedState) {
        this.preloadedState = preloadedState;
        this.store$ = new BehaviorSubject(undefined);
        /**
         * Unlike store.dispatch(action),
         * If you call next() on this subject, it can save action dispatch an action even before store is configured
         */
        this.actionsToDispatch = new ReplaySubject(20);
        this.epicSeq = 0;
        // private globalChangeActionCreator = createAction<(draftState: Draft<any>) => void>('__global_change');
        this.debugLog = new ReplaySubject(15);
        this.errorHandleMiddleware = (api) => {
            return (next) => {
                return (action) => {
                    try {
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
        this.realtimeState$ = new BehaviorSubject(preloadedState);
        this.epicWithUnsub$ = new ReplaySubject();
        this.log$ = this.debugLog.asObservable();
        this.reducerMap = {};
        this.rootStoreReady = this.store$.pipe(filter(store => store != null), take(1)).toPromise();
        const errorSlice = this.newSlice(errorSliceOpt);
        this.errorSlice = errorSlice;
        this.reportActionError = this.bindActionCreators(errorSlice).reportActionError;
    }
    configureStore(middlewares) {
        if (this.store$.getValue())
            return this;
        const rootReducer = this.createRootReducer();
        const epicMiddleware = createEpicMiddleware();
        const middleware = middlewares ? [epicMiddleware, this.errorHandleMiddleware, ...middlewares] : [epicMiddleware, this.errorHandleMiddleware];
        const store = configureStore({
            reducer: rootReducer,
            // preloadedState: this.preloadedState,
            middleware
        });
        this.store$.next(store);
        store.subscribe(() => {
            const state = store.getState();
            this.realtimeState$.next(state);
        });
        this.realtimeState$.pipe(distinctUntilChanged(), 
        // tap(() => console.log('state changed')),
        tap(state => this.debugLog.next(['state', state]))).subscribe();
        epicMiddleware.run((action$, state$, dependencies) => {
            return this.epicWithUnsub$.pipe(mergeMap(([epic, unsub]) => epic(action$, state$, dependencies)
                .pipe(takeUntil(unsub.pipe(take(1), tap(epicId => {
                this.debugLog.next(['[redux-toolkit-obs]', `unsubscribe from ${epicId}`]);
            }))), catchError((err, src) => {
                this.reportActionError(err);
                console.error(err);
                return src;
            }))), 
            // tslint:disable-next-line: no-console
            takeUntil(action$.pipe(ofType('STOP_EPIC'), tap(() => this.debugLog.next(['[redux-toolkit-obs]', 'Stop all epics'])))));
        });
        this.addEpic((action$) => {
            return this.actionsToDispatch;
        });
        // this.actionsToDispatch.pipe(
        //   tap(action => store.dispatch(action))
        // ).subscribe();
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
        const slice = reduxCreateSlice(opt);
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
     */
    addEpic(epic) {
        const epicId = 'Epic-' + ++this.epicSeq;
        const unsubscribeEpic = new Subject();
        this.epicWithUnsub$.next([epic, unsubscribeEpic]);
        this.debugLog.next(['[redux-toolkit-obs]', epicId + ' is added']);
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
        return this.realtimeState$.pipe(map(s => s[slice.name]), filter(ss => ss != null), distinctUntilChanged());
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
        for (const [sliceName, actionCreator] of Object.entries(slice.actions)) {
            const name = sliceName;
            const doAction = (...param) => {
                const action = actionCreator(...param);
                this.dispatch(action);
                return action;
            };
            actionMap[name] = doAction;
        }
        return actionMap;
    }
    stopAllEpics() {
        this.store$.pipe(tap(store => {
            if (store)
                store.dispatch({ payload: null, type: 'STOP_EPIC' });
        }), take(1)).subscribe();
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
        return combineReducers(this.reducerMap);
    }
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDhCQUE4QjtBQUM5QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xEOztHQUVHO0FBQ0gsT0FBTyxFQUNRLGVBQWUsRUFBRSxjQUFjLEVBQ3JCLFdBQVcsSUFBSSxnQkFBZ0IsRUFJdkQsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQixnQ0FBZ0M7QUFDaEMsT0FBTyxFQUFFLG9CQUFvQixFQUFRLE1BQU0sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQWMsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFhL0csTUFBTSxVQUFVLGVBQWUsQ0FBSSxHQUFHLGNBQTZDO0lBRWpGLE9BQU8sTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BELENBQUM7QUFvQkQsTUFBTSxvQkFBb0IsR0FBcUM7SUFDN0QsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNGLENBQUM7QUFZRixNQUFNLE9BQU8sWUFBWTtJQTJCdkIsWUFBb0IsY0FBdUQ7UUFBdkQsbUJBQWMsR0FBZCxjQUFjLENBQXlDO1FBcEJuRSxXQUFNLEdBQUcsSUFBSSxlQUFlLENBQXFELFNBQVMsQ0FBQyxDQUFDO1FBSXBH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