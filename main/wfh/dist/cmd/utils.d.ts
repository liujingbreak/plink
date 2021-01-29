import { PackagesState, PackageInfo } from '../package-mgr';
export declare function completePackageName(state: PackagesState, guessingNames: string[]): Generator<string | null, void, unknown>;
/** Use package-utils.ts#lookForPackages() */
export declare function findPackagesByNames(state: PackagesState, guessingNames: string[]): Generator<PackageInfo | null>;
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
export declare function lookupPackageJson(moduleName: string): string | null;
export declare function hl(text: string): string;
export declare function hlDesc(text: string): string;
export declare function arrayOptionFn(curr: string, prev: string[] | undefined): string[] | undefined;
