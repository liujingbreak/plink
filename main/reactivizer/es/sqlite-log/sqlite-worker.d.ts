import { SingleActionFactory, BaseReactorFactory, Action } from '@wfh/reactivizer';
export interface SqliteLogActions {
    connect(file: string): SingleActionFactory;
    logAction(controller: number, action: Action): SingleActionFactory;
    didConnect(): SingleActionFactory;
}
export declare const sqliteLogFac: BaseReactorFactory<SqliteLogActions, readonly [], import("@wfh/reactivizer").CoreOptions<SqliteLogActions>, []>;
