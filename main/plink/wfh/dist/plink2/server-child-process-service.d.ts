import { SimplexReactor } from '@wfh/reactivizer';
import { CmdChildProcessInput, CmdChildProcessEvents } from './cmd.types';
declare const tableFor: readonly ["setRootDir", "onCommanderInited"];
export type ServcerChildProcessEntry = SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, typeof tableFor>;
export declare function createService(log: (...args: string[]) => void): SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, readonly ["setRootDir", "onCommanderInited"], object>;
export {};
