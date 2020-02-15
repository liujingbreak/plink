"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const build_target_helper_1 = require("./build-target-helper");
// import fs from 'fs-extra';
const path_1 = tslib_1.__importDefault(require("path"));
// import {getCmdOptions} from './utils';
function change(buildPackage, config) {
    const { dir: pkDir, packageJson: pkJson } = build_target_helper_1.findPackage(buildPackage);
    config.entry = path_1.default.resolve(pkDir, pkJson.dr.buildEntry.lib);
    config.output.path = path_1.default.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
    config.output.filename = 'lib-bundle.js';
    config.output.libraryTarget = 'commonjs2';
    config.optimization.runtimeChunk = false;
    if (config.optimization && config.optimization.splitChunks) {
        config.optimization.splitChunks = {
            cacheGroups: { default: false }
        };
    }
    const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
    const InlineChunkHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
    const InterpolateHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
    const HtmlWebpackPlugin = require(path_1.default.resolve('node_modules/html-webpack-plugin'));
    config.plugins = config.plugins.filter(plugin => {
        return (!(plugin instanceof MiniCssExtractPlugin)) &&
            (!(plugin instanceof InlineChunkHtmlPlugin)) &&
            (!(plugin instanceof InterpolateHtmlPlugin)) &&
            (!(plugin instanceof HtmlWebpackPlugin));
    });
    for (const rule of config.module.rules)
        findAndChangeRule(rule);
    const reqSet = new Set();
    if (config.externals == null)
        config.externals = [];
    config.externals
        .push((context, request, callback) => {
        // TODO: Should be configurable
        if ((!request.startsWith('.') && request !== config.entry &&
            !/[?!]/.test(request) &&
            !/[\\/]@babel[\\/]/.test(request)) || request.indexOf('/bklib.min') >= 0) {
            // console.log('external request:', request, `(${context})`);
            reqSet.add(request);
            return callback(null, 'commonjs ' + request);
        }
        callback();
    });
    config.plugins.push(new (class {
        apply(compiler) {
            compiler.hooks.done.tap('cra-scripts', stats => {
                // tslint:disable-next-line: no-console
                console.log('external request:', Array.from(reqSet.values()).join('\n'));
            });
        }
    })());
}
exports.default = change;
function findAndChangeRule(rule) {
    // TODO: check in case CRA will use Rule.use instead of "loader"
    if (Array.isArray(rule.use)) {
        const found = rule.use.findIndex(use => use.loader && use.loader.indexOf('mini-css-extract-plugin') >= 0);
        if (found >= 0) {
            rule.use.splice(found, 1);
        }
    }
    else if (rule.oneOf) {
        return rule.oneOf.forEach(findAndChangeRule);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvd2VicGFjay1saWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0RBQWtEO0FBQ2xELDZCQUE2QjtBQUM3Qix3REFBd0I7QUFDeEIseUNBQXlDO0FBRXpDLFNBQXdCLE1BQU0sQ0FBQyxZQUFvQixFQUFFLE1BQXFCO0lBRXhFLE1BQU0sRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUMsR0FBRyxpQ0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRXBFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFN0QsTUFBTSxDQUFDLE1BQU8sQ0FBQyxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxrRkFBa0Y7SUFDdEksTUFBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLEdBQUcsZUFBZSxDQUFDO0lBQzFDLE1BQU0sQ0FBQyxNQUFPLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQztJQUMzQyxNQUFNLENBQUMsWUFBYSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7SUFDMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFO1FBQzFELE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHO1lBQ2hDLFdBQVcsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7U0FDOUIsQ0FBQztLQUNIO0lBRUQsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7SUFDM0YsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxvREFBb0QsQ0FB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LENBQUMsQ0FBQztTQUMzQjtLQUNGO1NBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztLQUM5QztBQUNILENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L3dlYnBhY2stbGliLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDb25maWd1cmF0aW9uLCBDb21waWxlciwgUnVsZVNldFJ1bGV9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB7Z2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uKSB7XG5cbiAgY29uc3Qge2RpcjogcGtEaXIsIHBhY2thZ2VKc29uOiBwa0pzb259ID0gZmluZFBhY2thZ2UoYnVpbGRQYWNrYWdlKTtcblxuICBjb25maWcuZW50cnkgPSBQYXRoLnJlc29sdmUocGtEaXIsIHBrSnNvbi5kci5idWlsZEVudHJ5LmxpYik7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAnY29tbW9uanMyJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgY29uc3QgTWluaUNzc0V4dHJhY3RQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykpO1xuICBjb25zdCBJbmxpbmVDaHVua0h0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEludGVycG9sYXRlSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ludGVycG9sYXRlSHRtbFBsdWdpbicpKTtcbiAgY29uc3QgSHRtbFdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2h0bWwtd2VicGFjay1wbHVnaW4nKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMgPSBjb25maWcucGx1Z2lucyEuZmlsdGVyKHBsdWdpbiA9PiB7XG4gICAgcmV0dXJuICghKHBsdWdpbiBpbnN0YW5jZW9mIE1pbmlDc3NFeHRyYWN0UGx1Z2luKSkgJiZcbiAgICAgICghIChwbHVnaW4gaW5zdGFuY2VvZiBJbmxpbmVDaHVua0h0bWxQbHVnaW4pKSAmJlxuICAgICAgKCEgKHBsdWdpbiBpbnN0YW5jZW9mIEludGVycG9sYXRlSHRtbFBsdWdpbikpICYmXG4gICAgICAoISAocGx1Z2luIGluc3RhbmNlb2YgSHRtbFdlYnBhY2tQbHVnaW4pKTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBydWxlIG9mIGNvbmZpZy5tb2R1bGUhLnJ1bGVzKVxuICAgIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUpO1xuXG5cbiAgY29uc3QgcmVxU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKGNvbmZpZy5leHRlcm5hbHMgPT0gbnVsbClcbiAgICBjb25maWcuZXh0ZXJuYWxzID0gW107XG4gIChjb25maWcuZXh0ZXJuYWxzIGFzIEV4dHJhY3Q8Q29uZmlndXJhdGlvblsnZXh0ZXJuYWxzJ10sIEFycmF5PGFueT4+KVxuICAucHVzaChcbiAgICAoY29udGV4dDogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCApID0+IHtcbiAgICAgIC8vIFRPRE86IFNob3VsZCBiZSBjb25maWd1cmFibGVcbiAgICAgIGlmICgoIXJlcXVlc3Quc3RhcnRzV2l0aCgnLicpICYmIHJlcXVlc3QgIT09IGNvbmZpZy5lbnRyeSAmJlxuICAgICAgICAhL1s/IV0vLnRlc3QocmVxdWVzdCkgJiZcbiAgICAgICAgIS9bXFxcXC9dQGJhYmVsW1xcXFwvXS8udGVzdChyZXF1ZXN0KSkgfHwgcmVxdWVzdC5pbmRleE9mKCcvYmtsaWIubWluJykgPj0gMCkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnZXh0ZXJuYWwgcmVxdWVzdDonLCByZXF1ZXN0LCBgKCR7Y29udGV4dH0pYCk7XG4gICAgICAgIHJlcVNldC5hZGQocmVxdWVzdCk7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAnY29tbW9uanMgJyArIHJlcXVlc3QpO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2gobmV3IChjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBzdGF0cyA9PiB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnZXh0ZXJuYWwgcmVxdWVzdDonLCBBcnJheS5mcm9tKHJlcVNldC52YWx1ZXMoKSkuam9pbignXFxuJykpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KSgpKTtcbn1cblxuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlOiBSdWxlU2V0UnVsZSkge1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgY29uc3QgZm91bmQgPSBydWxlLnVzZS5maW5kSW5kZXgodXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKCdtaW5pLWNzcy1leHRyYWN0LXBsdWdpbicpID49IDApO1xuICAgIGlmIChmb3VuZCA+PSAwKSB7XG4gICAgICBydWxlLnVzZS5zcGxpY2UoZm91bmQsIDEpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgcmV0dXJuIHJ1bGUub25lT2YuZm9yRWFjaChmaW5kQW5kQ2hhbmdlUnVsZSk7XG4gIH1cbn1cbiJdfQ==
