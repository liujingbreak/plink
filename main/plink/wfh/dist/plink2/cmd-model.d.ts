import { ReactorComposite2, SingleActionFactory } from '@wfh/reactivizer';
interface CmdActions {
    setRootDir(dir: string): SingleActionFactory;
    enableRxMessageTrace(enabled: boolean): SingleActionFactory;
    shutdown(): SingleActionFactory;
}
interface CmdEvents {
    saved(): SingleActionFactory;
    load(done: boolean): SingleActionFactory;
}
export declare const cmdModelService: ReactorComposite2<CmdActions, CmdEvents, readonly ["enableRxMessageTrace", "setRootDir"], readonly ["load"]>;
export {};
