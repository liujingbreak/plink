"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import {findPackage} from './build-target-helper';
// import childProc from 'child_process';
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const plink_1 = require("@wfh/plink");
const chalk_1 = __importDefault(require("chalk"));
const worker_threads_1 = require("worker_threads");
const lodash_1 = __importDefault(require("lodash"));
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-lib');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
const MODULE_NAME_PAT = /^((?:@[^\\/]+[\\/])?[^\\/]+)/;
function change(buildPackage, config, nodePath) {
    const foundPkg = [...plink_1.findPackagesByNames([buildPackage])][0];
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${buildPackage}`);
    }
    const { realPath: pkDir, json: pkJson } = foundPkg;
    if (Array.isArray(config.entry))
        config.entry = config.entry.filter(item => !/[\\/]react-dev-utils[\\/]webpackHotDevClient/.test(item));
    config.output.path = path_1.default.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
    config.output.filename = 'lib-bundle.js';
    config.output.libraryTarget = 'umd';
    config.optimization.runtimeChunk = false;
    if (config.optimization && config.optimization.splitChunks) {
        config.optimization.splitChunks = {
            cacheGroups: { default: false }
        };
    }
    // ---- Plugins filter ----
    const InlineChunkHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
    // const InterpolateHtmlPlugin = require(Path.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
    const ForkTsCheckerWebpackPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin'));
    // const HtmlWebpackPlugin = require(Path.resolve('node_modules/html-webpack-plugin'));
    const { HotModuleReplacementPlugin } = require(path_1.default.resolve('node_modules/webpack'));
    config.plugins = config.plugins.filter(plugin => {
        return [MiniCssExtractPlugin,
            ForkTsCheckerWebpackPlugin,
            InlineChunkHtmlPlugin,
            HotModuleReplacementPlugin
            // HtmlWebpackPlugin,
            // InterpolateHtmlPlugin
        ].every(cls => !(plugin instanceof cls));
    });
    findAndChangeRule(config.module.rules);
    const cmdOpts = utils_1.getCmdOptions();
    const externalRequestSet = new Set();
    const includeModuleRe = (cmdOpts.includes || [])
        .map(mod => new RegExp(mod));
    includeModuleRe.push(new RegExp(lodash_1.default.escapeRegExp(cmdOpts.buildTarget)));
    if (config.externals == null) {
        config.externals = [];
    }
    let entrySet;
    config.externals
        .push((context, request, callback) => __awaiter(this, void 0, void 0, function* () {
        if (includeModuleRe.some(rg => rg.test(request))) {
            return callback();
        }
        if (entrySet == null && config.entry)
            entrySet = yield createEntrySet(config.entry);
        if ((!request.startsWith('.') && !entrySet.has(request) &&
            !/[?!]/.test(request)) // && (!/(?:^|[\\/])@babel[\\/]runtime[\\/]/.test(request))
            ||
                // TODO: why hard coe bklib ?
                request.indexOf('/bklib.min') >= 0) {
            if (path_1.default.isAbsolute(request)) {
                log.info('request absolute path:', request);
                return callback();
            }
            else {
                log.debug('external request:', request, `(${context})`);
                externalRequestSet.add(request);
                return callback(null, request);
            }
        }
        callback();
    }));
    config.plugins.push(
    // new EsmWebpackPlugin(),
    new (class {
        constructor() {
            this.forkDone = Promise.resolve();
        }
        apply(compiler) {
            compiler.hooks.done.tap('cra-scripts', stats => {
                this.forkDone = this.forkDone.then(() => forkTsc(pkJson));
                const externalDeps = new Set();
                const workspaceNodeDir = plink_1.plinkEnv.workDir + path_1.default.sep + 'node_modules' + path_1.default.sep;
                for (const req of externalRequestSet.values()) {
                    if (path_1.default.isAbsolute(req) && path_1.default.resolve(req).startsWith(workspaceNodeDir)) {
                        const m = MODULE_NAME_PAT.exec(req.slice(workspaceNodeDir.length));
                        externalDeps.add(m ? m[1] : req.slice(workspaceNodeDir.length));
                    }
                    else {
                        const m = MODULE_NAME_PAT.exec(req);
                        externalDeps.add(m ? m[1] : req);
                    }
                }
                log.warn(chalk_1.default.red('external dependencies:\n  ' + [...externalDeps.values()].join(', ')));
            });
        }
    })());
}
exports.default = change;
function createEntrySet(configEntry, entrySet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (entrySet == null)
            entrySet = new Set();
        if (Array.isArray(configEntry)) {
            for (const entry of configEntry) {
                entrySet.add(entry);
            }
        }
        else if (typeof configEntry === 'string') {
            entrySet.add(configEntry);
        }
        else if (typeof configEntry === 'function') {
            yield Promise.resolve(configEntry()).then(entries => createEntrySet(entries));
        }
        else if (typeof configEntry === 'object') {
            yield Promise.all(Object.entries(configEntry).map(([_key, value]) => {
                return createEntrySet(value);
            }));
        }
        return entrySet;
    });
}
function findAndChangeRule(rules) {
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
        const found = set.findIndex(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        use => use.loader && use.loader.indexOf(MiniCssExtractPlugin.loader) >= 0);
        // const found = rule.use.findIndex(use => (use as any).loader && (use as any).loader.indexOf('mini-css-extract-plugin') >= 0);
        if (found >= 0) {
            set.splice(found, 1);
            set.unshift(require.resolve('style-loader'));
        }
    }
    return;
}
function forkTsc(targetPackageJson) {
    return __awaiter(this, void 0, void 0, function* () {
        const worker = new worker_threads_1.Worker(require.resolve('./tsd-generate-thread'));
        yield new Promise((resolve, rej) => {
            worker.on('exit', code => {
                if (code !== 0) {
                    rej(new Error(`Worker stopped with exit code ${code}`));
                }
                else {
                    resolve();
                }
            });
            worker.on('message', rej);
            worker.on('error', rej);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLHFEQUFxRDtBQUNyRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUN4QyxzQ0FBMkU7QUFDM0Usa0RBQTBCO0FBQzFCLG1EQUFzQztBQUN0QyxvREFBdUI7QUFDdkIsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBRTdELG1FQUFtRTtBQUNuRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUzRixNQUFNLGVBQWUsR0FBRyw4QkFBOEIsQ0FBQztBQUV2RCxTQUF3QixNQUFNLENBQUMsWUFBb0IsRUFBRSxNQUFxQixFQUFFLFFBQWtCO0lBQzVGLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRywyQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RCxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7UUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsWUFBWSxFQUFFLENBQUMsQ0FBQztLQUN2RTtJQUNELE1BQU0sRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUMsR0FBRyxRQUFRLENBQUM7SUFFakQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDN0IsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsOENBQThDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFekcsTUFBTSxDQUFDLE1BQU8sQ0FBQyxJ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QixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q29uZmlndXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG4vLyBpbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuLy8gaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZ2V0Q21kT3B0aW9ucyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXIgYXMgbG9nNGpzLCBmaW5kUGFja2FnZXNCeU5hbWVzLCBwbGlua0Vudn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stbGliJyk7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbmNvbnN0IE1pbmlDc3NFeHRyYWN0UGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9taW5pLWNzcy1leHRyYWN0LXBsdWdpbicpKTtcblxuY29uc3QgTU9EVUxFX05BTUVfUEFUID0gL14oKD86QFteXFxcXC9dK1tcXFxcL10pP1teXFxcXC9dKykvO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjaGFuZ2UoYnVpbGRQYWNrYWdlOiBzdHJpbmcsIGNvbmZpZzogQ29uZmlndXJhdGlvbiwgbm9kZVBhdGg6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGZvdW5kUGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW2J1aWxkUGFja2FnZV0pXVswXTtcbiAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2UgJHtidWlsZFBhY2thZ2V9YCk7XG4gIH1cbiAgY29uc3Qge3JlYWxQYXRoOiBwa0RpciwganNvbjogcGtKc29ufSA9IGZvdW5kUGtnO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbmZpZy5lbnRyeSkpXG4gICAgY29uZmlnLmVudHJ5ID0gY29uZmlnLmVudHJ5LmZpbHRlcihpdGVtID0+ICEvW1xcXFwvXXJlYWN0LWRldi11dGlsc1tcXFxcL113ZWJwYWNrSG90RGV2Q2xpZW50Ly50ZXN0KGl0ZW0pKTtcblxuICBjb25maWcub3V0cHV0IS5wYXRoID0gUGF0aC5yZXNvbHZlKHBrRGlyLCAnYnVpbGQnKTsgLy8gSGF2ZSB0byBvdmVycmlkZSBpdCBjdXonIHJlYWN0LXNjcmlwdHMgYXNzaWduIGB1bmRlZmluZWRgIGluIG5vbi1wcm9kdWN0aW9uIGVudlxuICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdsaWItYnVuZGxlLmpzJztcbiAgY29uZmlnLm91dHB1dCEubGlicmFyeVRhcmdldCA9ICd1bWQnO1xuICBjb25maWcub3B0aW1pemF0aW9uIS5ydW50aW1lQ2h1bmsgPSBmYWxzZTtcbiAgaWYgKGNvbmZpZy5vcHRpbWl6YXRpb24gJiYgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcykge1xuICAgIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MgPSB7XG4gICAgICBjYWNoZUdyb3Vwczoge2RlZmF1bHQ6IGZhbHNlfVxuICAgIH07XG4gIH1cblxuICAvLyAtLS0tIFBsdWdpbnMgZmlsdGVyIC0tLS1cblxuICBjb25zdCBJbmxpbmVDaHVua0h0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4nKSk7XG4gIC8vIGNvbnN0IEludGVycG9sYXRlSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ludGVycG9sYXRlSHRtbFBsdWdpbicpKTtcbiAgY29uc3QgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicpKTtcbiAgLy8gY29uc3QgSHRtbFdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2h0bWwtd2VicGFjay1wbHVnaW4nKSk7XG4gIGNvbnN0IHtIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbn0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3dlYnBhY2snKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMgPSBjb25maWcucGx1Z2lucyEuZmlsdGVyKHBsdWdpbiA9PiB7XG5cbiAgICByZXR1cm4gW01pbmlDc3NFeHRyYWN0UGx1Z2luLFxuICAgICAgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4sXG4gICAgICBJbmxpbmVDaHVua0h0bWxQbHVnaW4sXG4gICAgICBIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpblxuICAgICAgLy8gSHRtbFdlYnBhY2tQbHVnaW4sXG4gICAgICAvLyBJbnRlcnBvbGF0ZUh0bWxQbHVnaW5cbiAgICBdLmV2ZXJ5KGNscyA9PiAhKHBsdWdpbiBpbnN0YW5jZW9mIGNscykpO1xuICB9KTtcblxuICBmaW5kQW5kQ2hhbmdlUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG5cbiAgY29uc3QgY21kT3B0cyA9IGdldENtZE9wdGlvbnMoKTtcbiAgY29uc3QgZXh0ZXJuYWxSZXF1ZXN0U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGluY2x1ZGVNb2R1bGVSZSA9IChjbWRPcHRzLmluY2x1ZGVzIHx8IFtdKVxuICAgIC5tYXAobW9kID0+IG5ldyBSZWdFeHAobW9kKSk7XG4gIGluY2x1ZGVNb2R1bGVSZS5wdXNoKG5ldyBSZWdFeHAoXy5lc2NhcGVSZWdFeHAoY21kT3B0cy5idWlsZFRhcmdldCkpKTtcblxuICBpZiAoY29uZmlnLmV4dGVybmFscyA9PSBudWxsKSB7XG4gICAgY29uZmlnLmV4dGVybmFscyA9IFtdO1xuICB9XG5cbiAgbGV0IGVudHJ5U2V0OiBTZXQ8c3RyaW5nPjtcblxuICAoY29uZmlnLmV4dGVybmFscyBhcyBFeHRyYWN0PENvbmZpZ3VyYXRpb25bJ2V4dGVybmFscyddLCBBcnJheTxhbnk+PilcbiAgICAucHVzaChcbiAgICAgIGFzeW5jIChjb250ZXh0OiBzdHJpbmcsIHJlcXVlc3Q6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkICkgPT4ge1xuICAgICAgICBpZiAoaW5jbHVkZU1vZHVsZVJlLnNvbWUocmcgPT4gcmcudGVzdChyZXF1ZXN0KSkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW50cnlTZXQgPT0gbnVsbCAmJiBjb25maWcuZW50cnkpXG4gICAgICAgICAgZW50cnlTZXQgPSBhd2FpdCBjcmVhdGVFbnRyeVNldChjb25maWcuZW50cnkpO1xuXG4gICAgICAgIGlmICgoIXJlcXVlc3Quc3RhcnRzV2l0aCgnLicpICYmICFlbnRyeVNldC5oYXMocmVxdWVzdCkgJiZcbiAgICAgICAgICAhL1s/IV0vLnRlc3QocmVxdWVzdCkpIC8vICYmICghLyg/Ol58W1xcXFwvXSlAYmFiZWxbXFxcXC9dcnVudGltZVtcXFxcL10vLnRlc3QocmVxdWVzdCkpXG4gICAgICAgICAgfHxcbiAgICAgICAgICAvLyBUT0RPOiB3aHkgaGFyZCBjb2UgYmtsaWIgP1xuICAgICAgICAgIHJlcXVlc3QuaW5kZXhPZignL2JrbGliLm1pbicpID49IDApIHtcblxuICAgICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdyZXF1ZXN0IGFic29sdXRlIHBhdGg6JywgcmVxdWVzdCk7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nLmRlYnVnKCdleHRlcm5hbCByZXF1ZXN0OicsIHJlcXVlc3QsIGAoJHtjb250ZXh0fSlgKTtcbiAgICAgICAgICAgIGV4dGVybmFsUmVxdWVzdFNldC5hZGQocmVxdWVzdCk7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgKTtcblxuICBjb25maWcucGx1Z2lucy5wdXNoKFxuICAgIC8vIG5ldyBFc21XZWJwYWNrUGx1Z2luKCksXG4gICAgbmV3IChjbGFzcyB7XG4gICAgICBmb3JrRG9uZTogUHJvbWlzZTxhbnk+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnY3JhLXNjcmlwdHMnLCBzdGF0cyA9PiB7XG4gICAgICAgICAgdGhpcy5mb3JrRG9uZSA9IHRoaXMuZm9ya0RvbmUudGhlbigoKSA9PiBmb3JrVHNjKHBrSnNvbikpO1xuICAgICAgICAgIGNvbnN0IGV4dGVybmFsRGVwczogU2V0PHN0cmluZz4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgICBjb25zdCB3b3Jrc3BhY2VOb2RlRGlyID0gcGxpbmtFbnYud29ya0RpciArIFBhdGguc2VwICsgJ25vZGVfbW9kdWxlcycgKyBQYXRoLnNlcDtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlcSBvZiBleHRlcm5hbFJlcXVlc3RTZXQudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUocmVxKSAmJiBQYXRoLnJlc29sdmUocmVxKS5zdGFydHNXaXRoKHdvcmtzcGFjZU5vZGVEaXIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG0gPSBNT0RVTEVfTkFNRV9QQVQuZXhlYyhyZXEuc2xpY2Uod29ya3NwYWNlTm9kZURpci5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgZXh0ZXJuYWxEZXBzLmFkZChtID8gbVsxXSA6IHJlcS5zbGljZSh3b3Jrc3BhY2VOb2RlRGlyLmxlbmd0aCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgbSA9IE1PRFVMRV9OQU1FX1BBVC5leGVjKHJlcSk7XG4gICAgICAgICAgICAgIGV4dGVybmFsRGVwcy5hZGQobSA/IG1bMV0gOiByZXEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBsb2cud2FybihjaGFsay5yZWQoJ2V4dGVybmFsIGRlcGVuZGVuY2llczpcXG4gICcgKyBbLi4uZXh0ZXJuYWxEZXBzLnZhbHVlcygpXS5qb2luKCcsICcpKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlRW50cnlTZXQoY29uZmlnRW50cnk6IE5vbk51bGxhYmxlPENvbmZpZ3VyYXRpb25bJ2VudHJ5J10+LCBlbnRyeVNldD86IFNldDxzdHJpbmc+KSB7XG4gIGlmIChlbnRyeVNldCA9PSBudWxsKVxuICAgIGVudHJ5U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnRW50cnkpKSB7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBjb25maWdFbnRyeSkge1xuICAgICAgZW50cnlTZXQuYWRkKGVudHJ5KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnc3RyaW5nJykge1xuICAgIGVudHJ5U2V0LmFkZChjb25maWdFbnRyeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGNvbmZpZ0VudHJ5KCkpLnRoZW4oZW50cmllcyA9PiBjcmVhdGVFbnRyeVNldChlbnRyaWVzKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnb2JqZWN0Jykge1xuICAgIGF3YWl0IFByb21pc2UuYWxsKE9iamVjdC5lbnRyaWVzKGNvbmZpZ0VudHJ5KS5tYXAoKFtfa2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIHJldHVybiBjcmVhdGVFbnRyeVNldCh2YWx1ZSk7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiBlbnRyeVNldDtcbn1cblxuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBjb25zdCBmb3VuZCA9IHNldC5maW5kSW5kZXgoXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgdXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKE1pbmlDc3NFeHRyYWN0UGx1Z2luLmxvYWRlcikgPj0gMCk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBydWxlLnVzZS5maW5kSW5kZXgodXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKCdtaW5pLWNzcy1leHRyYWN0LXBsdWdpbicpID49IDApO1xuICAgIGlmIChmb3VuZCA+PSAwKSB7XG4gICAgICBzZXQuc3BsaWNlKGZvdW5kLCAxKTtcbiAgICAgIHNldC51bnNoaWZ0KHJlcXVpcmUucmVzb2x2ZSgnc3R5bGUtbG9hZGVyJykpO1xuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtUc2ModGFyZ2V0UGFja2FnZUpzb246IHtuYW1lOiBzdHJpbmc7IHBsaW5rPzogYW55OyBkcj86IGFueX0pIHtcbiAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vdHNkLWdlbmVyYXRlLXRocmVhZCcpKTtcbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIHdvcmtlci5vbignZXhpdCcsIGNvZGUgPT4ge1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgcmVqKG5ldyBFcnJvcihgV29ya2VyIHN0b3BwZWQgd2l0aCBleGl0IGNvZGUgJHtjb2RlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCByZWopO1xuICAgIHdvcmtlci5vbignZXJyb3InLCByZWopO1xuICB9KTtcbn1cbiJdfQ==