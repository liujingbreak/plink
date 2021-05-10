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
const build_target_helper_1 = require("./build-target-helper");
// import childProc from 'child_process';
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const plink_1 = require("@wfh/plink");
const chalk_1 = __importDefault(require("chalk"));
const worker_threads_1 = require("worker_threads");
const lodash_1 = __importDefault(require("lodash"));
const cra_scripts_paths_1 = require("./cra-scripts-paths");
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-lib');
// import {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
// const plinkDir = Path.dirname(require.resolve('@wfh/plink/package.json'));
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
function change(buildPackage, config, nodePath) {
    const foundPkg = build_target_helper_1.findPackage(buildPackage);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${buildPackage}`);
    }
    const { dir: pkDir, packageJson: pkJson } = foundPkg;
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
    const externalRequestSet = new Set();
    const includeModuleRe = (utils_1.getCmdOptions().includes || [])
        .map(mod => new RegExp(mod));
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
            !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
            ||
                request.indexOf('/bklib.min') >= 0) {
            // log.info('external request:', request, `(${context})`);
            externalRequestSet.add(request);
            return callback(null, 'commonjs ' + request);
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
                this.forkDone = this.forkDone.then(() => forkTsc(pkJson.name, nodePath));
                log.warn(chalk_1.default.red('external request:\n  ' + Array.from(externalRequestSet.values()).join(', ')));
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
function forkTsc(targetPackageJson, nodePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // const {nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;
        const targetPackage = targetPackageJson.name;
        const workerData = {
            package: [targetPackage], ed: true, jsx: true, watch: utils_1.getCmdOptions().watch,
            pathsJsons: [],
            overridePackgeDirs: { [targetPackage]: {
                    destDir: 'build',
                    srcDir: '',
                    include: lodash_1.default.get(targetPackageJson.plink ? targetPackageJson.plink : targetPackageJson.dr, cra_scripts_paths_1.PKG_LIB_ENTRY_PROP, cra_scripts_paths_1.PKG_LIB_ENTRY_DEFAULT)
                } }
        };
        const worker = new worker_threads_1.Worker(require.resolve('./tsd-generate-thread'), {
            workerData, env: { NODE_PATH: nodePath.join(path_1.default.delimiter) }
        });
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
        // const forkArgs = ['tsc', '--ed', '--jsx', targetPackage];
        // if (getCmdOptions().watch)
        //   forkArgs.push('-w');
        // // console.log('webpack-lib: ', Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs);
        // const cp = childProc.fork(Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs,
        //   {
        //     // env: {
        //     //   NODE_OPTIONS: '-r @wfh/plink/register',
        //     //   NODE_PATH: nodePath.join(Path.delimiter)
        //     // },
        //     cwd: process.cwd()
        //     // execArgv: [], // Not working, don't know why
        //     // stdio: [0, 1, 2, 'ipc']
        //   });
        // // cp.unref();
        // return new Promise<void>((resolve, rej) => {
        //   cp.on('message', msg => {
        //     if (msg === 'plink-tsc compiled')
        //       cp.kill('SIGINT');
        //   });
        //   if (cp.stdout) {
        //     cp.stdout.setEncoding('utf8');
        //     // tslint:disable-next-line: no-console
        //     cp.stdout.on('data', (data: string) => console.log(data));
        //     cp.stdout.resume();
        //   }
        //   if (cp.stderr)
        //     cp.stderr.resume();
        //   cp.on('exit', (code, signal) => {
        //     if (code != null && code !== 0) {
        //       rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
        //     } else {
        //       resolve();
        //     }
        //   });
        //   cp.on('error', err => {
        //     console.error(err);
        //     resolve();
        //   });
        // });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLCtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUV4QyxzQ0FBNEM7QUFDNUMsa0RBQTBCO0FBQzFCLG1EQUFzQztBQUN0QyxvREFBdUI7QUFDdkIsMkRBQThFO0FBQzlFLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUM3RCwwREFBMEQ7QUFDMUQsNkVBQTZFO0FBRTdFLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxDQUFDO0FBRTNGLFNBQXdCLE1BQU0sQ0FBQyxZQUFvQixFQUFFLE1BQXFCLEVBQUUsUUFBa0I7SUFDNUYsTUFBTSxRQUFRLEdBQUcsaUNBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7UUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsWUFBWSxFQUFFLENBQUMsQ0FBQztLQUN2RTtJQUNELE1BQU0sRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUMsR0FBRyxRQUFRLENBQUM7SUFFbkQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDN0IsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsOENBQThDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFekcsTUFBTSxDQUFDLE1BQU8sQ0FBQyxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFD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LDBCQUEwQjtRQUMxQixpQkFBaUI7UUFDakIsUUFBUTtRQUNSLE1BQU07SUFDUixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NvbmZpZ3VyYXRpb24sIENvbXBpbGVyLCBSdWxlU2V0UnVsZSwgUnVsZVNldFVzZUl0ZW19IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbi8vIGltcG9ydCBjaGlsZFByb2MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGdldENtZE9wdGlvbnMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7VHNjQ21kUGFyYW19IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcbmltcG9ydCB7bG9nZ2VyIGFzIGxvZzRqc30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1BLR19MSUJfRU5UUllfREVGQVVMVCwgUEtHX0xJQl9FTlRSWV9QUk9QfSBmcm9tICcuL2NyYS1zY3JpcHRzLXBhdGhzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvY3JhLXNjcmlwdHMud2VicGFjay1saWInKTtcbi8vIGltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbi8vIGNvbnN0IHBsaW5rRGlyID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbmNvbnN0IE1pbmlDc3NFeHRyYWN0UGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9taW5pLWNzcy1leHRyYWN0LXBsdWdpbicpKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY2hhbmdlKGJ1aWxkUGFja2FnZTogc3RyaW5nLCBjb25maWc6IENvbmZpZ3VyYXRpb24sIG5vZGVQYXRoOiBzdHJpbmdbXSkge1xuICBjb25zdCBmb3VuZFBrZyA9IGZpbmRQYWNrYWdlKGJ1aWxkUGFja2FnZSk7XG4gIGlmIChmb3VuZFBrZyA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlICR7YnVpbGRQYWNrYWdlfWApO1xuICB9XG4gIGNvbnN0IHtkaXI6IHBrRGlyLCBwYWNrYWdlSnNvbjogcGtKc29ufSA9IGZvdW5kUGtnO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbmZpZy5lbnRyeSkpXG4gICAgY29uZmlnLmVudHJ5ID0gY29uZmlnLmVudHJ5LmZpbHRlcihpdGVtID0+ICEvW1xcXFwvXXJlYWN0LWRldi11dGlsc1tcXFxcL113ZWJwYWNrSG90RGV2Q2xpZW50Ly50ZXN0KGl0ZW0pKTtcblxuICBjb25maWcub3V0cHV0IS5wYXRoID0gUGF0aC5yZXNvbHZlKHBrRGlyLCAnYnVpbGQnKTsgLy8gSGF2ZSB0byBvdmVycmlkZSBpdCBjdXonIHJlYWN0LXNjcmlwdHMgYXNzaWduIGB1bmRlZmluZWRgIGluIG5vbi1wcm9kdWN0aW9uIGVudlxuICBjb25maWcub3V0cHV0IS5maWxlbmFtZSA9ICdsaWItYnVuZGxlLmpzJztcbiAgY29uZmlnLm91dHB1dCEubGlicmFyeVRhcmdldCA9ICd1bWQnO1xuICBjb25maWcub3B0aW1pemF0aW9uIS5ydW50aW1lQ2h1bmsgPSBmYWxzZTtcbiAgaWYgKGNvbmZpZy5vcHRpbWl6YXRpb24gJiYgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcykge1xuICAgIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MgPSB7XG4gICAgICBjYWNoZUdyb3Vwczoge2RlZmF1bHQ6IGZhbHNlfVxuICAgIH07XG4gIH1cblxuICAvLyAtLS0tIFBsdWdpbnMgZmlsdGVyIC0tLS1cblxuICBjb25zdCBJbmxpbmVDaHVua0h0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4nKSk7XG4gIC8vIGNvbnN0IEludGVycG9sYXRlSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ludGVycG9sYXRlSHRtbFBsdWdpbicpKTtcbiAgY29uc3QgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9Gb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbicpKTtcbiAgLy8gY29uc3QgSHRtbFdlYnBhY2tQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2h0bWwtd2VicGFjay1wbHVnaW4nKSk7XG4gIGNvbnN0IHtIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbn0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3dlYnBhY2snKSk7XG5cbiAgY29uZmlnLnBsdWdpbnMgPSBjb25maWcucGx1Z2lucyEuZmlsdGVyKHBsdWdpbiA9PiB7XG5cbiAgICByZXR1cm4gW01pbmlDc3NFeHRyYWN0UGx1Z2luLFxuICAgICAgRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4sXG4gICAgICBJbmxpbmVDaHVua0h0bWxQbHVnaW4sXG4gICAgICBIb3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpblxuICAgICAgLy8gSHRtbFdlYnBhY2tQbHVnaW4sXG4gICAgICAvLyBJbnRlcnBvbGF0ZUh0bWxQbHVnaW5cbiAgICBdLmV2ZXJ5KGNscyA9PiAhKHBsdWdpbiBpbnN0YW5jZW9mIGNscykpO1xuICB9KTtcblxuICBmaW5kQW5kQ2hhbmdlUnVsZShjb25maWcubW9kdWxlIS5ydWxlcyk7XG5cbiAgY29uc3QgZXh0ZXJuYWxSZXF1ZXN0U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGluY2x1ZGVNb2R1bGVSZSA9IChnZXRDbWRPcHRpb25zKCkuaW5jbHVkZXMgfHwgW10pXG4gICAgLm1hcChtb2QgPT4gbmV3IFJlZ0V4cChtb2QpKTtcblxuICBpZiAoY29uZmlnLmV4dGVybmFscyA9PSBudWxsKSB7XG4gICAgY29uZmlnLmV4dGVybmFscyA9IFtdO1xuICB9XG5cbiAgbGV0IGVudHJ5U2V0OiBTZXQ8c3RyaW5nPjtcblxuICAoY29uZmlnLmV4dGVybmFscyBhcyBFeHRyYWN0PENvbmZpZ3VyYXRpb25bJ2V4dGVybmFscyddLCBBcnJheTxhbnk+PilcbiAgICAucHVzaChcbiAgICAgIGFzeW5jIChjb250ZXh0OiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkICkgPT4ge1xuICAgICAgICBpZiAoaW5jbHVkZU1vZHVsZVJlLnNvbWUocmcgPT4gcmcudGVzdChyZXF1ZXN0KSkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW50cnlTZXQgPT0gbnVsbCAmJiBjb25maWcuZW50cnkpXG4gICAgICAgICAgZW50cnlTZXQgPSBhd2FpdCBjcmVhdGVFbnRyeVNldChjb25maWcuZW50cnkpO1xuXG4gICAgICAgIC8vIFRPRE86IFNob3VsZCBiZSBjb25maWd1cmFibGVcblxuICAgICAgICBpZiAoKCFyZXF1ZXN0LnN0YXJ0c1dpdGgoJy4nKSAmJiAhZW50cnlTZXQuaGFzKHJlcXVlc3QpICYmXG4gICAgICAgICAgIS9bPyFdLy50ZXN0KHJlcXVlc3QpKSAmJiAoIS9bXFxcXC9dQGJhYmVsW1xcXFwvXXJ1bnRpbWVbXFxcXC9dLy50ZXN0KHJlcXVlc3QpKVxuICAgICAgICAgIHx8XG4gICAgICAgICAgcmVxdWVzdC5pbmRleE9mKCcvYmtsaWIubWluJykgPj0gMCkge1xuICAgICAgICAgIC8vIGxvZy5pbmZvKCdleHRlcm5hbCByZXF1ZXN0OicsIHJlcXVlc3QsIGAoJHtjb250ZXh0fSlgKTtcbiAgICAgICAgICBleHRlcm5hbFJlcXVlc3RTZXQuYWRkKHJlcXVlc3QpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAnY29tbW9uanMgJyArIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChcbiAgICAvLyBuZXcgRXNtV2VicGFja1BsdWdpbigpLFxuICAgIG5ldyAoY2xhc3Mge1xuICAgICAgZm9ya0RvbmU6IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgc3RhdHMgPT4ge1xuICAgICAgICAgIHRoaXMuZm9ya0RvbmUgPSB0aGlzLmZvcmtEb25lLnRoZW4oKCkgPT4gZm9ya1RzYyhwa0pzb24ubmFtZSwgbm9kZVBhdGgpKTtcbiAgICAgICAgICBsb2cud2FybihjaGFsay5yZWQoJ2V4dGVybmFsIHJlcXVlc3Q6XFxuICAnICsgQXJyYXkuZnJvbShleHRlcm5hbFJlcXVlc3RTZXQudmFsdWVzKCkpLmpvaW4oJywgJykpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKVxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVFbnRyeVNldChjb25maWdFbnRyeTogTm9uTnVsbGFibGU8Q29uZmlndXJhdGlvblsnZW50cnknXT4sIGVudHJ5U2V0PzogU2V0PHN0cmluZz4pIHtcbiAgaWYgKGVudHJ5U2V0ID09IG51bGwpXG4gICAgZW50cnlTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWdFbnRyeSkpIHtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGNvbmZpZ0VudHJ5KSB7XG4gICAgICBlbnRyeVNldC5hZGQoZW50cnkpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgY29uZmlnRW50cnkgPT09ICdzdHJpbmcnKSB7XG4gICAgZW50cnlTZXQuYWRkKGNvbmZpZ0VudHJ5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY29uZmlnRW50cnkgPT09ICdmdW5jdGlvbicpIHtcbiAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUoY29uZmlnRW50cnkoKSkudGhlbihlbnRyaWVzID0+IGNyZWF0ZUVudHJ5U2V0KGVudHJpZXMpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY29uZmlnRW50cnkgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yIChjb25zdCBbX2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbmZpZ0VudHJ5KSkge1xuICAgICAgY3JlYXRlRW50cnlTZXQodmFsdWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZW50cnlTZXQ7XG59XG5cblxuZnVuY3Rpb24gZmluZEFuZENoYW5nZVJ1bGUocnVsZXM6IFJ1bGVTZXRSdWxlW10pOiB2b2lkIHtcbiAgLy8gVE9ETzogY2hlY2sgaW4gY2FzZSBDUkEgd2lsbCB1c2UgUnVsZS51c2UgaW5zdGVhZCBvZiBcImxvYWRlclwiXG4gIGNoZWNrU2V0KHJ1bGVzKTtcbiAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocnVsZS51c2UpKSB7XG4gICAgICBjaGVja1NldChydWxlLnVzZSk7XG5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocnVsZS5sb2FkZXIpKSB7XG4gICAgICAgIGNoZWNrU2V0KHJ1bGUubG9hZGVyKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUub25lT2YpIHtcbiAgICAgIHJldHVybiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlLm9uZU9mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1NldChzZXQ6IChSdWxlU2V0UnVsZSB8IFJ1bGVTZXRVc2VJdGVtKVtdKSB7XG4gICAgY29uc3QgZm91bmQgPSBzZXQuZmluZEluZGV4KFxuICAgICAgdXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKE1pbmlDc3NFeHRyYWN0UGx1Z2luLmxvYWRlcikgPj0gMCk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBydWxlLnVzZS5maW5kSW5kZXgodXNlID0+ICh1c2UgYXMgYW55KS5sb2FkZXIgJiYgKHVzZSBhcyBhbnkpLmxvYWRlci5pbmRleE9mKCdtaW5pLWNzcy1leHRyYWN0LXBsdWdpbicpID49IDApO1xuICAgIGlmIChmb3VuZCA+PSAwKSB7XG4gICAgICBzZXQuc3BsaWNlKGZvdW5kLCAxKTtcbiAgICAgIHNldC51bnNoaWZ0KHJlcXVpcmUucmVzb2x2ZSgnc3R5bGUtbG9hZGVyJykpO1xuICAgIH1cbiAgfVxuICByZXR1cm47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtUc2ModGFyZ2V0UGFja2FnZUpzb246IGFueSwgbm9kZVBhdGg6IHN0cmluZ1tdKSB7XG5cbiAgLy8gY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBjb25zdCB0YXJnZXRQYWNrYWdlID0gdGFyZ2V0UGFja2FnZUpzb24ubmFtZTtcbiAgY29uc3Qgd29ya2VyRGF0YTogVHNjQ21kUGFyYW0gPSB7XG4gICAgcGFja2FnZTogW3RhcmdldFBhY2thZ2VdLCBlZDogdHJ1ZSwganN4OiB0cnVlLCB3YXRjaDogZ2V0Q21kT3B0aW9ucygpLndhdGNoLFxuICAgIHBhdGhzSnNvbnM6IFtdLFxuICAgIG92ZXJyaWRlUGFja2dlRGlyczoge1t0YXJnZXRQYWNrYWdlXToge1xuICAgICAgZGVzdERpcjogJ2J1aWxkJyxcbiAgICAgIHNyY0RpcjogJycsXG4gICAgICBpbmNsdWRlOiBfLmdldCh0YXJnZXRQYWNrYWdlSnNvbi5wbGluayA/IHRhcmdldFBhY2thZ2VKc29uLnBsaW5rIDogdGFyZ2V0UGFja2FnZUpzb24uZHIsIFBLR19MSUJfRU5UUllfUFJPUCwgUEtHX0xJQl9FTlRSWV9ERUZBVUxUKVxuICAgIH19XG4gIH07XG5cbiAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vdHNkLWdlbmVyYXRlLXRocmVhZCcpLCB7XG4gICAgd29ya2VyRGF0YSwgZW52OiB7Tk9ERV9QQVRIOiBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKX1cbiAgfSBhcyBhbnkpO1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgd29ya2VyLm9uKCdleGl0JywgY29kZSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICByZWoobmV3IEVycm9yKGBXb3JrZXIgc3RvcHBlZCB3aXRoIGV4aXQgY29kZSAke2NvZGV9YCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHdvcmtlci5vbignbWVzc2FnZScsIHJlaik7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gIH0pO1xuXG4gIC8vIGNvbnN0IGZvcmtBcmdzID0gWyd0c2MnLCAnLS1lZCcsICctLWpzeCcsIHRhcmdldFBhY2thZ2VdO1xuICAvLyBpZiAoZ2V0Q21kT3B0aW9ucygpLndhdGNoKVxuICAvLyAgIGZvcmtBcmdzLnB1c2goJy13Jyk7XG5cbiAgLy8gLy8gY29uc29sZS5sb2coJ3dlYnBhY2stbGliOiAnLCBQYXRoLnJlc29sdmUocGxpbmtEaXIsICd3ZmgvZGlzdC9jbWQtYm9vdHN0cmFwLmpzJyksIGZvcmtBcmdzKTtcbiAgLy8gY29uc3QgY3AgPSBjaGlsZFByb2MuZm9yayhQYXRoLnJlc29sdmUocGxpbmtEaXIsICd3ZmgvZGlzdC9jbWQtYm9vdHN0cmFwLmpzJyksIGZvcmtBcmdzLFxuICAvLyAgIHtcbiAgLy8gICAgIC8vIGVudjoge1xuICAvLyAgICAgLy8gICBOT0RFX09QVElPTlM6ICctciBAd2ZoL3BsaW5rL3JlZ2lzdGVyJyxcbiAgLy8gICAgIC8vICAgTk9ERV9QQVRIOiBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKVxuICAvLyAgICAgLy8gfSxcbiAgLy8gICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAvLyAgICAgLy8gZXhlY0FyZ3Y6IFtdLCAvLyBOb3Qgd29ya2luZywgZG9uJ3Qga25vdyB3aHlcbiAgLy8gICAgIC8vIHN0ZGlvOiBbMCwgMSwgMiwgJ2lwYyddXG4gIC8vICAgfSk7XG4gIC8vIC8vIGNwLnVucmVmKCk7XG4gIC8vIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gIC8vICAgY3Aub24oJ21lc3NhZ2UnLCBtc2cgPT4ge1xuICAvLyAgICAgaWYgKG1zZyA9PT0gJ3BsaW5rLXRzYyBjb21waWxlZCcpXG4gIC8vICAgICAgIGNwLmtpbGwoJ1NJR0lOVCcpO1xuICAvLyAgIH0pO1xuICAvLyAgIGlmIChjcC5zdGRvdXQpIHtcbiAgLy8gICAgIGNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAvLyAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgICBjcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiBjb25zb2xlLmxvZyhkYXRhKSk7XG4gIC8vICAgICBjcC5zdGRvdXQucmVzdW1lKCk7XG4gIC8vICAgfVxuICAvLyAgIGlmIChjcC5zdGRlcnIpXG4gIC8vICAgICBjcC5zdGRlcnIucmVzdW1lKCk7XG4gIC8vICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gIC8vICAgICBpZiAoY29kZSAhPSBudWxsICYmIGNvZGUgIT09IDApIHtcbiAgLy8gICAgICAgcmVqKG5ldyBFcnJvcihgRmFpbGVkIHRvIGdlbmVyYXRlIHRzZCBmaWxlcywgZHVlIHRvIHByb2Nlc3MgZXhpdCB3aXRoIGNvZGU6ICR7Y29kZX0gJHtzaWduYWx9YCkpO1xuICAvLyAgICAgfSBlbHNlIHtcbiAgLy8gICAgICAgcmVzb2x2ZSgpO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gIC8vICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gIC8vICAgICByZXNvbHZlKCk7XG4gIC8vICAgfSk7XG4gIC8vIH0pO1xufVxuIl19