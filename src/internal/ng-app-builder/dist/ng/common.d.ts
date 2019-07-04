/// <reference types="webpack-dev-server" />
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { Schema as NormalizedServerBuilderServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import { json } from '@angular-devkit/core';
import webpack from 'webpack';
import api from '__api';
export declare type DrcpConfig = typeof api.config;
export declare function initCli(options: any): Promise<import("dr-comp-package/wfh/dist/config-handler").DrcpConfig>;
export declare function configWebpack(param: AngularCliParam, webpackConfig: webpack.Configuration, drcpConfigSetting: {
    devMode: boolean;
}): void;
export declare function transformIndexHtml(content: string): Promise<string>;
export declare type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;
export interface AngularCliParam {
    builderConfig?: DevServerBuilderOptions;
    browserOptions: AngularBuilderOptions;
    ssr: boolean;
}
export declare type NormalizedAngularBuildSchema = NormalizedBrowserBuilderSchema | NormalizedServerBuilderServerSchema;
export declare type AngularBuilderOptions = NormalizedBrowserBuilderSchema & NormalizedServerBuilderServerSchema & DrcpBuilderOptions & json.JsonObject;
export interface DrcpBuilderOptions {
    drcpArgs: any;
    drcpConfig: string;
}
