import { PlinkPackageLookup } from '@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils';
type TsconfigType = {
    extends?: string;
    include?: string[];
    exclude?: string[];
    compilerOptions: {
        paths: Record<string, string[]>;
        [prop: string]: any;
    };
};
export declare const plinkRootDir: string;
export declare const tsconfigFile: string;
export declare const tsconfigJson: TsconfigType;
declare const lookupTool: PlinkPackageLookup;
export declare const packagePathMap: Map<string, string>;
export { lookupTool };
