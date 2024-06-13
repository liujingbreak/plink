/// <reference types="node" />
/// <reference types="node" />
import * as cp from 'child_process';
import { Worker } from 'node:cluster';
import * as rx from 'rxjs';
type ChildProcessFactory = () => cp.ChildProcess;
export type Options = {
    retryOnError?: number;
};
export default function (dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory[] | Worker[], opts?: Options): {
    action$: rx.Subject<"start" | "stop" | "restart">;
    serverState$: rx.BehaviorSubject<"stopped" | "started" | "stopping">;
};
export {};
