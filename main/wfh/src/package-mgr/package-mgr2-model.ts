import {PackageInfo } from './index';
export interface RootPackageJson {
  packages: string[];
  /** Connect with another repo directory which contains a packages.json.
   * Allow dependency reference to source packages which is located outside of current monorepo
   **/
  externalRepo?: string[];
  /**
   * The directory which contains source packages.
   * Allow dependency reference to source packages which is located outside of current monorepo
   */
  externalDir?: string[];
}

/** key is path, value is active mark, false means it will be deleted in the future */
export const externalProjects: Map<string, boolean> = new Map();
/** key is path, value is active mark, false means it will be deleted in the future */
export const externalSourceDirs: Map<string, boolean> = new Map();
export const projPkgMap: Map<string, string[]> = new Map();
export const srcPkgMap: Map<string, string[]> = new Map();
export const allPackages: Map<string, PackageInfo> = new Map();
// export const installSpaces = new Set<string>();
export const spacePkgMap: Map<string, Set<string>> = new Map();
// export const rootDir: string | undefined;
