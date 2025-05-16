import { SingleActionFactory, BaseReactorFactory, SimplexReactorOfFac } from '@wfh/reactivizer';
import { ThreadedLogItem } from './sqlite-api';
export interface WorkerDataType {
    dbFile?: string;
    enableWorkerLog?: boolean;
}
export interface SqliteLogWorkerActions {
    /** response is isReady */
    queryReady(): SingleActionFactory;
    exit(): SingleActionFactory;
    insertLogs(...items: ThreadedLogItem[]): SingleActionFactory;
    list(offset: number, limit: number): SingleActionFactory;
}
export interface SqliteLogWokerMsg extends SqliteLogWorkerActions {
    /** As response to queryReady */
    isReady(): SingleActionFactory;
    onReady(): SingleActionFactory;
    didList(): SingleActionFactory;
    trackableError(err: unknown, label?: string | null): SingleActionFactory;
}
declare const workerFac: BaseReactorFactory<SqliteLogWokerMsg, readonly [], import("@wfh/reactivizer").CoreOptions<SqliteLogWokerMsg>, []>;
export type SqliteLogWorker = SimplexReactorOfFac<typeof workerFac>;
export {};
