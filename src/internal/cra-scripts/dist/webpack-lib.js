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
const log4js_1 = __importDefault(require("log4js"));
const chalk_1 = __importDefault(require("chalk"));
const worker_threads_1 = require("worker_threads");
const log = log4js_1.default.getLogger('@wfh/cra-scripts.webpack-lib');
// import {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
// const plinkDir = Path.dirname(require.resolve('@wfh/plink/package.json'));
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
function change(buildPackage, config, nodePath) {
    const foundPkg = build_target_helper_1.findPackage(buildPackage);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${buildPackage}`);
    }
    const { dir: pkDir, packageJson: pkJson } = foundPkg;
    config.entry = path_1.default.resolve(pkDir, 'public_api.ts');
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
    const reqSet = new Set();
    const includeModuleRe = (utils_1.getCmdOptions().includes || [])
        .map(mod => new RegExp(mod));
    if (config.externals == null)
        config.externals = [];
    config.externals
        .push((context, request, callback) => {
        if (includeModuleRe.some(rg => rg.test(request))) {
            return callback();
        }
        // if (request.indexOf('js-sdk-ocr') >= 0 || request.indexOf('@bk/js-sdk-store') >= 0 ||
        //   request.indexOf('@bk/react-component') >= 0) {
        //   return callback();
        // }
        // TODO: Should be configurable
        if ((!request.startsWith('.') && request !== config.entry &&
            !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
            ||
                request.indexOf('/bklib.min') >= 0) {
            // log.info('external request:', request, `(${context})`);
            reqSet.add(request);
            return callback(null, 'commonjs ' + request);
        }
        callback();
    });
    config.plugins.push(
    // new EsmWebpackPlugin(),
    new (class {
        constructor() {
            this.forkDone = Promise.resolve();
        }
        apply(compiler) {
            compiler.hooks.done.tap('cra-scripts', stats => {
                this.forkDone = this.forkDone.then(() => forkTsc(pkJson.name, nodePath));
                log.warn(chalk_1.default.red('external request:\n  ' + Array.from(reqSet.values()).join(', ')));
            });
        }
    })());
}
exports.default = change;
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
            pathsJsons: []
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLCtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUV4QyxvREFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLG1EQUFzQztBQUV0QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdELDBEQUEwRDtBQUMxRCw2RUFBNkU7QUFFN0UsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFFM0YsU0FBd0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUIsRUFBRSxRQUFrQjtJQUM1RixNQUFNLFFBQVEsR0FBRyxpQ0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0tBQ3ZFO0lBQ0QsTUFBTSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxHQUFHLFFBQVEsQ0FBQztJQUVuRCxNQUFNLENBQUMsS0FBSyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRXBELE1BQU0sQ0FBQyxNQUFPLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO0lBQ3RJLE1BQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQztJQUMxQyxNQUFNLENBQUMsTUFBTyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDckMsTUFBTSxDQUFDLFlB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TCxPQUFPLEVBQUUsQ0FBQztpQkFDWDtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFFSCw0REFBNEQ7UUFDNUQsNkJBQTZCO1FBQzdCLHlCQUF5QjtRQUV6QixrR0FBa0c7UUFDbEcsMkZBQTJGO1FBQzNGLE1BQU07UUFDTixnQkFBZ0I7UUFDaEIsbURBQW1EO1FBQ25ELG9EQUFvRDtRQUNwRCxZQUFZO1FBQ1oseUJBQXlCO1FBQ3pCLHNEQUFzRDtRQUN0RCxpQ0FBaUM7UUFDakMsUUFBUTtRQUNSLGlCQUFpQjtRQUNqQiwrQ0FBK0M7UUFDL0MsOEJBQThCO1FBQzlCLHdDQUF3QztRQUN4QywyQkFBMkI7UUFDM0IsUUFBUTtRQUNSLHFCQUFxQjtRQUNyQixxQ0FBcUM7UUFDckMsOENBQThDO1FBQzlDLGlFQUFpRTtRQUNqRSwwQkFBMEI7UUFDMUIsTUFBTTtRQUNOLG1CQUFtQjtRQUNuQiwwQkFBMEI7UUFDMUIsc0NBQXNDO1FBQ3RDLHdDQUF3QztRQUN4QywwR0FBMEc7UUFDMUcsZUFBZTtRQUNmLG1CQUFtQjtRQUNuQixRQUFRO1FBQ1IsUUFBUTtRQUNSLDRCQUE0QjtRQUM1QiwwQkFBMEI7UUFDMUIsaUJBQWlCO1FBQ2pCLFFBQVE7UUFDUixNQUFNO0lBQ1IsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDb25maWd1cmF0aW9uLCBDb21waWxlciwgUnVsZVNldFJ1bGUsIFJ1bGVTZXRVc2VJdGVtfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG4vLyBpbXBvcnQgY2hpbGRQcm9jIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBnZXRDbWRPcHRpb25zIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1RzY0NtZFBhcmFtfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL2NyYS1zY3JpcHRzLndlYnBhY2stbGliJyk7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCc7XG4vLyBjb25zdCBwbGlua0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNoYW5nZShidWlsZFBhY2thZ2U6IHN0cmluZywgY29uZmlnOiBDb25maWd1cmF0aW9uLCBub2RlUGF0aDogc3RyaW5nW10pIHtcbiAgY29uc3QgZm91bmRQa2cgPSBmaW5kUGFja2FnZShidWlsZFBhY2thZ2UpO1xuICBpZiAoZm91bmRQa2cgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZSAke2J1aWxkUGFja2FnZX1gKTtcbiAgfVxuICBjb25zdCB7ZGlyOiBwa0RpciwgcGFja2FnZUpzb246IHBrSnNvbn0gPSBmb3VuZFBrZztcblxuICBjb25maWcuZW50cnkgPSBQYXRoLnJlc29sdmUocGtEaXIsICdwdWJsaWNfYXBpLnRzJyk7XG5cbiAgY29uZmlnLm91dHB1dCEucGF0aCA9IFBhdGgucmVzb2x2ZShwa0RpciwgJ2J1aWxkJyk7IC8vIEhhdmUgdG8gb3ZlcnJpZGUgaXQgY3V6JyByZWFjdC1zY3JpcHRzIGFzc2lnbiBgdW5kZWZpbmVkYCBpbiBub24tcHJvZHVjdGlvbiBlbnZcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnbGliLWJ1bmRsZS5qcyc7XG4gIGNvbmZpZy5vdXRwdXQhLmxpYnJhcnlUYXJnZXQgPSAndW1kJztcbiAgY29uZmlnLm9wdGltaXphdGlvbiEucnVudGltZUNodW5rID0gZmFsc2U7XG4gIGlmIChjb25maWcub3B0aW1pemF0aW9uICYmIGNvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MpIHtcbiAgICBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzID0ge1xuICAgICAgY2FjaGVHcm91cHM6IHtkZWZhdWx0OiBmYWxzZX1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLSBQbHVnaW5zIGZpbHRlciAtLS0tXG5cbiAgY29uc3QgSW5saW5lQ2h1bmtIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luJykpO1xuICAvLyBjb25zdCBJbnRlcnBvbGF0ZUh0bWxQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3JlYWN0LWRldi11dGlscy9JbnRlcnBvbGF0ZUh0bWxQbHVnaW4nKSk7XG4gIGNvbnN0IEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvRm9ya1RzQ2hlY2tlcldlYnBhY2tQbHVnaW4nKSk7XG4gIC8vIGNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9odG1sLXdlYnBhY2stcGx1Z2luJykpO1xuICBjb25zdCB7SG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy93ZWJwYWNrJykpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0gY29uZmlnLnBsdWdpbnMhLmZpbHRlcihwbHVnaW4gPT4ge1xuXG4gICAgcmV0dXJuIFtNaW5pQ3NzRXh0cmFjdFBsdWdpbixcbiAgICAgIEZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luLFxuICAgICAgSW5saW5lQ2h1bmtIdG1sUGx1Z2luLFxuICAgICAgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW5cbiAgICAgIC8vIEh0bWxXZWJwYWNrUGx1Z2luLFxuICAgICAgLy8gSW50ZXJwb2xhdGVIdG1sUGx1Z2luXG4gICAgXS5ldmVyeShjbHMgPT4gIShwbHVnaW4gaW5zdGFuY2VvZiBjbHMpKTtcbiAgfSk7XG5cbiAgZmluZEFuZENoYW5nZVJ1bGUoY29uZmlnLm1vZHVsZSEucnVsZXMpO1xuXG4gIGNvbnN0IHJlcVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbmNsdWRlTW9kdWxlUmUgPSAoZ2V0Q21kT3B0aW9ucygpLmluY2x1ZGVzIHx8IFtdKVxuICAgIC5tYXAobW9kID0+IG5ldyBSZWdFeHAobW9kKSk7XG5cbiAgaWYgKGNvbmZpZy5leHRlcm5hbHMgPT0gbnVsbClcbiAgICBjb25maWcuZXh0ZXJuYWxzID0gW107XG4gIChjb25maWcuZXh0ZXJuYWxzIGFzIEV4dHJhY3Q8Q29uZmlndXJhdGlvblsnZXh0ZXJuYWxzJ10sIEFycmF5PGFueT4+KVxuICAucHVzaChcbiAgICAoY29udGV4dDogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCApID0+IHtcbiAgICAgIGlmIChpbmNsdWRlTW9kdWxlUmUuc29tZShyZyA9PiByZy50ZXN0KHJlcXVlc3QpKSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIChyZXF1ZXN0LmluZGV4T2YoJ2pzLXNkay1vY3InKSA+PSAwIHx8IHJlcXVlc3QuaW5kZXhPZignQGJrL2pzLXNkay1zdG9yZScpID49IDAgfHxcbiAgICAgIC8vICAgcmVxdWVzdC5pbmRleE9mKCdAYmsvcmVhY3QtY29tcG9uZW50JykgPj0gMCkge1xuICAgICAgLy8gICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vIFRPRE86IFNob3VsZCBiZSBjb25maWd1cmFibGVcbiAgICAgIGlmICgoIXJlcXVlc3Quc3RhcnRzV2l0aCgnLicpICYmIHJlcXVlc3QgIT09IGNvbmZpZy5lbnRyeSAmJlxuICAgICAgICAhL1s/IV0vLnRlc3QocmVxdWVzdCkpICYmICghL1tcXFxcL11AYmFiZWxbXFxcXC9dcnVudGltZVtcXFxcL10vLnRlc3QocmVxdWVzdCkpXG4gICAgICAgICB8fFxuICAgICAgICByZXF1ZXN0LmluZGV4T2YoJy9ia2xpYi5taW4nKSA+PSAwKSB7XG4gICAgICAgIC8vIGxvZy5pbmZvKCdleHRlcm5hbCByZXF1ZXN0OicsIHJlcXVlc3QsIGAoJHtjb250ZXh0fSlgKTtcbiAgICAgICAgcmVxU2V0LmFkZChyZXF1ZXN0KTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsICdjb21tb25qcyAnICsgcmVxdWVzdCk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgKTtcblxuICBjb25maWcucGx1Z2lucyEucHVzaChcbiAgICAvLyBuZXcgRXNtV2VicGFja1BsdWdpbigpLFxuICAgIG5ldyAoY2xhc3Mge1xuICAgICAgZm9ya0RvbmU6IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2NyYS1zY3JpcHRzJywgc3RhdHMgPT4ge1xuICAgICAgICAgIHRoaXMuZm9ya0RvbmUgPSB0aGlzLmZvcmtEb25lLnRoZW4oKCkgPT4gZm9ya1RzYyhwa0pzb24ubmFtZSwgbm9kZVBhdGgpKTtcbiAgICAgICAgICBsb2cud2FybihjaGFsay5yZWQoJ2V4dGVybmFsIHJlcXVlc3Q6XFxuICAnICsgQXJyYXkuZnJvbShyZXFTZXQudmFsdWVzKCkpLmpvaW4oJywgJykpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKVxuICApO1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGVzOiBSdWxlU2V0UnVsZVtdKTogdm9pZCB7XG4gIC8vIFRPRE86IGNoZWNrIGluIGNhc2UgQ1JBIHdpbGwgdXNlIFJ1bGUudXNlIGluc3RlYWQgb2YgXCJsb2FkZXJcIlxuICBjaGVja1NldChydWxlcyk7XG4gIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJ1bGUudXNlKSkge1xuICAgICAgY2hlY2tTZXQocnVsZS51c2UpO1xuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJ1bGUubG9hZGVyKSkge1xuICAgICAgICBjaGVja1NldChydWxlLmxvYWRlcik7XG4gICAgfSBlbHNlIGlmIChydWxlLm9uZU9mKSB7XG4gICAgICByZXR1cm4gZmluZEFuZENoYW5nZVJ1bGUocnVsZS5vbmVPZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTZXQoc2V0OiAoUnVsZVNldFJ1bGUgfCBSdWxlU2V0VXNlSXRlbSlbXSkge1xuICAgIGNvbnN0IGZvdW5kID0gc2V0LmZpbmRJbmRleChcbiAgICAgIHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZihNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIpID49IDApO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcnVsZS51c2UuZmluZEluZGV4KHVzZSA9PiAodXNlIGFzIGFueSkubG9hZGVyICYmICh1c2UgYXMgYW55KS5sb2FkZXIuaW5kZXhPZignbWluaS1jc3MtZXh0cmFjdC1wbHVnaW4nKSA+PSAwKTtcbiAgICBpZiAoZm91bmQgPj0gMCkge1xuICAgICAgc2V0LnNwbGljZShmb3VuZCwgMSk7XG4gICAgICBzZXQudW5zaGlmdChyZXF1aXJlLnJlc29sdmUoJ3N0eWxlLWxvYWRlcicpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmb3JrVHNjKHRhcmdldFBhY2thZ2U6IHN0cmluZywgbm9kZVBhdGg6IHN0cmluZ1tdKSB7XG5cbiAgLy8gY29uc3Qge25vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG4gIGNvbnN0IHdvcmtlckRhdGE6IFRzY0NtZFBhcmFtID0ge1xuICAgIHBhY2thZ2U6IFt0YXJnZXRQYWNrYWdlXSwgZWQ6IHRydWUsIGpzeDogdHJ1ZSwgd2F0Y2g6IGdldENtZE9wdGlvbnMoKS53YXRjaCxcbiAgICBwYXRoc0pzb25zOiBbXVxuICB9O1xuXG4gIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3RzZC1nZW5lcmF0ZS10aHJlYWQnKSwge1xuICAgIHdvcmtlckRhdGEsIGVudjoge05PREVfUEFUSDogbm9kZVBhdGguam9pbihQYXRoLmRlbGltaXRlcil9XG4gIH0gYXMgYW55KTtcbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIHdvcmtlci5vbignZXhpdCcsIGNvZGUgPT4ge1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgcmVqKG5ldyBFcnJvcihgV29ya2VyIHN0b3BwZWQgd2l0aCBleGl0IGNvZGUgJHtjb2RlfWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCByZWopO1xuICAgIHdvcmtlci5vbignZXJyb3InLCByZWopO1xuICB9KTtcblxuICAvLyBjb25zdCBmb3JrQXJncyA9IFsndHNjJywgJy0tZWQnLCAnLS1qc3gnLCB0YXJnZXRQYWNrYWdlXTtcbiAgLy8gaWYgKGdldENtZE9wdGlvbnMoKS53YXRjaClcbiAgLy8gICBmb3JrQXJncy5wdXNoKCctdycpO1xuXG4gIC8vIC8vIGNvbnNvbGUubG9nKCd3ZWJwYWNrLWxpYjogJywgUGF0aC5yZXNvbHZlKHBsaW5rRGlyLCAnd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcC5qcycpLCBmb3JrQXJncyk7XG4gIC8vIGNvbnN0IGNwID0gY2hpbGRQcm9jLmZvcmsoUGF0aC5yZXNvbHZlKHBsaW5rRGlyLCAnd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcC5qcycpLCBmb3JrQXJncyxcbiAgLy8gICB7XG4gIC8vICAgICAvLyBlbnY6IHtcbiAgLy8gICAgIC8vICAgTk9ERV9PUFRJT05TOiAnLXIgQHdmaC9wbGluay9yZWdpc3RlcicsXG4gIC8vICAgICAvLyAgIE5PREVfUEFUSDogbm9kZVBhdGguam9pbihQYXRoLmRlbGltaXRlcilcbiAgLy8gICAgIC8vIH0sXG4gIC8vICAgICBjd2Q6IHByb2Nlc3MuY3dkKClcbiAgLy8gICAgIC8vIGV4ZWNBcmd2OiBbXSwgLy8gTm90IHdvcmtpbmcsIGRvbid0IGtub3cgd2h5XG4gIC8vICAgICAvLyBzdGRpbzogWzAsIDEsIDIsICdpcGMnXVxuICAvLyAgIH0pO1xuICAvLyAvLyBjcC51bnJlZigpO1xuICAvLyByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAvLyAgIGNwLm9uKCdtZXNzYWdlJywgbXNnID0+IHtcbiAgLy8gICAgIGlmIChtc2cgPT09ICdwbGluay10c2MgY29tcGlsZWQnKVxuICAvLyAgICAgICBjcC5raWxsKCdTSUdJTlQnKTtcbiAgLy8gICB9KTtcbiAgLy8gICBpZiAoY3Auc3Rkb3V0KSB7XG4gIC8vICAgICBjcC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgICAgY3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4gY29uc29sZS5sb2coZGF0YSkpO1xuICAvLyAgICAgY3Auc3Rkb3V0LnJlc3VtZSgpO1xuICAvLyAgIH1cbiAgLy8gICBpZiAoY3Auc3RkZXJyKVxuICAvLyAgICAgY3Auc3RkZXJyLnJlc3VtZSgpO1xuICAvLyAgIGNwLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAvLyAgICAgaWYgKGNvZGUgIT0gbnVsbCAmJiBjb2RlICE9PSAwKSB7XG4gIC8vICAgICAgIHJlaihuZXcgRXJyb3IoYEZhaWxlZCB0byBnZW5lcmF0ZSB0c2QgZmlsZXMsIGR1ZSB0byBwcm9jZXNzIGV4aXQgd2l0aCBjb2RlOiAke2NvZGV9ICR7c2lnbmFsfWApKTtcbiAgLy8gICAgIH0gZWxzZSB7XG4gIC8vICAgICAgIHJlc29sdmUoKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gICBjcC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAvLyAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAvLyAgICAgcmVzb2x2ZSgpO1xuICAvLyAgIH0pO1xuICAvLyB9KTtcbn1cbiJdfQ==