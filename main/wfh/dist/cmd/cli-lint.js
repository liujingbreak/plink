"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const path_1 = __importDefault(require("path"));
// import chalk from 'chalk';
const log4js_1 = __importDefault(require("log4js"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const dist_1 = require("../../../packages/thread-promise-pool/dist");
const os_1 = __importDefault(require("os"));
const log = log4js_1.default.getLogger('plink.cli-lint');
const cpus = os_1.default.cpus().length;
async function default_1(packages, opts) {
    return lint(packages, opts.pj, opts.fix);
}
exports.default = default_1;
function lint(packages, projects, fix) {
    let prom = Promise.resolve();
    const errors = [];
    if (packages.length > 0) {
        const threadPool = new dist_1.Pool(cpus - 1);
        const taskProms = [];
        for (const name of (0, utils_1.completePackageName)((0, package_mgr_1.getState)(), packages)) {
            if (name == null) {
                log.warn('Can not find package for name: ' + name);
                continue;
            }
            const pkg = (0, package_mgr_1.getState)().srcPackages.get(name);
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    else if (packages.length === 0 && (projects == null || projects.length === 0)) {
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
        // verbose: true
        });
        const taskProms = [];
        for (const pkg of (0, package_mgr_1.getState)().srcPackages.values()) {
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    else if (projects && projects.length > 0) {
        const taskProms = [];
        const threadPool = new dist_1.Pool(cpus - 1, 0, {
        // verbose: true
        });
        for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projects)) {
            taskProms.push(threadPool.submitProcess({
                file: path_1.default.resolve(__dirname, 'tslint-worker.js'),
                exportFn: 'default',
                args: [pkg.name, pkg.json, pkg.realPath, fix]
            }).catch(err => {
                errors.push({ pkg: pkg.name, error: err.toString() });
            }));
        }
        prom = Promise.all(taskProms);
    }
    return prom.then(() => {
        if (errors.length > 0) {
            errors.forEach(error => log.error('Package ' + error.pkg + ':\n', error.error));
            throw new Error('Lint result contains errors');
        }
    });
}
//# sourceMappingURL=cli-lint.js.map