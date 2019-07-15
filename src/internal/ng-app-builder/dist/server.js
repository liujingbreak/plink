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
const api_share_1 = require("../isom/api-share");
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
        tsjson.extends = Path.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json'));
        if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
            tsjson.extends = './' + tsjson.extends;
        }
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
            strictNullChecks: true,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUF3QjtBQUN4QixpREFBMkI7QUFDM0IsdURBQWlDO0FBQ2pDLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQWdDO0FBRWhDLDhFQUFtRDtBQUduRCwwREFBeUQ7QUFDekQsaURBQStDO0FBRS9DLHlEQUErQjtBQUMvQixzREFBNEI7QUFDNUIsMkRBQWlDO0FBR2pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUV2QyxrQ0FBa0M7QUFDbEMseUVBQXlFO0FBQ3pFLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLFNBQWdCLE9BQU87SUFDckIsc0NBQXNDO0lBQ3RDLDZEQUE2RDtJQUM3RCxrREFBa0Q7SUFDbEQsOERBQThEO0lBQzlELHlHQUF5RztJQUN6RywyREFBMkQ7SUFDM0Qsc0JBQXNCO0lBQ3RCLDJGQUEyRjtJQUMzRixNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLE9BQU87SUFDUCxJQUFJO0lBQ0osT0FBTyxxQkFBcUIsRUFBRSxDQUFDO0FBQ2pDLENBQUM7QUFkRCwwQkFjQztBQUVVLFFBQUEsU0FBUyxHQUFjLGNBQWMsQ0FBQztBQUNqRCxTQUFTLGNBQWMsQ0FBQyxHQUFrQjtJQUN4QyxPQUFPLEVBQUUsQ0FBQztJQUNWLDZEQUE2RDtJQUM3RCwrQ0FBK0M7SUFDL0MsY0FBYztJQUVkLG1DQUFtQztJQUNuQyxxQ0FBcUM7SUFDckMsMENBQTBDO0lBQzFDLDBFQUEwRTtJQUMxRSx5Q0FBeUM7SUFDekMsb0NBQW9DO0lBQ3BDLCtEQUErRDtJQUMvRCxv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ZXIvZGlzdC9zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtBbmd1bGFyQ2xpUGFyYW19IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBjaGFuZ2VXZWJwYWNrQ29uZmlnIGZyb20gJy4vY29uZmlnLXdlYnBhY2snO1xuaW1wb3J0IHtUc0hhbmRsZXIsIFJlcGxhY2VtZW50SW5mfSBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCB7bmdSb3V0ZXJQYXRofSBmcm9tICcuLi9pc29tL2FwaS1zaGFyZSc7XG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZ3VyYWJsZSc7XG5leHBvcnQgKiBmcm9tICcuL25nLXByZXJlbmRlcic7XG5leHBvcnQgKiBmcm9tICcuL25nL2NvbW1vbic7XG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy13ZWJwYWNrJztcbmV4cG9ydCB7QW5ndWxhckNvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuLy8gY29uc3Qgc3lzRnMgPSBmcyBhcyB0eXBlb2YgX2ZzICYge21rZGlyc1N5bmM6IChmaWxlOiBzdHJpbmcpID0+IHZvaWR9O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcbiAgLy8gY29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcbiAgLy8gY29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuICAvLyBpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcykge1xuICAvLyBcdGNvbnN0IGZtID0gYXBpLmJyb3dzZXJJbmplY3Rvci5mcm9tRGlyKFBhdGgucmVzb2x2ZSgnLycpKTtcbiAgLy8gXHRmbS5hbGlhcygvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZywgcmVnczogUmVnRXhwRXhlY0FycmF5KTogc3RyaW5nID0+IHtcbiAgLy8gXHRcdGNvbnN0IHBrSW5zdGFuY2UgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW3JlZ3NbMV1dO1xuICAvLyBcdFx0aWYgKHBrSW5zdGFuY2UpIHtcbiAgLy8gXHRcdFx0cmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdCwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ3NbMl07XG4gIC8vIFx0XHR9XG4gIC8vIFx0XHRyZXR1cm4gcmVnc1swXTtcbiAgLy8gXHR9KTtcbiAgLy8gfVxuICByZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuICByZXR1cm4gW107XG4gIC8vIGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcbiAgLy8gaWYgKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcylcbiAgLy8gXHRyZXR1cm4gW107XG5cbiAgLy8gY29uc3Qgc2VsID0gbmV3IFRzU2VsZWN0b3Ioc3JjKTtcbiAgLy8gY29uc3QgcmVwbDogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICAvLyBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoc3JjLmZpbGVOYW1lKTtcbiAgLy8gZm9yIChjb25zdCBhc3Qgb2Ygc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyJykpIHtcbiAgLy8gXHRjb25zdCBmcm9tID0gYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWw7XG4gIC8vIFx0Ly8gbG9nLmluZm8oJ2Zyb20gJywgZnJvbS50ZXh0KTtcbiAgLy8gXHRjb25zdCByZWcgPSAvXigoPzpAW14vXStcXC8pP1teLi9dKykoLio/KSQvLmV4ZWMoZnJvbS50ZXh0KTtcbiAgLy8gXHRpZiAocmVnID09IG51bGwpXG4gIC8vIFx0XHRjb250aW51ZTtcbiAgLy8gXHRjb25zdCBwa0luc3RhbmNlID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtyZWdbMV1dO1xuICAvLyBcdGlmIChwa0luc3RhbmNlICYmIHBrSW5zdGFuY2UuZHIpIHtcbiAgLy8gXHRcdGxldCByZXNvbHZlZEZyb20gPSBQYXRoLnJlbGF0aXZlKGRpciwgcGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlZ1syXTtcbiAgLy8gXHRcdGlmIChyZXNvbHZlZEZyb20uc3RhcnRzV2l0aCgnbm9kZV9tb2R1bGVzLycpKSB7XG4gIC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9IHJlc29sdmVkRnJvbS5zbGljZSgnbm9kZV9tb2R1bGVzLycubGVuZ3RoKTtcbiAgLy8gXHRcdH0gZWxzZSBpZiAoL15bXi4vXS8udGVzdChyZXNvbHZlZEZyb20pKSB7XG4gIC8vIFx0XHRcdHJlc29sdmVkRnJvbSA9ICcuLycgKyByZXNvbHZlZEZyb207XG4gIC8vIFx0XHR9XG4gIC8vIFx0XHRyZXBsLnB1c2goe3RleHQ6IGAnJHtyZXNvbHZlZEZyb219J2AsIHN0YXJ0OiBmcm9tLmdldFN0YXJ0KHNyYyksIGVuZDogZnJvbS5nZXRFbmQoKX0pO1xuICAvLyBcdH1cbiAgLy8gfVxuICAvLyByZXR1cm4gcmVwbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gIC8vIHByaW50SGVscCgpO1xuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKSkge1xuICAgIF9mcy5yZW1vdmVTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJyk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyB3YWl0IGZvciBkZWxldGVcbiAgaWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcbiAgLy8gd3JpdGVUc2NvbmZpZygpO1xuICBoYWNrRml4V2F0Y2hwYWNrKCk7XG4gIHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCkge1xuICBjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG4gIGlmICghbmdQYXJhbSB8fCBhcGkubmdFbnRyeUNvbXBvbmVudClcbiAgICByZXR1cm47XG4gIC8vIGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gIC8vIFx0dGhyb3cgbmV3IEVycm9yKCdJbiBvcmRlciB0byBnZXQgRFJDUCBidWlsZGVyIHdvcmssXFxcbiAgLy8gXHR5b3UgbXVzdCBzZXQgcHJvcGVydHkgYHByZXNlcnZlU3ltbGlua3NgIHRvIGJlIHRydWUgaW4gcHJvamVjdFxcJ3MgYW5ndWxhci5qc29uIGZpbGUgXFxcbiAgLy8gXHQnKTtcbiAgLy8gfVxuICBjb25zdCB3ZWJwYWNrQ29uZmlnID0gbmdQYXJhbS53ZWJwYWNrQ29uZmlnO1xuICBjb25zdCBuZ0VudHJ5Q29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKFBhdGgucmVzb2x2ZShuZ1BhcmFtLnByb2plY3RSb290KSk7XG4gIGNvbnN0IGRlcGxveVVybCA9IHdlYnBhY2tDb25maWcub3V0cHV0LnB1YmxpY1BhdGggfHwgYXBpLmNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKTtcblxuICBjb25zdCBwdWJsaWNVcmxPYmogPSBVcmwucGFyc2UoZGVwbG95VXJsKTtcbiAgT2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuICAgIHdlYnBhY2tDb25maWcsXG4gICAgbmdFbnRyeUNvbXBvbmVudCxcbiAgICBkZXBsb3lVcmwsXG4gICAgc3NyOiBuZ1BhcmFtLnNzcixcbiAgICBuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuICAgIG5nUm91dGVyUGF0aCxcbiAgICBzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcbiAgICAgIGlmIChuZ1BhcmFtLnNzcilcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGNoYW5nZVdlYnBhY2tDb25maWcobmdQYXJhbSwgd2VicGFja0NvbmZpZywgYXBpLmNvbmZpZygpKTtcblxuICAvLyBuZ1BhcmFtLnZmc0hvc3QuaG9va1JlYWQgPSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuICBsb2cuaW5mbygnU2V0dXAgYXBpIG9iamVjdCBmb3IgQW5ndWxhcicpO1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuICBjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJzAuMTIuMicsXG4gICAgJ0Bhbmd1bGFyL2NsaSc6ICc3LjIuMicsXG4gICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICc3LjIuMScsXG4gICAgJ0Bhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2UnOiAnNy4yLjEnXG4gIH07XG4gIGxldCB2YWxpZCA9IHRydWU7XG4gIF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcbiAgICBjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG4gICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgbG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG5cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuLy8gXHQvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBcdGNvbnNvbGUubG9nKCdcXG5cXG4gIElmIHlvdSB3YW50IHRvIG5hcnJvdyBkb3duIHRvIG9ubHkgc3BlY2lmaWMgbW9kdWxlcyBmb3IgQW5ndWxhciB0byBidWlsZC9zZXJ2ZSwgdHJ5XFxuICAgICcgK1xuLy8gXHRcdHllbGxvdygnZHJjcCBpbml0IC0tcHJvcCBAZHItY29yZS9uZy1hcHAtYnVpbGRlci5wYWNrYWdlcz08cGFja2FnZU5hbWUsLi4uPicpICsgJ1xcbiAgJyArXG4vLyBcdFx0J09yIHRocm91Z2ggYSBjb25maWd1cmF0aW9uIGZpbGU6XFxuJyArXG4vLyBcdFx0eWVsbG93KCcgICAgZHJjcCBpbml0IC1jIDxvdGhlciBmaWxlcz4gbW9kdWxlcy55YW1sXFxuJykgK1xuLy8gXHRcdCcgIG1vZHVsZXMueWFtbDpcXG4nICtcbi8vIFx0XHRjeWFuKCcgICcucmVwZWF0KDEpICsgJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMikgKyAncGFja2FnZXM6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAxPlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMj5cXG4nKVxuLy8gXHQpO1xuLy8gfVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNEVkaXRvcigpIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgLy8gaW5jbHVkZTogdHNJbmNsdWRlLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgYmFzZVVybDogJy4nLFxuICAgICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZVxuICAgIH1cbiAgfTtcbiAgLy8gLS0tLS0tLSBXcml0ZSB0c2NvbmZpZy5qc29uIGZvciBWaXN1YWwgQ29kZSBFZGl0b3IgLS0tLS0tLS1cblxuICBsZXQgc3JjRGlyQ291bnQgPSAwO1xuICBjb25zdCByb290ID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuXG4gIGNvbnN0IHBhY2thZ2VUb1JlYWxQYXRoOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuICByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpXG4gIC5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcmVhbERpciA9IF9mcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICAgIC8vIFBhdGgucmVsYXRpdmUocm9vdCwgcmVhbERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhY2thZ2VUb1JlYWxQYXRoLnB1c2goW25hbWUsIHJlYWxEaXJdKTtcbiAgfSwgJ3NyYycpO1xuXG4gIGZvciAobGV0IHByb2ogb2YgYXBpLmNvbmZpZygpLnByb2plY3RMaXN0KSB7XG4gICAgdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSk7XG4gICAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgICByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInKS5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICAgIHNyY0RpckNvdW50Kys7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuICAgIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gICAgZm9yIChjb25zdCBbbmFtZSwgcmVhbFBhdGhdIG9mIHBhY2thZ2VUb1JlYWxQYXRoKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cblxuICAgIGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gICAgcGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cbiAgICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgICAgYmFzZVVybDogcm9vdCxcbiAgICAgIHBhdGhzOiBwYXRoTWFwcGluZyxcbiAgICAgIHR5cGVSb290czogW1xuICAgICAgICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgICAgUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAgIFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG4gICAgICBdLFxuICAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgICAgbW9kdWxlOiAnY29tbW9uanMnXG4gICAgfTtcbiAgICBfZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gIH1cblxuXG4gIGlmIChzcmNEaXJDb3VudCA+IDApIHtcbiAgICBsb2cuaW5mbygnXFxuJyArIGJveFN0cmluZygnVG8gYmUgZnJpZW5kbHkgdG8geW91ciBlZGl0b3IsIHdlIGp1c3QgYWRkZWQgdHNjb25maWcuanNvbiBmaWxlIHRvIGVhY2ggb2YgeW91ciBwcm9qZWN0IGRpcmVjdG9yaWVzLFxcbicgK1xuICAgICdCdXQgcGxlYXNlIGFkZCBcInRzY29uZmlnLmpzb25cIiB0byB5b3VyIC5naXRpbmdvcmUgZmlsZSxcXG4nICtcbiAgICAnc2luY2UgdGhlc2UgdHNjb25maWcuanNvbiBhcmUgZ2VuZXJhdGVkIGJhc2VkIG9uIHlvdXIgbG9jYWwgd29ya3NwYWNlIGxvY2F0aW9uLicpKTtcbiAgfVxufVxuXG5cbi8qKlxuICogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MVxuICovXG5mdW5jdGlvbiBoYWNrRml4V2F0Y2hwYWNrKCkge1xuICBjb25zdCB3YXRjaHBhY2tQYXRoID0gWyd3ZWJwYWNrL25vZGVfbW9kdWxlcy93YXRjaHBhY2snLCAnd2F0Y2hwYWNrJ10uZmluZChwYXRoID0+IHtcbiAgICByZXR1cm4gX2ZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHBhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJykpO1xuICB9KTtcbiAgaWYgKCF3YXRjaHBhY2tQYXRoKSB7XG4gICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCB3YXRjaHBhY2ssIHBsZWFzZSBtYWtlIHN1cmUgV2VicGFjayBpcyBpbnN0YWxsZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyB3YXRjaHBhY2tQYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpO1xuICBpZiAoX2ZzLmV4aXN0c1N5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycpKVxuICAgIHJldHVybjtcbiAgbG9nLmluZm8oYGhhY2tpbmcgJHt0YXJnZXR9XFxuXFx0IHRvIHdvcmthcm91bmQgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFgKTtcbiAgX2ZzLnJlbmFtZVN5bmModGFyZ2V0LCB0YXJnZXQgKyAnLmRyY3AtYmFrJyk7XG4gIF9mcy53cml0ZUZpbGVTeW5jKHRhcmdldCxcbiAgICBfZnMucmVhZEZpbGVTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnLCAndXRmOCcpLnJlcGxhY2UoL1xcV2ZvbGxvd1N5bWxpbmtzOlxcc2ZhbHNlL2csICdmb2xsb3dTeW1saW5rczogdHJ1ZScpLCAndXRmOCcpO1xufVxuIl19
