import { StateFactory, ofPayloadAction } from '../../redux-toolkit-observable/dist/redux-toolkit-observable';
export { createReducers } from '../../redux-toolkit-observable/dist/helper';
export { ofPayloadAction };
export declare function setSyncStateToMainProcess(enabled: boolean): void;
declare const PROCESS_MSG_TYPE = "rtk-observable:state";
export declare type ProcessStateSyncMsg = {
    type: typeof PROCESS_MSG_TYPE;
    data: string;
};
export declare function isStateSyncMsg(msg: unknown): msg is ProcessStateSyncMsg;
export declare const BEFORE_SAVE_STATE = "BEFORE_SAVE_STATE";
export declare const lastSavedState: any;
export declare const stateFactory: StateFactory;
export declare function startLogging(): void;
/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
export declare function saveState(): Promise<void>;
