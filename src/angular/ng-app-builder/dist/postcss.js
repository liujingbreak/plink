"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cssnano = require('cssnano');
const postcssImports = require('postcss-import');
const autoprefixer = require('autoprefixer');
const postcssUrl = require('postcss-url');
const path = require("path");
const __api_1 = require("__api");
const projectRoot = __api_1.default.config().rootPath;
const baseHref = '';
const deployUrl = __api_1.default.config().publicPath;
const maximumInlineSize = 10;
function postcssPlugins(loader) {
    // safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
    const importantCommentRe = /@preserve|@licen[cs]e|[@#]\s*source(?:Mapping)?URL|^!/i;
    const minimizeOptions = {
        autoprefixer: false,
        safe: true,
        mergeLonghand: false,
        discardComments: { remove: (comment) => !importantCommentRe.test(comment) }
    };
    return [
        postcssImports({
            resolve: (url, context) => {
                return new Promise((resolve, reject) => {
                    if (url && url.startsWith('~')) {
                        url = url.substr(1);
                    }
                    loader.resolve(context, url, (err, result) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(result);
                    });
                });
            },
            load: (filename) => {
                return new Promise((resolve, reject) => {
                    loader.fs.readFile(filename, (err, data) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        const content = data.toString();
                        resolve(content);
                    });
                });
            }
        }),
        postcssUrl({
            filter: ({ url }) => url.startsWith('~'),
            url: ({ url }) => {
                const fullPath = path.join(projectRoot, 'node_modules', url.substr(1));
                return path.relative(loader.context, fullPath).replace(/\\/g, '/');
            }
        }),
        postcssUrl([
            {
                // Only convert root relative URLs, which CSS-Loader won't process into require().
                filter: ({ url }) => url.startsWith('/') && !url.startsWith('//'),
                url: ({ url }) => {
                    if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
                        // If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
                        return `${deployUrl.replace(/\/$/, '')}${url}`;
                    }
                    else if (baseHref.match(/:\/\//)) {
                        // If baseHref contains a scheme, include it as is.
                        return baseHref.replace(/\/$/, '') +
                            `/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
                    }
                    else {
                        // Join together base-href, deploy-url and the original URL.
                        // Also dedupe multiple slashes into single ones.
                        return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
                    }
                }
            },
            {
                // TODO: inline .cur if not supporting IE (use browserslist to check)
                filter: (asset) => {
                    return maximumInlineSize > 0 && !asset.hash && !asset.absolutePath.endsWith('.cur');
                },
                url: 'inline',
                // NOTE: maxSize is in KB
                maxSize: maximumInlineSize,
                fallback: 'rebase'
            },
            { url: 'rebase' }
        ]),
        autoprefixer({ browsers: [
                'ie >= 8',
                'ff >= 30',
                'chrome >= 34',
                'safari >= 7',
                'ios >= 6',
                'android >= 2.1'
            ] })
    ].concat(!__api_1.default.config().devMode ? [cssnano(minimizeOptions)] : []);
}
exports.default = postcssPlugins;

//# sourceMappingURL=postcss.js.map
