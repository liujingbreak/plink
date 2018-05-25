import api, {DrcpApi} from '__api';
import DrComponent from '@dr-core/build-util/dist/package-instance';
const Webpack = require('webpack');

export interface WebpackConfig {
	[key: string]: any;
}
export interface Webpack2BuilderApi extends DrcpApi {
	configWebpackLater(execFunc:
		(originalConfig: WebpackConfig, webpack: any) =>WebpackConfig | Promise<WebpackConfig>): void;
	isDrFile(fileSuffix: string | string[],
		compare?: (relPath: string, component: DrComponent) => boolean): void;
	isIssuerAngular(file: string): boolean;
}

export type WebpackConfigFunc =
	(originalConfig: WebpackConfig, webpack: any) => WebpackConfig | Promise<WebpackConfig>;

var newApi: Webpack2BuilderApi = Object.getPrototypeOf(api);
newApi.configWebpackLater = function(this: Webpack2BuilderApi,
	execFunc: WebpackConfigFunc) {

	require('..').tapable.plugin('webpackConfig',
		function(webpackConfig: WebpackConfig, cb: (err: Error, config: WebpackConfig) => void) {
			Promise.resolve(execFunc(webpackConfig, Webpack))
			.then((cfg: WebpackConfig) => cb(null, cfg))
			.catch((err: Error) => cb(err, null));
	});
};
