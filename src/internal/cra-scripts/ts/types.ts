import {Configuration} from 'webpack';
import {CommandOption} from './build-options';
import ts from 'typescript';
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
  swSrc: string;
  publicUrlOrPath: string;
  // These properties only exist before ejecting:
  ownPath: string;
  ownNodeModules: string; // This is empty on npm 3
  appTypeDeclarations: string;
  ownTypeDeclarations: string;
}
export interface ReactScriptsHandler {
  changeCraPaths?(craPaths: CraScriptsPaths, env: string, cmdOpt: CommandOption): void;
  tsCompilerOptions?(compileOptionsJson: {[prop in keyof ts.CompilerOptions]: ts.CompilerOptionsValue}, cmdOpt: CommandOption): void;
  webpack?(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
export {default as webpack} from 'webpack';
