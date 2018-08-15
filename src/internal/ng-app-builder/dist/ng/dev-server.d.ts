import './node-inject';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/';
import { DevServerBuilder, DevServerBuilderOptions } from '@angular-devkit/build-angular';
export declare type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
export default class DrcpDevServer extends DevServerBuilder {
    run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent>;
    private _getBrowserOptions1(options);
}
