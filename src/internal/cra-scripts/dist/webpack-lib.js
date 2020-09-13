"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_target_helper_1 = require("./build-target-helper");
// import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';
const child_process_1 = __importDefault(require("child_process"));
// import fs from 'fs-extra';
const path_1 = __importDefault(require("path"));
// import {findDrcpProjectDir} from './utils';
const utils_1 = require("./utils");
// import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';
// const {symlinkDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
const plinkDir = path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
function change(buildPackage, config, nodePath) {
    const { dir: pkDir, packageJson: pkJson } = build_target_helper_1.findPackage(buildPackage);
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
    const InterpolateHtmlPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
    const ForkTsCheckerWebpackPlugin = require(path_1.default.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin'));
    const HtmlWebpackPlugin = require(path_1.default.resolve('node_modules/html-webpack-plugin'));
    const { HotModuleReplacementPlugin } = require(path_1.default.resolve('node_modules/webpack'));
    config.plugins = config.plugins.filter(plugin => {
        return [MiniCssExtractPlugin,
            ForkTsCheckerWebpackPlugin,
            InlineChunkHtmlPlugin,
            HotModuleReplacementPlugin,
            HtmlWebpackPlugin,
            InterpolateHtmlPlugin].every(cls => !(plugin instanceof cls));
    });
    findAndChangeRule(config.module.rules);
    const reqSet = new Set();
    if (config.externals == null)
        config.externals = [];
    config.externals
        .push((context, request, callback) => {
        // TODO: Should be configurable
        if ((!request.startsWith('.') && request !== config.entry &&
            !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
            ||
                request.indexOf('/bklib.min') >= 0) {
            // console.log('external request:', request, `(${context})`);
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
                // tslint:disable-next-line: no-console
                console.log('external request:\n  ', Array.from(reqSet.values()).join(', '));
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
    const forkArgs = ['tsc', '--ed', '--jsx', targetPackage];
    if (utils_1.getCmdOptions().watch)
        forkArgs.push('-w');
    // console.log('webpack-lib: ', Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs);
    const cp = child_process_1.default.fork(path_1.default.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs, {
        env: {
            NODE_OPTIONS: '-r dr-comp-package/register',
            NODE_PATH: nodePath.join(path_1.default.delimiter)
        },
        cwd: process.cwd()
        // execArgv: [], // Not working, don't know why
        // stdio: [0, 1, 2, 'ipc']
    });
    // cp.unref();
    return new Promise((resolve, rej) => {
        cp.on('message', msg => {
            if (msg === 'plink-tsc compiled')
                cp.kill('SIGINT');
        });
        if (cp.stdout) {
            cp.stdout.setEncoding('utf8');
            // tslint:disable-next-line: no-console
            cp.stdout.on('data', (data) => console.log(data));
            cp.stdout.resume();
        }
        if (cp.stderr)
            cp.stderr.resume();
        cp.on('exit', (code, signal) => {
            if (code !== 0) {
                rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
            }
            else {
                // tslint:disable-next-line: no-console
                console.log('[webpack-lib] tsc done');
                resolve();
            }
        });
        cp.on('error', err => {
            console.error(err);
            resolve();
        });
    });
}

//# sourceMappingURL=webpack-lib.js.map
