import {PackageInfo} from '@wfh/plink';

export interface BuildOptions {
  statsJson: boolean;
  progress: boolean;
}

export interface CommandOption {
  cmd: string;
  /** "lib" stands for library build mode, "app" stands for application build mode  */
  buildType: 'lib' | 'app' | 'dll';
  /** package name */
  /** For buld command like cra-start, cra-build, it means for build entries */
  buildTargets: {pkg?: PackageInfo; file?: string}[];
  refDllManifest?: string[];
  watch: boolean;
  devMode: boolean;
  /** Be aware that process.env.PUBLIC_URL could be the actual setting approach, do not rely on this property */
  publicUrl?: string;
  // external: string[];
  includes?: string[];
  webpackEnv: 'development' | 'production';
  usePoll: boolean;
  /** use fork-ts-checker */
  tsck: boolean;
  // argv: Map<string, string|boolean>;
}
