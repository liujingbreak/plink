import { SimplexReactor } from '@wfh/reactivizer';
import { CmdChildProcessInput, CmdChildProcessEvents } from './cmd.types';
export declare const service: SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, readonly ["setRootDir", "onCommanderInited"]>;
