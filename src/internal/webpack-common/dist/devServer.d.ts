import { Configuration } from 'webpack-dev-server';
/**
 * Avoid process exit when encountering Error like ERR_HTTP_HEADERS_SENT
 * Allow CORS
 * @param webpackConfig
 */
export default function (webpackConfig: {
    devServer: Configuration;
}): void;
