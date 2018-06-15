import './node-inject';
import { BuildEvent, BuilderConfiguration } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { BrowserBuilder as GoogleBrowserBuilder } from '@angular-devkit/build-angular';
export declare class BrowserBuilder extends GoogleBrowserBuilder {
    run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent>;
    private _deleteOutputDir0(root, outputPath, host);
}
export default BrowserBuilder;