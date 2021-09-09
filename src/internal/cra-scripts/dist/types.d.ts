import { Configuration } from 'webpack';
import { CommandOption } from './build-options';
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
    ownPath: string;
    ownNodeModules: string;
    appTypeDeclarations: string;
    ownTypeDeclarations: string;
}
export interface ReactScriptsHandler {
    /** Change CRA's paths  */
    changeCraPaths?(craPaths: CraScriptsPaths, env: string, cmdOpt: CommandOption): void;
    /** change Typescript compiler options for CRA's fork-ts-checker  */
    tsCheckCompilerOptions?(compileOptionsJson: {
        [prop in keyof ts.CompilerOptions]: ts.CompilerOptionsValue;
    }, cmdOpt: CommandOption): void;
    /** In build "lib" mode, change Typescript compiler options for Plink's TSC command which generates TSD files  */
    libTsdCompilerOptions?(compileOptionsJson: {
        [prop in keyof ts.CompilerOptions]: ts.CompilerOptionsValue;
    }, cmdOpt: CommandOption): void;
    webpack?(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
export { default as webpack } from 'webpack';
export declare const PKG_LIB_ENTRY_PROP = "cra-lib-entry";
export declare const PKG_LIB_ENTRY_DEFAULT = "public_api.ts";
export declare const PKG_APP_ENTRY_PROP = "cra-app-entry";
export declare const PKG_APP_ENTRY_DEFAULT = "start.tsx";
