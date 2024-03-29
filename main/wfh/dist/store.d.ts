import * as rx from 'rxjs';
import { StateFactory, ofPayloadAction } from '../../packages/redux-toolkit-observable/dist/redux-toolkit-observable';
import { createReducers, action$Of, castByActionType } from '../../packages/redux-toolkit-observable/dist/helper';
export { ofPayloadAction, createReducers, action$Of, castByActionType };
declare const PROCESS_MSG_TYPE = "rtk-observable:state";
export type ProcessStateSyncMsg = {
    type: typeof PROCESS_MSG_TYPE;
    data: string;
};
export declare function isStateSyncMsg(msg: unknown): msg is ProcessStateSyncMsg;
export declare const BEFORE_SAVE_STATE = "BEFORE_SAVE_STATE";
export declare const lastSavedState: any;
/**
 * Before actuall using stateFactory, I must execute `stateFactory.configureStore();`,
 * and its better after most of the slices havee been defined
 */
export declare const stateFactory: StateFactory;
export type StoreSetting = {
    actionOnExit: 'save' | 'send' | 'none';
    stateChangeCount: number;
};
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<import("../../packages/redux-toolkit-observable/dist/helper").RegularReducers<StoreSetting, {
    changeActionOnExit(s: StoreSetting, mode: StoreSetting['actionOnExit']): void;
    /**
     * Dispatch this action before you explicitly run process.exit(0) to quit, because "beforeExit"
     * won't be triggered prior to process.exit(0)
     */
    processExit(): void;
    storeSaved(): void;
}> & import("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<StoreSetting>, "storeSetting">;
export declare const processExitAction$: rx.Observable<{
    type: "storeSetting/processExit";
} | {
    payload: void;
    type: "storeSetting/processExit";
}>;
export declare const storeSavedAction$: rx.Observable<{
    type: "storeSetting/storeSaved";
} | {
    payload: void;
    type: "storeSetting/storeSaved";
}>;
export declare function startLogging(): void;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls,
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
