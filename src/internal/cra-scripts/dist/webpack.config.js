"use strict";
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// import { RawSource } from 'webpack-sources';
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
const webpack_lib_1 = tslib_1.__importDefault(require("./webpack-lib"));
// import chalk from 'chalk';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const findPackageByFile = package_utils_1.createLazyPackageFileFinder();
function changeBabelLoader(config) {
    const craPaths = require('react-scripts/config/paths');
    config.module.rules.some(findAndChangeRule);
    function findAndChangeRule(rule) {
        // TODO: check in case CRA will use Rule.use instead of "loader"
        if (rule.include && typeof rule.loader === 'string' && rule.loader.indexOf(path_1.default.sep + 'babel-loader' + path_1.default.sep)) {
            delete rule.include;
            const origTest = rule.test;
            rule.test = (file) => {
                const pk = findPackageByFile(file);
                const yes = ((pk && pk.dr) || file.startsWith(craPaths.appSrc)) &&
                    (origTest instanceof RegExp) ? origTest.test(file) :
                    (origTest instanceof Function ? origTest(file) : origTest === file);
                // console.log(file, yes);
                return yes;
            };
            return true;
        }
        else if (rule.oneOf) {
            return rule.oneOf.some(findAndChangeRule);
        }
        return false;
    }
}
module.exports = function (webpackEnv) {
    utils_1.drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${path_1.default.resolve('/logs')}\n  ${__filename}`);
    const cmdOption = utils_1.getCmdOptions();
    // `npm run build` by default is in production mode, below hacks the way react-scripts does
    if (process.argv.indexOf('--dev') >= 0) {
        console.log('Development mode!!!');
        webpackEnv = 'development';
    }
    else {
        process.env.GENERATE_SOURCEMAP = 'false';
    }
    const origWebpackConfig = require('react-scripts/config/webpack.config');
    const config = origWebpackConfig(webpackEnv);
    // Make sure babel compiles source folder out side of current src directory
    changeBabelLoader(config);
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
    fs_extra_1.default.mkdirpSync('logs');
    fs_extra_1.default.writeFile('logs/webpack.config.debug.js', utils_1.printConfig(config), (err) => {
        // just for debug
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSx3REFBd0I7QUFDeEIsZ0VBQTBCO0FBRTFCLCtDQUErQztBQUMvQyxtQ0FBOEQ7QUFDOUQsMEVBQW1GO0FBQ25GLHdFQUF1QztBQUN2Qyw2QkFBNkI7QUFDN0IsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFHN0QsTUFBTSxpQkFBaUIsR0FBRywyQ0FBMkIsRUFBRSxDQUFDO0FBdUZ4RCxTQUFTLGlCQUFpQixDQUFDLE1BQXFCO0lBQzlDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ3ZELE1BQU0sQ0FBQyxNQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRTdDLFNBQVMsaUJBQWlCLENBQUMsSUFBaUI7UUFDMUMsZ0VBQWdFO1FBQ2hFLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxHQUFHLGNBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNoSCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDcEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztZQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ25CLE1BQU0sRUFBRSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVuQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDN0Qs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Q0FBQyxTQUFTLEtBQUssS0FBSztRQUMvQixxQkFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFNUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsa0JBQUUsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsbUJBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3hFLGlCQUFpQjtJQUNuQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3Qvd2VicGFjay5jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtDb25maWd1cmF0aW9uLCBSdWxlU2V0UnVsZSwgQ29tcGlsZXJ9IGZyb20gJ3dlYnBhY2snO1xuLy8gaW1wb3J0IHsgUmF3U291cmNlIH0gZnJvbSAnd2VicGFjay1zb3VyY2VzJztcbmltcG9ydCB7ZHJhd1B1cHB5LCBwcmludENvbmZpZywgZ2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNoYW5nZTRsaWIgZnJvbSAnLi93ZWJwYWNrLWxpYic7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuY29uc3QgUHJvZ3Jlc3NQbHVnaW4gPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9Qcm9ncmVzc1BsdWdpbicpO1xuXG5cbmNvbnN0IGZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG5cblxuZXhwb3J0ID0gZnVuY3Rpb24od2VicGFja0Vudjogc3RyaW5nKSB7XG5cbiAgZHJhd1B1cHB5KCdQb29pbmcgb24gY3JlYXRlLXJlYWN0LWFwcCcsIGBJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBXZWJwYWNrIGlzIGNvbmZpZ3VyZWQsIGNoZWNrOlxcbiAgJHtQYXRoLnJlc29sdmUoJy9sb2dzJyl9XFxuICAke19fZmlsZW5hbWV9YCk7XG5cbiAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuXG4gIC8vIGBucG0gcnVuIGJ1aWxkYCBieSBkZWZhdWx0IGlzIGluIHByb2R1Y3Rpb24gbW9kZSwgYmVsb3cgaGFja3MgdGhlIHdheSByZWFjdC1zY3JpcHRzIGRvZXNcbiAgaWYgKHByb2Nlc3MuYXJndi5pbmRleE9mKCctLWRldicpID49IDApIHtcbiAgICBjb25zb2xlLmxvZygnRGV2ZWxvcG1lbnQgbW9kZSEhIScpO1xuICAgIHdlYnBhY2tFbnYgPSAnZGV2ZWxvcG1lbnQnO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICdmYWxzZSc7XG4gIH1cbiAgY29uc3Qgb3JpZ1dlYnBhY2tDb25maWcgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy93ZWJwYWNrLmNvbmZpZycpO1xuICBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSBvcmlnV2VicGFja0NvbmZpZyh3ZWJwYWNrRW52KTtcbiAgLy8gTWFrZSBzdXJlIGJhYmVsIGNvbXBpbGVzIHNvdXJjZSBmb2xkZXIgb3V0IHNpZGUgb2YgY3VycmVudCBzcmMgZGlyZWN0b3J5XG4gIGNoYW5nZUJhYmVsTG9hZGVyKGNvbmZpZyk7XG5cbiAgLy8gUmVtb3ZlIE1vZHVsZXNTY29wZVBsdWdpbiBmcm9tIHJlc29sdmUgcGx1Z2lucywgaXQgc3RvcHMgdXMgdXNpbmcgc291cmNlIGZvbGQgb3V0IHNpZGUgb2YgcHJvamVjdCBkaXJlY3RvcnlcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMpIHtcbiAgICBjb25zdCBNb2R1bGVTY29wZVBsdWdpbiA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9Nb2R1bGVTY29wZVBsdWdpbicpO1xuICAgIGNvbnN0IHNyY1Njb3BlUGx1Z2luSWR4ID0gY29uZmlnLnJlc29sdmUucGx1Z2lucy5maW5kSW5kZXgocGx1Z2luID0+IHBsdWdpbiBpbnN0YW5jZW9mIE1vZHVsZVNjb3BlUGx1Z2luKTtcbiAgICBpZiAoc3JjU2NvcGVQbHVnaW5JZHggPj0gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUucGx1Z2lucy5zcGxpY2Uoc3JjU2NvcGVQbHVnaW5JZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE1vdmUgcHJvamVjdCBub2RlX21vZHVsZXMgdG8gZmlyc3QgcG9zaXRpb24gaW4gcmVzb2x2ZSBvcmRlclxuICBpZiAoY29uZmlnLnJlc29sdmUgJiYgY29uZmlnLnJlc29sdmUubW9kdWxlcykge1xuICAgIGNvbnN0IHRvcE1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJyk7XG4gICAgY29uc3QgcHdkSWR4ID0gY29uZmlnLnJlc29sdmUubW9kdWxlcy5maW5kSW5kZXgobSA9PiBtID09PSB0b3BNb2R1bGVEaXIpO1xuICAgIGlmIChwd2RJZHggPiAwKSB7XG4gICAgICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnNwbGljZShwd2RJZHgsIDEpO1xuICAgIH1cbiAgICBjb25maWcucmVzb2x2ZS5tb2R1bGVzLnVuc2hpZnQodG9wTW9kdWxlRGlyKTtcbiAgfVxuXG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLnJlc29sdmUhLmFsaWFzLCByZXF1aXJlKCdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZycpKCkpO1xuICBPYmplY3QuYXNzaWduKGNvbmZpZy5vcHRpbWl6YXRpb24hLnNwbGl0Q2h1bmtzLCB7XG4gICAgY2h1bmtzOiAnYWxsJyxcbiAgICAvLyBuYW1lOiBmYWxzZSwgZGVmYXVsdCBpcyBmYWxzZSBmb3IgcHJvZHVjdGlvblxuICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICBsYXp5VmVuZG9yOiB7XG4gICAgICAgIG5hbWU6ICdsYXp5LXZlbmRvcicsXG4gICAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgICAgdGVzdDogL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dLywgLy8gVE9ETzogZXhjbHVkZSBEciBwYWNrYWdlIHNvdXJjZSBmaWxlXG4gICAgICAgIHByaW9yaXR5OiAxXG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZHJjcC1jbGktc3RhdHMnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5nZXRTdGF0cygpLnRvU3RyaW5nKCdub3JtYWwnKSk7XG4gICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgLy8gY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9Kc29uKCdub3JtYWwnKSk7XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snc3RhdHMuanNvbiddID0gbmV3IFJhd1NvdXJjZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSkoKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgY29uZmlnLnN0YXRzID0gJ25vcm1hbCc7IC8vIE5vdCB3b3JraW5nXG5cbiAgY29uc3Qgc3NyQ29uZmlnID0gKGdsb2JhbCBhcyBhbnkpLl9fU1NSO1xuICBpZiAoc3NyQ29uZmlnKSB7XG4gICAgc3NyQ29uZmlnKGNvbmZpZyk7XG4gIH1cblxuICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpXG4gICAgY2hhbmdlNGxpYihjbWRPcHRpb24uYnVpbGRUYXJnZXQsIGNvbmZpZyk7XG5cbiAgZnMubWtkaXJwU3luYygnbG9ncycpO1xuICBmcy53cml0ZUZpbGUoJ2xvZ3Mvd2VicGFjay5jb25maWcuZGVidWcuanMnLCBwcmludENvbmZpZyhjb25maWcpLCAoZXJyKSA9PiB7XG4gICAgLy8ganVzdCBmb3IgZGVidWdcbiAgfSk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG5mdW5jdGlvbiBjaGFuZ2VCYWJlbExvYWRlcihjb25maWc6IENvbmZpZ3VyYXRpb24pIHtcbiAgY29uc3QgY3JhUGF0aHMgPSByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL2NvbmZpZy9wYXRocycpO1xuICBjb25maWcubW9kdWxlIS5ydWxlcy5zb21lKGZpbmRBbmRDaGFuZ2VSdWxlKTtcblxuICBmdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlOiBSdWxlU2V0UnVsZSkge1xuICAgIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICAgIGlmIChydWxlLmluY2x1ZGUgJiYgdHlwZW9mIHJ1bGUubG9hZGVyID09PSAnc3RyaW5nJyAmJiBydWxlLmxvYWRlci5pbmRleE9mKFBhdGguc2VwICsgJ2JhYmVsLWxvYWRlcicgKyBQYXRoLnNlcCkpIHtcbiAgICAgIGRlbGV0ZSBydWxlLmluY2x1ZGU7XG4gICAgICBjb25zdCBvcmlnVGVzdCA9IHJ1bGUudGVzdDtcbiAgICAgIHJ1bGUudGVzdCA9IChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHBrID0gZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG5cbiAgICAgICAgY29uc3QgeWVzID0gKChwayAmJiBway5kcikgfHwgZmlsZS5zdGFydHNXaXRoKGNyYVBhdGhzLmFwcFNyYykpICYmXG4gICAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgUmVnRXhwKSA/IG9yaWdUZXN0LnRlc3QoZmlsZSkgOlxuICAgICAgICAgICAgKG9yaWdUZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBvcmlnVGVzdChmaWxlKSA6IG9yaWdUZXN0ID09PSBmaWxlKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZmlsZSwgeWVzKTtcbiAgICAgICAgcmV0dXJuIHllcztcbiAgICAgIH07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIHJldHVybiBydWxlLm9uZU9mLnNvbWUoZmluZEFuZENoYW5nZVJ1bGUpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==
