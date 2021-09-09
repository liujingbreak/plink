import { CommandOption } from './build-options';
import { commander } from '@wfh/plink';
export declare const getReportDir: () => string;
export declare function drawPuppy(slogon: string, message?: string): void;
export declare function printConfig(c: any, level?: number): string;
export declare function getCmdOptions(): CommandOption;
export declare function saveCmdOptionsToEnv(pkgName: string, cmd: commander.Command, buildType: 'app' | 'lib'): CommandOption;
export declare function craVersionCheck(): void;
export declare function runTsConfigHandlers(compilerOptions: any): void;
export declare function runTsConfigHandlers4LibTsd(): {
    paths: {};
};
