import { GlobalOptions } from '@wfh/plink';
export interface CBOptions extends GlobalOptions {
    forTemplate: boolean;
    dryRun: boolean;
}
export declare function generate(packageName: string, cmdName: string, opts: CBOptions): Promise<void>;
