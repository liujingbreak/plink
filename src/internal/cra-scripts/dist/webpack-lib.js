"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
            this.forkDone = this.forkDone.then(() => forkTsc(pkJson.name, nodePath));
            compiler.hooks.done.tap('cra-scripts', stats => {
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
        const { Worker } = yield Promise.resolve().then(() => __importStar(require('worker_threads')));
        // const {nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;
        const workerData = { package: [targetPackage], ed: true, jsx: true, watch: utils_1.getCmdOptions().watch };
        const worker = new Worker(require.resolve('./tsd-generate-thread'), {
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

//# sourceMappingURL=webpack-lib.js.map
