import { StateFactory, ofPayloadAction } from '../../redux-toolkit-observable/dist/redux-toolkit-observable';
export { ofPayloadAction };
export declare const lastSavedState: any;
export declare const stateFactory: StateFactory;
export declare function startLogging(): Promise<void>;
/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
export declare function saveState(): Promise<void>;
