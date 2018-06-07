import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import ReadHookHost from '../utils/read-hook-vfshost';
import * as Rx from 'rxjs';
export declare type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
export interface AngularCliParam {
    builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
    browserOptions: NormalizedBrowserBuilderSchema & DrcpBuilderOptions;
    webpackConfig: any;
    projectRoot: string;
    vfsHost: ReadHookHost;
    argv: any;
}
export interface DrcpBuilderOptions {
    drcpArgs: any;
}
export declare function startDrcpServer(projectRoot: string, builderConfig: BuilderConfiguration<DevServerBuilderOptions>, browserOptions: NormalizedBrowserBuilderSchema, buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost): Rx.Observable<BuildEvent>;
export declare function compile(projectRoot: string, browserOptions: NormalizedBrowserBuilderSchema, buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost): Rx.Observable<{}>;
