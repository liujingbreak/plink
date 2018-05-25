/// <reference types="drcp-types" />
import { DrcpApi } from '__api';
import DrComponent from '@dr-core/build-util/dist/package-instance';
export interface WebpackConfig {
    [key: string]: any;
}
export interface Webpack2BuilderApi extends DrcpApi {
    configWebpackLater(execFunc: (originalConfig: WebpackConfig, webpack: any) => WebpackConfig | Promise<WebpackConfig>): void;
    isDrFile(fileSuffix: string | string[], compare?: (relPath: string, component: DrComponent) => boolean): void;
    isIssuerAngular(file: string): boolean;
}
export declare type WebpackConfigFunc = (originalConfig: WebpackConfig, webpack: any) => WebpackConfig | Promise<WebpackConfig>;
