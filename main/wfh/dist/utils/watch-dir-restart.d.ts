/// <reference types="node" />
import * as cp from 'child_process';
import * as rx from 'rxjs';
declare type ChildProcessFactory = () => cp.ChildProcess[] | rx.Observable<cp.ChildProcess>;
export default function (dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory): {
    action$: rx.Subject<"start" | "stop" | "restart">;
    serverState$: rx.BehaviorSubject<"stopped" | "started" | "starting" | "stopping">;
};
export {};
