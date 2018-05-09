// const cssnano = require('cssnano');
// const postcssImports = require('postcss-import');
// const autoprefixer = require('autoprefixer');
// const postcssUrl = require('postcss-url');
// import * as path from 'path';
// import api from '__api';

// const projectRoot = api.config().rootPath;
// const baseHref = '';
// const deployUrl = api.config().publicPath;
// const maximumInlineSize = 10;

// export default function postcssPlugins(loader: any) {
// 	// safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
// 	const importantCommentRe = /@preserve|@licen[cs]e|[@#]\s*source(?:Mapping)?URL|^!/i;
// 	const minimizeOptions = {
// 		autoprefixer: false,
// 		safe: true,
// 		mergeLonghand: false,
// 		discardComments: { remove: (comment: string) => !importantCommentRe.test(comment) }
// 	};
// 	return [
// 		postcssImports({
// 			resolve: (url: string, context: any) => {
// 				return new Promise((resolve, reject) => {
// 					if (url && url.startsWith('~')) {
// 						url = url.substr(1);
// 					}
// 					loader.resolve(context, url, (err: Error, result: any) => {
// 						if (err) {
// 							reject(err);
// 							return;
// 						}
// 						resolve(result);
// 					});
// 				});
// 			},
// 			load: (filename: string) => {
// 				return new Promise((resolve, reject) => {
// 					loader.fs.readFile(filename, (err: Error, data: any) => {
// 						if (err) {
// 							reject(err);
// 							return;
// 						}
// 						const content = data.toString();
// 						resolve(content);
// 					});
// 				});
// 			}
// 		}),
// 		postcssUrl({
// 			filter: ({ url }: {url: string}) => url.startsWith('~'),
// 			url: ({ url }: {url: string}) => {
// 				const fullPath = path.join(projectRoot, 'node_modules', url.substr(1));
// 				return path.relative(loader.context, fullPath).replace(/\\/g, '/');
// 			}
// 		}),
// 		postcssUrl([
// 			{
// 				// Only convert root relative URLs, which CSS-Loader won't process into require().
// 				filter: ({ url }: {url: string}) => url.startsWith('/') && !url.startsWith('//'),
// 				url: ({ url }: {url: string}) => {
// 					if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
// 						// If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
// 						return `${deployUrl.replace(/\/$/, '')}${url}`;
// 					} else if (baseHref.match(/:\/\//)) {
// 						// If baseHref contains a scheme, include it as is.
// 						return baseHref.replace(/\/$/, '') +
// 							`/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
// 					} else {
// 						// Join together base-href, deploy-url and the original URL.
// 						// Also dedupe multiple slashes into single ones.
// 						return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
// 					}
// 				}
// 			},
// 			{
// 				// TODO: inline .cur if not supporting IE (use browserslist to check)
// 				filter: (asset: any) => {
// 					return maximumInlineSize > 0 && !asset.hash && !asset.absolutePath.endsWith('.cur');
// 				},
// 				url: 'inline',
// 				// NOTE: maxSize is in KB
// 				maxSize: maximumInlineSize,
// 				fallback: 'rebase'
// 			},
// 			{ url: 'rebase' }
// 		]),
// 		autoprefixer({browsers: [
// 			'ie >= 8',
// 			'ff >= 30',
// 			'chrome >= 34',
// 			'safari >= 7',
// 			'ios >= 6',
// 			'android >= 2.1'
// 		]})
// 	].concat(!api.config().devMode ? [cssnano(minimizeOptions)] : []);
// }
