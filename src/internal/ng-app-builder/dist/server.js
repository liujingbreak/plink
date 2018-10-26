"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const __api_1 = require("__api");
const log4js = require("log4js");
const _ = require("lodash");
const Path = require("path");
const _fs = require("fs");
const config_webpack_1 = require("./config-webpack");
const Url = require("url");
const semver = require('semver');
const { red, yellow } = require('chalk');
// const fs = require('fs-extra');
// const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(__api_1.default.packageName);
function compile() {
    setupApiForAngularCli();
}
exports.compile = compile;
function init() {
    // printHelp();
    checkAngularVersion();
    // writeTsconfig();
}
exports.init = init;
function activate() {
}
exports.activate = activate;
function setupApiForAngularCli() {
    const ngParam = __api_1.default.config()._angularCli;
    if (!ngParam || __api_1.default.ngEntryComponent)
        return;
    if (!ngParam.browserOptions.preserveSymlinks) {
        throw new Error('In order to get DRCP builder work,\
		you must set property `preserveSymlinks` to be true in project\'s angular.json file \
		');
    }
    const webpackConfig = ngParam.webpackConfig;
    const ngEntryComponent = __api_1.default.findPackageByFile(Path.resolve(ngParam.projectRoot));
    let deployUrl = webpackConfig.output.publicPath || __api_1.default.config.get('publicPath');
    const publicUrlObj = Url.parse(deployUrl);
    Object.assign(Object.getPrototypeOf(__api_1.default), {
        webpackConfig,
        ngEntryComponent,
        deployUrl,
        ssr: ngParam.ssr,
        ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
        /**@function ngRouterPath
         * @memberOf __api
         * e.g.
         * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json.
         * Current feature package is `@bk/feature-a`, its `ngRoutePath` is by default 'feature-a',
         * feature package `@bk/feature-b`'s `ngRoutePath` is by default 'feature-b'
         *  ```ts
         * __api.ngRouterPath('action')  // "/base-href/feature-a/action"
         * __api.ngRouterPath('@bk/feature-b', 'action')   // "/base-href/feature-b/action"
         * ```
         * @return the configured Angular router path for specific (current) feature package
         */
        ngRouterPath(packageName, subPath) {
            const url = this.assetsUrl(packageName, subPath);
            return _.trimStart(Url.parse(url).pathname, '/');
        },
        ssrRequire(requirePath) {
            if (ngParam.ssr)
                return require(Path.join(this.__dirname, requirePath));
        }
    });
    config_webpack_1.default(ngParam, webpackConfig, __api_1.default.config());
    // ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
    log.info('Setup api object for Angular');
}
function checkAngularVersion() {
    const deps = {
        '@angular-devkit/build-angular': '~0.10.2',
        '@angular/cli': '7.0.3',
        '@angular/compiler-cli': '7.0.1',
        '@angular/language-service': '7.0.1'
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
		you need to delete it and maybe \`clean\` and \`init\` again`);
        valid = false;
    }
    catch (ex) { }
    if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@angular-devkit')) {
        log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@angular-devkit",\n
		you need to delete it and maybe \`clean\` and \`init\` again`);
        valid = false;
    }
    if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@ngtools/webpack')) {
        log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@ngtools/webpack",\n
		you need to delete it and maybe \`clean\` and \`init\` again`);
        valid = false;
    }
    try {
        const duplicate = require.resolve('@angular-devkit/architect/node_modules/rxjs/package.json');
        log.error(`Duplicate dependency is found in "${duplicate}",\n
		you need to delete it and maybe \`clean\` and \`init\` again`);
        valid = false;
    }
    catch (ex) { }
    return valid;
}
// function printHelp() {
// 	// tslint:disable no-console
// 	console.log('\n\n  If you want to narrow down to only specific modules for Angular to build/serve, try\n    ' +
// 		yellow('drcp init --prop @dr-core/ng-app-builder.packages=<packageName,...>') + '\n  ' +
// 		'Or through a configuration file:\n' +
// 		yellow('    drcp init -c <other files> modules.yaml\n') +
// 		'  modules.yaml:\n' +
// 		cyan('  '.repeat(1) + '@dr-core/ng-app-builder:\n' +
// 			'  '.repeat(2) + 'packages:\n' +
// 			'  '.repeat(3) + '- <packageName 1>\n' +
// 			'  '.repeat(3) + '- <packageName 2>\n')
// 	);
// }

//# sourceMappingURL=server.js.map
