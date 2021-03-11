/// <reference types="webpack-dev-server" />
import { Configuration } from 'webpack';
import { CommandOption } from './build-options';
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
    publicUrlOrPath: string;
    ownPath: string;
    ownNodeModules: string;
    appTypeDeclarations: string;
    ownTypeDeclarations: string;
}
export interface ReactScriptsHandler {
    changeCraPaths?(craPaths: CraScriptsPaths): void;
    webpack?(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
