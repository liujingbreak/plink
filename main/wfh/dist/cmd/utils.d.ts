import type { PackagesState, PackageInfo } from '../package-mgr';
import * as _ from 'lodash';
export declare function writeFile(file: string, content: string): void;
export declare function completePackageName(state: PackagesState, guessingNames: string[]): Generator<string | null, void, unknown>;
export declare function findPackagesByNames(state: PackagesState, guessingNames: string[]): Generator<PackageInfo | null>;
export declare const findPackageJsonPath: typeof _findPackageJsonPath & _.MemoizedFunction;
declare function _findPackageJsonPath(moduleName: string): string | null;
export {};
