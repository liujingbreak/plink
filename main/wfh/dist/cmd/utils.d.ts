import { PackagesState, PackageInfo } from '../package-mgr';
export declare function writeFile(file: string, content: string): void;
export declare function completePackageName(state: PackagesState, guessingNames: string[]): Generator<string | null, void, unknown>;
export declare function findPackagesByNames(state: PackagesState, guessingNames: string[]): Generator<PackageInfo | null>;
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
export declare function lookupPackageJson(moduleName: string): string | null;
