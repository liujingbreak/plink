import DrComponent from 'dr-comp-package/wfh/dist/build-util/ts/package-instance';
export interface WebpackConfig {
    [key: string]: any;
}
export interface Webpack2BuilderApi {
    configWebpackLater(execFunc: (originalConfig: WebpackConfig, webpack: any) => WebpackConfig | Promise<WebpackConfig>): void;
    isDrFile(fileSuffix: string | string[], compare?: (relPath: string, component: DrComponent) => boolean): void;
    isIssuerAngular(file: string): boolean;
}
export declare type WebpackConfigFunc = (originalConfig: WebpackConfig, webpack: any) => WebpackConfig | Promise<WebpackConfig>;
