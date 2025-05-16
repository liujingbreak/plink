import { Action, SingleActionFactory, BaseReactorFactory } from '@wfh/reactivizer';
export type LogItem = [servicePrefix: string, ReturnType<Action['toJson']>];
export type ThreadedLogItem = [threadId: number, ...LogItem];
interface SqliteLog {
    onError(err: Error): SingleActionFactory;
    isWorkerReady(ready: boolean): SingleActionFactory;
    onExit(): SingleActionFactory;
    stop(): SingleActionFactory;
}
export declare const sqliteLogFac: BaseReactorFactory<SqliteLog, readonly ["isWorkerReady"], import("@wfh/reactivizer").CoreOptions<SqliteLog>, [dbFile: string]>;
/**
 * To explicitly quit sqlite database writing, dispatch "stop" action of returned service
 * ```
 * const {ft} = startSqlite(...);
 * ft.stop().dp();
 * ```
 */
export declare function startSqlite(dbFile: string, enableSelfLog?: boolean): import("@wfh/reactivizer").SimplexReactor<SqliteLog, readonly ["isWorkerReady"], object>;
/** @return a function to shutdown worker thread and close database */
export declare function useAsInitOption(dbFile: string, enableSelfLog?: boolean): () => void;
export declare function handleRawLog(...content: LogItem): void;
export {};
