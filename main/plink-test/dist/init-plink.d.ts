import { PlinkPackageLookup } from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';
import { TsconfigType } from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';
export declare const plinkRootDir: string;
export declare const tsconfigFile: string;
export declare const tsconfigJson: TsconfigType;
declare const lookupTool: PlinkPackageLookup;
export declare const packagePathMap: Map<string, string>;
export { lookupTool };
