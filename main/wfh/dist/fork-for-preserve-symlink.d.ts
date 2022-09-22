import * as rx from 'rxjs';
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            __plinkLogMainPid: string;
            __plink_fork_main?: string;
        }
    }
}
export declare const isWin32: boolean;
export declare function workDirChangedByCli(): {
    workdir: string | null;
    argv: string[];
};
export default function run(moduleName: string, opts: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
}, bootStrap: () => ((Array<() => rx.ObservableInput<unknown>>) | void)): void;
