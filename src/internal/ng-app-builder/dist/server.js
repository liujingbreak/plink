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
        extends: null,
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
        tsjson.extends = Path.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json')).replace(/\\/g, '/'),
            require('dr-comp-package/wfh/dist/recipe-manager').eachRecipeSrc(proj, (srcDir) => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUF3QjtBQUN4QixpREFBMkI7QUFDM0IsdURBQWlDO0FBQ2pDLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQWdDO0FBRWhDLDhFQUFtRDtBQUduRCwwREFBeUQ7QUFDekQsMkNBQXlDO0FBRXpDLHlEQUErQjtBQUMvQixzREFBNEI7QUFDNUIsMkRBQWlDO0FBR2pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUV2QyxrQ0FBa0M7QUFDbEMseUVBQXlFO0FBQ3pFLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLFNBQWdCLE9BQU87SUFDdEIsc0NBQXNDO0lBQ3RDLDZEQUE2RDtJQUM3RCxrREFBa0Q7SUFDbEQsOERBQThEO0lBQzlELHlHQUF5RztJQUN6RywyREFBMkQ7SUFDM0Qsc0JBQXNCO0lBQ3RCLDJGQUEyRjtJQUMzRixNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLE9BQU87SUFDUCxJQUFJO0lBQ0osT0FBTyxxQkFBcUIsRUFBRSxDQUFDO0FBQ2hDLENBQUM7QUFkRCwwQkFjQztBQUVVLFFBQUEsU0FBUyxHQUFjLGNBQWMsQ0FBQztBQUNqRCxTQUFTLGNBQWMsQ0FBQyxHQUFrQjtJQUN6QyxPQUFPLEVBQUUsQ0FBQztJQUNWLDZEQUE2RDtJQUM3RCwrQ0FBK0M7SUFDL0MsY0FBYztJQUVkLG1DQUFtQztJQUNuQyxxQ0FBcUM7SUFDckMsMENBQTBDO0lBQzFDLDBFQUEwRTtJQUMxRSx5Q0FBeUM7SUFDekMsb0NBQW9DO0lBQ3BDLCtEQUErRDtJQUMvRCxv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RztBQUNILFNBQVMsZ0JBQWdCO0lBQ3hCLE1BQU0sYUFBYSxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2pGLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLGdFQUFnRSxDQUFDLENBQUM7UUFDM0UsT0FBTztLQUNQO0lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7SUFDMUYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFDdkMsT0FBTztJQUNSLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLDBFQUEwRSxDQUFDLENBQUM7SUFDdEcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzdDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUN2QixHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDdkgsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtBbmd1bGFyQ2xpUGFyYW19IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBjaGFuZ2VXZWJwYWNrQ29uZmlnIGZyb20gJy4vY29uZmlnLXdlYnBhY2snO1xuaW1wb3J0IHtUc0hhbmRsZXIsIFJlcGxhY2VtZW50SW5mfSBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCB7bmdSb3V0ZXJQYXRofSBmcm9tICcuL2FwaS1zaGFyZSc7XG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZ3VyYWJsZSc7XG5leHBvcnQgKiBmcm9tICcuL25nLXByZXJlbmRlcic7XG5leHBvcnQgKiBmcm9tICcuL25nL2NvbW1vbic7XG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy13ZWJwYWNrJztcbmV4cG9ydCB7QW5ndWxhckNvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuLy8gY29uc3Qgc3lzRnMgPSBmcyBhcyB0eXBlb2YgX2ZzICYge21rZGlyc1N5bmM6IChmaWxlOiBzdHJpbmcpID0+IHZvaWR9O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcblx0Ly8gY29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcblx0Ly8gY29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuXHQvLyBpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcykge1xuXHQvLyBcdGNvbnN0IGZtID0gYXBpLmJyb3dzZXJJbmplY3Rvci5mcm9tRGlyKFBhdGgucmVzb2x2ZSgnLycpKTtcblx0Ly8gXHRmbS5hbGlhcygvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZywgcmVnczogUmVnRXhwRXhlY0FycmF5KTogc3RyaW5nID0+IHtcblx0Ly8gXHRcdGNvbnN0IHBrSW5zdGFuY2UgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW3JlZ3NbMV1dO1xuXHQvLyBcdFx0aWYgKHBrSW5zdGFuY2UpIHtcblx0Ly8gXHRcdFx0cmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdCwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ3NbMl07XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXR1cm4gcmVnc1swXTtcblx0Ly8gXHR9KTtcblx0Ly8gfVxuXHRyZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuXHRyZXR1cm4gW107XG5cdC8vIGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcblx0Ly8gaWYgKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcylcblx0Ly8gXHRyZXR1cm4gW107XG5cblx0Ly8gY29uc3Qgc2VsID0gbmV3IFRzU2VsZWN0b3Ioc3JjKTtcblx0Ly8gY29uc3QgcmVwbDogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXHQvLyBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoc3JjLmZpbGVOYW1lKTtcblx0Ly8gZm9yIChjb25zdCBhc3Qgb2Ygc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykpIHtcblx0Ly8gXHRjb25zdCBmcm9tID0gYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWw7XG5cdC8vIFx0Ly8gbG9nLmluZm8oJ2Zyb20gJywgZnJvbS50ZXh0KTtcblx0Ly8gXHRjb25zdCByZWcgPSAvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLmV4ZWMoZnJvbS50ZXh0KTtcblx0Ly8gXHRpZiAocmVnID09IG51bGwpXG5cdC8vIFx0XHRjb250aW51ZTtcblx0Ly8gXHRjb25zdCBwa0luc3RhbmNlID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtyZWdbMV1dO1xuXHQvLyBcdGlmIChwa0luc3RhbmNlICYmIHBrSW5zdGFuY2UuZHIpIHtcblx0Ly8gXHRcdGxldCByZXNvbHZlZEZyb20gPSBQYXRoLnJlbGF0aXZlKGRpciwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ1syXTtcblx0Ly8gXHRcdGlmIChyZXNvbHZlZEZyb20uc3RhcnRzV2l0aCgnbm9kZV9tb2R1bGVzLycpKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9IHJlc29sdmVkRnJvbS5zbGljZSgnbm9kZV9tb2R1bGVzLycubGVuZ3RoKTtcblx0Ly8gXHRcdH0gZWxzZSBpZiAoL15bXi4vXS8udGVzdChyZXNvbHZlZEZyb20pKSB7XG5cdC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9ICcuLycgKyByZXNvbHZlZEZyb207XG5cdC8vIFx0XHR9XG5cdC8vIFx0XHRyZXBsLnB1c2goe3RleHQ6IGAnJHtyZXNvbHZlZEZyb219J2AsIHN0YXJ0OiBmcm9tLmdldFN0YXJ0KHNyYyksIGVuZDogZnJvbS5nZXRFbmQoKX0pO1xuXHQvLyBcdH1cblx0Ly8gfVxuXHQvLyByZXR1cm4gcmVwbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdC8vIHByaW50SGVscCgpO1xuXHRpZiAoX2ZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKSkge1xuXHRcdF9mcy5yZW1vdmVTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJyk7XG5cdH1cblx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyB3YWl0IGZvciBkZWxldGVcblx0aWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcblx0Ly8gd3JpdGVUc2NvbmZpZygpO1xuXHRoYWNrRml4V2F0Y2hwYWNrKCk7XG5cdHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCkge1xuXHRjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG5cdGlmICghbmdQYXJhbSB8fCBhcGkubmdFbnRyeUNvbXBvbmVudClcblx0XHRyZXR1cm47XG5cdC8vIGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdC8vIFx0dGhyb3cgbmV3IEVycm9yKCdJbiBvcmRlciB0byBnZXQgRFJDUCBidWlsZGVyIHdvcmssXFxcblx0Ly8gXHR5b3UgbXVzdCBzZXQgcHJvcGVydHkgYHByZXNlcnZlU3ltbGlua3NgIHRvIGJlIHRydWUgaW4gcHJvamVjdFxcJ3MgYW5ndWxhci5qc29uIGZpbGUgXFxcblx0Ly8gXHQnKTtcblx0Ly8gfVxuXHRjb25zdCB3ZWJwYWNrQ29uZmlnID0gbmdQYXJhbS53ZWJwYWNrQ29uZmlnO1xuXHRjb25zdCBuZ0VudHJ5Q29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKFBhdGgucmVzb2x2ZShuZ1BhcmFtLnByb2plY3RSb290KSk7XG5cdGNvbnN0IGRlcGxveVVybCA9IHdlYnBhY2tDb25maWcub3V0cHV0LnB1YmxpY1BhdGggfHwgYXBpLmNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKTtcblxuXHRjb25zdCBwdWJsaWNVcmxPYmogPSBVcmwucGFyc2UoZGVwbG95VXJsKTtcblx0T2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuXHRcdHdlYnBhY2tDb25maWcsXG5cdFx0bmdFbnRyeUNvbXBvbmVudCxcblx0XHRkZXBsb3lVcmwsXG5cdFx0c3NyOiBuZ1BhcmFtLnNzcixcblx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuXHRcdG5nUm91dGVyUGF0aCxcblx0XHRzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcblx0XHRcdGlmIChuZ1BhcmFtLnNzcilcblx0XHRcdFx0cmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuXHRcdH1cblx0fSk7XG5cdGF3YWl0IGNoYW5nZVdlYnBhY2tDb25maWcobmdQYXJhbSwgd2VicGFja0NvbmZpZywgYXBpLmNvbmZpZygpKTtcblxuXHQvLyBuZ1BhcmFtLnZmc0hvc3QuaG9va1JlYWQgPSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuXHRsb2cuaW5mbygnU2V0dXAgYXBpIG9iamVjdCBmb3IgQW5ndWxhcicpO1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuXHRjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG5cdFx0J0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJzAuMTIuMicsXG5cdFx0J0Bhbmd1bGFyL2NsaSc6ICc3LjIuMicsXG5cdFx0J0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICc3LjIuMScsXG5cdFx0J0Bhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2UnOiAnNy4yLjEnXG5cdH07XG5cdGxldCB2YWxpZCA9IHRydWU7XG5cdF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcblx0XHRjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcblx0XHRpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG5cdFx0XHR2YWxpZCA9IGZhbHNlO1xuXHRcdFx0bG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcblx0XHR9XG5cdH0pO1xuXG5cdHRyeSB7XG5cdFx0Y29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fSBjYXRjaCAoZXgpIHt9XG5cblx0aWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuXHRcdHZhbGlkID0gZmFsc2U7XG5cdH1cblx0aWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG5cdFx0bG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fVxuXHR0cnkge1xuXHRcdGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcblx0XHRsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG5cdFx0dmFsaWQgPSBmYWxzZTtcblx0fSBjYXRjaCAoZXgpIHt9XG5cdHJldHVybiB2YWxpZDtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuLy8gXHQvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBcdGNvbnNvbGUubG9nKCdcXG5cXG4gIElmIHlvdSB3YW50IHRvIG5hcnJvdyBkb3duIHRvIG9ubHkgc3BlY2lmaWMgbW9kdWxlcyBmb3IgQW5ndWxhciB0byBidWlsZC9zZXJ2ZSwgdHJ5XFxuICAgICcgK1xuLy8gXHRcdHllbGxvdygnZHJjcCBpbml0IC0tcHJvcCBAZHItY29yZS9uZy1hcHAtYnVpbGRlci5wYWNrYWdlcz08cGFja2FnZU5hbWUsLi4uPicpICsgJ1xcbiAgJyArXG4vLyBcdFx0J09yIHRocm91Z2ggYSBjb25maWd1cmF0aW9uIGZpbGU6XFxuJyArXG4vLyBcdFx0eWVsbG93KCcgICAgZHJjcCBpbml0IC1jIDxvdGhlciBmaWxlcz4gbW9kdWxlcy55YW1sXFxuJykgK1xuLy8gXHRcdCcgIG1vZHVsZXMueWFtbDpcXG4nICtcbi8vIFx0XHRjeWFuKCcgICcucmVwZWF0KDEpICsgJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMikgKyAncGFja2FnZXM6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAxPlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMj5cXG4nKVxuLy8gXHQpO1xuLy8gfVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNEVkaXRvcigpIHtcblx0Y29uc3QgdHNqc29uOiBhbnkgPSB7XG5cdFx0ZXh0ZW5kczogbnVsbCxcblx0XHRjb21waWxlck9wdGlvbnM6IHtcblx0XHRcdGJhc2VVcmw6ICcuJyxcblx0XHRcdHN0cmljdE51bGxDaGVja3M6IHRydWVcblx0XHR9XG5cdH07XG5cdC8vIC0tLS0tLS0gV3JpdGUgdHNjb25maWcuanNvbiBmb3IgVmlzdWFsIENvZGUgRWRpdG9yIC0tLS0tLS0tXG5cblx0bGV0IHNyY0RpckNvdW50ID0gMDtcblx0Y29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcblxuXHRjb25zdCBwYWNrYWdlVG9SZWFsUGF0aDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcblx0cmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKVxuXHQuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuXHRcdGNvbnN0IHJlYWxEaXIgPSBfZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcblx0XHQvLyBQYXRoLnJlbGF0aXZlKHJvb3QsIHJlYWxEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRwYWNrYWdlVG9SZWFsUGF0aC5wdXNoKFtuYW1lLCByZWFsRGlyXSk7XG5cdH0sICdzcmMnKTtcblxuXHRmb3IgKGxldCBwcm9qIG9mIGFwaS5jb25maWcoKS5wcm9qZWN0TGlzdCkge1xuXHRcdHRzanNvbi5pbmNsdWRlID0gW107XG5cdFx0dHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcblx0XHRyZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInKS5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuXHRcdFx0bGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0aWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuXHRcdFx0XHRpbmNsdWRlRGlyICs9ICcvJztcblx0XHRcdHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG5cdFx0XHR0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcblx0XHRcdHNyY0RpckNvdW50Kys7XG5cdFx0fSk7XG5cdFx0bG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuXHRcdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cdFx0Zm9yIChjb25zdCBbbmFtZSwgcmVhbFBhdGhdIG9mIHBhY2thZ2VUb1JlYWxQYXRoKSB7XG5cdFx0XHRjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0cGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG5cdFx0XHRwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cblx0XHR0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuXHRcdFx0YmFzZVVybDogcm9vdCxcblx0XHRcdHBhdGhzOiBwYXRoTWFwcGluZyxcblx0XHRcdHR5cGVSb290czogW1xuXHRcdFx0XHRQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG5cdFx0XHRcdFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG5cdFx0XHRdLFxuXHRcdFx0bm9JbXBsaWNpdEFueTogdHJ1ZSxcblx0XHRcdHRhcmdldDogJ2VzMjAxNScsXG5cdFx0XHRtb2R1bGU6ICdjb21tb25qcydcblx0XHR9O1xuXHRcdF9mcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcblx0fVxuXG5cblx0aWYgKHNyY0RpckNvdW50ID4gMCkge1xuXHRcdGxvZy5pbmZvKCdcXG4nICsgYm94U3RyaW5nKCdUbyBiZSBmcmllbmRseSB0byB5b3VyIGVkaXRvciwgd2UganVzdCBhZGRlZCB0c2NvbmZpZy5qc29uIGZpbGUgdG8gZWFjaCBvZiB5b3VyIHByb2plY3QgZGlyZWN0b3JpZXMsXFxuJyArXG5cdFx0J0J1dCBwbGVhc2UgYWRkIFwidHNjb25maWcuanNvblwiIHRvIHlvdXIgLmdpdGluZ29yZSBmaWxlLFxcbicgK1xuXHRcdCdzaW5jZSB0aGVzZSB0c2NvbmZpZy5qc29uIGFyZSBnZW5lcmF0ZWQgYmFzZWQgb24geW91ciBsb2NhbCB3b3Jrc3BhY2UgbG9jYXRpb24uJykpO1xuXHR9XG59XG5cblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxXG4gKi9cbmZ1bmN0aW9uIGhhY2tGaXhXYXRjaHBhY2soKSB7XG5cdGNvbnN0IHdhdGNocGFja1BhdGggPSBbJ3dlYnBhY2svbm9kZV9tb2R1bGVzL3dhdGNocGFjaycsICd3YXRjaHBhY2snXS5maW5kKHBhdGggPT4ge1xuXHRcdHJldHVybiBfZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgcGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKSk7XG5cdH0pO1xuXHRpZiAoIXdhdGNocGFja1BhdGgpIHtcblx0XHRsb2cud2FybignQ2FuIG5vdCBmaW5kIHdhdGNocGFjaywgcGxlYXNlIG1ha2Ugc3VyZSBXZWJwYWNrIGlzIGluc3RhbGxlZC4nKTtcblx0XHRyZXR1cm47XG5cdH1cblx0Y29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHdhdGNocGFja1BhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJyk7XG5cdGlmIChfZnMuZXhpc3RzU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJykpXG5cdFx0cmV0dXJuO1xuXHRsb2cuaW5mbyhgaGFja2luZyAke3RhcmdldH1cXG5cXHQgdG8gd29ya2Fyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MWApO1xuXHRfZnMucmVuYW1lU3luYyh0YXJnZXQsIHRhcmdldCArICcuZHJjcC1iYWsnKTtcblx0X2ZzLndyaXRlRmlsZVN5bmModGFyZ2V0LFxuXHRcdF9mcy5yZWFkRmlsZVN5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycsICd1dGY4JykucmVwbGFjZSgvXFxXZm9sbG93U3ltbGlua3M6XFxzZmFsc2UvZywgJ2ZvbGxvd1N5bWxpbmtzOiB0cnVlJyksICd1dGY4Jyk7XG59XG4iXX0=
