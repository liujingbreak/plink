import { Configuration } from 'webpack';
import { CommandOption } from './build-options';
export interface ConfigureHandler {
    webpack(cfg: Configuration, env: string, cmdOpt: CommandOption): void;
}
