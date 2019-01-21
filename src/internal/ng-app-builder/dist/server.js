"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const __api_1 = tslib_1.__importDefault(require("__api"));
const Url = tslib_1.__importStar(require("url"));
const log4js = tslib_1.__importStar(require("log4js"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const _fs = tslib_1.__importStar(require("fs-extra"));
const config_webpack_1 = tslib_1.__importDefault(require("./config-webpack"));
const utils_1 = require("dr-comp-package/wfh/dist/utils");
const api_share_1 = require("./api-share");
tslib_1.__exportStar(require("./ng-prerender"), exports);
tslib_1.__exportStar(require("./ng/common"), exports);
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
            ngRouterPath: api_share_1.ngRouterPath,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUF3QjtBQUN4QixpREFBMkI7QUFDM0IsdURBQWlDO0FBQ2pDLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQWdDO0FBRWhDLDhFQUFtRDtBQUduRCwwREFBeUQ7QUFDekQsMkNBQXlDO0FBRXpDLHlEQUErQjtBQUMvQixzREFBNEI7QUFHNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUN0QixzQ0FBc0M7SUFDdEMsNkRBQTZEO0lBQzdELGtEQUFrRDtJQUNsRCw4REFBOEQ7SUFDOUQseUdBQXlHO0lBQ3pHLDJEQUEyRDtJQUMzRCxzQkFBc0I7SUFDdEIsMkZBQTJGO0lBQzNGLE1BQU07SUFDTixvQkFBb0I7SUFDcEIsT0FBTztJQUNQLElBQUk7SUFDSixPQUFPLHFCQUFxQixFQUFFLENBQUM7QUFDaEMsQ0FBQztBQWRELDBCQWNDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3pDLE9BQU8sRUFBRSxDQUFDO0lBQ1YsNkRBQTZEO0lBQzdELCtDQUErQztJQUMvQyxjQUFjO0lBRWQsbUNBQW1DO0lBQ25DLHFDQUFxQztJQUNyQywwQ0FBMEM7SUFDMUMsMEVBQTBFO0lBQzFFLHlDQUF5QztJQUN6QyxvQ0FBb0M7SUFDcEMsK0RBQStEO0lBQy9ELG9CQUFvQjtJQUNwQixj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QUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztRQUMzRSxPQUFPO0tBQ1A7SUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxhQUFhLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztJQUMxRixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztRQUN2QyxPQUFPO0lBQ1IsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLE1BQU0sMEVBQTBFLENBQUMsQ0FBQztJQUN0RyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDN0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQ3ZCLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN2SCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0FuZ3VsYXJDbGlQYXJhbX0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IGNoYW5nZVdlYnBhY2tDb25maWcgZnJvbSAnLi9jb25maWctd2VicGFjayc7XG5pbXBvcnQge1RzSGFuZGxlciwgUmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IHtuZ1JvdXRlclBhdGh9IGZyb20gJy4vYXBpLXNoYXJlJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbmV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCAqIGZyb20gJy4vbmcvY29tbW9uJztcbmV4cG9ydCB7QW5ndWxhckNvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuLy8gY29uc3Qgc3lzRnMgPSBmcyBhcyB0eXBlb2YgX2ZzICYge21rZGlyc1N5bmM6IChmaWxlOiBzdHJpbmcpID0+IHZvaWR9O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcblx0Ly8gY29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcblx0Ly8gY29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuXHQvLyBpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcykge1xuXHQvLyBcdGNvbnN0IGZtID0gYXBpLmJyb3dzZXJJbmplY3Rvci5mcm9tRGlyKFBhdGgucmVzb2x2ZSgnLycpKTtcblx0Ly8gXHRmbS5hbGlhcygvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZywgcmVnczogUmVnRXhwRXhlY0FycmF5KTogc3RyaW5nID0+IHtcblx0Ly8gXHRcdGNvbnN0IHBrSW5zdGFuY2UgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW3JlZ3NbMV1dO1xuXHQvLyBcdFx0aWYgKHBrSW5zdGFuY2UpIHtcblx0Ly8gXHRcdFx0cmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdCwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ3NbMl07XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXR1cm4gcmVnc1swXTtcblx0Ly8gXHR9KTtcblx0Ly8gfVxuXHRyZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuXHRyZXR1cm4gW107XG5cdC8vIGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcblx0Ly8gaWYgKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcylcblx0Ly8gXHRyZXR1cm4gW107XG5cblx0Ly8gY29uc3Qgc2VsID0gbmV3IFRzU2VsZWN0b3Ioc3JjKTtcblx0Ly8gY29uc3QgcmVwbDogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXHQvLyBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoc3JjLmZpbGVOYW1lKTtcblx0Ly8gZm9yIChjb25zdCBhc3Qgb2Ygc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykpIHtcblx0Ly8gXHRjb25zdCBmcm9tID0gYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWw7XG5cdC8vIFx0Ly8gbG9nLmluZm8oJ2Zyb20gJywgZnJvbS50ZXh0KTtcblx0Ly8gXHRjb25zdCByZWcgPSAvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLmV4ZWMoZnJvbS50ZXh0KTtcblx0Ly8gXHRpZiAocmVnID09IG51bGwpXG5cdC8vIFx0XHRjb250aW51ZTtcblx0Ly8gXHRjb25zdCBwa0luc3RhbmNlID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtyZWdbMV1dO1xuXHQvLyBcdGlmIChwa0luc3RhbmNlICYmIHBrSW5zdGFuY2UuZHIpIHtcblx0Ly8gXHRcdGxldCByZXNvbHZlZEZyb20gPSBQYXRoLnJlbGF0aXZlKGRpciwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ1syXTtcblx0Ly8gXHRcdGlmIChyZXNvbHZlZEZyb20uc3RhcnRzV2l0aCgnbm9kZV9tb2R1bGVzLycpKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9IHJlc29sdmVkRnJvbS5zbGljZSgnbm9kZV9tb2R1bGVzLycubGVuZ3RoKTtcblx0Ly8gXHRcdH0gZWxzZSBpZiAoL15bXi4vXS8udGVzdChyZXNvbHZlZEZyb20pKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9ICcuLycgKyByZXNvbHZlZEZyb207XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXBsLnB1c2goe3RleHQ6IGAnJHtyZXNvbHZlZEZyb219J2AsIHN0YXJ0OiBmcm9tLmdldFN0YXJ0KHNyYyksIGVuZDogZnJvbS5nZXRFbmQoKX0pO1xuXHQvLyBcdH1cblx0Ly8gfVxuXHQvLyByZXR1cm4gcmVwbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdC8vIHByaW50SGVscCgpO1xuXHRpZiAoX2ZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKSkge1xuXHRcdF9mcy5yZW1vdmVTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJyk7XG5cdH1cblx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyB3YWl0IGZvciBkZWxldGVcblx0aWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcblx0Ly8gd3JpdGVUc2NvbmZpZygpO1xuXHRoYWNrRml4V2F0Y2hwYWNrKCk7XG5cdHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCkge1xuXHRjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG5cdGlmICghbmdQYXJhbSB8fCBhcGkubmdFbnRyeUNvbXBvbmVudClcblx0XHRyZXR1cm47XG5cdC8vIGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdC8vIFx0dGhyb3cgbmV3IEVycm9yKCdJbiBvcmRlciB0byBnZXQgRFJDUCBidWlsZGVyIHdvcmssXFxcblx0Ly8gXHR5b3UgbXVzdCBzZXQgcHJvcGVydHkgYHByZXNlcnZlU3ltbGlua3NgIHRvIGJlIHRydWUgaW4gcHJvamVjdFxcJ3MgYW5ndWxhci5qc29uIGZpbGUgXFxcblx0Ly8gXHQnKTtcblx0Ly8gfVxuXHRjb25zdCB3ZWJwYWNrQ29uZmlnID0gbmdQYXJhbS53ZWJwYWNrQ29uZmlnO1xuXHRjb25zdCBuZ0VudHJ5Q29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKFBhdGgucmVzb2x2ZShuZ1BhcmFtLnByb2plY3RSb290KSk7XG5cdGNvbnN0IGRlcGxveVVybCA9IHdlYnBhY2tDb25maWcub3V0cHV0LnB1YmxpY1BhdGggfHwgYXBpLmNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKTtcblxuXHRjb25zdCBwdWJsaWNVcmxPYmogPSBVcmwucGFyc2UoZGVwbG95VXJsKTtcblx0T2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuXHRcdHdlYnBhY2tDb25maWcsXG5cdFx0bmdFbnRyeUNvbXBvbmVudCxcblx0XHRkZXBsb3lVcmwsXG5cdFx0c3NyOiBuZ1BhcmFtLnNzcixcblx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuXHRcdG5nUm91dGVyUGF0aCxcblx0XHRzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcblx0XHRcdGlmIChuZ1BhcmFtLnNzcilcblx0XHRcdFx0cmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuXHRcdH1cblx0fSk7XG5cdGF3YWl0IGNoYW5nZVdlYnBhY2tDb25maWcobmdQYXJhbSwgd2VicGFja0NvbmZpZywgYXBpLmNvbmZpZygpKTtcblxuXHQvLyBuZ1BhcmFtLnZmc0hvc3QuaG9va1JlYWQgPSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuXHRsb2cuaW5mbygnU2V0dXAgYXBpIG9iamVjdCBmb3IgQW5ndWxhcicpO1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuXHRjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG5cdFx0J0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJzAuMTIuMicsXG5cdFx0J0Bhbmd1bGFyL2NsaSc6ICc3LjIuMicsXG5cdFx0J0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICc3LjIuMScsXG5cdFx0J0Bhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2UnOiAnNy4yLjEnXG5cdH07XG5cdGxldCB2YWxpZCA9IHRydWU7XG5cdF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcblx0XHRjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcblx0XHRpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG5cdFx0XHR2YWxpZCA9IGZhbHNlO1xuXHRcdFx0bG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcblx0XHR9XG5cdH0pO1xuXG5cdHRyeSB7XG5cdFx0Y29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fSBjYXRjaCAoZXgpIHt9XG5cblx0aWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuXHRcdHZhbGlkID0gZmFsc2U7XG5cdH1cblx0aWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG5cdFx0bG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fVxuXHR0cnkge1xuXHRcdGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fSBjYXRjaCAoZXgpIHt9XG5cdHJldHVybiB2YWxpZDtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuLy8gXHQvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBcdGNvbnNvbGUubG9nKCdcXG5cXG4gIElmIHlvdSB3YW50IHRvIG5hcnJvdyBkb3duIHRvIG9ubHkgc3BlY2lmaWMgbW9kdWxlcyBmb3IgQW5ndWxhciB0byBidWlsZC9zZXJ2ZSwgdHJ5XFxuICAgICcgK1xuLy8gXHRcdHllbGxvdygnZHJjcCBpbml0IC0tcHJvcCBAZHItY29yZS9uZy1hcHAtYnVpbGRlci5wYWNrYWdlcz08cGFja2FnZU5hbWUsLi4uPicpICsgJ1xcbiAgJyArXG4vLyBcdFx0J09yIHRocm91Z2ggYSBjb25maWd1cmF0aW9uIGZpbGU6XFxuJyArXG4vLyBcdFx0eWVsbG93KCcgICAgZHJjcCBpbml0IC1jIDxvdGhlciBmaWxlcz4gbW9kdWxlcy55YW1sXFxuJykgK1xuLy8gXHRcdCcgIG1vZHVsZXMueWFtbDpcXG4nICtcbi8vIFx0XHRjeWFuKCcgICcucmVwZWF0KDEpICsgJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMikgKyAncGFja2FnZXM6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAxPlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMj5cXG4nKVxuLy8gXHQpO1xuLy8gfVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNEVkaXRvcigpIHtcblx0Y29uc3QgdHNqc29uOiBhbnkgPSB7XG5cdFx0Ly8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuXHRcdGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJyksXG5cdFx0Ly8gaW5jbHVkZTogdHNJbmNsdWRlLFxuXHRcdGNvbXBpbGVyT3B0aW9uczoge1xuXHRcdFx0YmFzZVVybDogJy4nXG5cdFx0fVxuXHR9O1xuXHQvLyAtLS0tLS0tIFdyaXRlIHRzY29uZmlnLmpzb24gZm9yIFZpc3VhbCBDb2RlIEVkaXRvciAtLS0tLS0tLVxuXG5cdGxldCBzcmNEaXJDb3VudCA9IDA7XG5cdGNvbnN0IHJvb3QgPSBhcGkuY29uZmlnKCkucm9vdFBhdGg7XG5cblx0Y29uc3QgcGFja2FnZVRvUmVhbFBhdGg6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG5cdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJylcblx0LmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcblx0XHRjb25zdCByZWFsRGlyID0gX2ZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG5cdFx0Ly8gUGF0aC5yZWxhdGl2ZShyb290LCByZWFsRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGFja2FnZVRvUmVhbFBhdGgucHVzaChbbmFtZSwgcmVhbERpcl0pO1xuXHR9LCAnc3JjJyk7XG5cblx0Zm9yIChsZXQgcHJvaiBvZiBhcGkuY29uZmlnKCkucHJvamVjdExpc3QpIHtcblx0XHR0c2pzb24uaW5jbHVkZSA9IFtdO1xuXHRcdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2d1bHAvcmVjaXBlTWFuYWdlcicpLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG5cdFx0XHRsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG5cdFx0XHRcdGluY2x1ZGVEaXIgKz0gJy8nO1xuXHRcdFx0dHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcblx0XHRcdHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuXHRcdFx0c3JjRGlyQ291bnQrKztcblx0XHR9KTtcblx0XHRsb2cuaW5mbygnV3JpdGUgdHNjb25maWcuanNvbiB0byAnICsgcHJvaik7XG5cdFx0Y29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblx0XHRmb3IgKGNvbnN0IFtuYW1lLCByZWFsUGF0aF0gb2YgcGFja2FnZVRvUmVhbFBhdGgpIHtcblx0XHRcdGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcblx0XHRcdHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG5cdFx0fVxuXG5cdFx0Y29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgX2ZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcblx0XHRwYXRoTWFwcGluZ1snKiddID0gWydub2RlX21vZHVsZXMvKicsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXTtcblxuXHRcdHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG5cdFx0XHRiYXNlVXJsOiByb290LFxuXHRcdFx0cGF0aHM6IHBhdGhNYXBwaW5nLFxuXHRcdFx0dHlwZVJvb3RzOiBbXG5cdFx0XHRcdFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuXHRcdFx0XHRQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcblx0XHRcdF0sXG5cdFx0XHRub0ltcGxpY2l0QW55OiB0cnVlLFxuXHRcdFx0dGFyZ2V0OiAnZXMyMDE1Jyxcblx0XHRcdG1vZHVsZTogJ2NvbW1vbmpzJ1xuXHRcdH07XG5cdFx0X2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuXHR9XG5cblxuXHRpZiAoc3JjRGlyQ291bnQgPiAwKSB7XG5cdFx0bG9nLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoJ1RvIGJlIGZyaWVuZGx5IHRvIHlvdXIgZWRpdG9yLCB3ZSBqdXN0IGFkZGVkIHRzY29uZmlnLmpzb24gZmlsZSB0byBlYWNoIG9mIHlvdXIgcHJvamVjdCBkaXJlY3RvcmllcyxcXG4nICtcblx0XHQnQnV0IHBsZWFzZSBhZGQgXCJ0c2NvbmZpZy5qc29uXCIgdG8geW91ciAuZ2l0aW5nb3JlIGZpbGUsXFxuJyArXG5cdFx0J3NpbmNlIHRoZXNlIHRzY29uZmlnLmpzb24gYXJlIGdlbmVyYXRlZCBiYXNlZCBvbiB5b3VyIGxvY2FsIHdvcmtzcGFjZSBsb2NhdGlvbi4nKSk7XG5cdH1cbn1cblxuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFcbiAqL1xuZnVuY3Rpb24gaGFja0ZpeFdhdGNocGFjaygpIHtcblx0Y29uc3Qgd2F0Y2hwYWNrUGF0aCA9IFsnd2VicGFjay9ub2RlX21vZHVsZXMvd2F0Y2hwYWNrJywgJ3dhdGNocGFjayddLmZpbmQocGF0aCA9PiB7XG5cdFx0cmV0dXJuIF9mcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyBwYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpKTtcblx0fSk7XG5cdGlmICghd2F0Y2hwYWNrUGF0aCkge1xuXHRcdGxvZy53YXJuKCdDYW4gbm90IGZpbmQgd2F0Y2hwYWNrLCBwbGVhc2UgbWFrZSBzdXJlIFdlYnBhY2sgaXMgaW5zdGFsbGVkLicpO1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgd2F0Y2hwYWNrUGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKTtcblx0aWYgKF9mcy5leGlzdHNTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnKSlcblx0XHRyZXR1cm47XG5cdGxvZy5pbmZvKGBoYWNraW5nICR7dGFyZ2V0fVxcblxcdCB0byB3b3JrYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxYCk7XG5cdF9mcy5yZW5hbWVTeW5jKHRhcmdldCwgdGFyZ2V0ICsgJy5kcmNwLWJhaycpO1xuXHRfZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsXG5cdFx0X2ZzLnJlYWRGaWxlU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJywgJ3V0ZjgnKS5yZXBsYWNlKC9cXFdmb2xsb3dTeW1saW5rczpcXHNmYWxzZS9nLCAnZm9sbG93U3ltbGlua3M6IHRydWUnKSwgJ3V0ZjgnKTtcbn1cbiJdfQ==
