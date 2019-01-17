"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js = tslib_1.__importStar(require("log4js"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const _fs = tslib_1.__importStar(require("fs-extra"));
const config_webpack_1 = tslib_1.__importDefault(require("./config-webpack"));
const Url = require("url");
const utils_1 = require("dr-comp-package/wfh/dist/utils");
tslib_1.__exportStar(require("./ng-prerender"), exports);
tslib_1.__exportStar(require("./ng/common"), exports);
// import TsSelector from '@dr-core/ng-app-builder/dist/utils/ts-ast-query';
const semver = require('semver');
const { red, yellow } = require('chalk');
// const fs = require('fs-extra');
// const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(__api_1.default.packageName);
function compile() {
    // const root = api.config().rootPath;
    // const ngParam: AngularCliParam = api.config()._angularCli;
    // if (!ngParam.browserOptions.preserveSymlinks) {
    // 	const fm = api.browserInjector.fromDir(Path.resolve('/'));
    // 	fm.alias(/^((?:@[^/]+\/)?[^./]+)(.*?)$/, (sourceFilePath: string, regs: RegExpExecArray): string => {
    // 		const pkInstance = api.packageInfo.moduleMap[regs[1]];
    // 		if (pkInstance) {
    // 			return Path.relative(root, pkInstance.realPackagePath).replace(/\\/g, '/') + regs[2];
    // 		}
    // 		return regs[0];
    // 	});
    // }
    return setupApiForAngularCli();
}
exports.compile = compile;
exports.tsHandler = resolveImports;
function resolveImports(src) {
    return [];
    // const ngParam: AngularCliParam = api.config()._angularCli;
    // if (ngParam.browserOptions.preserveSymlinks)
    // 	return [];
    // const sel = new TsSelector(src);
    // const repl: ReplacementInf[] = [];
    // const dir = Path.dirname(src.fileName);
    // for (const ast of sel.findAll(':ImportDeclaration>.moduleSpecifier')) {
    // 	const from = ast as ts.StringLiteral;
    // 	// log.info('from ', from.text);
    // 	const reg = /^((?:@[^/]+\/)?[^./]+)(.*?)$/.exec(from.text);
    // 	if (reg == null)
    // 		continue;
    // 	const pkInstance = api.packageInfo.moduleMap[reg[1]];
    // 	if (pkInstance && pkInstance.dr) {
    // 		let resolvedFrom = Path.relative(dir, pkInstance.realPackagePath).replace(/\\/g, '/') + reg[2];
    // 		if (resolvedFrom.startsWith('node_modules/')) {
    // 			resolvedFrom = resolvedFrom.slice('node_modules/'.length);
    // 		} else if (/^[^./]/.test(resolvedFrom)) {
    // 			resolvedFrom = './' + resolvedFrom;
    // 		}
    // 		repl.push({text: `'${resolvedFrom}'`, start: from.getStart(src), end: from.getEnd()});
    // 	}
    // }
    // return repl;
}
function init() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // printHelp();
        if (_fs.existsSync('node_modules/@angular-devkit/build-angular/node_modules')) {
            _fs.removeSync('node_modules/@angular-devkit/build-angular/node_modules');
        }
        yield new Promise(resolve => setTimeout(resolve, 100)); // wait for delete
        if (!checkAngularVersion())
            throw new Error('Angular version check Error');
        // writeTsconfig();
        hackFixWatchpack();
        writeTsconfig4Editor();
    });
}
exports.init = init;
function activate() {
}
exports.activate = activate;
function setupApiForAngularCli() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const ngParam = __api_1.default.config()._angularCli;
        if (!ngParam || __api_1.default.ngEntryComponent)
            return;
        // if (!ngParam.browserOptions.preserveSymlinks) {
        // 	throw new Error('In order to get DRCP builder work,\
        // 	you must set property `preserveSymlinks` to be true in project\'s angular.json file \
        // 	');
        // }
        const webpackConfig = ngParam.webpackConfig;
        const ngEntryComponent = __api_1.default.findPackageByFile(Path.resolve(ngParam.projectRoot));
        const deployUrl = webpackConfig.output.publicPath || __api_1.default.config.get('publicPath');
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
        yield config_webpack_1.default(ngParam, webpackConfig, __api_1.default.config());
        // ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
        log.info('Setup api object for Angular');
    });
}
function checkAngularVersion() {
    const deps = {
        '@angular-devkit/build-angular': '0.12.2',
        '@angular/cli': '7.2.2',
        '@angular/compiler-cli': '7.2.1',
        '@angular/language-service': '7.2.1'
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
function writeTsconfig4Editor() {
    const tsjson = {
        // extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        extends: require.resolve('dr-comp-package/wfh/tsconfig.json'),
        // include: tsInclude,
        compilerOptions: {
            baseUrl: '.'
        }
    };
    // ------- Write tsconfig.json for Visual Code Editor --------
    let srcDirCount = 0;
    const root = __api_1.default.config().rootPath;
    const packageToRealPath = [];
    require('dr-comp-package/wfh/lib/packageMgr/packageUtils')
        .findAllPackages((name, entryPath, parsedName, json, packagePath) => {
        const realDir = _fs.realpathSync(packagePath);
        // Path.relative(root, realDir).replace(/\\/g, '/');
        packageToRealPath.push([name, realDir]);
    }, 'src');
    for (let proj of __api_1.default.config().projectList) {
        tsjson.include = [];
        require('dr-comp-package/wfh/lib/gulp/recipeManager').eachRecipeSrc(proj, (srcDir) => {
            let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
            if (includeDir && includeDir !== '/')
                includeDir += '/';
            tsjson.include.push(includeDir + '**/*.ts');
            tsjson.include.push(includeDir + '**/*.tsx');
            srcDirCount++;
        });
        log.info('Write tsconfig.json to ' + proj);
        const pathMapping = {};
        for (const [name, realPath] of packageToRealPath) {
            const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
            pathMapping[name] = [realDir];
            pathMapping[name + '/*'] = [realDir + '/*'];
        }
        const drcpDir = Path.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
        pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];
        tsjson.compilerOptions = {
            baseUrl: root,
            paths: pathMapping,
            typeRoots: [
                Path.join(root, 'node_modules/@types'),
                Path.join(root, 'node_modules/@dr-types'),
                Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
            ],
            noImplicitAny: true,
            target: 'es2015',
            module: 'commonjs'
        };
        _fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(tsjson, null, '  '));
    }
    if (srcDirCount > 0) {
        log.info('\n' + utils_1.boxString('To be friendly to your editor, we just added tsconfig.json file to each of your project directories,\n' +
            'But please add "tsconfig.json" to your .gitingore file,\n' +
            'since these tsconfig.json are generated based on your local workspace location.'));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUFtQztBQUNuQyx1REFBaUM7QUFDakMsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixzREFBZ0M7QUFHaEMsOEVBQW1EO0FBQ25ELDJCQUE0QjtBQUc1QiwwREFBeUQ7QUFJekQseURBQStCO0FBQy9CLHNEQUE0QjtBQUU1Qiw0RUFBNEU7QUFDNUUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUN0QixzQ0FBc0M7SUFDdEMsNkRBQTZEO0lBQzdELGtEQUFrRDtJQUNsRCw4REFBOEQ7SUFDOUQseUdBQXlHO0lBQ3pHLDJEQUEyRDtJQUMzRCxzQkFBc0I7SUFDdEIsMkZBQTJGO0lBQzNGLE1BQU07SUFDTixvQkFBb0I7SUFDcEIsT0FBTztJQUNQLElBQUk7SUFDSixPQUFPLHFCQUFxQixFQUFFLENBQUM7QUFDaEMsQ0FBQztBQWRELDBCQWNDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3pDLE9BQU8sRUFBRSxDQUFDO0lBQ1YsNkRBQTZEO0lBQzdELCtDQUErQztJQUMvQyxjQUFjO0lBRWQsbUNBQW1DO0lBQ25DLHFDQUFxQztJQUNyQywwQ0FBMEM7SUFDMUMsMEVBQTBFO0lBQzFFLHlDQUF5QztJQUN6QyxvQ0FBb0M7SUFDcEMsK0RBQStEO0lBQy9ELG9CQUFvQjtJQUNwQixj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QUcsaUJBQVMsQ0FBQyx3R0FBd0c7WUFDbEksMkRBQTJEO1lBQzNELGlGQUFpRixDQUFDLENBQUMsQ0FBQztLQUNwRjtBQUNGLENBQUM7QUFHRDs7R0FFRztBQUNILFNBQVMsZ0JBQWdCO0lBQ3hCLE1BQU0sYUFBYSxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2pGLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLGdFQUFnRSxDQUFDLENBQUM7UUFDM0UsT0FBTztLQUNQO0lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7SUFDMUYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFDdkMsT0FBTztJQUNSLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLDBFQUEwRSxDQUFDLENBQUM7SUFDdEcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzdDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUN2QixHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDdkgsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuLy8gaW1wb3J0IHsgUHJlcmVuZGVyRm9yRXhwcmVzcyB9IGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmltcG9ydCB7QW5ndWxhckNsaVBhcmFtfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgY2hhbmdlV2VicGFja0NvbmZpZyBmcm9tICcuL2NvbmZpZy13ZWJwYWNrJztcbmltcG9ydCBVcmwgPSByZXF1aXJlKCd1cmwnKTtcbmltcG9ydCB7VHNIYW5kbGVyLCBSZXBsYWNlbWVudEluZn0gZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1iZWZvcmUtYW90JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG4vLyBpbXBvcnQge3Byb21pc2lmeUV4ZX0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbmV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCAqIGZyb20gJy4vbmcvY29tbW9uJztcblxuLy8gaW1wb3J0IFRzU2VsZWN0b3IgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1hc3QtcXVlcnknO1xuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuLy8gY29uc3Qgc3lzRnMgPSBmcyBhcyB0eXBlb2YgX2ZzICYge21rZGlyc1N5bmM6IChmaWxlOiBzdHJpbmcpID0+IHZvaWR9O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcblx0Ly8gY29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcblx0Ly8gY29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuXHQvLyBpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcykge1xuXHQvLyBcdGNvbnN0IGZtID0gYXBpLmJyb3dzZXJJbmplY3Rvci5mcm9tRGlyKFBhdGgucmVzb2x2ZSgnLycpKTtcblx0Ly8gXHRmbS5hbGlhcygvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZywgcmVnczogUmVnRXhwRXhlY0FycmF5KTogc3RyaW5nID0+IHtcblx0Ly8gXHRcdGNvbnN0IHBrSW5zdGFuY2UgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW3JlZ3NbMV1dO1xuXHQvLyBcdFx0aWYgKHBrSW5zdGFuY2UpIHtcblx0Ly8gXHRcdFx0cmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdCwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ3NbMl07XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXR1cm4gcmVnc1swXTtcblx0Ly8gXHR9KTtcblx0Ly8gfVxuXHRyZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuXHRyZXR1cm4gW107XG5cdC8vIGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcblx0Ly8gaWYgKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcylcblx0Ly8gXHRyZXR1cm4gW107XG5cblx0Ly8gY29uc3Qgc2VsID0gbmV3IFRzU2VsZWN0b3Ioc3JjKTtcblx0Ly8gY29uc3QgcmVwbDogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXHQvLyBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoc3JjLmZpbGVOYW1lKTtcblx0Ly8gZm9yIChjb25zdCBhc3Qgb2Ygc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykpIHtcblx0Ly8gXHRjb25zdCBmcm9tID0gYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWw7XG5cdC8vIFx0Ly8gbG9nLmluZm8oJ2Zyb20gJywgZnJvbS50ZXh0KTtcblx0Ly8gXHRjb25zdCByZWcgPSAvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLmV4ZWMoZnJvbS50ZXh0KTtcblx0Ly8gXHRpZiAocmVnID09IG51bGwpXG5cdC8vIFx0XHRjb250aW51ZTtcblx0Ly8gXHRjb25zdCBwa0luc3RhbmNlID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtyZWdbMV1dO1xuXHQvLyBcdGlmIChwa0luc3RhbmNlICYmIHBrSW5zdGFuY2UuZHIpIHtcblx0Ly8gXHRcdGxldCByZXNvbHZlZEZyb20gPSBQYXRoLnJlbGF0aXZlKGRpciwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ1syXTtcblx0Ly8gXHRcdGlmIChyZXNvbHZlZEZyb20uc3RhcnRzV2l0aCgnbm9kZV9tb2R1bGVzLycpKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9IHJlc29sdmVkRnJvbS5zbGljZSgnbm9kZV9tb2R1bGVzLycubGVuZ3RoKTtcblx0Ly8gXHRcdH0gZWxzZSBpZiAoL15bXi4vXS8udGVzdChyZXNvbHZlZEZyb20pKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9ICcuLycgKyByZXNvbHZlZEZyb207XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXBsLnB1c2goe3RleHQ6IGAnJHtyZXNvbHZlZEZyb219J2AsIHN0YXJ0OiBmcm9tLmdldFN0YXJ0KHNyYyksIGVuZDogZnJvbS5nZXRFbmQoKX0pO1xuXHQvLyBcdH1cblx0Ly8gfVxuXHQvLyByZXR1cm4gcmVwbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdC8vIHByaW50SGVscCgpO1xuXHRpZiAoX2ZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKSkge1xuXHRcdF9mcy5yZW1vdmVTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJyk7XG5cdH1cblx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyB3YWl0IGZvciBkZWxldGVcblx0aWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcblx0Ly8gd3JpdGVUc2NvbmZpZygpO1xuXHRoYWNrRml4V2F0Y2hwYWNrKCk7XG5cdHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCkge1xuXHRjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG5cdGlmICghbmdQYXJhbSB8fCBhcGkubmdFbnRyeUNvbXBvbmVudClcblx0XHRyZXR1cm47XG5cdC8vIGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdC8vIFx0dGhyb3cgbmV3IEVycm9yKCdJbiBvcmRlciB0byBnZXQgRFJDUCBidWlsZGVyIHdvcmssXFxcblx0Ly8gXHR5b3UgbXVzdCBzZXQgcHJvcGVydHkgYHByZXNlcnZlU3ltbGlua3NgIHRvIGJlIHRydWUgaW4gcHJvamVjdFxcJ3MgYW5ndWxhci5qc29uIGZpbGUgXFxcblx0Ly8gXHQnKTtcblx0Ly8gfVxuXHRjb25zdCB3ZWJwYWNrQ29uZmlnID0gbmdQYXJhbS53ZWJwYWNrQ29uZmlnO1xuXHRjb25zdCBuZ0VudHJ5Q29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKFBhdGgucmVzb2x2ZShuZ1BhcmFtLnByb2plY3RSb290KSk7XG5cdGNvbnN0IGRlcGxveVVybCA9IHdlYnBhY2tDb25maWcub3V0cHV0LnB1YmxpY1BhdGggfHwgYXBpLmNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKTtcblxuXHRjb25zdCBwdWJsaWNVcmxPYmogPSBVcmwucGFyc2UoZGVwbG95VXJsKTtcblx0T2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuXHRcdHdlYnBhY2tDb25maWcsXG5cdFx0bmdFbnRyeUNvbXBvbmVudCxcblx0XHRkZXBsb3lVcmwsXG5cdFx0c3NyOiBuZ1BhcmFtLnNzcixcblx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuXHRcdC8qKkBmdW5jdGlvbiBuZ1JvdXRlclBhdGhcblx0XHQgKiBAbWVtYmVyT2YgX19hcGlcblx0XHQgKiBlLmcuXG5cdFx0ICogQXNzdW1lIGFwcGxpY2F0aW9uIGlzIGRlcGxveWVkIG9uICdodHRwOi8vZm9vYmFyLmNvbS9iYXNlLWhyZWYnIGFzIFwiZGVwbG95VXJsXCIgaW4gYW5ndWxhci5qc29uLlxuXHRcdCAqIEN1cnJlbnQgZmVhdHVyZSBwYWNrYWdlIGlzIGBAYmsvZmVhdHVyZS1hYCwgaXRzIGBuZ1JvdXRlUGF0aGAgaXMgYnkgZGVmYXVsdCAnZmVhdHVyZS1hJyxcblx0XHQgKiBmZWF0dXJlIHBhY2thZ2UgYEBiay9mZWF0dXJlLWJgJ3MgYG5nUm91dGVQYXRoYCBpcyBieSBkZWZhdWx0ICdmZWF0dXJlLWInXG5cdFx0ICogIGBgYHRzXG5cdFx0ICogX19hcGkubmdSb3V0ZXJQYXRoKCdhY3Rpb24nKSAgLy8gXCIvYmFzZS1ocmVmL2ZlYXR1cmUtYS9hY3Rpb25cIlxuXHRcdCAqIF9fYXBpLm5nUm91dGVyUGF0aCgnQGJrL2ZlYXR1cmUtYicsICdhY3Rpb24nKSAgIC8vIFwiL2Jhc2UtaHJlZi9mZWF0dXJlLWIvYWN0aW9uXCJcblx0XHQgKiBgYGBcblx0XHQgKiBAcmV0dXJuIHRoZSBjb25maWd1cmVkIEFuZ3VsYXIgcm91dGVyIHBhdGggZm9yIHNwZWNpZmljIChjdXJyZW50KSBmZWF0dXJlIHBhY2thZ2Vcblx0XHQgKi9cblx0XHRuZ1JvdXRlclBhdGgodGhpczogRHJjcEFwaSwgcGFja2FnZU5hbWU6IHN0cmluZywgc3ViUGF0aD86IHN0cmluZykge1xuXHRcdFx0Y29uc3QgdXJsID0gdGhpcy5hc3NldHNVcmwocGFja2FnZU5hbWUsIHN1YlBhdGgpO1xuXHRcdFx0cmV0dXJuIF8udHJpbVN0YXJ0KFVybC5wYXJzZSh1cmwpLnBhdGhuYW1lLCAnLycpO1xuXHRcdH0sXG5cdFx0c3NyUmVxdWlyZShyZXF1aXJlUGF0aDogc3RyaW5nKSB7XG5cdFx0XHRpZiAobmdQYXJhbS5zc3IpXG5cdFx0XHRcdHJldHVybiByZXF1aXJlKFBhdGguam9pbih0aGlzLl9fZGlybmFtZSwgcmVxdWlyZVBhdGgpKTtcblx0XHR9XG5cdH0pO1xuXHRhd2FpdCBjaGFuZ2VXZWJwYWNrQ29uZmlnKG5nUGFyYW0sIHdlYnBhY2tDb25maWcsIGFwaS5jb25maWcoKSk7XG5cblx0Ly8gbmdQYXJhbS52ZnNIb3N0Lmhvb2tSZWFkID0gY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtKTtcblx0bG9nLmluZm8oJ1NldHVwIGFwaSBvYmplY3QgZm9yIEFuZ3VsYXInKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBbmd1bGFyVmVyc2lvbigpIHtcblx0Y29uc3QgZGVwczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuXHRcdCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic6ICcwLjEyLjInLFxuXHRcdCdAYW5ndWxhci9jbGknOiAnNy4yLjInLFxuXHRcdCdAYW5ndWxhci9jb21waWxlci1jbGknOiAnNy4yLjEnLFxuXHRcdCdAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlJzogJzcuMi4xJ1xuXHR9O1xuXHRsZXQgdmFsaWQgPSB0cnVlO1xuXHRfLmVhY2goZGVwcywgKGV4cGVjdFZlciwgbW9kKSA9PiB7XG5cdFx0Y29uc3QgdmVyID0gcmVxdWlyZShtb2QgKyAnL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG5cdFx0aWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlciwgZXhwZWN0VmVyKSkge1xuXHRcdFx0dmFsaWQgPSBmYWxzZTtcblx0XHRcdGxvZy5lcnJvcih5ZWxsb3coYEluc3RhbGxlZCBkZXBlbmRlbmN5IFwiJHttb2R9QGApICsgcmVkKHZlcikgKyB5ZWxsb3coYFwiIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCwgaW5zdGFsbCAke2V4cGVjdFZlcn0gaW5zdGVhZC5gKSk7XG5cdFx0fVxuXHR9KTtcblxuXHR0cnkge1xuXHRcdGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL3dlYnBhY2svcGFja2FnZS5qc29uJyk7XG5cdFx0bG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuXHRcdHZhbGlkID0gZmFsc2U7XG5cdH0gY2F0Y2ggKGV4KSB7fVxuXG5cdGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdCcpKSB7XG5cdFx0bG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXRcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcblx0XHR2YWxpZCA9IGZhbHNlO1xuXHR9XG5cdGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2snKSkge1xuXHRcdGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFja1wiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuXHRcdHZhbGlkID0gZmFsc2U7XG5cdH1cblx0dHJ5IHtcblx0XHRjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZV9tb2R1bGVzL3J4anMvcGFja2FnZS5qc29uJyk7XG5cdFx0bG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuXHRcdHZhbGlkID0gZmFsc2U7XG5cdH0gY2F0Y2ggKGV4KSB7fVxuXHRyZXR1cm4gdmFsaWQ7XG59XG5cbi8vIGZ1bmN0aW9uIHByaW50SGVscCgpIHtcbi8vIFx0Ly8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuLy8gXHRjb25zb2xlLmxvZygnXFxuXFxuICBJZiB5b3Ugd2FudCB0byBuYXJyb3cgZG93biB0byBvbmx5IHNwZWNpZmljIG1vZHVsZXMgZm9yIEFuZ3VsYXIgdG8gYnVpbGQvc2VydmUsIHRyeVxcbiAgICAnICtcbi8vIFx0XHR5ZWxsb3coJ2RyY3AgaW5pdCAtLXByb3AgQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIucGFja2FnZXM9PHBhY2thZ2VOYW1lLC4uLj4nKSArICdcXG4gICcgK1xuLy8gXHRcdCdPciB0aHJvdWdoIGEgY29uZmlndXJhdGlvbiBmaWxlOlxcbicgK1xuLy8gXHRcdHllbGxvdygnICAgIGRyY3AgaW5pdCAtYyA8b3RoZXIgZmlsZXM+IG1vZHVsZXMueWFtbFxcbicpICtcbi8vIFx0XHQnICBtb2R1bGVzLnlhbWw6XFxuJyArXG4vLyBcdFx0Y3lhbignICAnLnJlcGVhdCgxKSArICdAZHItY29yZS9uZy1hcHAtYnVpbGRlcjpcXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDIpICsgJ3BhY2thZ2VzOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMT5cXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDMpICsgJy0gPHBhY2thZ2VOYW1lIDI+XFxuJylcbi8vIFx0KTtcbi8vIH1cblxuZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRFZGl0b3IoKSB7XG5cdGNvbnN0IHRzanNvbjogYW55ID0ge1xuXHRcdC8vIGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL3RzY29uZmlnLmpzb24nKSxcblx0XHRleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpLFxuXHRcdC8vIGluY2x1ZGU6IHRzSW5jbHVkZSxcblx0XHRjb21waWxlck9wdGlvbnM6IHtcblx0XHRcdGJhc2VVcmw6ICcuJ1xuXHRcdH1cblx0fTtcblx0Ly8gLS0tLS0tLSBXcml0ZSB0c2NvbmZpZy5qc29uIGZvciBWaXN1YWwgQ29kZSBFZGl0b3IgLS0tLS0tLS1cblxuXHRsZXQgc3JjRGlyQ291bnQgPSAwO1xuXHRjb25zdCByb290ID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuXG5cdGNvbnN0IHBhY2thZ2VUb1JlYWxQYXRoOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuXHRyZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpXG5cdC5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0Y29uc3QgcmVhbERpciA9IF9mcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuXHRcdC8vIFBhdGgucmVsYXRpdmUocm9vdCwgcmVhbERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhY2thZ2VUb1JlYWxQYXRoLnB1c2goW25hbWUsIHJlYWxEaXJdKTtcblx0fSwgJ3NyYycpO1xuXG5cdGZvciAobGV0IHByb2ogb2YgYXBpLmNvbmZpZygpLnByb2plY3RMaXN0KSB7XG5cdFx0dHNqc29uLmluY2x1ZGUgPSBbXTtcblx0XHRyZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9ndWxwL3JlY2lwZU1hbmFnZXInKS5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuXHRcdFx0bGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0aWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuXHRcdFx0XHRpbmNsdWRlRGlyICs9ICcvJztcblx0XHRcdHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG5cdFx0XHR0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcblx0XHRcdHNyY0RpckNvdW50Kys7XG5cdFx0fSk7XG5cdFx0bG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuXHRcdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cdFx0Zm9yIChjb25zdCBbbmFtZSwgcmVhbFBhdGhdIG9mIHBhY2thZ2VUb1JlYWxQYXRoKSB7XG5cdFx0XHRjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0cGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG5cdFx0XHRwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cblx0XHR0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuXHRcdFx0YmFzZVVybDogcm9vdCxcblx0XHRcdHBhdGhzOiBwYXRoTWFwcGluZyxcblx0XHRcdHR5cGVSb290czogW1xuXHRcdFx0XHRQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG5cdFx0XHRcdFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG5cdFx0XHRdLFxuXHRcdFx0bm9JbXBsaWNpdEFueTogdHJ1ZSxcblx0XHRcdHRhcmdldDogJ2VzMjAxNScsXG5cdFx0XHRtb2R1bGU6ICdjb21tb25qcydcblx0XHR9O1xuXHRcdF9mcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcblx0fVxuXG5cblx0aWYgKHNyY0RpckNvdW50ID4gMCkge1xuXHRcdGxvZy5pbmZvKCdcXG4nICsgYm94U3RyaW5nKCdUbyBiZSBmcmllbmRseSB0byB5b3VyIGVkaXRvciwgd2UganVzdCBhZGRlZCB0c2NvbmZpZy5qc29uIGZpbGUgdG8gZWFjaCBvZiB5b3VyIHByb2plY3QgZGlyZWN0b3JpZXMsXFxuJyArXG5cdFx0J0J1dCBwbGVhc2UgYWRkIFwidHNjb25maWcuanNvblwiIHRvIHlvdXIgLmdpdGluZ29yZSBmaWxlLFxcbicgK1xuXHRcdCdzaW5jZSB0aGVzZSB0c2NvbmZpZy5qc29uIGFyZSBnZW5lcmF0ZWQgYmFzZWQgb24geW91ciBsb2NhbCB3b3Jrc3BhY2UgbG9jYXRpb24uJykpO1xuXHR9XG59XG5cblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxXG4gKi9cbmZ1bmN0aW9uIGhhY2tGaXhXYXRjaHBhY2soKSB7XG5cdGNvbnN0IHdhdGNocGFja1BhdGggPSBbJ3dlYnBhY2svbm9kZV9tb2R1bGVzL3dhdGNocGFjaycsICd3YXRjaHBhY2snXS5maW5kKHBhdGggPT4ge1xuXHRcdHJldHVybiBfZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgcGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKSk7XG5cdH0pO1xuXHRpZiAoIXdhdGNocGFja1BhdGgpIHtcblx0XHRsb2cud2FybignQ2FuIG5vdCBmaW5kIHdhdGNocGFjaywgcGxlYXNlIG1ha2Ugc3VyZSBXZWJwYWNrIGlzIGluc3RhbGxlZC4nKTtcblx0XHRyZXR1cm47XG5cdH1cblx0Y29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHdhdGNocGFja1BhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJyk7XG5cdGlmIChfZnMuZXhpc3RzU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJykpXG5cdFx0cmV0dXJuO1xuXHRsb2cuaW5mbyhgaGFja2luZyAke3RhcmdldH1cXG5cXHQgdG8gd29ya2Fyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MWApO1xuXHRfZnMucmVuYW1lU3luYyh0YXJnZXQsIHRhcmdldCArICcuZHJjcC1iYWsnKTtcblx0X2ZzLndyaXRlRmlsZVN5bmModGFyZ2V0LFxuXHRcdF9mcy5yZWFkRmlsZVN5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycsICd1dGY4JykucmVwbGFjZSgvXFxXZm9sbG93U3ltbGlua3M6XFxzZmFsc2UvZywgJ2ZvbGxvd1N5bWxpbmtzOiB0cnVlJyksICd1dGY4Jyk7XG59XG4iXX0=
