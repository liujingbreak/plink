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
tslib_1.__exportStar(require("./config-webpack"), exports);
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
            baseUrl: '.',
            strictNullChecks: true
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUF3QjtBQUN4QixpREFBMkI7QUFDM0IsdURBQWlDO0FBQ2pDLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQWdDO0FBRWhDLDhFQUFtRDtBQUduRCwwREFBeUQ7QUFDekQsMkNBQXlDO0FBRXpDLHlEQUErQjtBQUMvQixzREFBNEI7QUFDNUIsMkRBQWlDO0FBR2pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUV2QyxrQ0FBa0M7QUFDbEMseUVBQXlFO0FBQ3pFLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLFNBQWdCLE9BQU87SUFDdEIsc0NBQXNDO0lBQ3RDLDZEQUE2RDtJQUM3RCxrREFBa0Q7SUFDbEQsOERBQThEO0lBQzlELHlHQUF5RztJQUN6RywyREFBMkQ7SUFDM0Qsc0JBQXNCO0lBQ3RCLDJGQUEyRjtJQUMzRixNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLE9BQU87SUFDUCxJQUFJO0lBQ0osT0FBTyxxQkFBcUIsRUFBRSxDQUFDO0FBQ2hDLENBQUM7QUFkRCwwQkFjQztBQUVVLFFBQUEsU0FBUyxHQUFjLGNBQWMsQ0FBQztBQUNqRCxTQUFTLGNBQWMsQ0FBQyxHQUFrQjtJQUN6QyxPQUFPLEVBQUUsQ0FBQztJQUNWLDZEQUE2RDtJQUM3RCwrQ0FBK0M7SUFDL0MsY0FBYztJQUVkLG1DQUFtQztJQUNuQyxxQ0FBcUM7SUFDckMsMENBQTBDO0lBQzFDLDBFQUEwRTtJQUMxRSx5Q0FBeUM7SUFDekMsb0NBQW9DO0lBQ3BDLCtEQUErRDtJQUMvRCxv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QUMsSUFBSSxDQUFDLEVBQUU7UUFDakYsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztRQUMzRSxPQUFPO0tBQ1A7SUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxhQUFhLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztJQUMxRixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztRQUN2QyxPQUFPO0lBQ1IsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLE1BQU0sMEVBQTBFLENBQUMsQ0FBQztJQUN0RyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDN0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQ3ZCLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN2SCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge0FuZ3VsYXJDbGlQYXJhbX0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IGNoYW5nZVdlYnBhY2tDb25maWcgZnJvbSAnLi9jb25maWctd2VicGFjayc7XG5pbXBvcnQge1RzSGFuZGxlciwgUmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IHtuZ1JvdXRlclBhdGh9IGZyb20gJy4vYXBpLXNoYXJlJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbmV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCAqIGZyb20gJy4vbmcvY29tbW9uJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnLXdlYnBhY2snO1xuZXhwb3J0IHtBbmd1bGFyQ29uZmlnSGFuZGxlcn0gZnJvbSAnLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuXG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSByZXF1aXJlKCdjaGFsaycpO1xuXG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG4vLyBjb25zdCBzeXNGcyA9IGZzIGFzIHR5cGVvZiBfZnMgJiB7bWtkaXJzU3luYzogKGZpbGU6IHN0cmluZykgPT4gdm9pZH07XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuXHQvLyBjb25zdCByb290ID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuXHQvLyBjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG5cdC8vIGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdC8vIFx0Y29uc3QgZm0gPSBhcGkuYnJvd3NlckluamVjdG9yLmZyb21EaXIoUGF0aC5yZXNvbHZlKCcvJykpO1xuXHQvLyBcdGZtLmFsaWFzKC9eKCg/OkBbXi9dK1xcLyk/W14uL10rKSguKj8pJC8sIChzb3VyY2VGaWxlUGF0aDogc3RyaW5nLCByZWdzOiBSZWdFeHBFeGVjQXJyYXkpOiBzdHJpbmcgPT4ge1xuXHQvLyBcdFx0Y29uc3QgcGtJbnN0YW5jZSA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbcmVnc1sxXV07XG5cdC8vIFx0XHRpZiAocGtJbnN0YW5jZSkge1xuXHQvLyBcdFx0XHRyZXR1cm4gUGF0aC5yZWxhdGl2ZShyb290LCBwa0luc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgcmVnc1syXTtcblx0Ly8gXHRcdH1cblx0Ly8gXHRcdHJldHVybiByZWdzWzBdO1xuXHQvLyBcdH0pO1xuXHQvLyB9XG5cdHJldHVybiBzZXR1cEFwaUZvckFuZ3VsYXJDbGkoKTtcbn1cblxuZXhwb3J0IGxldCB0c0hhbmRsZXI6IFRzSGFuZGxlciA9IHJlc29sdmVJbXBvcnRzO1xuZnVuY3Rpb24gcmVzb2x2ZUltcG9ydHMoc3JjOiB0cy5Tb3VyY2VGaWxlKTogUmVwbGFjZW1lbnRJbmZbXSB7XG5cdHJldHVybiBbXTtcblx0Ly8gY29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuXHQvLyBpZiAobmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKVxuXHQvLyBcdHJldHVybiBbXTtcblxuXHQvLyBjb25zdCBzZWwgPSBuZXcgVHNTZWxlY3RvcihzcmMpO1xuXHQvLyBjb25zdCByZXBsOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cdC8vIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShzcmMuZmlsZU5hbWUpO1xuXHQvLyBmb3IgKGNvbnN0IGFzdCBvZiBzZWwuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXInKSkge1xuXHQvLyBcdGNvbnN0IGZyb20gPSBhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcblx0Ly8gXHQvLyBsb2cuaW5mbygnZnJvbSAnLCBmcm9tLnRleHQpO1xuXHQvLyBcdGNvbnN0IHJlZyA9IC9eKCg/OkBbXi9dK1xcLyk/W14uL10rKSguKj8pJC8uZXhlYyhmcm9tLnRleHQpO1xuXHQvLyBcdGlmIChyZWcgPT0gbnVsbClcblx0Ly8gXHRcdGNvbnRpbnVlO1xuXHQvLyBcdGNvbnN0IHBrSW5zdGFuY2UgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW3JlZ1sxXV07XG5cdC8vIFx0aWYgKHBrSW5zdGFuY2UgJiYgcGtJbnN0YW5jZS5kcikge1xuXHQvLyBcdFx0bGV0IHJlc29sdmVkRnJvbSA9IFBhdGgucmVsYXRpdmUoZGlyLCBwa0luc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgcmVnWzJdO1xuXHQvLyBcdFx0aWYgKHJlc29sdmVkRnJvbS5zdGFydHNXaXRoKCdub2RlX21vZHVsZXMvJykpIHtcblx0Ly8gXHRcdFx0cmVzb2x2ZWRGcm9tID0gcmVzb2x2ZWRGcm9tLnNsaWNlKCdub2RlX21vZHVsZXMvJy5sZW5ndGgpO1xuXHQvLyBcdFx0fSBlbHNlIGlmICgvXlteLi9dLy50ZXN0KHJlc29sdmVkRnJvbSkpIHtcblx0Ly8gXHRcdFx0cmVzb2x2ZWRGcm9tID0gJy4vJyArIHJlc29sdmVkRnJvbTtcblx0Ly8gXHRcdH1cblx0Ly8gXHRcdHJlcGwucHVzaCh7dGV4dDogYCcke3Jlc29sdmVkRnJvbX0nYCwgc3RhcnQ6IGZyb20uZ2V0U3RhcnQoc3JjKSwgZW5kOiBmcm9tLmdldEVuZCgpfSk7XG5cdC8vIFx0fVxuXHQvLyB9XG5cdC8vIHJldHVybiByZXBsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcblx0Ly8gcHJpbnRIZWxwKCk7XG5cdGlmIChfZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcycpKSB7XG5cdFx0X2ZzLnJlbW92ZVN5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKTtcblx0fVxuXHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7IC8vIHdhaXQgZm9yIGRlbGV0ZVxuXHRpZiAoIWNoZWNrQW5ndWxhclZlcnNpb24oKSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgdmVyc2lvbiBjaGVjayBFcnJvcicpO1xuXHQvLyB3cml0ZVRzY29uZmlnKCk7XG5cdGhhY2tGaXhXYXRjaHBhY2soKTtcblx0d3JpdGVUc2NvbmZpZzRFZGl0b3IoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXR1cEFwaUZvckFuZ3VsYXJDbGkoKSB7XG5cdGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcblx0aWYgKCFuZ1BhcmFtIHx8IGFwaS5uZ0VudHJ5Q29tcG9uZW50KVxuXHRcdHJldHVybjtcblx0Ly8gaWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MpIHtcblx0Ly8gXHR0aHJvdyBuZXcgRXJyb3IoJ0luIG9yZGVyIHRvIGdldCBEUkNQIGJ1aWxkZXIgd29yayxcXFxuXHQvLyBcdHlvdSBtdXN0IHNldCBwcm9wZXJ0eSBgcHJlc2VydmVTeW1saW5rc2AgdG8gYmUgdHJ1ZSBpbiBwcm9qZWN0XFwncyBhbmd1bGFyLmpzb24gZmlsZSBcXFxuXHQvLyBcdCcpO1xuXHQvLyB9XG5cdGNvbnN0IHdlYnBhY2tDb25maWcgPSBuZ1BhcmFtLndlYnBhY2tDb25maWc7XG5cdGNvbnN0IG5nRW50cnlDb21wb25lbnQgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoUGF0aC5yZXNvbHZlKG5nUGFyYW0ucHJvamVjdFJvb3QpKTtcblx0Y29uc3QgZGVwbG95VXJsID0gd2VicGFja0NvbmZpZy5vdXRwdXQucHVibGljUGF0aCB8fCBhcGkuY29uZmlnLmdldCgncHVibGljUGF0aCcpO1xuXG5cdGNvbnN0IHB1YmxpY1VybE9iaiA9IFVybC5wYXJzZShkZXBsb3lVcmwpO1xuXHRPYmplY3QuYXNzaWduKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpLCB7XG5cdFx0d2VicGFja0NvbmZpZyxcblx0XHRuZ0VudHJ5Q29tcG9uZW50LFxuXHRcdGRlcGxveVVybCxcblx0XHRzc3I6IG5nUGFyYW0uc3NyLFxuXHRcdG5nQmFzZVJvdXRlclBhdGg6IF8udHJpbShwdWJsaWNVcmxPYmoucGF0aG5hbWUsICcvJyksXG5cdFx0bmdSb3V0ZXJQYXRoLFxuXHRcdHNzclJlcXVpcmUocmVxdWlyZVBhdGg6IHN0cmluZykge1xuXHRcdFx0aWYgKG5nUGFyYW0uc3NyKVxuXHRcdFx0XHRyZXR1cm4gcmVxdWlyZShQYXRoLmpvaW4odGhpcy5fX2Rpcm5hbWUsIHJlcXVpcmVQYXRoKSk7XG5cdFx0fVxuXHR9KTtcblx0YXdhaXQgY2hhbmdlV2VicGFja0NvbmZpZyhuZ1BhcmFtLCB3ZWJwYWNrQ29uZmlnLCBhcGkuY29uZmlnKCkpO1xuXG5cdC8vIG5nUGFyYW0udmZzSG9zdC5ob29rUmVhZCA9IGNyZWF0ZVRzUmVhZEhvb2sobmdQYXJhbSk7XG5cdGxvZy5pbmZvKCdTZXR1cCBhcGkgb2JqZWN0IGZvciBBbmd1bGFyJyk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQW5ndWxhclZlcnNpb24oKSB7XG5cdGNvbnN0IGRlcHM6IHtbazogc3RyaW5nXTogc3RyaW5nfSA9IHtcblx0XHQnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiAnMC4xMi4yJyxcblx0XHQnQGFuZ3VsYXIvY2xpJzogJzcuMi4yJyxcblx0XHQnQGFuZ3VsYXIvY29tcGlsZXItY2xpJzogJzcuMi4xJyxcblx0XHQnQGFuZ3VsYXIvbGFuZ3VhZ2Utc2VydmljZSc6ICc3LjIuMSdcblx0fTtcblx0bGV0IHZhbGlkID0gdHJ1ZTtcblx0Xy5lYWNoKGRlcHMsIChleHBlY3RWZXIsIG1vZCkgPT4ge1xuXHRcdGNvbnN0IHZlciA9IHJlcXVpcmUobW9kICsgJy9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuXHRcdGlmICghc2VtdmVyLnNhdGlzZmllcyh2ZXIsIGV4cGVjdFZlcikpIHtcblx0XHRcdHZhbGlkID0gZmFsc2U7XG5cdFx0XHRsb2cuZXJyb3IoeWVsbG93KGBJbnN0YWxsZWQgZGVwZW5kZW5jeSBcIiR7bW9kfUBgKSArIHJlZCh2ZXIpICsgeWVsbG93KGBcIiB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQsIGluc3RhbGwgJHtleHBlY3RWZXJ9IGluc3RlYWQuYCkpO1xuXHRcdH1cblx0fSk7XG5cblx0dHJ5IHtcblx0XHRjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy93ZWJwYWNrL3BhY2thZ2UuanNvbicpO1xuXHRcdGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcblx0XHR2YWxpZCA9IGZhbHNlO1xuXHR9IGNhdGNoIChleCkge31cblxuXHRpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQnKSkge1xuXHRcdGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fVxuXHRpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrJykpIHtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2tcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcblx0XHR2YWxpZCA9IGZhbHNlO1xuXHR9XG5cdHRyeSB7XG5cdFx0Y29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGVfbW9kdWxlcy9yeGpzL3BhY2thZ2UuanNvbicpO1xuXHRcdGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcblx0XHR2YWxpZCA9IGZhbHNlO1xuXHR9IGNhdGNoIChleCkge31cblx0cmV0dXJuIHZhbGlkO1xufVxuXG4vLyBmdW5jdGlvbiBwcmludEhlbHAoKSB7XG4vLyBcdC8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8vIFx0Y29uc29sZS5sb2coJ1xcblxcbiAgSWYgeW91IHdhbnQgdG8gbmFycm93IGRvd24gdG8gb25seSBzcGVjaWZpYyBtb2R1bGVzIGZvciBBbmd1bGFyIHRvIGJ1aWxkL3NlcnZlLCB0cnlcXG4gICAgJyArXG4vLyBcdFx0eWVsbG93KCdkcmNwIGluaXQgLS1wcm9wIEBkci1jb3JlL25nLWFwcC1idWlsZGVyLnBhY2thZ2VzPTxwYWNrYWdlTmFtZSwuLi4+JykgKyAnXFxuICAnICtcbi8vIFx0XHQnT3IgdGhyb3VnaCBhIGNvbmZpZ3VyYXRpb24gZmlsZTpcXG4nICtcbi8vIFx0XHR5ZWxsb3coJyAgICBkcmNwIGluaXQgLWMgPG90aGVyIGZpbGVzPiBtb2R1bGVzLnlhbWxcXG4nKSArXG4vLyBcdFx0JyAgbW9kdWxlcy55YW1sOlxcbicgK1xuLy8gXHRcdGN5YW4oJyAgJy5yZXBlYXQoMSkgKyAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXI6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgyKSArICdwYWNrYWdlczpcXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDMpICsgJy0gPHBhY2thZ2VOYW1lIDE+XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAyPlxcbicpXG4vLyBcdCk7XG4vLyB9XG5cbmZ1bmN0aW9uIHdyaXRlVHNjb25maWc0RWRpdG9yKCkge1xuXHRjb25zdCB0c2pzb246IGFueSA9IHtcblx0XHQvLyBleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG5cdFx0ZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSxcblx0XHQvLyBpbmNsdWRlOiB0c0luY2x1ZGUsXG5cdFx0Y29tcGlsZXJPcHRpb25zOiB7XG5cdFx0XHRiYXNlVXJsOiAnLicsXG5cdFx0XHRzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlXG5cdFx0fVxuXHR9O1xuXHQvLyAtLS0tLS0tIFdyaXRlIHRzY29uZmlnLmpzb24gZm9yIFZpc3VhbCBDb2RlIEVkaXRvciAtLS0tLS0tLVxuXG5cdGxldCBzcmNEaXJDb3VudCA9IDA7XG5cdGNvbnN0IHJvb3QgPSBhcGkuY29uZmlnKCkucm9vdFBhdGg7XG5cblx0Y29uc3QgcGFja2FnZVRvUmVhbFBhdGg6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG5cdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJylcblx0LmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcblx0XHRjb25zdCByZWFsRGlyID0gX2ZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG5cdFx0Ly8gUGF0aC5yZWxhdGl2ZShyb290LCByZWFsRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGFja2FnZVRvUmVhbFBhdGgucHVzaChbbmFtZSwgcmVhbERpcl0pO1xuXHR9LCAnc3JjJyk7XG5cblx0Zm9yIChsZXQgcHJvaiBvZiBhcGkuY29uZmlnKCkucHJvamVjdExpc3QpIHtcblx0XHR0c2pzb24uaW5jbHVkZSA9IFtdO1xuXHRcdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2d1bHAvcmVjaXBlTWFuYWdlcicpLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG5cdFx0XHRsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG5cdFx0XHRcdGluY2x1ZGVEaXIgKz0gJy8nO1xuXHRcdFx0dHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcblx0XHRcdHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuXHRcdFx0c3JjRGlyQ291bnQrKztcblx0XHR9KTtcblx0XHRsb2cuaW5mbygnV3JpdGUgdHNjb25maWcuanNvbiB0byAnICsgcHJvaik7XG5cdFx0Y29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblx0XHRmb3IgKGNvbnN0IFtuYW1lLCByZWFsUGF0aF0gb2YgcGFja2FnZVRvUmVhbFBhdGgpIHtcblx0XHRcdGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcblx0XHRcdHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG5cdFx0fVxuXG5cdFx0Y29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgX2ZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcblx0XHRwYXRoTWFwcGluZ1snKiddID0gWydub2RlX21vZHVsZXMvKicsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXTtcblxuXHRcdHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG5cdFx0XHRiYXNlVXJsOiByb290LFxuXHRcdFx0cGF0aHM6IHBhdGhNYXBwaW5nLFxuXHRcdFx0dHlwZVJvb3RzOiBbXG5cdFx0XHRcdFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuXHRcdFx0XHRQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcblx0XHRcdF0sXG5cdFx0XHRub0ltcGxpY2l0QW55OiB0cnVlLFxuXHRcdFx0dGFyZ2V0OiAnZXMyMDE1Jyxcblx0XHRcdG1vZHVsZTogJ2NvbW1vbmpzJ1xuXHRcdH07XG5cdFx0X2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuXHR9XG5cblxuXHRpZiAoc3JjRGlyQ291bnQgPiAwKSB7XG5cdFx0bG9nLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoJ1RvIGJlIGZyaWVuZGx5IHRvIHlvdXIgZWRpdG9yLCB3ZSBqdXN0IGFkZGVkIHRzY29uZmlnLmpzb24gZmlsZSB0byBlYWNoIG9mIHlvdXIgcHJvamVjdCBkaXJlY3RvcmllcyxcXG4nICtcblx0XHQnQnV0IHBsZWFzZSBhZGQgXCJ0c2NvbmZpZy5qc29uXCIgdG8geW91ciAuZ2l0aW5nb3JlIGZpbGUsXFxuJyArXG5cdFx0J3NpbmNlIHRoZXNlIHRzY29uZmlnLmpzb24gYXJlIGdlbmVyYXRlZCBiYXNlZCBvbiB5b3VyIGxvY2FsIHdvcmtzcGFjZSBsb2NhdGlvbi4nKSk7XG5cdH1cbn1cblxuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFcbiAqL1xuZnVuY3Rpb24gaGFja0ZpeFdhdGNocGFjaygpIHtcblx0Y29uc3Qgd2F0Y2hwYWNrUGF0aCA9IFsnd2VicGFjay9ub2RlX21vZHVsZXMvd2F0Y2hwYWNrJywgJ3dhdGNocGFjayddLmZpbmQocGF0aCA9PiB7XG5cdFx0cmV0dXJuIF9mcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyBwYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpKTtcblx0fSk7XG5cdGlmICghd2F0Y2hwYWNrUGF0aCkge1xuXHRcdGxvZy53YXJuKCdDYW4gbm90IGZpbmQgd2F0Y2hwYWNrLCBwbGVhc2UgbWFrZSBzdXJlIFdlYnBhY2sgaXMgaW5zdGFsbGVkLicpO1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgd2F0Y2hwYWNrUGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKTtcblx0aWYgKF9mcy5leGlzdHNTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnKSlcblx0XHRyZXR1cm47XG5cdGxvZy5pbmZvKGBoYWNraW5nICR7dGFyZ2V0fVxcblxcdCB0byB3b3JrYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxYCk7XG5cdF9mcy5yZW5hbWVTeW5jKHRhcmdldCwgdGFyZ2V0ICsgJy5kcmNwLWJhaycpO1xuXHRfZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsXG5cdFx0X2ZzLnJlYWRGaWxlU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJywgJ3V0ZjgnKS5yZXBsYWNlKC9cXFdmb2xsb3dTeW1saW5rczpcXHNmYWxzZS9nLCAnZm9sbG93U3ltbGlua3M6IHRydWUnKSwgJ3V0ZjgnKTtcbn1cbiJdfQ==
