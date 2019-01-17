import { AngularBuilderOptions } from './common';
import { BuilderConfiguration } from '@angular-devkit/architect';
import { DrcpConfig, ConfigHandler } from 'dr-comp-package/wfh/dist/config-handler';
export interface AngularConfigHandler extends ConfigHandler {
    /**
     * You may override angular.json in this function
     * @param options Angular angular.json properties under path <project>.architect.<command>.options
     * @param builderConfig Angular angular.json properties under path <project>
     */
    angularJson(options: AngularBuilderOptions, builderConfig: BuilderConfiguration<AngularBuilderOptions>): Promise<void> | void;
}
export default function changeAngularCliOptions(config: DrcpConfig, browserOptions: AngularBuilderOptions, builderConfig?: BuilderConfiguration<AngularBuilderOptions>): Promise<void>;
