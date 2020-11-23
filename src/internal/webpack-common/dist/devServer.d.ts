/// <reference types="webpack-dev-server" />
import * as wp from 'webpack';
/**
 * Avoid process exit when encountering Error like ERR_HTTP_HEADERS_SENT
 * Allow CORS
 * @param webpackConfig
 */
export default function (webpackConfig: {
    devServer: wp.Configuration['devServer'];
}): void;
