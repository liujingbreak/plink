import * as rx from 'rxjs';
export declare const isWin32: boolean;
export declare function workDirChangedByCli(): {
    workdir: string | null;
    argv: string[];
};
export default function run(moduleName: string, opts: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
}, bootStrap: () => (() => (rx.ObservableInput<unknown> | void))[]): void;
