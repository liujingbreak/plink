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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1saWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLCtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFDekMsZ0RBQXdCO0FBQ3hCLG1DQUF3QztBQUV4QyxvREFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLG1EQUFzQztBQUV0QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQzdELDBEQUEwRDtBQUMxRCw2RUFBNkU7QUFFN0UsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFFM0YsU0FBd0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUIsRUFBRSxRQUFrQjtJQUM1RixNQUFNLFFBQVEsR0FBRyxpQ0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0tBQ3ZFO0lBQ0QsTUFBTSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxHQUFHLFFBQVEsQ0FBQztJQUVuRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUM3QixNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyw4Q0FBOEMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUV6RyxNQUFNLENBQUMsTUFBTyxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGtGQUFrRjtJQUN0SSxN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dXJhdGlvbiwgQ29tcGlsZXIsIFJ1bGVTZXRSdWxlLCBSdWxlU2V0VXNlSXRlbX0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuLy8gaW1wb3J0IGNoaWxkUHJvYyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZ2V0Q21kT3B0aW9ucyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtUc2NDbWRQYXJhbX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7V29ya2VyfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9jcmEtc2NyaXB0cy53ZWJwYWNrLWxpYicpO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnO1xuLy8gY29uc3QgcGxpbmtEaXIgPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuY29uc3QgTWluaUNzc0V4dHJhY3RQbHVnaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjaGFuZ2UoYnVpbGRQYWNrYWdlOiBzdHJpbmcsIGNvbmZpZzogQ29uZmlndXJhdGlvbiwgbm9kZVBhdGg6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGZvdW5kUGtnID0gZmluZFBhY2thZ2UoYnVpbGRQYWNrYWdlKTtcbiAgaWYgKGZvdW5kUGtnID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2UgJHtidWlsZFBhY2thZ2V9YCk7XG4gIH1cbiAgY29uc3Qge2RpcjogcGtEaXIsIHBhY2thZ2VKc29uOiBwa0pzb259ID0gZm91bmRQa2c7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnLmVudHJ5KSlcbiAgICBjb25maWcuZW50cnkgPSBjb25maWcuZW50cnkuZmlsdGVyKGl0ZW0gPT4gIS9bXFxcXC9dcmVhY3QtZGV2LXV0aWxzW1xcXFwvXXdlYnBhY2tIb3REZXZDbGllbnQvLnRlc3QoaXRlbSkpO1xuXG4gIGNvbmZpZy5vdXRwdXQhLnBhdGggPSBQYXRoLnJlc29sdmUocGtEaXIsICdidWlsZCcpOyAvLyBIYXZlIHRvIG92ZXJyaWRlIGl0IGN1eicgcmVhY3Qtc2NyaXB0cyBhc3NpZ24gYHVuZGVmaW5lZGAgaW4gbm9uLXByb2R1Y3Rpb24gZW52XG4gIGNvbmZpZy5vdXRwdXQhLmZpbGVuYW1lID0gJ2xpYi1idW5kbGUuanMnO1xuICBjb25maWcub3V0cHV0IS5saWJyYXJ5VGFyZ2V0ID0gJ3VtZCc7XG4gIGNvbmZpZy5vcHRpbWl6YXRpb24hLnJ1bnRpbWVDaHVuayA9IGZhbHNlO1xuICBpZiAoY29uZmlnLm9wdGltaXphdGlvbiAmJiBjb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzKSB7XG4gICAgY29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcyA9IHtcbiAgICAgIGNhY2hlR3JvdXBzOiB7ZGVmYXVsdDogZmFsc2V9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLS0gUGx1Z2lucyBmaWx0ZXIgLS0tLVxuXG4gIGNvbnN0IElubGluZUNodW5rSHRtbFBsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbicpKTtcbiAgLy8gY29uc3QgSW50ZXJwb2xhdGVIdG1sUGx1Z2luID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9yZWFjdC1kZXYtdXRpbHMvSW50ZXJwb2xhdGVIdG1sUGx1Z2luJykpO1xuICBjb25zdCBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3QtZGV2LXV0aWxzL0ZvcmtUc0NoZWNrZXJXZWJwYWNrUGx1Z2luJykpO1xuICAvLyBjb25zdCBIdG1sV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvaHRtbC13ZWJwYWNrLXBsdWdpbicpKTtcbiAgY29uc3Qge0hvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2lufSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvd2VicGFjaycpKTtcblxuICBjb25maWcucGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIS5maWx0ZXIocGx1Z2luID0+IHtcblxuICAgIHJldHVybiBbTWluaUNzc0V4dHJhY3RQbHVnaW4sXG4gICAgICBGb3JrVHNDaGVja2VyV2VicGFja1BsdWdpbixcbiAgICAgIElubGluZUNodW5rSHRtbFBsdWdpbixcbiAgICAgIEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luXG4gICAgICAvLyBIdG1sV2VicGFja1BsdWdpbixcbiAgICAgIC8vIEludGVycG9sYXRlSHRtbFBsdWdpblxuICAgIF0uZXZlcnkoY2xzID0+ICEocGx1Z2luIGluc3RhbmNlb2YgY2xzKSk7XG4gIH0pO1xuXG4gIGZpbmRBbmRDaGFuZ2VSdWxlKGNvbmZpZy5tb2R1bGUhLnJ1bGVzKTtcblxuICBjb25zdCByZXFTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5jbHVkZU1vZHVsZVJlID0gKGdldENtZE9wdGlvbnMoKS5pbmNsdWRlcyB8fCBbXSlcbiAgICAubWFwKG1vZCA9PiBuZXcgUmVnRXhwKG1vZCkpO1xuXG4gIGlmIChjb25maWcuZXh0ZXJuYWxzID09IG51bGwpXG4gICAgY29uZmlnLmV4dGVybmFscyA9IFtdO1xuICAoY29uZmlnLmV4dGVybmFscyBhcyBFeHRyYWN0PENvbmZpZ3VyYXRpb25bJ2V4dGVybmFscyddLCBBcnJheTxhbnk+PilcbiAgLnB1c2goXG4gICAgKGNvbnRleHQ6IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQgKSA9PiB7XG4gICAgICBpZiAoaW5jbHVkZU1vZHVsZVJlLnNvbWUocmcgPT4gcmcudGVzdChyZXF1ZXN0KSkpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgICAvLyBpZiAocmVxdWVzdC5pbmRleE9mKCdqcy1zZGstb2NyJykgPj0gMCB8fCByZXF1ZXN0LmluZGV4T2YoJ0Biay9qcy1zZGstc3RvcmUnKSA+PSAwIHx8XG4gICAgICAvLyAgIHJlcXVlc3QuaW5kZXhPZignQGJrL3JlYWN0LWNvbXBvbmVudCcpID49IDApIHtcbiAgICAgIC8vICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAvLyB9XG4gICAgICAvLyBUT0RPOiBTaG91bGQgYmUgY29uZmlndXJhYmxlXG4gICAgICBpZiAoKCFyZXF1ZXN0LnN0YXJ0c1dpdGgoJy4nKSAmJiByZXF1ZXN0ICE9PSBjb25maWcuZW50cnkgJiZcbiAgICAgICAgIS9bPyFdLy50ZXN0KHJlcXVlc3QpKSAmJiAoIS9bXFxcXC9dQGJhYmVsW1xcXFwvXXJ1bnRpbWVbXFxcXC9dLy50ZXN0KHJlcXVlc3QpKVxuICAgICAgICAgfHxcbiAgICAgICAgcmVxdWVzdC5pbmRleE9mKCcvYmtsaWIubWluJykgPj0gMCkge1xuICAgICAgICAvLyBsb2cuaW5mbygnZXh0ZXJuYWwgcmVxdWVzdDonLCByZXF1ZXN0LCBgKCR7Y29udGV4dH0pYCk7XG4gICAgICAgIHJlcVNldC5hZGQocmVxdWVzdCk7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCAnY29tbW9uanMgJyArIHJlcXVlc3QpO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICk7XG5cbiAgY29uZmlnLnBsdWdpbnMhLnB1c2goXG4gICAgLy8gbmV3IEVzbVdlYnBhY2tQbHVnaW4oKSxcbiAgICBuZXcgKGNsYXNzIHtcbiAgICAgIGZvcmtEb25lOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdjcmEtc2NyaXB0cycsIHN0YXRzID0+IHtcbiAgICAgICAgICB0aGlzLmZvcmtEb25lID0gdGhpcy5mb3JrRG9uZS50aGVuKCgpID0+IGZvcmtUc2MocGtKc29uLm5hbWUsIG5vZGVQYXRoKSk7XG4gICAgICAgICAgbG9nLndhcm4oY2hhbGsucmVkKCdleHRlcm5hbCByZXF1ZXN0OlxcbiAgJyArIEFycmF5LmZyb20ocmVxU2V0LnZhbHVlcygpKS5qb2luKCcsICcpKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKClcbiAgKTtcbn1cblxuXG5mdW5jdGlvbiBmaW5kQW5kQ2hhbmdlUnVsZShydWxlczogUnVsZVNldFJ1bGVbXSk6IHZvaWQge1xuICAvLyBUT0RPOiBjaGVjayBpbiBjYXNlIENSQSB3aWxsIHVzZSBSdWxlLnVzZSBpbnN0ZWFkIG9mIFwibG9hZGVyXCJcbiAgY2hlY2tTZXQocnVsZXMpO1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShydWxlLnVzZSkpIHtcbiAgICAgIGNoZWNrU2V0KHJ1bGUudXNlKTtcblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShydWxlLmxvYWRlcikpIHtcbiAgICAgICAgY2hlY2tTZXQocnVsZS5sb2FkZXIpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5vbmVPZikge1xuICAgICAgcmV0dXJuIGZpbmRBbmRDaGFuZ2VSdWxlKHJ1bGUub25lT2YpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrU2V0KHNldDogKFJ1bGVTZXRSdWxlIHwgUnVsZVNldFVzZUl0ZW0pW10pIHtcbiAgICBjb25zdCBmb3VuZCA9IHNldC5maW5kSW5kZXgoXG4gICAgICB1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoTWluaUNzc0V4dHJhY3RQbHVnaW4ubG9hZGVyKSA+PSAwKTtcbiAgICAvLyBjb25zdCBmb3VuZCA9IHJ1bGUudXNlLmZpbmRJbmRleCh1c2UgPT4gKHVzZSBhcyBhbnkpLmxvYWRlciAmJiAodXNlIGFzIGFueSkubG9hZGVyLmluZGV4T2YoJ21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJykgPj0gMCk7XG4gICAgaWYgKGZvdW5kID49IDApIHtcbiAgICAgIHNldC5zcGxpY2UoZm91bmQsIDEpO1xuICAgICAgc2V0LnVuc2hpZnQocmVxdWlyZS5yZXNvbHZlKCdzdHlsZS1sb2FkZXInKSk7XG4gICAgfVxuICB9XG4gIHJldHVybjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1RzYyh0YXJnZXRQYWNrYWdlOiBzdHJpbmcsIG5vZGVQYXRoOiBzdHJpbmdbXSkge1xuXG4gIC8vIGNvbnN0IHtub2RlUGF0aH0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuICBjb25zdCB3b3JrZXJEYXRhOiBUc2NDbWRQYXJhbSA9IHtcbiAgICBwYWNrYWdlOiBbdGFyZ2V0UGFja2FnZV0sIGVkOiB0cnVlLCBqc3g6IHRydWUsIHdhdGNoOiBnZXRDbWRPcHRpb25zKCkud2F0Y2gsXG4gICAgcGF0aHNKc29uczogW10sXG4gICAgb3ZlcnJpZGVQYWNrZ2VEaXJzOiB7W3RhcmdldFBhY2thZ2VdOiB7ZGVzdERpcjogJ2J1aWxkJywgc3JjRGlyOiAnJ319XG4gIH07XG5cbiAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vdHNkLWdlbmVyYXRlLXRocmVhZCcpLCB7XG4gICAgd29ya2VyRGF0YSwgZW52OiB7Tk9ERV9QQVRIOiBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKX1cbiAgfSBhcyBhbnkpO1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgd29ya2VyLm9uKCdleGl0JywgY29kZSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICByZWoobmV3IEVycm9yKGBXb3JrZXIgc3RvcHBlZCB3aXRoIGV4aXQgY29kZSAke2NvZGV9YCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHdvcmtlci5vbignbWVzc2FnZScsIHJlaik7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gIH0pO1xuXG4gIC8vIGNvbnN0IGZvcmtBcmdzID0gWyd0c2MnLCAnLS1lZCcsICctLWpzeCcsIHRhcmdldFBhY2thZ2VdO1xuICAvLyBpZiAoZ2V0Q21kT3B0aW9ucygpLndhdGNoKVxuICAvLyAgIGZvcmtBcmdzLnB1c2goJy13Jyk7XG5cbiAgLy8gLy8gY29uc29sZS5sb2coJ3dlYnBhY2stbGliOiAnLCBQYXRoLnJlc29sdmUocGxpbmtEaXIsICd3ZmgvZGlzdC9jbWQtYm9vdHN0cmFwLmpzJyksIGZvcmtBcmdzKTtcbiAgLy8gY29uc3QgY3AgPSBjaGlsZFByb2MuZm9yayhQYXRoLnJlc29sdmUocGxpbmtEaXIsICd3ZmgvZGlzdC9jbWQtYm9vdHN0cmFwLmpzJyksIGZvcmtBcmdzLFxuICAvLyAgIHtcbiAgLy8gICAgIC8vIGVudjoge1xuICAvLyAgICAgLy8gICBOT0RFX09QVElPTlM6ICctciBAd2ZoL3BsaW5rL3JlZ2lzdGVyJyxcbiAgLy8gICAgIC8vICAgTk9ERV9QQVRIOiBub2RlUGF0aC5qb2luKFBhdGguZGVsaW1pdGVyKVxuICAvLyAgICAgLy8gfSxcbiAgLy8gICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAvLyAgICAgLy8gZXhlY0FyZ3Y6IFtdLCAvLyBOb3Qgd29ya2luZywgZG9uJ3Qga25vdyB3aHlcbiAgLy8gICAgIC8vIHN0ZGlvOiBbMCwgMSwgMiwgJ2lwYyddXG4gIC8vICAgfSk7XG4gIC8vIC8vIGNwLnVucmVmKCk7XG4gIC8vIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gIC8vICAgY3Aub24oJ21lc3NhZ2UnLCBtc2cgPT4ge1xuICAvLyAgICAgaWYgKG1zZyA9PT0gJ3BsaW5rLXRzYyBjb21waWxlZCcpXG4gIC8vICAgICAgIGNwLmtpbGwoJ1NJR0lOVCcpO1xuICAvLyAgIH0pO1xuICAvLyAgIGlmIChjcC5zdGRvdXQpIHtcbiAgLy8gICAgIGNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAvLyAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgICBjcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiBjb25zb2xlLmxvZyhkYXRhKSk7XG4gIC8vICAgICBjcC5zdGRvdXQucmVzdW1lKCk7XG4gIC8vICAgfVxuICAvLyAgIGlmIChjcC5zdGRlcnIpXG4gIC8vICAgICBjcC5zdGRlcnIucmVzdW1lKCk7XG4gIC8vICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gIC8vICAgICBpZiAoY29kZSAhPSBudWxsICYmIGNvZGUgIT09IDApIHtcbiAgLy8gICAgICAgcmVqKG5ldyBFcnJvcihgRmFpbGVkIHRvIGdlbmVyYXRlIHRzZCBmaWxlcywgZHVlIHRvIHByb2Nlc3MgZXhpdCB3aXRoIGNvZGU6ICR7Y29kZX0gJHtzaWduYWx9YCkpO1xuICAvLyAgICAgfSBlbHNlIHtcbiAgLy8gICAgICAgcmVzb2x2ZSgpO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gIC8vICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gIC8vICAgICByZXNvbHZlKCk7XG4gIC8vICAgfSk7XG4gIC8vIH0pO1xufVxuIl19