import { AngularBuilderOptions } from './common';
import { BuilderConfiguration } from '@angular-devkit/architect';
import { DrcpConfig, ConfigHandler } from 'dr-comp-package/wfh/dist/config-handler';
export interface AngularConfigHandler extends ConfigHandler {
    angularJson(options: AngularBuilderOptions, builderConfig: BuilderConfiguration<AngularBuilderOptions>): Promise<void> | void;
}
export default function changeAngularCliOptions(config: DrcpConfig, browserOptions: AngularBuilderOptions, builderConfig?: BuilderConfiguration<AngularBuilderOptions>): Promise<void>;
