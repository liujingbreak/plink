import { AngularBuilderOptions, AngularConfigHandler } from './common';
import { BuilderConfiguration } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import api from '__api';
declare type DrcpConfig = typeof api.config;
export default function changeAngularCliOptions(config: DrcpConfig, browserOptions: AngularBuilderOptions, configHandlers: Array<{
    file: string;
    handler: AngularConfigHandler;
}>, builderConfig?: BuilderConfiguration<DevServerBuilderOptions>): Promise<void>;
export {};
