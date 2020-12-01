import {Configuration} from 'webpack';
import {CommandOption} from './build-options';
import {CraScriptsPaths} from './cra-scripts-paths';

export {CraScriptsPaths};
export interface ReactScriptsHandler {
  changeCraPaths?(craPaths: CraScriptsPaths): void;
  webpack?(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
