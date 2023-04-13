import { PlinkSettings } from '@wfh/plink';
import { CommandOption } from './build-options';
export declare const getReportDir: () => string;
export declare function drawPuppy(slogon: string, message?: string): void;
export declare function printConfig(c: any, level?: number): string;
export declare function getCmdOptions(): CommandOption;
export type BuildCliOpts = {
    watch: boolean;
    include?: string[];
    publicUrl?: string;
    sourceMap?: boolean;
    poll: boolean;
    tsck: CommandOption['tsck'];
} & NonNullable<PlinkSettings['cliOptions']>;
export declare function saveCmdOptionsToEnv(pkgName: string, cmdName: string, opts: BuildCliOpts, buildType: 'app' | 'lib'): CommandOption;
export declare function craVersionCheck(): void;
export declare function runTsConfigHandlers(compilerOptions: any): void;
export declare function runTsConfigHandlers4LibTsd(): {
    paths: {};
};
