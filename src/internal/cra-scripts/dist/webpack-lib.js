"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import {findPackage} from './build-target-helper';
// import childProc from 'child_process';
const path_1 = tslib_1.__importDefault(require("path"));
const worker_threads_1 = require("worker_threads");
const plink_1 = require("@wfh/plink");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("./utils");
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-lib');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MiniCssExtractPlugin = require(path_1.default.resolve('node_modules/mini-css-extract-plugin'));
const MODULE_NAME_PAT = /^((?:@[^\\/]+[\\/])?[^\\/]+)/;
function change(buildPackage, config, nodePath) {
    const foundPkg = [...(0, plink_1.findPackagesByNames)([buildPackage])][0];
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${buildPackage}`);
    }
    const { realPath: pkDir } = foundPkg;
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
        return [
            MiniCssExtractPlugin,
            ForkTsCheckerWebpackPlugin,
            InlineChunkHtmlPlugin,
            HotModuleReplacementPlugin
            // HtmlWebpackPlugin,
            // InterpolateHtmlPlugin
        ].every(cls => !(plugin instanceof cls));
    });
    findAndChangeRule(config.module.rules);
    const cmdOpts = (0, utils_1.getCmdOptions)();
    const externalRequestSet = new Set();
    const includeModuleRe = (cmdOpts.includes || [])
        .map(mod => new RegExp(mod));
    includeModuleRe.push(new RegExp(lodash_1.default.escapeRegExp(cmdOpts.buildTarget)));
    if (config.externals == null) {
        config.externals = [];
    }
    let entrySet;
    config.externals
        .push(async ({ context, request }, callback) => {
        if (request && includeModuleRe.some(rg => rg.test(request))) {
            return callback();
        }
        if (entrySet == null && config.entry)
            entrySet = await createEntrySet(config.entry);
        if (request && (!request.startsWith('.') && !entrySet.has(request) &&
            !/[?!]/.test(request)) // && (!/(?:^|[\\/])@babel[\\/]runtime[\\/]/.test(request))
        ) {
            if (path_1.default.isAbsolute(request)) {
                log.info('request absolute path:', request);
                return callback();
            }
            else {
                log.debug('external request:', request, `(${context !== null && context !== void 0 ? context : ''})`);
                externalRequestSet.add(request);
                return callback(null, request);
            }
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
                this.forkDone = this.forkDone.then(() => forkTsc());
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
async function createEntrySet(configEntry, entrySet) {
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
        await Promise.resolve(configEntry()).then(entries => createEntrySet(entries));
    }
    else if (typeof configEntry === 'object') {
        if (configEntry.import) {
            await createEntrySet(configEntry.import);
        }
        else {
            await Promise.all(Object.entries(configEntry).map(([_key, value]) => {
                return createEntrySet(value);
            }));
        }
    }
    return entrySet;
}
function findAndChangeRule(rules) {
    // TODO: check in case CRA will use Rule.use instead of "loader"
    if (!Array.isArray(rules))
        return;
    checkSet(rules);
    for (const rule of rules) {
        if (typeof rule === 'string')
            continue;
        if (Array.isArray(rule.use)) {
            checkSet(rule.use);
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
async function forkTsc() {
    const worker = new worker_threads_1.Worker(require.resolve('./tsd-generate-thread'), { execArgv: ['--preserve-symlinks-main', '--preserve-symlinks'] });
    log.warn('forkTsc, threadId:', worker.threadId);
    await new Promise((resolve, rej) => {
        worker.on('exit', code => {
            if (code !== 0) {
                rej(new Error(`Worker stopped with exit code ${code}`));
            }
            else {
                resolve();
            }
            worker.off('message', rej);
            worker.off('error', rej);
        });
        worker.on('message', rej);
        worker.on('error', rej);
    });
}
//# sourceMappingURL=webpack-lib.js.map