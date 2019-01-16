import { AngularCliParam } from './ng/common';
export interface WepackConfigHandler {
    /** @returns webpack configuration or Promise */
    webpackConfig(originalConfig: any): Promise<{
        [name: string]: any;
    } | void> | {
        [name: string]: any;
    } | void;
}
export default function changeWebpackConfig(param: AngularCliParam, webpackConfig: any, drcpConfigSetting: any): Promise<any>;
//# sourceMappingURL=config-webpack.d.ts.map