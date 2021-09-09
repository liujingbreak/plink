/// <reference types="node" />
import { WorkerOptions } from 'worker_threads';
export interface InitialOptions {
    verbose?: boolean;
    /** After worker being created, the exported function will be run,
     * You can put any initial logic in it, like calling `require('source-map-support/register')` or
     * setup process event handling for uncaughtException and unhandledRejection.
     */
    initializer?: {
        file: string;
        exportFn?: string;
    };
}
export interface Task {
    file: string;
    /**
     * A function which can return Promise or non-Promise value
     */
    exportFn: string;
    args?: any[];
    /** Worker message transferList, see
     * https://nodejs.org/docs/latest-v12.x/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist
     * may be a list of ArrayBuffer, MessagePort and FileHandle objects. After transferring,
     * they will not be usable on the sending side of the channel anymore (even if they are not contained in value).
     * Unlike with child processes, transferring handles such as network sockets is currently not supported.
     * If value contains SharedArrayBuffer instances, those will be accessible from either thread.
     * They cannot be listed in transferList.
     * value may still contain ArrayBuffer instances that are not in transferList;
     * in that case, the underlying memory is copied rather than moved.
     */
    transferList?: WorkerOptions['transferList'];
}
export interface TaskResult {
    transferList?: WorkerOptions['transferList'];
}
export interface Command {
    exit: boolean;
}
