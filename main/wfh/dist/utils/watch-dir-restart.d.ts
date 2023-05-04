/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import * as cp from 'child_process';
import { Worker } from 'node:cluster';
import * as rx from 'rxjs';
declare type ChildProcessFactory = () => cp.ChildProcess;
export declare type Options = {
    retryOnError?: number;
};
export default function (dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory[] | Worker[], opts?: Options): {
    action$: rx.Subject<"stop" | "start" | "restart">;
    serverState$: rx.BehaviorSubject<"stopped" | "started" | "stopping">;
};
export {};
