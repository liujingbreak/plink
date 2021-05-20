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
// import {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
// const plinkDir = Path.dirname(require.resolve('@wfh/plink/package.json'));
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
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
        // TODO: Should be configurable
        if ((!request.startsWith('.') && !entrySet.has(request) &&
            !/[?!]/.test(request)) // && (!/(?:^|[\\/])@babel[\\/]runtime[\\/]/.test(request))
            ||
                // TODO: why hard coe bklib ?
                request.indexOf('/bklib.min') >= 0) {
            // log.info('external request:', request, `(${context})`);
            externalRequestSet.add(request);
            return callback(null, request);
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
                        const m = /^((?:@[^\\\/]+[\\\/])?[^\\\/]+)/.exec(req.slice(workspaceNodeDir.length));
                        externalDeps.add(m ? m[1] : req.slice(workspaceNodeDir.length));
                    }
                    else {
                        externalDeps.add(req);
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
            for (const [_key, value] of Object.entries(configEntry)) {
                createEntrySet(value);
            }
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
        const found = set.findIndex(use => use.loader && use.loader.indexOf(MiniCssExtractPlugin.loader) >= 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLHFEQUFxRDtBQUNyRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUN4QyxzQ0FBMkU7QUFDM0Usa0RBQTBCO0FBQzFCLG1EQUFzQztBQUN0QyxvREFBdUI7QUFDdkIsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdELDBEQUEwRDtBQUMxRCw2RUFBNkU7QUFFN0UsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFFM0YsU0FBd0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUIsRUFBRSxRQUFrQjtJQUM1RixNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsMkJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDdkU7SUFDRCxNQUFNLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFDLEdBQUcsUUFBUSxDQUFDO0lBRWpELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXpHLE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxP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Q0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0lBQ0QsT0FBTztBQUNULENBQUM7QUFFRCxTQUFlLE9BQU8sQ0FBQyxpQkFBd0Q7O1FBQzdFLE1BQU0sTUFBTSxHQUFHLElBQUksdUJBQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUN2QixJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ2QsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLGlDQUFpQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3pEO3FCQUFNO29CQUNMLE9BQU8sRUFBRSxDQUFDO2lCQUNYO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q29uZmlndXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG4vLyBpbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuLy8gaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZ2V0Q21kT3B0aW9ucyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXIgYXMgbG9nNGpzLCBmaW5kUGFja2FnZXNCeU5hbWVzLCBwbGlua0Vudn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stbGliJyk7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG4vLyBjb25zdCBwbGlua0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uLCBub2RlUGF0aDogc3RyaW5nW10pIHtcbiAgY29uc3QgZm91bmRQa2cgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhbYnVpbGRQYWNrYWdlXSldWzBdO1xuICBpZiAoZm91bmRQa2cgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZSAke2J1aWxkUGFja2FnZX1gKTtcbiAgfVxuICBjb25zdCB7cmVhbFBhdGg6IHBrRGlyLCBqc29uOiBwa0pzb259ID0gZm91bmRQa2c7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnLmVudHJ5KSlcbiAgICBjb25maWcuZW50cnkgPSBjb25maWcuZW50cnkuZmlsdGVyKGl0ZW0gPT4gIS9bXFxcXC9dcmVhY3QtZGV2LXV0aWxzW1xcXFwvXXdlYnBhY2tIb3REZXZDbGllbnQvLnRlc3QoaXRlbSkpO1xuXG4gIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBQYXRoLnJlc29sdmUocGtEaXIsICdidWlsZCcpOyAvLyBIYXZlIHRvIG92ZXJyaWRlIGl0IGN1eicgcmVhY3Qtc2NyaXB0cyBhc3NpZ24gYHVuZGVmaW5lZGAgaW4gbm9uLXByb2R1Y3Rpb24gZW52XG4gIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ2xpYi1idW5kbGUuanMnO1xuICBjb25maWcub3V0cHV0IS5saWJyYXJ5VGFyZ2V0ID0gJ3VtZCc7XG4gIGNvbmZpZy5vcHRpbWl6YXRpb24hLnJ1bnRpbWVDaHVuayA9IGZhbHNlO1xuICBpZiAoY29uZmlnLm9wdGltaXphdGlvbiAmJiBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzKSB7XG4gICAgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcyA9IHtcbiAgICAgIGNhY2hlR3JvdXBzOiB7ZGVmYXVsdDogZmFsc2V9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLS0gUGx1Z2lucyBmaWx0ZXIgLS0tLVxuXG4gIGNvbnN0IElubGluZUNodW5rSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbicpKTtcbiAgLy8gY29uc3QgSW50ZXJwb2xhdGVIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW50ZXJwb2xhdGVIdG1sUGx1Z2luJykpO1xuICBjb25zdCBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luJykpO1xuICAvLyBjb25zdCBIdG1sV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvaHRtbC13ZWJwYWNrLXBsdWdpbicpKTtcbiAgY29uc3Qge0hvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2lufSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvd2VicGFjaycpKTtcblxuICBjb25maWcucGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIS5maWx0ZXIocGx1Z2luID0+IHtcblxuICAgIHJldHVybiBbTWluaUNzc0V4dHJhY3RQbHVnaW4sXG4gICAgICBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbixcbiAgICAgIElubGluZUNodW5rSHRtbFBsdWdpbixcbiAgICAgIEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luXG4gICAgICAvLyBIdG1sV2VicGFja1BsdWdpbixcbiAgICAgIC8vIEludGVycG9sYXRlSHRtbFBsdWdpblxuICAgIF0uZXZlcnkoY2xzID0+ICEocGx1Z2luIGluc3RhbmNlb2YgY2xzKSk7XG4gIH0pO1xuXG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuICBjb25zdCBjbWRPcHRzID0gZ2V0Q21kT3B0aW9ucygpO1xuICBjb25zdCBleHRlcm5hbFJlcXVlc3RTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5jbHVkZU1vZHVsZVJlID0gKGNtZE9wdHMuaW5jbHVkZXMgfHwgW10pXG4gICAgLm1hcChtb2QgPT4gbmV3IFJlZ0V4cChtb2QpKTtcbiAgaW5jbHVkZU1vZHVsZVJlLnB1c2gobmV3IFJlZ0V4cChfLmVzY2FwZVJlZ0V4cChjbWRPcHRzLmJ1aWxkVGFyZ2V0KSkpO1xuXG4gIGlmIChjb25maWcuZXh0ZXJuYWxzID09IG51bGwpIHtcbiAgICBjb25maWcuZXh0ZXJuYWxzID0gW107XG4gIH1cblxuICBsZXQgZW50cnlTZXQ6IFNldDxzdHJpbmc+O1xuXG4gIChjb25maWcuZXh0ZXJuYWxzIGFzIEV4dHJhY3Q8Q29uZmlndXJhdGlvblsnZXh0ZXJuYWxzJ10sIEFycmF5PGFueT4+KVxuICAgIC5wdXNoKFxuICAgICAgYXN5bmMgKGNvbnRleHQ6IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQgKSA9PiB7XG4gICAgICAgIGlmIChpbmNsdWRlTW9kdWxlUmUuc29tZShyZyA9PiByZy50ZXN0KHJlcXVlc3QpKSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbnRyeVNldCA9PSBudWxsICYmIGNvbmZpZy5lbnRyeSlcbiAgICAgICAgICBlbnRyeVNldCA9IGF3YWl0IGNyZWF0ZUVudHJ5U2V0KGNvbmZpZy5lbnRyeSk7XG5cbiAgICAgICAgLy8gVE9ETzogU2hvdWxkIGJlIGNvbmZpZ3VyYWJsZVxuICAgICAgICBpZiAoKCFyZXF1ZXN0LnN0YXJ0c1dpdGgoJy4nKSAmJiAhZW50cnlTZXQuaGFzKHJlcXVlc3QpICYmXG4gICAgICAgICAgIS9bPyFdLy50ZXN0KHJlcXVlc3QpKSAvLyAmJiAoIS8oPzpefFtcXFxcL10pQGJhYmVsW1xcXFwvXXJ1bnRpbWVbXFxcXC9dLy50ZXN0KHJlcXVlc3QpKVxuICAgICAgICAgIHx8XG4gICAgICAgICAgLy8gVE9ETzogd2h5IGhhcmQgY29lIGJrbGliID9cbiAgICAgICAgICByZXF1ZXN0LmluZGV4T2YoJy9ia2xpYi5taW4nKSA+PSAwKSB7XG4gICAgICAgICAgLy8gbG9nLmluZm8oJ2V4dGVybmFsIHJlcXVlc3Q6JywgcmVxdWVzdCwgYCgke2NvbnRleHR9KWApO1xuICAgICAgICAgIGV4dGVybmFsUmVxdWVzdFNldC5hZGQocmVxdWVzdCk7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChcbiAgICAvLyBuZXcgRXNtV2VicGFja1BsdWdpbigpLFxuICAgIG5ldyAoY2xhc3Mge1xuICAgICAgZm9ya0RvbmU6IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgc3RhdHMgPT4ge1xuICAgICAgICAgIHRoaXMuZm9ya0RvbmUgPSB0aGlzLmZvcmtEb25lLnRoZW4oKCkgPT4gZm9ya1RzYyhwa0pzb24pKTtcbiAgICAgICAgICBjb25zdCBleHRlcm5hbERlcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgICAgY29uc3Qgd29ya3NwYWNlTm9kZURpciA9IHBsaW5rRW52LndvcmtEaXIgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnICsgUGF0aC5zZXA7XG4gICAgICAgICAgZm9yIChjb25zdCByZXEgb2YgZXh0ZXJuYWxSZXF1ZXN0U2V0LnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHJlcSkgJiYgUGF0aC5yZXNvbHZlKHJlcSkuc3RhcnRzV2l0aCh3b3Jrc3BhY2VOb2RlRGlyKSkge1xuICAgICAgICAgICAgICBjb25zdCBtID0gL14oKD86QFteXFxcXFxcL10rW1xcXFxcXC9dKT9bXlxcXFxcXC9dKykvLmV4ZWMocmVxLnNsaWNlKHdvcmtzcGFjZU5vZGVEaXIubGVuZ3RoKSk7XG4gICAgICAgICAgICAgIGV4dGVybmFsRGVwcy5hZGQobSA/IG1bMV0gOiByZXEuc2xpY2Uod29ya3NwYWNlTm9kZURpci5sZW5ndGgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGV4dGVybmFsRGVwcy5hZGQocmVxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbG9nLndhcm4oY2hhbGsucmVkKCdleHRlcm5hbCBkZXBlbmRlbmNpZXM6XFxuICAnICsgWy4uLmV4dGVybmFsRGVwcy52YWx1ZXMoKV0uam9pbignLCAnKSkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUVudHJ5U2V0KGNvbmZpZ0VudHJ5OiBOb25OdWxsYWJsZTxDb25maWd1cmF0aW9uWydlbnRyeSddPiwgZW50cnlTZXQ/OiBTZXQ8c3RyaW5nPikge1xuICBpZiAoZW50cnlTZXQgPT0gbnVsbClcbiAgICBlbnRyeVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbmZpZ0VudHJ5KSkge1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgY29uZmlnRW50cnkpIHtcbiAgICAgIGVudHJ5U2V0LmFkZChlbnRyeSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBjb25maWdFbnRyeSA9PT0gJ3N0cmluZycpIHtcbiAgICBlbnRyeVNldC5hZGQoY29uZmlnRW50cnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjb25maWdFbnRyeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShjb25maWdFbnRyeSgpKS50aGVuKGVudHJpZXMgPT4gY3JlYXRlRW50cnlTZXQoZW50cmllcykpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjb25maWdFbnRyeSA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKGNvbnN0IFtfa2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY29uZmlnRW50cnkpKSB7XG4gICAgICBjcmVhdGVFbnRyeVNldCh2YWx1ZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBlbnRyeVNldDtcbn1cblxuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBjb25zdCBmb3VuZCA9IHNldC5maW5kSW5kZXgoXG4gICAgICB1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoTWluaUNzc0V4dHJhY3RQbHVnaW4ubG9hZGVyKSA+PSAwKTtcbiAgICAvLyBjb25zdCBmb3VuZCA9IHJ1bGUudXNlLmZpbmRJbmRleCh1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoJ21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykgPj0gMCk7XG4gICAgaWYgKGZvdW5kID49IDApIHtcbiAgICAgIHNldC5zcGxpY2UoZm91bmQsIDEpO1xuICAgICAgc2V0LnVuc2hpZnQocmVxdWlyZS5yZXNvbHZlKCdzdHlsZS1sb2FkZXInKSk7XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1RzYyh0YXJnZXRQYWNrYWdlSnNvbjoge25hbWU6IHN0cmluZzsgcGxpbms/OiBhbnk7IGRyPzogYW55fSkge1xuICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi90c2QtZ2VuZXJhdGUtdGhyZWFkJykpO1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgd29ya2VyLm9uKCdleGl0JywgY29kZSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICByZWoobmV3IEVycm9yKGBXb3JrZXIgc3RvcHBlZCB3aXRoIGV4aXQgY29kZSAke2NvZGV9YCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHdvcmtlci5vbignbWVzc2FnZScsIHJlaik7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gIH0pO1xufVxuIl19