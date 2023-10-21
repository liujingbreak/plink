import {Configuration} from 'webpack';
import ts from 'typescript';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import {CommandOption} from './build-options';
export interface CraScriptsPaths {
  dotenv: string;
  appPath: string;
  appBuild: string;
  appPublic: string;
  appHtml: string;
  appIndexJs: string;
  appPackageJson: string;
  appSrc: string;
  appTsConfig: string;
  appJsConfig: string;
  yarnLockFile: string;
  testsSetup: string;
  proxySetup: string;
  appNodeModules: string;
  appWebpackCache: string;
  appTsBuildInfoFile: string;
  swSrc: string;
  publicUrlOrPath: string;
  // These properties only exist before ejecting:
  ownPath: string;
  ownNodeModules: string; // This is empty on npm 3
  appTypeDeclarations: string;
  ownTypeDeclarations: string;

  // A simlink path to appIndexJs which is under node_modules
  // plinkEntryFileSymlink: string;
}
export interface ReactScriptsHandler {
  /** Change CRA's paths  */
  changeCraPaths?(craPaths: CraScriptsPaths, env: string, cmdOpt: CommandOption): void;
  /** change Typescript compiler options for CRA's fork-ts-checker  */
  tsCheckCompilerOptions?(compileOptionsJson: {[prop in keyof ts.CompilerOptions]: ts.CompilerOptionsValue}, cmdOpt: CommandOption): void;
  /** In build "lib" mode, change Typescript compiler options for Plink's TSC command which generates TSD files  */
  libTsdCompilerOptions?(compileOptionsJson: {[prop in keyof ts.CompilerOptions]: ts.CompilerOptionsValue}, cmdOpt: CommandOption): void;
  webpack?(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
export {default as webpack} from 'webpack';

export const PKG_LIB_ENTRY_PROP = 'cra-lib-entry';
export const PKG_LIB_ENTRY_DEFAULT = 'public_api.ts';
export const PKG_APP_ENTRY_PROP = 'cra-app-entry';
export const PKG_APP_ENTRY_DEFAULT = 'start.tsx';

export type ForkTsCheckerWebpackPluginOptions = NonNullable<ConstructorParameters<typeof ForkTsCheckerWebpackPlugin>[0]>;
export type ForkTsCheckerWebpackPluginTypescriptOpts = Exclude<NonNullable<ForkTsCheckerWebpackPluginOptions['typescript']>, boolean>;
