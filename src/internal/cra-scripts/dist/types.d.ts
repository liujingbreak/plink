/// <reference types="webpack-dev-server" />
import { Configuration } from 'webpack';
import { CommandOption } from './build-options';
export interface ReactScriptsHandler {
    webpack(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
