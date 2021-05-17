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
            !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLHFEQUFxRDtBQUNyRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUN4QyxzQ0FBaUU7QUFDakUsa0RBQTBCO0FBQzFCLG1EQUFzQztBQUN0QyxvREFBdUI7QUFDdkIsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdELDBEQUEwRDtBQUMxRCw2RUFBNkU7QUFFN0UsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFFM0YsU0FBd0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUIsRUFBRSxRQUFrQjtJQUM1RixNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsMkJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDdkU7SUFDRCxNQUFNLEVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFDLEdBQUcsUUFBUSxDQUFDO0lBRWpELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRXpHLE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxP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QUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO1FBRUgsNERBQTREO1FBQzVELDZCQUE2QjtRQUM3Qix5QkFBeUI7UUFFekIsa0dBQWtHO1FBQ2xHLDJGQUEyRjtRQUMzRixNQUFNO1FBQ04sZ0JBQWdCO1FBQ2hCLG1EQUFtRDtRQUNuRCxvREFBb0Q7UUFDcEQsWUFBWTtRQUNaLHlCQUF5QjtRQUN6QixzREFBc0Q7UUFDdEQsaUNBQWlDO1FBQ2pDLFFBQVE7UUFDUixpQkFBaUI7UUFDakIsK0NBQStDO1FBQy9DLDhCQUE4QjtRQUM5Qix3Q0FBd0M7UUFDeEMsMkJBQTJCO1FBQzNCLFFBQVE7UUFDUixxQkFBcUI7UUFDckIscUNBQXFDO1FBQ3JDLDhDQUE4QztRQUM5QyxpRUFBaUU7UUFDakUsMEJBQTBCO1FBQzFCLE1BQU07UUFDTixtQkFBbUI7UUFDbkIsMEJBQTBCO1FBQzFCLHNDQUFzQztRQUN0Qyx3Q0FBd0M7UUFDeEMsMEdBQTBHO1FBQzFHLGVBQWU7UUFDZixtQkFBbUI7UUFDbkIsUUFBUTtRQUNSLFFBQVE7UUFDUiw0QkFBNEI7UUFDNUIsMEJBQTBCO1FBQzFCLGlCQUFpQjtRQUNqQixRQUFRO1FBQ1IsTUFBTTtJQUNSLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q29uZmlndXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG4vLyBpbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuLy8gaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZ2V0Q21kT3B0aW9ucyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXIgYXMgbG9nNGpzLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvY3JhLXNjcmlwdHMud2VicGFjay1saWInKTtcbi8vIGltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJztcbi8vIGNvbnN0IHBsaW5rRGlyID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbmNvbnN0IE1pbmlDc3NFeHRyYWN0UGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9taW5pLWNzcy1leHRyYWN0LXBsdWdpbicpKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY2hhbmdlKGJ1aWxkUGFja2FnZTogc3RyaW5nLCBjb25maWc6IENvbmZpZ3VyYXRpb24sIG5vZGVQYXRoOiBzdHJpbmdbXSkge1xuICBjb25zdCBmb3VuZFBrZyA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKFtidWlsZFBhY2thZ2VdKV1bMF07XG4gIGlmIChmb3VuZFBrZyA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlICR7YnVpbGRQYWNrYWdlfWApO1xuICB9XG4gIGNvbnN0IHtyZWFsUGF0aDogcGtEaXIsIGpzb246IHBrSnNvbn0gPSBmb3VuZFBrZztcblxuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcuZW50cnkpKVxuICAgIGNvbmZpZy5lbnRyeSA9IGNvbmZpZy5lbnRyeS5maWx0ZXIoaXRlbSA9PiAhL1tcXFxcL11yZWFjdC1kZXYtdXRpbHNbXFxcXC9dd2VicGFja0hvdERldkNsaWVudC8udGVzdChpdGVtKSk7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAndW1kJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLSBQbHVnaW5zIGZpbHRlciAtLS0tXG5cbiAgY29uc3QgSW5saW5lQ2h1bmtIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luJykpO1xuICAvLyBjb25zdCBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbnRlcnBvbGF0ZUh0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nKSk7XG4gIC8vIGNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9odG1sLXdlYnBhY2stcGx1Z2luJykpO1xuICBjb25zdCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy93ZWJwYWNrJykpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhLmZpbHRlcihwbHVnaW4gPT4ge1xuXG4gICAgcmV0dXJuIFtNaW5pQ3NzRXh0cmFjdFBsdWdpbixcbiAgICAgIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luLFxuICAgICAgSW5saW5lQ2h1bmtIdG1sUGx1Z2luLFxuICAgICAgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW5cbiAgICAgIC8vIEh0bWxXZWJwYWNrUGx1Z2luLFxuICAgICAgLy8gSW50ZXJwb2xhdGVIdG1sUGx1Z2luXG4gICAgXS5ldmVyeShjbHMgPT4gIShwbHVnaW4gaW5zdGFuY2VvZiBjbHMpKTtcbiAgfSk7XG5cbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuXG4gIGNvbnN0IGNtZE9wdHMgPSBnZXRDbWRPcHRpb25zKCk7XG4gIGNvbnN0IGV4dGVybmFsUmVxdWVzdFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbmNsdWRlTW9kdWxlUmUgPSAoY21kT3B0cy5pbmNsdWRlcyB8fCBbXSlcbiAgICAubWFwKG1vZCA9PiBuZXcgUmVnRXhwKG1vZCkpO1xuICBpbmNsdWRlTW9kdWxlUmUucHVzaChuZXcgUmVnRXhwKF8uZXNjYXBlUmVnRXhwKGNtZE9wdHMuYnVpbGRUYXJnZXQpKSk7XG5cbiAgaWYgKGNvbmZpZy5leHRlcm5hbHMgPT0gbnVsbCkge1xuICAgIGNvbmZpZy5leHRlcm5hbHMgPSBbXTtcbiAgfVxuXG4gIGxldCBlbnRyeVNldDogU2V0PHN0cmluZz47XG5cbiAgKGNvbmZpZy5leHRlcm5hbHMgYXMgRXh0cmFjdDxDb25maWd1cmF0aW9uWydleHRlcm5hbHMnXSwgQXJyYXk8YW55Pj4pXG4gICAgLnB1c2goXG4gICAgICBhc3luYyAoY29udGV4dDogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCApID0+IHtcbiAgICAgICAgaWYgKGluY2x1ZGVNb2R1bGVSZS5zb21lKHJnID0+IHJnLnRlc3QocmVxdWVzdCkpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVudHJ5U2V0ID09IG51bGwgJiYgY29uZmlnLmVudHJ5KVxuICAgICAgICAgIGVudHJ5U2V0ID0gYXdhaXQgY3JlYXRlRW50cnlTZXQoY29uZmlnLmVudHJ5KTtcblxuICAgICAgICAvLyBUT0RPOiBTaG91bGQgYmUgY29uZmlndXJhYmxlXG5cbiAgICAgICAgaWYgKCghcmVxdWVzdC5zdGFydHNXaXRoKCcuJykgJiYgIWVudHJ5U2V0LmhhcyhyZXF1ZXN0KSAmJlxuICAgICAgICAgICEvWz8hXS8udGVzdChyZXF1ZXN0KSkgJiYgKCEvW1xcXFwvXUBiYWJlbFtcXFxcL11ydW50aW1lW1xcXFwvXS8udGVzdChyZXF1ZXN0KSlcbiAgICAgICAgICB8fFxuICAgICAgICAgIC8vIFRPRE86IHdoeSBoYXJkIGNvZSBia2xpYiA/XG4gICAgICAgICAgcmVxdWVzdC5pbmRleE9mKCcvYmtsaWIubWluJykgPj0gMCkge1xuICAgICAgICAgIC8vIGxvZy5pbmZvKCdleHRlcm5hbCByZXF1ZXN0OicsIHJlcXVlc3QsIGAoJHtjb250ZXh0fSlgKTtcbiAgICAgICAgICBleHRlcm5hbFJlcXVlc3RTZXQuYWRkKHJlcXVlc3QpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgICk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2goXG4gICAgLy8gbmV3IEVzbVdlYnBhY2tQbHVnaW4oKSxcbiAgICBuZXcgKGNsYXNzIHtcbiAgICAgIGZvcmtEb25lOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdjcmEtc2NyaXB0cycsIHN0YXRzID0+IHtcbiAgICAgICAgICB0aGlzLmZvcmtEb25lID0gdGhpcy5mb3JrRG9uZS50aGVuKCgpID0+IGZvcmtUc2MocGtKc29uKSk7XG4gICAgICAgICAgbG9nLndhcm4oY2hhbGsucmVkKCdleHRlcm5hbCByZXF1ZXN0OlxcbiAgJyArIEFycmF5LmZyb20oZXh0ZXJuYWxSZXF1ZXN0U2V0LnZhbHVlcygpKS5qb2luKCcsICcpKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlRW50cnlTZXQoY29uZmlnRW50cnk6IE5vbk51bGxhYmxlPENvbmZpZ3VyYXRpb25bJ2VudHJ5J10+LCBlbnRyeVNldD86IFNldDxzdHJpbmc+KSB7XG4gIGlmIChlbnRyeVNldCA9PSBudWxsKVxuICAgIGVudHJ5U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnRW50cnkpKSB7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBjb25maWdFbnRyeSkge1xuICAgICAgZW50cnlTZXQuYWRkKGVudHJ5KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnc3RyaW5nJykge1xuICAgIGVudHJ5U2V0LmFkZChjb25maWdFbnRyeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGNvbmZpZ0VudHJ5KCkpLnRoZW4oZW50cmllcyA9PiBjcmVhdGVFbnRyeVNldChlbnRyaWVzKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZ0VudHJ5ID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAoY29uc3QgW19rZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb25maWdFbnRyeSkpIHtcbiAgICAgIGNyZWF0ZUVudHJ5U2V0KHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJ5U2V0O1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGNvbnN0IGZvdW5kID0gc2V0LmZpbmRJbmRleChcbiAgICAgIHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZihNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIpID49IDApO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcnVsZS51c2UuZmluZEluZGV4KHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZignbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSA+PSAwKTtcbiAgICBpZiAoZm91bmQgPj0gMCkge1xuICAgICAgc2V0LnNwbGljZShmb3VuZCwgMSk7XG4gICAgICBzZXQudW5zaGlmdChyZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmb3JrVHNjKHRhcmdldFBhY2thZ2VKc29uOiB7bmFtZTogc3RyaW5nOyBwbGluaz86IGFueTsgZHI/OiBhbnl9KSB7XG4gIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3RzZC1nZW5lcmF0ZS10aHJlYWQnKSk7XG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBjb2RlID0+IHtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHJlaihuZXcgRXJyb3IoYFdvcmtlciBzdG9wcGVkIHdpdGggZXhpdCBjb2RlICR7Y29kZX1gKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgfSk7XG5cbiAgLy8gY29uc3QgZm9ya0FyZ3MgPSBbJ3RzYycsICctLWVkJywgJy0tanN4JywgdGFyZ2V0UGFja2FnZV07XG4gIC8vIGlmIChnZXRDbWRPcHRpb25zKCkud2F0Y2gpXG4gIC8vICAgZm9ya0FyZ3MucHVzaCgnLXcnKTtcblxuICAvLyAvLyBjb25zb2xlLmxvZygnd2VicGFjay1saWI6ICcsIFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3dmaC9kaXN0L2NtZC1ib290c3RyYXAuanMnKSwgZm9ya0FyZ3MpO1xuICAvLyBjb25zdCBjcCA9IGNoaWxkUHJvYy5mb3JrKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3dmaC9kaXN0L2NtZC1ib290c3RyYXAuanMnKSwgZm9ya0FyZ3MsXG4gIC8vICAge1xuICAvLyAgICAgLy8gZW52OiB7XG4gIC8vICAgICAvLyAgIE5PREVfT1BUSU9OUzogJy1yIEB3ZmgvcGxpbmsvcmVnaXN0ZXInLFxuICAvLyAgICAgLy8gICBOT0RFX1BBVEg6IG5vZGVQYXRoLmpvaW4oUGF0aC5kZWxpbWl0ZXIpXG4gIC8vICAgICAvLyB9LFxuICAvLyAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpXG4gIC8vICAgICAvLyBleGVjQXJndjogW10sIC8vIE5vdCB3b3JraW5nLCBkb24ndCBrbm93IHdoeVxuICAvLyAgICAgLy8gc3RkaW86IFswLCAxLCAyLCAnaXBjJ11cbiAgLy8gICB9KTtcbiAgLy8gLy8gY3AudW5yZWYoKTtcbiAgLy8gcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgLy8gICBjcC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG4gIC8vICAgICBpZiAobXNnID09PSAncGxpbmstdHNjIGNvbXBpbGVkJylcbiAgLy8gICAgICAgY3Aua2lsbCgnU0lHSU5UJyk7XG4gIC8vICAgfSk7XG4gIC8vICAgaWYgKGNwLnN0ZG91dCkge1xuICAvLyAgICAgY3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gIC8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICAgIGNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhOiBzdHJpbmcpID0+IGNvbnNvbGUubG9nKGRhdGEpKTtcbiAgLy8gICAgIGNwLnN0ZG91dC5yZXN1bWUoKTtcbiAgLy8gICB9XG4gIC8vICAgaWYgKGNwLnN0ZGVycilcbiAgLy8gICAgIGNwLnN0ZGVyci5yZXN1bWUoKTtcbiAgLy8gICBjcC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgLy8gICAgIGlmIChjb2RlICE9IG51bGwgJiYgY29kZSAhPT0gMCkge1xuICAvLyAgICAgICByZWoobmV3IEVycm9yKGBGYWlsZWQgdG8gZ2VuZXJhdGUgdHNkIGZpbGVzLCBkdWUgdG8gcHJvY2VzcyBleGl0IHdpdGggY29kZTogJHtjb2RlfSAke3NpZ25hbH1gKSk7XG4gIC8vICAgICB9IGVsc2Uge1xuICAvLyAgICAgICByZXNvbHZlKCk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgLy8gICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgLy8gICAgIHJlc29sdmUoKTtcbiAgLy8gICB9KTtcbiAgLy8gfSk7XG59XG4iXX0=