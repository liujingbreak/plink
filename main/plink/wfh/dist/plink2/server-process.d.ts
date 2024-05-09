/// <reference types="node" />
/// <reference types="node" />
import stream from 'node:stream';
import * as cp from 'node:child_process';
import { SingleActionFactory, ReactorComposite2 } from '@wfh/reactivizer';
interface ProcessActions {
    getProcessFor(cwd: string): SingleActionFactory;
    sendCommand(screenSize: [number, number], cwd: string, cmd: string[], ouput: stream.Writable): SingleActionFactory;
    interrupt(cwd: string): SingleActionFactory;
}
interface ProcessEvents {
    processFor(p: cp.ChildProcess | 'main', rootDir: string): SingleActionFactory;
    /** ActionMeta is related to processFor */
    onChildProcessReady(plinkRootDir: string): SingleActionFactory;
    onCommandDoneAnyway(): SingleActionFactory;
}
export declare function createProcessManager(log: (...m: any[]) => void): ReactorComposite2<ProcessActions, ProcessEvents, readonly [], readonly []>;
export {};
