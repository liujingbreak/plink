import * as rx from 'rxjs';
import { StateFactory, ofPayloadAction } from '../../packages/redux-toolkit-observable/dist/redux-toolkit-observable';
import { createReducers, action$Of } from '../../packages/redux-toolkit-observable/dist/helper';
export { ofPayloadAction, createReducers, action$Of };
declare const PROCESS_MSG_TYPE = "rtk-observable:state";
export declare type ProcessStateSyncMsg = {
    type: typeof PROCESS_MSG_TYPE;
    data: string;
};
export declare function isStateSyncMsg(msg: unknown): msg is ProcessStateSyncMsg;
export declare const BEFORE_SAVE_STATE = "BEFORE_SAVE_STATE";
export declare const lastSavedState: any;
export declare const stateFactory: StateFactory;
declare type StoreSetting = {
    actionOnExit: 'save' | 'send' | 'none';
    stateChangeCount: number;
};
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<import("../../packages/redux-toolkit-observable/dist/helper").RegularReducers<StoreSetting, {
    changeActionOnExit(s: StoreSetting, mode: StoreSetting['actionOnExit']): void;
    /**
     * Dispatch this action before you explicitly run process.exit(0) to quit, because "beforeExit"
     * won't be triggered prior to process.exit(0)
     */
    processExit(s: StoreSetting): void;
    storeSaved(s: StoreSetting): void;
}> & import("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<StoreSetting>>;
export declare const processExitAction$: rx.Observable<{
    type: string;
}>;
export declare const storeSavedAction$: rx.Observable<{
    type: string;
}>;
export declare function startLogging(): void;
