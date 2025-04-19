import { Action, SingleActionFactory, BaseReactorFactory } from '@wfh/reactivizer';
export type LogItem = [servicePrefix: string, ReturnType<Action['toJson']>];
export type ThreadedLogItem = [threadId: number, ...LogItem];
interface SqliteLogActions {
    startWorker(dbFile: string): SingleActionFactory;
    appendLog(...content: ThreadedLogItem): SingleActionFactory;
    stop(): SingleActionFactory;
}
interface SqliteLogEvents extends SqliteLogActions {
    onError(err: Error): SingleActionFactory;
    onExit(): SingleActionFactory;
    isWorkerReady(state: 'ready' | 'query' | 'none'): SingleActionFactory;
    hasPendingLog(num: number): SingleActionFactory;
}
export declare const sqliteLogFac: BaseReactorFactory<SqliteLogEvents, readonly ["isWorkerReady", "hasPendingLog"], import("@wfh/reactivizer").CoreOptions<SqliteLogEvents>, []>;
/**
 * @param dbFile you shall only provide this parameter when it run main thread, once
 * this paramter is provided then it will spawn a specific worker thread to work on Sqlite.
 *
 * @return a function to shutdown worker thread and close database, if
 * current thread is not the original main thread which starts Sqlite worker thread (by
 * providing parameter "dbFile"), then you should run the returned "stop" function.
 */
export declare function useAsInitOption(dbFile?: string | null, enableLog?: boolean): {
    stop(): Promise<[import("@wfh/reactivizer").ActionMeta]>;
    waitForPending(): Promise<[import("@wfh/reactivizer").ActionMeta, num: number]>;
};
export {};
