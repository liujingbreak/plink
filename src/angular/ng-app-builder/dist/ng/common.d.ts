import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import * as Rx from 'rxjs';
export declare function initDrcp(drcpArgs: any): any;
export declare type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
export interface AngularCliParam {
    builderConfig: BuilderConfiguration<DevServerBuilderOptions>;
    buildWebpackConfig: buildWebpackConfigFunc;
    browserOptions: NormalizedBrowserBuilderSchema;
    argv: any;
}
export interface DrcpBuilderOptions {
    drcpArgs: any;
}
export declare function startDrcpServer(builderConfig: BuilderConfiguration<DevServerBuilderOptions>, browserOptions: NormalizedBrowserBuilderSchema, buildWebpackConfig: buildWebpackConfigFunc): Rx.Observable<BuildEvent>;
export declare function changeWebpackConfig(options: DrcpBuilderOptions, webpackConfig: any): any;
