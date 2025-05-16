import { PackageInfo, PackagesState } from '../package-mgr';
export declare function completePackageName(guessingNames: Iterable<string>): Generator<string | null, void, unknown>;
export declare function completePackageName(state: PackagesState, guessingNames: Iterable<string>): Generator<string | null, void, unknown>;
/** Use package-utils.ts#lookForPackages() */
export declare function findPackagesByNames(guessingNames: Iterable<string>): Generator<PackageInfo | null | undefined>;
export declare function findPackagesByNames(state: PackagesState, guessingNames: Iterable<string>): Generator<PackageInfo | null | undefined>;
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
export declare function lookupPackageJson(moduleName: string): string | null;
export declare function hl(text: string): string;
export declare function hlDesc(text: string): string;
export declare function arrayOptionFn(curr: string, prev: string[] | undefined): string[] | undefined;
