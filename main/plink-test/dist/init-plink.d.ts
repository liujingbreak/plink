import { TsconfigType } from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';
export declare const plinkRootDir: string;
export declare const tsconfigFile: string;
export declare const tsconfigJson: TsconfigType;
export declare const packageToPathMap: Map<string, string>;
export declare function lookupPackage(file: string): string | null | undefined;
