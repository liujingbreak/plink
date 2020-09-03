"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.init = exports.tsHandler = void 0;
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const _fs = tslib_1.__importStar(require("fs-extra"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const Path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
tslib_1.__exportStar(require("./configurable"), exports);
// export * from './ng-prerender';
tslib_1.__exportStar(require("./ng/common"), exports);
const semver = require('semver');
const { red, yellow } = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
exports.tsHandler = resolveImports;
function resolveImports(src) {
    return [];
}
function init() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!checkAngularVersion())
            throw new Error('Angular version check Error');
        checkAngularCliDepVersion();
        // writeTsconfig();
        hackFixWatchpack();
    });
}
exports.init = init;
function activate() {
}
exports.activate = activate;
function checkAngularVersion() {
    const deps = {
        '@angular-devkit/build-angular': '~0.803.12',
        '@angular/cli': '~8.3.12',
        '@angular/compiler-cli': '~8.2.11',
        '@angular/language-service': '~8.2.11'
    };
    let valid = true;
    _.each(deps, (expectVer, mod) => {
        const ver = require(mod + '/package.json').version;
        if (!semver.satisfies(ver, expectVer)) {
            valid = false;
            log.error(yellow(`Installed dependency "${mod}@`) + red(ver) + yellow(`" version is not supported, install ${expectVer} instead.`));
        }
    });
    try {
        const duplicate = require.resolve('@angular-devkit/build-angular/node_modules/webpack/package.json');
        log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
        valid = false;
    }
    catch (ex) { }
    if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@angular-devkit')) {
        log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@angular-devkit",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
        valid = false;
    }
    if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@ngtools/webpack')) {
        log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@ngtools/webpack",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
        valid = false;
    }
    try {
        const duplicate = require.resolve('@angular-devkit/architect/node_modules/rxjs/package.json');
        log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
        valid = false;
    }
    catch (ex) { }
    return valid;
}
function checkAngularCliDepVersion() {
    const ngDeps = require('@angular-devkit/build-angular/package.json').dependencies;
    const ourDeps = require('../package.json').dependencies;
    let msg = '';
    for (const ngDep of Object.keys(ngDeps)) {
        if (_.has(ourDeps, ngDep) && ourDeps[ngDep] !== ngDeps[ngDep]) {
            msg += `Different version of dependency between @angular-devkit/build-angular and ng-app-builder:\n  ${ngDep}@${ngDeps[ngDep]} vs ${ngDep}@${ourDeps[ngDep]}\n`;
        }
    }
    if (msg.length > 0) {
        throw new Error(`You need to contact author of ng-app-builder for:\n${msg}`);
    }
}
/**
 * https://github.com/webpack/watchpack/issues/61
 */
function hackFixWatchpack() {
    const watchpackPath = ['webpack/node_modules/watchpack', 'watchpack'].find(path => {
        return _fs.existsSync(Path.resolve('node_modules/' + path + '/lib/DirectoryWatcher.js'));
    });
    if (!watchpackPath) {
        log.warn('Can not find watchpack, please make sure Webpack is installed.');
        return;
    }
    const target = Path.resolve('node_modules/' + watchpackPath + '/lib/DirectoryWatcher.js');
    if (_fs.existsSync(target + '.drcp-bak'))
        return;
    log.info(`hacking ${target}\n\t to workaround issue: https://github.com/webpack/watchpack/issues/61`);
    _fs.renameSync(target, target + '.drcp-bak');
    _fs.writeFileSync(target, _fs.readFileSync(target + '.drcp-bak', 'utf8').replace(/\WfollowSymlinks:\sfalse/g, 'followSymlinks: true'), 'utf8');
}

//# sourceMappingURL=server.js.map
