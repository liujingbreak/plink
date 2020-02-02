"use strict";
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// import { RawSource } from 'webpack-sources';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const utils_1 = require("./utils");
const package_utils_1 = require("dr-comp-package/wfh/dist/package-utils");
// import chalk from 'chalk';
const origWebpackConfig = require('react-scripts/config/webpack.config');
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
            compiler.hooks.emit.tap('angular-cli-stats', compilation => {
                setTimeout(() => {
                    console.log('');
                    console.log(compilation.getStats().toString('normal'));
                    console.log('');
                }, 100);
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
    fs_extra_1.default.mkdirpSync('logs');
    fs_extra_1.default.writeFile('logs/webpack.config.debug.js', utils_1.printConfig(config), (err) => {
        // just for debug
    });
    return config;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSx3REFBd0I7QUFDeEIsZ0VBQTBCO0FBRTFCLCtDQUErQztBQUMvQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUM3RCxtQ0FBK0M7QUFDL0MsMEVBQW1GO0FBQ25GLDZCQUE2QjtBQUU3QixNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBRXpFLE1BQU0saUJBQWlCLEdBQUcsMkNBQTJCLEVBQUUsQ0FBQztBQXVFeEQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFxQjtJQUM5QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN2RCxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUU3QyxTQUFTLGlCQUFpQixDQUFDLElBQWlCO1FBQzFDLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDaEgsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUs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QUFDLFFBQWtCO1lBQ3RCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLENBQUMsRUFBRTtnQkFDekQsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNSLHdFQUF3RTtnQkFDeEUsMERBQTBEO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFTixNQUFNLENBQUMsT0FBUSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFNUQsTUFBTSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxjQUFjO0lBRXZDLE1BQU0sU0FBUyxHQUFJLE1BQWMsQ0FBQyxLQUFLLENBQUM7SUFDeEMsSUFBSSxTQUFTLEVBQUU7UUFDYixTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDbkI7SUFFRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QixrQkFBRSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDeEUsaUJBQWlCO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC93ZWJwYWNrLmNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0NvbmZpZ3VyYXRpb24sIFJ1bGVTZXRSdWxlLCBDb21waWxlcn0gZnJvbSAnd2VicGFjayc7XG4vLyBpbXBvcnQgeyBSYXdTb3VyY2UgfSBmcm9tICd3ZWJwYWNrLXNvdXJjZXMnO1xuY29uc3QgUHJvZ3Jlc3NQbHVnaW4gPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9Qcm9ncmVzc1BsdWdpbicpO1xuaW1wb3J0IHtkcmF3UHVwcHksIHByaW50Q29uZmlnfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5jb25zdCBvcmlnV2VicGFja0NvbmZpZyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3dlYnBhY2suY29uZmlnJyk7XG5cbmNvbnN0IGZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG5cbmV4cG9ydCA9IGZ1bmN0aW9uKHdlYnBhY2tFbnY6IHN0cmluZykge1xuICBkcmF3UHVwcHkoJ1Bvb2luZyBvbiBjcmVhdGUtcmVhY3QtYXBwJywgYElmIHlvdSB3YW50IHRvIGtub3cgaG93IFdlYnBhY2sgaXMgY29uZmlndXJlZCwgY2hlY2s6XFxuICAke1BhdGgucmVzb2x2ZSgnL2xvZ3MnKX1cXG4gICR7X19maWxlbmFtZX1gKTtcbiAgY29uc3QgY29uZmlnOiBDb25maWd1cmF0aW9uID0gb3JpZ1dlYnBhY2tDb25maWcod2VicGFja0Vudik7XG4gIC8vIE1ha2Ugc3VyZSBiYWJlbCBjb21waWxlcyBzb3VyY2UgZm9sZGVyIG91dCBzaWRlIG9mIGN1cnJlbnQgc3JjIGRpcmVjdG9yeVxuICBjaGFuZ2VCYWJlbExvYWRlcihjb25maWcpO1xuXG4gIC8vIFJlbW92ZSBNb2R1bGVzU2NvcGVQbHVnaW4gZnJvbSByZXNvbHZlIHBsdWdpbnMsIGl0IHN0b3BzIHVzIHVzaW5nIHNvdXJjZSBmb2xkIG91dCBzaWRlIG9mIHByb2plY3QgZGlyZWN0b3J5XG4gIGlmIChjb25maWcucmVzb2x2ZSAmJiBjb25maWcucmVzb2x2ZS5wbHVnaW5zKSB7XG4gICAgY29uc3QgTW9kdWxlU2NvcGVQbHVnaW4gPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvTW9kdWxlU2NvcGVQbHVnaW4nKTtcbiAgICBjb25zdCBzcmNTY29wZVBsdWdpbklkeCA9IGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuZmluZEluZGV4KHBsdWdpbiA9PiBwbHVnaW4gaW5zdGFuY2VvZiBNb2R1bGVTY29wZVBsdWdpbik7XG4gICAgaWYgKHNyY1Njb3BlUGx1Z2luSWR4ID49IDApIHtcbiAgICAgIGNvbmZpZy5yZXNvbHZlLnBsdWdpbnMuc3BsaWNlKHNyY1Njb3BlUGx1Z2luSWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBNb3ZlIHByb2plY3Qgbm9kZV9tb2R1bGVzIHRvIGZpcnN0IHBvc2l0aW9uIGluIHJlc29sdmUgb3JkZXJcbiAgaWYgKGNvbmZpZy5yZXNvbHZlICYmIGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMpIHtcbiAgICBjb25zdCB0b3BNb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpO1xuICAgIGNvbnN0IHB3ZElkeCA9IGNvbmZpZy5yZXNvbHZlLm1vZHVsZXMuZmluZEluZGV4KG0gPT4gbSA9PT0gdG9wTW9kdWxlRGlyKTtcbiAgICBpZiAocHdkSWR4ID4gMCkge1xuICAgICAgY29uZmlnLnJlc29sdmUubW9kdWxlcy5zcGxpY2UocHdkSWR4LCAxKTtcbiAgICB9XG4gICAgY29uZmlnLnJlc29sdmUubW9kdWxlcy51bnNoaWZ0KHRvcE1vZHVsZURpcik7XG4gIH1cblxuICBPYmplY3QuYXNzaWduKGNvbmZpZy5yZXNvbHZlIS5hbGlhcywgcmVxdWlyZSgncnhqcy9fZXNtMjAxNS9wYXRoLW1hcHBpbmcnKSgpKTtcbiAgT2JqZWN0LmFzc2lnbihjb25maWcub3B0aW1pemF0aW9uIS5zcGxpdENodW5rcywge1xuICAgIGNodW5rczogJ2FsbCcsXG4gICAgLy8gbmFtZTogZmFsc2UsIGRlZmF1bHQgaXMgZmFsc2UgZm9yIHByb2R1Y3Rpb25cbiAgICBjYWNoZUdyb3Vwczoge1xuICAgICAgbGF6eVZlbmRvcjoge1xuICAgICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgICBjaHVua3M6ICdhc3luYycsXG4gICAgICAgIGVuZm9yY2U6IHRydWUsXG4gICAgICAgIHRlc3Q6IC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXS8sIC8vIFRPRE86IGV4Y2x1ZGUgRHIgcGFja2FnZSBzb3VyY2UgZmlsZVxuICAgICAgICBwcmlvcml0eTogMVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGNvbmZpZy5wbHVnaW5zIS5wdXNoKG5ldyAoY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2FuZ3VsYXItY2xpLXN0YXRzJywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgY29uc29sZS5sb2coY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b1N0cmluZygnbm9ybWFsJykpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgLy8gY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9Kc29uKCdub3JtYWwnKSk7XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snc3RhdHMuanNvbiddID0gbmV3IFJhd1NvdXJjZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSkoKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IFByb2dyZXNzUGx1Z2luKHsgcHJvZmlsZTogdHJ1ZSB9KSk7XG5cbiAgY29uZmlnLnN0YXRzID0gJ25vcm1hbCc7IC8vIE5vdCB3b3JraW5nXG5cbiAgY29uc3Qgc3NyQ29uZmlnID0gKGdsb2JhbCBhcyBhbnkpLl9fU1NSO1xuICBpZiAoc3NyQ29uZmlnKSB7XG4gICAgc3NyQ29uZmlnKGNvbmZpZyk7XG4gIH1cblxuICBmcy5ta2RpcnBTeW5jKCdsb2dzJyk7XG4gIGZzLndyaXRlRmlsZSgnbG9ncy93ZWJwYWNrLmNvbmZpZy5kZWJ1Zy5qcycsIHByaW50Q29uZmlnKGNvbmZpZyksIChlcnIpID0+IHtcbiAgICAvLyBqdXN0IGZvciBkZWJ1Z1xuICB9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbmZ1bmN0aW9uIGNoYW5nZUJhYmVsTG9hZGVyKGNvbmZpZzogQ29uZmlndXJhdGlvbikge1xuICBjb25zdCBjcmFQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnNvbWUoZmluZEFuZENoYW5nZVJ1bGUpO1xuXG4gIGZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGU6IFJ1bGVTZXRSdWxlKSB7XG4gICAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gICAgaWYgKHJ1bGUuaW5jbHVkZSAmJiB0eXBlb2YgcnVsZS5sb2FkZXIgPT09ICdzdHJpbmcnICYmIHJ1bGUubG9hZGVyLmluZGV4T2YoUGF0aC5zZXAgKyAnYmFiZWwtbG9hZGVyJyArIFBhdGguc2VwKSkge1xuICAgICAgZGVsZXRlIHJ1bGUuaW5jbHVkZTtcbiAgICAgIGNvbnN0IG9yaWdUZXN0ID0gcnVsZS50ZXN0O1xuICAgICAgcnVsZS50ZXN0ID0gKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcGsgPSBmaW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblxuICAgICAgICBjb25zdCB5ZXMgPSAoKHBrICYmIHBrLmRyKSB8fCBmaWxlLnN0YXJ0c1dpdGgoY3JhUGF0aHMuYXBwU3JjKSkgJiZcbiAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBSZWdFeHApID8gb3JpZ1Rlc3QudGVzdChmaWxlKSA6XG4gICAgICAgICAgICAob3JpZ1Rlc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG9yaWdUZXN0KGZpbGUpIDogb3JpZ1Rlc3QgPT09IGZpbGUpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhmaWxlLCB5ZXMpO1xuICAgICAgICByZXR1cm4geWVzO1xuICAgICAgfTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIHJ1bGUub25lT2Yuc29tZShmaW5kQW5kQ2hhbmdlUnVsZSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5cbiJdfQ==
