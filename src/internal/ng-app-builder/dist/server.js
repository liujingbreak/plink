"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const utils_1 = require("dr-comp-package/wfh/dist/utils");
const _fs = tslib_1.__importStar(require("fs-extra"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const Path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const { parse } = require('comment-json');
tslib_1.__exportStar(require("./config-webpack"), exports);
tslib_1.__exportStar(require("./ng-prerender"), exports);
tslib_1.__exportStar(require("./ng/common"), exports);
const semver = require('semver');
const { red, yellow } = require('chalk');
// const fs = require('fs-extra');
// const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(__api_1.default.packageName);
function compile() {
    // return setupApiForAngularCli();
}
exports.compile = compile;
exports.tsHandler = resolveImports;
function resolveImports(src) {
    return [];
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
// async function setupApiForAngularCli() {
// 	const ngParam: AngularCliParam = api.config()._angularCli;
// 	if (!ngParam || api.ngEntryComponent)
// 		return;
// 	const deployUrl = webpackConfig.output.publicPath || api.config.get('publicPath');
// 	const publicUrlObj = Url.parse(deployUrl);
// 	Object.assign(Object.getPrototypeOf(api), {
// 		deployUrl,
// 		ssr: ngParam.ssr,
// 		ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
// 		ngRouterPath,
// 		ssrRequire(requirePath: string) {
// 			if (ngParam.ssr)
// 				return require(Path.join(this.__dirname, requirePath));
// 		}
// 	});
// 	await changeWebpackConfig(ngParam, webpackConfig, api.config());
// 	log.info('Setup api object for Angular');
// }
function checkAngularVersion() {
    const deps = {
        '@angular-devkit/build-angular': '~0.800.2',
        '@angular/cli': '~8.0.2',
        '@angular/compiler-cli': '~8.0.0',
        '@angular/language-service': '~8.0.0'
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
        extends: null
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
    const recipeManager = require('dr-comp-package/wfh/dist/recipe-manager');
    for (let proj of __api_1.default.config().projectList) {
        tsjson.include = [];
        tsjson.extends = Path.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json'));
        if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
            tsjson.extends = './' + tsjson.extends;
        }
        tsjson.extends = tsjson.extends.replace(/\\/g, '/');
        recipeManager.eachRecipeSrc(proj, (srcDir) => {
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
            rootDir: './',
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
        const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
        if (_fs.existsSync(tsconfigFile)) {
            const existingJson = parse(_fs.readFileSync(tsconfigFile, 'utf8'));
            const co = existingJson.compilerOptions;
            const newCo = tsjson.compilerOptions;
            co.typeRoots = newCo.typeRoots;
            co.baseUrl = newCo.baseUrl;
            co.paths = newCo.paths;
            co.rootDir = newCo.rootDir;
            existingJson.extends = tsjson.extends;
            existingJson.include = tsjson.include;
            _fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(existingJson, null, '  '));
        }
        else {
            _fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(tsjson, null, '  '));
        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUEyRDtBQUMzRCxzREFBZ0M7QUFDaEMsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyxtREFBNkI7QUFFN0IsMERBQXdCO0FBRXhCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsMkRBQWlDO0FBRWpDLHlEQUErQjtBQUUvQixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUNyQixrQ0FBa0M7QUFDcEMsQ0FBQztBQUZELDBCQUVDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLGVBQWU7UUFDZixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMseURBQXlELENBQUMsRUFBRTtZQUM3RSxHQUFHLENBQUMsVUFBVSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO1FBQzFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FB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O0lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7SUFDMUYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFDdEMsT0FBTztJQUNULEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLDBFQUEwRSxDQUFDLENBQUM7SUFDdEcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzdDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUN0QixHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDekgsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IGJveFN0cmluZyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IFJlcGxhY2VtZW50SW5mLCBUc0hhbmRsZXIgfSBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy13ZWJwYWNrJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbmV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCB7IEFuZ3VsYXJDb25maWdIYW5kbGVyIH0gZnJvbSAnLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuZXhwb3J0ICogZnJvbSAnLi9uZy9jb21tb24nO1xuXG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSByZXF1aXJlKCdjaGFsaycpO1xuXG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG4vLyBjb25zdCBzeXNGcyA9IGZzIGFzIHR5cGVvZiBfZnMgJiB7bWtkaXJzU3luYzogKGZpbGU6IHN0cmluZykgPT4gdm9pZH07XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuICAvLyByZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICAvLyBwcmludEhlbHAoKTtcbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJykpIHtcbiAgICBfZnMucmVtb3ZlU3luYygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcycpO1xuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTsgLy8gd2FpdCBmb3IgZGVsZXRlXG4gIGlmICghY2hlY2tBbmd1bGFyVmVyc2lvbigpKVxuICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciB2ZXJzaW9uIGNoZWNrIEVycm9yJyk7XG4gIC8vIHdyaXRlVHNjb25maWcoKTtcbiAgaGFja0ZpeFdhdGNocGFjaygpO1xuICB3cml0ZVRzY29uZmlnNEVkaXRvcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHNldHVwQXBpRm9yQW5ndWxhckNsaSgpIHtcbi8vIFx0Y29uc3QgbmdQYXJhbTogQW5ndWxhckNsaVBhcmFtID0gYXBpLmNvbmZpZygpLl9hbmd1bGFyQ2xpO1xuLy8gXHRpZiAoIW5nUGFyYW0gfHwgYXBpLm5nRW50cnlDb21wb25lbnQpXG4vLyBcdFx0cmV0dXJuO1xuLy8gXHRjb25zdCBkZXBsb3lVcmwgPSB3ZWJwYWNrQ29uZmlnLm91dHB1dC5wdWJsaWNQYXRoIHx8IGFwaS5jb25maWcuZ2V0KCdwdWJsaWNQYXRoJyk7XG5cbi8vIFx0Y29uc3QgcHVibGljVXJsT2JqID0gVXJsLnBhcnNlKGRlcGxveVVybCk7XG4vLyBcdE9iamVjdC5hc3NpZ24oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSksIHtcbi8vIFx0XHRkZXBsb3lVcmwsXG4vLyBcdFx0c3NyOiBuZ1BhcmFtLnNzcixcbi8vIFx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuLy8gXHRcdG5nUm91dGVyUGF0aCxcbi8vIFx0XHRzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcbi8vIFx0XHRcdGlmIChuZ1BhcmFtLnNzcilcbi8vIFx0XHRcdFx0cmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuLy8gXHRcdH1cbi8vIFx0fSk7XG4vLyBcdGF3YWl0IGNoYW5nZVdlYnBhY2tDb25maWcobmdQYXJhbSwgd2VicGFja0NvbmZpZywgYXBpLmNvbmZpZygpKTtcbi8vIFx0bG9nLmluZm8oJ1NldHVwIGFwaSBvYmplY3QgZm9yIEFuZ3VsYXInKTtcbi8vIH1cblxuZnVuY3Rpb24gY2hlY2tBbmd1bGFyVmVyc2lvbigpIHtcbiAgY29uc3QgZGVwczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic6ICd+MC44MDAuMicsXG4gICAgJ0Bhbmd1bGFyL2NsaSc6ICd+OC4wLjInLFxuICAgICdAYW5ndWxhci9jb21waWxlci1jbGknOiAnfjguMC4wJyxcbiAgICAnQGFuZ3VsYXIvbGFuZ3VhZ2Utc2VydmljZSc6ICd+OC4wLjAnXG4gIH07XG4gIGxldCB2YWxpZCA9IHRydWU7XG4gIF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcbiAgICBjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG4gICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgbG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG5cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuLy8gXHQvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBcdGNvbnNvbGUubG9nKCdcXG5cXG4gIElmIHlvdSB3YW50IHRvIG5hcnJvdyBkb3duIHRvIG9ubHkgc3BlY2lmaWMgbW9kdWxlcyBmb3IgQW5ndWxhciB0byBidWlsZC9zZXJ2ZSwgdHJ5XFxuICAgICcgK1xuLy8gXHRcdHllbGxvdygnZHJjcCBpbml0IC0tcHJvcCBAZHItY29yZS9uZy1hcHAtYnVpbGRlci5wYWNrYWdlcz08cGFja2FnZU5hbWUsLi4uPicpICsgJ1xcbiAgJyArXG4vLyBcdFx0J09yIHRocm91Z2ggYSBjb25maWd1cmF0aW9uIGZpbGU6XFxuJyArXG4vLyBcdFx0eWVsbG93KCcgICAgZHJjcCBpbml0IC1jIDxvdGhlciBmaWxlcz4gbW9kdWxlcy55YW1sXFxuJykgK1xuLy8gXHRcdCcgIG1vZHVsZXMueWFtbDpcXG4nICtcbi8vIFx0XHRjeWFuKCcgICcucmVwZWF0KDEpICsgJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMikgKyAncGFja2FnZXM6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAxPlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMj5cXG4nKVxuLy8gXHQpO1xuLy8gfVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNEVkaXRvcigpIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbFxuICB9O1xuICAvLyAtLS0tLS0tIFdyaXRlIHRzY29uZmlnLmpzb24gZm9yIFZpc3VhbCBDb2RlIEVkaXRvciAtLS0tLS0tLVxuXG4gIGxldCBzcmNEaXJDb3VudCA9IDA7XG4gIGNvbnN0IHJvb3QgPSBhcGkuY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3QgcGFja2FnZVRvUmVhbFBhdGg6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG4gIHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJylcbiAgLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCByZWFsRGlyID0gX2ZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG4gICAgLy8gUGF0aC5yZWxhdGl2ZShyb290LCByZWFsRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGFja2FnZVRvUmVhbFBhdGgucHVzaChbbmFtZSwgcmVhbERpcl0pO1xuICB9LCAnc3JjJyk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGZvciAobGV0IHByb2ogb2YgYXBpLmNvbmZpZygpLnByb2plY3RMaXN0KSB7XG4gICAgdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSk7XG4gICAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgICB9XG4gICAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICAgIHNyY0RpckNvdW50Kys7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuICAgIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gICAgZm9yIChjb25zdCBbbmFtZSwgcmVhbFBhdGhdIG9mIHBhY2thZ2VUb1JlYWxQYXRoKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cblxuICAgIGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gICAgcGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cbiAgICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgICAgcm9vdERpcjogJy4vJyxcbiAgICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgICBwYXRoczogcGF0aE1hcHBpbmcsXG4gICAgICB0eXBlUm9vdHM6IFtcbiAgICAgICAgUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgICAgIFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuICAgICAgICBQYXRoLmpvaW4oUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKSwgJy93ZmgvdHlwZXMnKVxuICAgICAgXSxcbiAgICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgICAgbW9kdWxlOiAnY29tbW9uanMnXG4gICAgfTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgICBpZiAoX2ZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoX2ZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICAgICAgY29uc3QgY28gPSBleGlzdGluZ0pzb24uY29tcGlsZXJPcHRpb25zO1xuICAgICAgY29uc3QgbmV3Q28gPSB0c2pzb24uY29tcGlsZXJPcHRpb25zO1xuICAgICAgY28udHlwZVJvb3RzID0gbmV3Q28udHlwZVJvb3RzO1xuICAgICAgY28uYmFzZVVybCA9IG5ld0NvLmJhc2VVcmw7XG4gICAgICBjby5wYXRocyA9IG5ld0NvLnBhdGhzO1xuICAgICAgY28ucm9vdERpciA9IG5ld0NvLnJvb3REaXI7XG5cbiAgICAgIGV4aXN0aW5nSnNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHM7XG4gICAgICBleGlzdGluZ0pzb24uaW5jbHVkZSA9IHRzanNvbi5pbmNsdWRlO1xuXG4gICAgICBfZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9mcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcbiAgICB9XG4gIH1cblxuXG4gIGlmIChzcmNEaXJDb3VudCA+IDApIHtcbiAgICBsb2cuaW5mbygnXFxuJyArIGJveFN0cmluZygnVG8gYmUgZnJpZW5kbHkgdG8geW91ciBlZGl0b3IsIHdlIGp1c3QgYWRkZWQgdHNjb25maWcuanNvbiBmaWxlIHRvIGVhY2ggb2YgeW91ciBwcm9qZWN0IGRpcmVjdG9yaWVzLFxcbicgK1xuICAgICdCdXQgcGxlYXNlIGFkZCBcInRzY29uZmlnLmpzb25cIiB0byB5b3VyIC5naXRpbmdvcmUgZmlsZSxcXG4nICtcbiAgICAnc2luY2UgdGhlc2UgdHNjb25maWcuanNvbiBhcmUgZ2VuZXJhdGVkIGJhc2VkIG9uIHlvdXIgbG9jYWwgd29ya3NwYWNlIGxvY2F0aW9uLicpKTtcbiAgfVxufVxuXG5cbi8qKlxuICogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MVxuICovXG5mdW5jdGlvbiBoYWNrRml4V2F0Y2hwYWNrKCkge1xuICBjb25zdCB3YXRjaHBhY2tQYXRoID0gWyd3ZWJwYWNrL25vZGVfbW9kdWxlcy93YXRjaHBhY2snLCAnd2F0Y2hwYWNrJ10uZmluZChwYXRoID0+IHtcbiAgICByZXR1cm4gX2ZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHBhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJykpO1xuICB9KTtcbiAgaWYgKCF3YXRjaHBhY2tQYXRoKSB7XG4gICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCB3YXRjaHBhY2ssIHBsZWFzZSBtYWtlIHN1cmUgV2VicGFjayBpcyBpbnN0YWxsZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyB3YXRjaHBhY2tQYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpO1xuICBpZiAoX2ZzLmV4aXN0c1N5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycpKVxuICAgIHJldHVybjtcbiAgbG9nLmluZm8oYGhhY2tpbmcgJHt0YXJnZXR9XFxuXFx0IHRvIHdvcmthcm91bmQgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFgKTtcbiAgX2ZzLnJlbmFtZVN5bmModGFyZ2V0LCB0YXJnZXQgKyAnLmRyY3AtYmFrJyk7XG4gIF9mcy53cml0ZUZpbGVTeW5jKHRhcmdldCxcbiAgICBfZnMucmVhZEZpbGVTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnLCAndXRmOCcpLnJlcGxhY2UoL1xcV2ZvbGxvd1N5bWxpbmtzOlxcc2ZhbHNlL2csICdmb2xsb3dTeW1saW5rczogdHJ1ZScpLCAndXRmOCcpO1xufVxuIl19
