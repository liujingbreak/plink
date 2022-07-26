/// <reference types="node" />
import * as cp from 'child_process';
import * as rx from 'rxjs';
declare type ChildProcessFactory = () => cp.ChildProcess;
export declare type Options = {
    retryOnError?: number;
};
export default function (dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory[], opts?: Options): {
    action$: rx.Subject<"stop" | "start" | "restart">;
    serverState$: rx.BehaviorSubject<"stopped" | "started" | "starting" | "stopping">;
};
export {};
