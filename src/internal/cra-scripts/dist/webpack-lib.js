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
function forkTsc(targetPackage, nodePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // const {nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;
        const workerData = {
            package: [targetPackage], ed: true, jsx: true, watch: utils_1.getCmdOptions().watch,
            pathsJsons: [],
            overridePackgeDirs: { [targetPackage]: { destDir: 'build', srcDir: '' } }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLCtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUV4QyxzQ0FBNEM7QUFDNUMsa0RBQTBCO0FBQzFCLG1EQUFzQztBQUV0QyxNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDN0QsMERBQTBEO0FBQzFELDZFQUE2RTtBQUU3RSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUUzRixTQUF3QixNQUFNLENBQUMsWUFBb0IsRUFBRSxNQUFxQixFQUFFLFFBQWtCO0lBQzVGLE1BQU0sUUFBUSxHQUFHLGlDQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0MsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDdkU7SUFDRCxNQUFNLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFDLEdBQUcsUUFBUSxDQUFDO0lBRW5ELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXpHLE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO0lBQ3RJLE1B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LElBQUksS0FBSyxDQUFDLGlDQUFpQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3pEO3FCQUFNO29CQUNMLE9BQU8sRUFBRSxDQUFDO2lCQUNYO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVILDREQUE0RDtRQUM1RCw2QkFBNkI7UUFDN0IseUJBQXlCO1FBRXpCLGtHQUFrRztRQUNsRywyRkFBMkY7UUFDM0YsTUFBTTtRQUNOLGdCQUFnQjtRQUNoQixtREFBbUQ7UUFDbkQsb0RBQW9EO1FBQ3BELFlBQVk7UUFDWix5QkFBeUI7UUFDekIsc0RBQXNEO1FBQ3RELGlDQUFpQztRQUNqQyxRQUFRO1FBQ1IsaUJBQWlCO1FBQ2pCLCtDQUErQztRQUMvQyw4QkFBOEI7UUFDOUIsd0NBQXdDO1FBQ3hDLDJCQUEyQjtRQUMzQixRQUFRO1FBQ1IscUJBQXFCO1FBQ3JCLHFDQUFxQztRQUNyQyw4Q0FBOEM7UUFDOUMsaUVBQWlFO1FBQ2pFLDBCQUEwQjtRQUMxQixNQUFNO1FBQ04sbUJBQW1CO1FBQ25CLDBCQUEwQjtRQUMxQixzQ0FBc0M7UUFDdEMsd0NBQXdDO1FBQ3hDLDBHQUEwRztRQUMxRyxlQUFlO1FBQ2YsbUJBQW1CO1FBQ25CLFFBQVE7UUFDUixRQUFRO1FBQ1IsNEJBQTRCO1FBQzVCLDBCQUEwQjtRQUMxQixpQkFBaUI7UUFDakIsUUFBUTtRQUNSLE1BQU07SUFDUixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NvbmZpZ3VyYXRpb24sIENvbXBpbGVyLCBSdWxlU2V0UnVsZSwgUnVsZVNldFVzZUl0ZW19IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtmaW5kUGFja2FnZX0gZnJvbSAnLi9idWlsZC10YXJnZXQtaGVscGVyJztcbi8vIGltcG9ydCBjaGlsZFByb2MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGdldENtZE9wdGlvbnMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7VHNjQ21kUGFyYW19IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcbmltcG9ydCB7bG9nZ2VyIGFzIGxvZzRqc30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stbGliJyk7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG4vLyBjb25zdCBwbGlua0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uLCBub2RlUGF0aDogc3RyaW5nW10pIHtcbiAgY29uc3QgZm91bmRQa2cgPSBmaW5kUGFja2FnZShidWlsZFBhY2thZ2UpO1xuICBpZiAoZm91bmRQa2cgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZSAke2J1aWxkUGFja2FnZX1gKTtcbiAgfVxuICBjb25zdCB7ZGlyOiBwa0RpciwgcGFja2FnZUpzb246IHBrSnNvbn0gPSBmb3VuZFBrZztcblxuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcuZW50cnkpKVxuICAgIGNvbmZpZy5lbnRyeSA9IGNvbmZpZy5lbnRyeS5maWx0ZXIoaXRlbSA9PiAhL1tcXFxcL11yZWFjdC1kZXYtdXRpbHNbXFxcXC9dd2VicGFja0hvdERldkNsaWVudC8udGVzdChpdGVtKSk7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAndW1kJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLSBQbHVnaW5zIGZpbHRlciAtLS0tXG5cbiAgY29uc3QgSW5saW5lQ2h1bmtIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luJykpO1xuICAvLyBjb25zdCBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbnRlcnBvbGF0ZUh0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nKSk7XG4gIC8vIGNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9odG1sLXdlYnBhY2stcGx1Z2luJykpO1xuICBjb25zdCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy93ZWJwYWNrJykpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhLmZpbHRlcihwbHVnaW4gPT4ge1xuXG4gICAgcmV0dXJuIFtNaW5pQ3NzRXh0cmFjdFBsdWdpbixcbiAgICAgIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luLFxuICAgICAgSW5saW5lQ2h1bmtIdG1sUGx1Z2luLFxuICAgICAgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW5cbiAgICAgIC8vIEh0bWxXZWJwYWNrUGx1Z2luLFxuICAgICAgLy8gSW50ZXJwb2xhdGVIdG1sUGx1Z2luXG4gICAgXS5ldmVyeShjbHMgPT4gIShwbHVnaW4gaW5zdGFuY2VvZiBjbHMpKTtcbiAgfSk7XG5cbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuXG4gIGNvbnN0IGV4dGVybmFsUmVxdWVzdFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbmNsdWRlTW9kdWxlUmUgPSAoZ2V0Q21kT3B0aW9ucygpLmluY2x1ZGVzIHx8IFtdKVxuICAgIC5tYXAobW9kID0+IG5ldyBSZWdFeHAobW9kKSk7XG5cbiAgaWYgKGNvbmZpZy5leHRlcm5hbHMgPT0gbnVsbCkge1xuICAgIGNvbmZpZy5leHRlcm5hbHMgPSBbXTtcbiAgfVxuXG4gIGxldCBlbnRyeVNldDogU2V0PHN0cmluZz47XG5cbiAgKGNvbmZpZy5leHRlcm5hbHMgYXMgRXh0cmFjdDxDb25maWd1cmF0aW9uWydleHRlcm5hbHMnXSwgQXJyYXk8YW55Pj4pXG4gICAgLnB1c2goXG4gICAgICBhc3luYyAoY29udGV4dDogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCApID0+IHtcbiAgICAgICAgaWYgKGluY2x1ZGVNb2R1bGVSZS5zb21lKHJnID0+IHJnLnRlc3QocmVxdWVzdCkpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVudHJ5U2V0ID09IG51bGwgJiYgY29uZmlnLmVudHJ5KVxuICAgICAgICAgIGVudHJ5U2V0ID0gYXdhaXQgY3JlYXRlRW50cnlTZXQoY29uZmlnLmVudHJ5KTtcblxuICAgICAgICAvLyBUT0RPOiBTaG91bGQgYmUgY29uZmlndXJhYmxlXG5cbiAgICAgICAgaWYgKCghcmVxdWVzdC5zdGFydHNXaXRoKCcuJykgJiYgIWVudHJ5U2V0LmhhcyhyZXF1ZXN0KSAmJlxuICAgICAgICAgICEvWz8hXS8udGVzdChyZXF1ZXN0KSkgJiYgKCEvW1xcXFwvXUBiYWJlbFtcXFxcL11ydW50aW1lW1xcXFwvXS8udGVzdChyZXF1ZXN0KSlcbiAgICAgICAgICB8fFxuICAgICAgICAgIHJlcXVlc3QuaW5kZXhPZignL2JrbGliLm1pbicpID49IDApIHtcbiAgICAgICAgICAvLyBsb2cuaW5mbygnZXh0ZXJuYWwgcmVxdWVzdDonLCByZXF1ZXN0LCBgKCR7Y29udGV4dH0pYCk7XG4gICAgICAgICAgZXh0ZXJuYWxSZXF1ZXN0U2V0LmFkZChyZXF1ZXN0KTtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgJ2NvbW1vbmpzICcgKyByZXF1ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgICk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2goXG4gICAgLy8gbmV3IEVzbVdlYnBhY2tQbHVnaW4oKSxcbiAgICBuZXcgKGNsYXNzIHtcbiAgICAgIGZvcmtEb25lOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdjcmEtc2NyaXB0cycsIHN0YXRzID0+IHtcbiAgICAgICAgICB0aGlzLmZvcmtEb25lID0gdGhpcy5mb3JrRG9uZS50aGVuKCgpID0+IGZvcmtUc2MocGtKc29uLm5hbWUsIG5vZGVQYXRoKSk7XG4gICAgICAgICAgbG9nLndhcm4oY2hhbGsucmVkKCdleHRlcm5hbCByZXF1ZXN0OlxcbiAgJyArIEFycmF5LmZyb20oZXh0ZXJuYWxSZXF1ZXN0U2V0LnZhbHVlcygpKS5qb2luKCcsICcpKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlRW50cnlTZXQoY29uZmlnRW50cnk6IE5vbk51bGxhYmxlPENvbmZpZ3VyYXRpb25bJ2VudHJ5J10+LCBlbnRyeVNldD86IFNldDxzdHJpbmc+KSB7XG4gIGlmIChlbnRyeVNldCA9PSBudWxsKVxuICAgIGVudHJ5U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnRW50cnkpKSB7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBjb25maWdFbnRyeSkge1xuICAgICAgZW50cnlTZXQuYWRkKGVudHJ5KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnc3RyaW5nJykge1xuICAgIGVudHJ5U2V0LmFkZChjb25maWdFbnRyeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGNvbmZpZ0VudHJ5KCkpLnRoZW4oZW50cmllcyA9PiBjcmVhdGVFbnRyeVNldChlbnRyaWVzKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAoY29uc3QgW19rZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb25maWdFbnRyeSkpIHtcbiAgICAgIGNyZWF0ZUVudHJ5U2V0KHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJ5U2V0O1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGNvbnN0IGZvdW5kID0gc2V0LmZpbmRJbmRleChcbiAgICAgIHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZihNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIpID49IDApO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcnVsZS51c2UuZmluZEluZGV4KHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZignbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSA+PSAwKTtcbiAgICBpZiAoZm91bmQgPj0gMCkge1xuICAgICAgc2V0LnNwbGljZShmb3VuZCwgMSk7XG4gICAgICBzZXQudW5zaGlmdChyZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmb3JrVHNjKHRhcmdldFBhY2thZ2U6IHN0cmluZywgbm9kZVBhdGg6IHN0cmluZ1tdKSB7XG5cbiAgLy8gY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG4gIGNvbnN0IHdvcmtlckRhdGE6IFRzY0NtZFBhcmFtID0ge1xuICAgIHBhY2thZ2U6IFt0YXJnZXRQYWNrYWdlXSwgZWQ6IHRydWUsIGpzeDogdHJ1ZSwgd2F0Y2g6IGdldENtZE9wdGlvbnMoKS53YXRjaCxcbiAgICBwYXRoc0pzb25zOiBbXSxcbiAgICBvdmVycmlkZVBhY2tnZURpcnM6IHtbdGFyZ2V0UGFja2FnZV06IHtkZXN0RGlyOiAnYnVpbGQnLCBzcmNEaXI6ICcnfX1cbiAgfTtcblxuICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi90c2QtZ2VuZXJhdGUtdGhyZWFkJyksIHtcbiAgICB3b3JrZXJEYXRhLCBlbnY6IHtOT0RFX1BBVEg6IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpfVxuICB9IGFzIGFueSk7XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBjb2RlID0+IHtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHJlaihuZXcgRXJyb3IoYFdvcmtlciBzdG9wcGVkIHdpdGggZXhpdCBjb2RlICR7Y29kZX1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgfSk7XG5cbiAgLy8gY29uc3QgZm9ya0FyZ3MgPSBbJ3RzYycsICctLWVkJywgJy0tanN4JywgdGFyZ2V0UGFja2FnZV07XG4gIC8vIGlmIChnZXRDbWRPcHRpb25zKCkud2F0Y2gpXG4gIC8vICAgZm9ya0FyZ3MucHVzaCgnLXcnKTtcblxuICAvLyAvLyBjb25zb2xlLmxvZygnd2VicGFjay1saWI6ICcsIFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3dmaC9kaXN0L2NtZC1ib290c3RyYXAuanMnKSwgZm9ya0FyZ3MpO1xuICAvLyBjb25zdCBjcCA9IGNoaWxkUHJvYy5mb3JrKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3dmaC9kaXN0L2NtZC1ib290c3RyYXAuanMnKSwgZm9ya0FyZ3MsXG4gIC8vICAge1xuICAvLyAgICAgLy8gZW52OiB7XG4gIC8vICAgICAvLyAgIE5PREVfT1BUSU9OUzogJy1yIEB3ZmgvcGxpbmsvcmVnaXN0ZXInLFxuICAvLyAgICAgLy8gICBOT0RFX1BBVEg6IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpXG4gIC8vICAgICAvLyB9LFxuICAvLyAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpXG4gIC8vICAgICAvLyBleGVjQXJndjogW10sIC8vIE5vdCB3b3JraW5nLCBkb24ndCBrbm93IHdoeVxuICAvLyAgICAgLy8gc3RkaW86IFswLCAxLCAyLCAnaXBjJ11cbiAgLy8gICB9KTtcbiAgLy8gLy8gY3AudW5yZWYoKTtcbiAgLy8gcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgLy8gICBjcC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG4gIC8vICAgICBpZiAobXNnID09PSAncGxpbmstdHNjIGNvbXBpbGVkJylcbiAgLy8gICAgICAgY3Aua2lsbCgnU0lHSU5UJyk7XG4gIC8vICAgfSk7XG4gIC8vICAgaWYgKGNwLnN0ZG91dCkge1xuICAvLyAgICAgY3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gIC8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICAgIGNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhOiBzdHJpbmcpID0+IGNvbnNvbGUubG9nKGRhdGEpKTtcbiAgLy8gICAgIGNwLnN0ZG91dC5yZXN1bWUoKTtcbiAgLy8gICB9XG4gIC8vICAgaWYgKGNwLnN0ZGVycilcbiAgLy8gICAgIGNwLnN0ZGVyci5yZXN1bWUoKTtcbiAgLy8gICBjcC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgLy8gICAgIGlmIChjb2RlICE9IG51bGwgJiYgY29kZSAhPT0gMCkge1xuICAvLyAgICAgICByZWoobmV3IEVycm9yKGBGYWlsZWQgdG8gZ2VuZXJhdGUgdHNkIGZpbGVzLCBkdWUgdG8gcHJvY2VzcyBleGl0IHdpdGggY29kZTogJHtjb2RlfSAke3NpZ25hbH1gKSk7XG4gIC8vICAgICB9IGVsc2Uge1xuICAvLyAgICAgICByZXNvbHZlKCk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgLy8gICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgLy8gICAgIHJlc29sdmUoKTtcbiAgLy8gICB9KTtcbiAgLy8gfSk7XG59XG4iXX0=