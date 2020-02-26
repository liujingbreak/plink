"use strict";
const tslib_1 = require("tslib");
// tslint:disable:no-console
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// import { RawSource } from 'webpack-sources';
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
const build_target_helper_1 = require("./build-target-helper");
const config_handler_1 = require("dr-comp-package/wfh/dist/config-handler");
// import chalk from 'chalk';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const findPackageByFile = package_utils_1.createLazyPackageFileFinder();
function findAndChangeRule(rules) {
    const craPaths = require('react-scripts/config/paths');
    // TODO: check in case CRA will use Rule.use instead of "loader"
    checkSet(rules);
    for (const rule of rules) {
        if (Array.isArray(rule.use)) {
            checkSet(rule.use);
        }
        else if (Array.isArray(rule.loader)) {
            checkSet(rule.loader);
        }
        else if (rule.oneOf) {
            return findAndChangeRule(rule.oneOf);
        }
    }
    function checkSet(set) {
        for (let i = 0; i < set.length; i++) {
            const rule = set[i];
            if (typeof rule === 'string' && (rule.indexOf('file-loader') >= 0 || rule.indexOf('url-loader') >= 0)) {
                set[i] = {
                    loader: rule,
                    options: {
                        outputPath(url, resourcePath, context) {
                            const pk = findPackageByFile(resourcePath);
                            return `${(pk ? pk.shortName : 'external')}/${url}`;
                        }
                    }
                };
            }
            else if ((typeof rule.loader) === 'string' &&
                (rule.loader.indexOf('file-loader') >= 0 ||
                    rule.loader.indexOf('url-loader') >= 0)) {
                set[i].options.outputPath = (url, resourcePath, context) => {
                    const pk = findPackageByFile(resourcePath);
                    return `${(pk ? pk.shortName : 'external')}/${url}`;
                };
            }
            if (rule.include && typeof rule.loader === 'string' &&
                rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep)) {
                delete rule.include;
                const origTest = rule.test;
                rule.test = (file) => {
                    const pk = findPackageByFile(file);
                    const yes = ((pk && pk.dr) || file.startsWith(craPaths.appSrc)) &&
                        (origTest instanceof RegExp) ? origTest.test(file) :
                        (origTest instanceof Function ? origTest(file) : origTest === file);
                    // console.log(`[webpack.config] babel-loader: ${file}`, yes);
                    return yes;
                };
            }
        }
    }
    return;
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${path_1.default.resolve('/logs')}\n  ${__filename}`);
    const cmdOption = utils_1.getCmdOptions();
    // console.log('webpackEnv=', webpackEnv);
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (cmdOption.argv.get('dev') || cmdOption.argv.get('watch')) {
        webpackEnv = 'development';
        console.log('Development mode is on:', webpackEnv);
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    console.log(__filename, config.output.publicPath);
    // Make sure babel compiles source folder out side of current src directory
    findAndChangeRule(config.module.rules);
    const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (cmdOption.buildType === 'app') {
        // TODO: do not hard code
        config.resolve.alias['alias:dr.cra-start-entry'] = packageJson.name + '/' + packageJson.dr['cra-start-entry'];
        console.log(packageJson.name + '/' + packageJson.dr['cra-start-entry']);
    }
    // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
    if (config.resolve && config.resolve.plugins) {
        const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
        const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
        if (srcScopePluginIdx >= 0) {
            config.resolve.plugins.splice(srcScopePluginIdx, 1);
        }
    }
    // Move project node_modules to first position in resolve order
    if (config.resolve && config.resolve.modules) {
        const topModuleDir = path_1.default.resolve('node_modules');
        const pwdIdx = config.resolve.modules.findIndex(m => m === topModuleDir);
        if (pwdIdx > 0) {
            config.resolve.modules.splice(pwdIdx, 1);
        }
        config.resolve.modules.unshift(topModuleDir);
    }
    Object.assign(config.resolve.alias, require('rxjs/_esm2015/path-mapping')());
    Object.assign(config.optimization.splitChunks, {
        chunks: 'all',
        // name: false, default is false for production
        cacheGroups: {
            lazyVendor: {
                name: 'lazy-vendor',
                chunks: 'async',
                enforce: true,
                test: /[\\/]node_modules[\\/]/,
                priority: 1
            }
        }
    });
    config.plugins.push(new (class {
        apply(compiler) {
            compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
                setTimeout(() => {
                    console.log('');
                    console.log(compilation.getStats().toString('normal'));
                    console.log('');
                }, 0);
                // const data = JSON.stringify(compilation.getStats().toJson('normal'));
                // compilation.assets['stats.json'] = new RawSource(data);
            });
        }
    })());
    config.plugins.push(new ProgressPlugin({ profile: true }));
    config.stats = 'normal'; // Not working
    const ssrConfig = global.__SSR;
    if (ssrConfig) {
        ssrConfig(config);
    }
    if (cmdOption.buildType === 'lib')
        webpack_lib_1.default(cmdOption.buildTarget, config);
    const configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
    if (fs_extra_1.default.existsSync(configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            handler.webpack(config, webpackEnv, cmdOption);
        });
    }
    fs_extra_1.default.mkdirpSync('logs');
    fs_extra_1.default.writeFile('logs/webpack.config.debug.js', utils_1.printConfig(config), (err) => {
        // just for debug
    });
    return config;
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsNERBQXVCO0FBQ3ZCLHdEQUF3QjtBQUN4QixnRUFBMEI7QUFFMUIsK0NBQStDO0FBQy9DLG1DQUE4RDtBQUM5RCwwRUFBbUY7QUFDbkYsd0VBQXVDO0FBQ3ZDLCtEQUFrRDtBQUNsRCw0RUFBeUU7QUFHekUsNkJBQTZCO0FBQzdCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRzdELE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQXdHeEQsU0FBUyxpQkFBaUIsQ0FBQyxLQUFvQjtJQUM3QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN2RCxnRUFBZ0U7SUFDaEUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3hCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUVwQjthQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN6QjthQUFNLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNyQixPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN0QztLQUNGO0lBRUQsU0FBUyxRQUFRLENBQUMsR0FBcUM7UUFDckQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDckcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHO29CQUNQLE1BQU0sRUFBRSxJQUFJO29CQUNaLE9BQU8sRUFBRTt3QkFDUCxVQUFVLENBQUMsR0FBVyxFQUFFLFlBQW9CLEVBQUUsT0FBZTs0QkFDM0QsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7NEJBQzNDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7d0JBQ3RELENBQUM7cUJBQ0Y7aUJBQ0YsQ0FBQzthQUNIO2lCQUFNLElBQUksQ0FBQyxPQUFRLElBQW9DLENBQUMsTUFBTSxDQUFDLEtBQUssUUFBUTtnQkFDM0UsQ0FBRyxJQUFvQyxDQUFDLE1BQWlCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7b0JBQ25GLElBQW9DLENBQUMsTUFBaUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUNsRixFQUFFO2dCQUNELEdBQUcsQ0FBQyxDQUFDLENBQWlDLENBQUMsT0FBZ0IsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFXLEVBQUUsWUFBb0IsRUFBRSxPQUFlLEVBQUUsRUFBRTtvQkFDNUgsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzNDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3RELENBQUMsQ0FBQzthQUNIO1lBRUQsSUFBSyxJQUFvQixDQUFDLE9BQU8sSUFBSSxPQUFRLElBQW9CLENBQUMsTUFBTSxLQUFLLFFBQVE7Z0JBQ2xGLElBQXNCLENBQUMsTUFBTyxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQy9FLE9BQVEsSUFBb0IsQ0FBQyxPQUFPLENBQUM7Z0JBQ3JDLE1BQU0sUUFBUSxHQUFJLElBQW9CLENBQUMsSUFBSSxDQUFDO2dCQUMzQyxJQUFvQixDQUFDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNwQyxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFFbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQzdELENBQUMsUUFBUSxZQUFZLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2xELENBQUMsUUFBUSxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUM7b0JBQ3hFLDhEQUE4RDtvQkFDOUQsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDO2FBQ0g7U0FDRjtJQUNILENBQUM7SUFDRCxPQUFPO0FBQ1QsQ0FBQztBQTVKRCxpQkFBUyxVQUFTLFVBQWtCO0lBRWxDLGlCQUFTLENBQUMsNEJBQTRCLEVBQUUsNERBQTRELGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sVUFBVSxFQUFFLENBQUMsQ0FBQztJQUU5SSxNQUFNLFNBQVMsR0FBRyxxQkFBYSxFQUFFLENBQUM7SUFDbEMsMENBQTBDO0lBQzFDLDJGQUEyRjtJQUMzRixJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzVELFVBQVUsR0FBRyxhQUFhLENBQUM7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQztLQUNwRDtTQUFNO1FBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUM7S0FDMUM7SUFDRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sTUFBTSxHQUFrQixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELDJFQUEyRTtJQUMzRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhDLE1BQU0sRUFBQyxHQUFHLEVBQUUsV0FBVyxFQUFDLEdBQUcsaUNBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUQsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUNqQyx5QkFBeUI7UUFDekIsTUFBTSxDQUFDLE9BQVEsQ0FBQyxLQUFNLENBQUMsMEJBQTBCLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDaEgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztLQUN6RTtJQUdELDhHQUE4RztJQUM5RyxJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN2RSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sWUFBWSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzFHLElBQUksaUJBQWlCLElBQUksQ0FBQyxFQUFFO1lBQzFCLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNyRDtLQUNGO0lBRUQsK0RBQStEO0lBQy9ELElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUM1QyxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQztRQUN6RSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDZCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzFDO1FBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQzlDO0lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBYSxDQUFDLFdBQVcsRUFBRTtRQUM5QyxNQUFNLEVBQUUsS0FBSztRQUNiLCtDQUErQztRQUMvQyxXQUFXLEVBQUU7WUFDWCxVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxPQUFPO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSx3QkFBd0I7Z0JBQzlCLFFBQVEsRUFBRSxDQUFDO2FBQ1o7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUN4QixLQUFLLENBQUMsUUFBa0I7WUFDdEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxFQUFFO2dCQUN0RCxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sd0VBQXdFO2dCQUN4RSwwREFBMEQ7WUFDNUQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVOLE1BQU0sQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLElBQUksY0FBYyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUU1RCxNQUFNLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxDQUFDLGNBQWM7SUFFdkMsTUFBTSxTQUFTLEdBQUksTUFBYyxDQUFDLEtBQUssQ0FBQztJQUN4QyxJQUFJLFNBQVMsRUFBRTtRQUNiLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNuQjtJQUVELElBQUksU0FBUyxDQUFDLFNBQVMsS0FBSyxLQUFLO1FBQy9CLHFCQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU1QyxNQUFNLG1CQUFtQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUMxSCxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQ0FBZ0IsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFtQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDaEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QixrQkFBRSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDeEUsaUJBQWlCO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0NvbmZpZ3VyYXRpb24sIFJ1bGVTZXRSdWxlLCBDb21waWxlciwgUnVsZVNldFVzZUl0ZW0sIFJ1bGVTZXRMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuLy8gaW1wb3J0IHsgUmF3U291cmNlIH0gZnJvbSAnd2VicGFjay1zb3VyY2VzJztcbmltcG9ydCB7ZHJhd1B1cHB5LCBwcmludENvbmZpZywgZ2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtDb25maWd1cmVIYW5kbGVyfSBmcm9tICcuL3R5cGVzJztcblxuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcblxuXG5jb25zdCBmaW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuXG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6IHN0cmluZykge1xuXG4gIGRyYXdQdXBweSgnUG9vaW5nIG9uIGNyZWF0ZS1yZWFjdC1hcHAnLCBgSWYgeW91IHdhbnQgdG8ga25vdyBob3cgV2VicGFjayBpcyBjb25maWd1cmVkLCBjaGVjazpcXG4gICR7UGF0aC5yZXNvbHZlKCcvbG9ncycpfVxcbiAgJHtfX2ZpbGVuYW1lfWApO1xuXG4gIGNvbnN0IGNtZE9wdGlvbiA9IGdldENtZE9wdGlvbnMoKTtcbiAgLy8gY29uc29sZS5sb2coJ3dlYnBhY2tFbnY9Jywgd2VicGFja0Vudik7XG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKGNtZE9wdGlvbi5hcmd2LmdldCgnZGV2JykgfHwgY21kT3B0aW9uLmFyZ3YuZ2V0KCd3YXRjaCcpKSB7XG4gICAgd2VicGFja0VudiA9ICdkZXZlbG9wbWVudCc7XG4gICAgY29uc29sZS5sb2coJ0RldmVsb3BtZW50IG1vZGUgaXMgb246Jywgd2VicGFja0Vudik7XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ2ZhbHNlJztcbiAgfVxuICBjb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG4gIGNvbnN0IGNvbmZpZzogQ29uZmlndXJhdGlvbiA9IG9yaWdXZWJwYWNrQ29uZmlnKHdlYnBhY2tFbnYpO1xuICBjb25zb2xlLmxvZyhfX2ZpbGVuYW1lLCBjb25maWcub3V0cHV0IS5wdWJsaWNQYXRoKTtcbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuICBjb25zdCB7ZGlyLCBwYWNrYWdlSnNvbn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICAvLyBUT0RPOiBkbyBub3QgaGFyZCBjb2RlXG4gICAgY29uZmlnLnJlc29sdmUhLmFsaWFzIVsnYWxpYXM6ZHIuY3JhLXN0YXJ0LWVudHJ5J10gPSBwYWNrYWdlSnNvbi5uYW1lICsgJy8nICsgcGFja2FnZUpzb24uZHJbJ2NyYS1zdGFydC1lbnRyeSddO1xuICAgIGNvbnNvbGUubG9nKHBhY2thZ2VKc29uLm5hbWUgKyAnLycgKyBwYWNrYWdlSnNvbi5kclsnY3JhLXN0YXJ0LWVudHJ5J10pO1xuICB9XG5cblxuICAvLyBSZW1vdmUgTW9kdWxlc1Njb3BlUGx1Z2luIGZyb20gcmVzb2x2ZSBwbHVnaW5zLCBpdCBzdG9wcyB1cyB1c2luZyBzb3VyY2UgZm9sZCBvdXQgc2lkZSBvZiBwcm9qZWN0IGRpcmVjdG9yeVxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUucGx1Z2lucykge1xuICAgIGNvbnN0IE1vZHVsZVNjb3BlUGx1Z2luID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL01vZHVsZVNjb3BlUGx1Z2luJyk7XG4gICAgY29uc3Qgc3JjU2NvcGVQbHVnaW5JZHggPSBjb25maWcucmVzb2x2ZS5wbHVnaW5zLmZpbmRJbmRleChwbHVnaW4gPT4gcGx1Z2luIGluc3RhbmNlb2YgTW9kdWxlU2NvcGVQbHVnaW4pO1xuICAgIGlmIChzcmNTY29wZVBsdWdpbklkeCA+PSAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5wbHVnaW5zLnNwbGljZShzcmNTY29wZVBsdWdpbklkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTW92ZSBwcm9qZWN0IG5vZGVfbW9kdWxlcyB0byBmaXJzdCBwb3NpdGlvbiBpbiByZXNvbHZlIG9yZGVyXG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5tb2R1bGVzKSB7XG4gICAgY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKTtcbiAgICBjb25zdCBwd2RJZHggPSBjb25maWcucmVzb2x2ZS5tb2R1bGVzLmZpbmRJbmRleChtID0+IG0gPT09IHRvcE1vZHVsZURpcik7XG4gICAgaWYgKHB3ZElkeCA+IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuc3BsaWNlKHB3ZElkeCwgMSk7XG4gICAgfVxuICAgIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMudW5zaGlmdCh0b3BNb2R1bGVEaXIpO1xuICB9XG5cbiAgT2JqZWN0LmFzc2lnbihjb25maWcucmVzb2x2ZSEuYWxpYXMsIHJlcXVpcmUoJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJykoKSk7XG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLm9wdGltaXphdGlvbiEuc3BsaXRDaHVua3MsIHtcbiAgICBjaHVua3M6ICdhbGwnLFxuICAgIC8vIG5hbWU6IGZhbHNlLCBkZWZhdWx0IGlzIGZhbHNlIGZvciBwcm9kdWN0aW9uXG4gICAgY2FjaGVHcm91cHM6IHtcbiAgICAgIGxhenlWZW5kb3I6IHtcbiAgICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgICB0ZXN0OiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLCAvLyBUT0RPOiBleGNsdWRlIERyIHBhY2thZ2Ugc291cmNlIGZpbGVcbiAgICAgICAgcHJpb3JpdHk6IDFcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgKGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdkcmNwLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9TdHJpbmcoJ25vcm1hbCcpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgIH0sIDApO1xuICAgICAgICAvLyBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ25vcm1hbCcpKTtcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydzdGF0cy5qc29uJ10gPSBuZXcgUmF3U291cmNlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KSgpKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiB0cnVlIH0pKTtcblxuICBjb25maWcuc3RhdHMgPSAnbm9ybWFsJzsgLy8gTm90IHdvcmtpbmdcblxuICBjb25zdCBzc3JDb25maWcgPSAoZ2xvYmFsIGFzIGFueSkuX19TU1I7XG4gIGlmIChzc3JDb25maWcpIHtcbiAgICBzc3JDb25maWcoY29uZmlnKTtcbiAgfVxuXG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJylcbiAgICBjaGFuZ2U0bGliKGNtZE9wdGlvbi5idWlsZFRhcmdldCwgY29uZmlnKTtcblxuICBjb25zdCBjb25maWdGaWxlSW5QYWNrYWdlID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sIFsnZHInLCAnY29uZmlnLW92ZXJyaWRlcy1wYXRoJ10sICdjb25maWctb3ZlcnJpZGVzLnRzJykpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjb25maWdGaWxlSW5QYWNrYWdlKSkge1xuICAgIGNvbnN0IGNmZ01nciA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFtjb25maWdGaWxlSW5QYWNrYWdlXSk7XG4gICAgY2ZnTWdyLnJ1bkVhY2hTeW5jPENvbmZpZ3VyZUhhbmRsZXI+KChjZmdGaWxlLCByZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGhhbmRsZXIud2VicGFjayhjb25maWcsIHdlYnBhY2tFbnYsIGNtZE9wdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICBmcy5ta2RpcnBTeW5jKCdsb2dzJyk7XG4gIGZzLndyaXRlRmlsZSgnbG9ncy93ZWJwYWNrLmNvbmZpZy5kZWJ1Zy5qcycsIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICAvLyBqdXN0IGZvciBkZWJ1Z1xuICB9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIGNvbnN0IGNyYVBhdGhzID0gcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKTtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIHJldHVybiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlLm9uZU9mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1NldChzZXQ6IChSdWxlU2V0UnVsZSB8IFJ1bGVTZXRVc2VJdGVtKVtdKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXQubGVuZ3RoIDsgaSsrKSB7XG4gICAgICBjb25zdCBydWxlID0gc2V0W2ldO1xuICAgICAgaWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyAmJiAocnVsZS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHwgcnVsZS5pbmRleE9mKCd1cmwtbG9hZGVyJykgPj0gMCkpIHtcbiAgICAgICAgc2V0W2ldID0ge1xuICAgICAgICAgIGxvYWRlcjogcnVsZSxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXRQYXRoKHVybDogc3RyaW5nLCByZXNvdXJjZVBhdGg6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGAkeyhwayA/IHBrLnNob3J0TmFtZSA6ICdleHRlcm5hbCcpfS8ke3VybH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiAocnVsZSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLmxvYWRlcikgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICgoKHJ1bGUgYXMgUnVsZVNldFJ1bGUgfCBSdWxlU2V0TG9hZGVyKS5sb2FkZXIgYXMgc3RyaW5nKS5pbmRleE9mKCdmaWxlLWxvYWRlcicpID49IDAgfHxcbiAgICAgICAgKChydWxlIGFzIFJ1bGVTZXRSdWxlIHwgUnVsZVNldExvYWRlcikubG9hZGVyIGFzIHN0cmluZykuaW5kZXhPZigndXJsLWxvYWRlcicpID49IDBcbiAgICAgICAgKSkge1xuICAgICAgICAoKHNldFtpXSBhcyBSdWxlU2V0UnVsZSB8IFJ1bGVTZXRMb2FkZXIpLm9wdGlvbnMgYXMgYW55KSEub3V0cHV0UGF0aCA9ICh1cmw6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICByZXR1cm4gYCR7KHBrID8gcGsuc2hvcnROYW1lIDogJ2V4dGVybmFsJyl9LyR7dXJsfWA7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGlmICgocnVsZSBhcyBSdWxlU2V0UnVsZSkuaW5jbHVkZSAmJiB0eXBlb2YgKHJ1bGUgYXMgUnVsZVNldFJ1bGUpLmxvYWRlciA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKHJ1bGUgYXMgUnVsZVNldExvYWRlcikubG9hZGVyIS5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkpIHtcbiAgICAgICAgZGVsZXRlIChydWxlIGFzIFJ1bGVTZXRSdWxlKS5pbmNsdWRlO1xuICAgICAgICBjb25zdCBvcmlnVGVzdCA9IChydWxlIGFzIFJ1bGVTZXRSdWxlKS50ZXN0O1xuICAgICAgICAocnVsZSBhcyBSdWxlU2V0UnVsZSkudGVzdCA9IChmaWxlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblxuICAgICAgICAgIGNvbnN0IHllcyA9ICgocGsgJiYgcGsuZHIpIHx8IGZpbGUuc3RhcnRzV2l0aChjcmFQYXRocy5hcHBTcmMpKSAmJlxuICAgICAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgUmVnRXhwKSA/IG9yaWdUZXN0LnRlc3QoZmlsZSkgOlxuICAgICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBbd2VicGFjay5jb25maWddIGJhYmVsLWxvYWRlcjogJHtmaWxlfWAsIHllcyk7XG4gICAgICAgICAgcmV0dXJuIHllcztcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuIl19
