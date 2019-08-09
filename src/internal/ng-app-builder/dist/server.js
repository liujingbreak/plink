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
// 	const publicUrlObj = Url.parse(deployUrl, true, true);
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
        '@angular-devkit/build-angular': '~0.802.0',
        '@angular/cli': '~8.2.0',
        '@angular/compiler-cli': '~8.2.0',
        '@angular/language-service': '~8.2.0'
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
        // pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];
        tsjson.compilerOptions = {
            rootDir: './',
            baseUrl: root,
            noResolve: true,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUEyRDtBQUMzRCxzREFBZ0M7QUFDaEMsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyxtREFBNkI7QUFFN0IsMERBQXdCO0FBRXhCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsMkRBQWlDO0FBRWpDLHlEQUErQjtBQUUvQixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUNyQixrQ0FBa0M7QUFDcEMsQ0FBQztBQUZELDBCQUVDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLGVBQWU7UUFDZixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMseURBQXlELENBQUMsRUFBRTtZQUM3RSxHQUFHLENBQUMsVUFBVSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO1FBQzFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FB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QUFPLENBQUMsZUFBZSxHQUFHLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO0lBQzFGLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBQ3RDLE9BQU87SUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSwwRUFBMEUsQ0FBQyxDQUFDO0lBQ3RHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztJQUM3QyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFDdEIsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pILENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgeyBib3hTdHJpbmcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0ICogYXMgX2ZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBSZXBsYWNlbWVudEluZiwgVHNIYW5kbGVyIH0gZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuZXhwb3J0ICogZnJvbSAnLi9jb25maWctd2VicGFjayc7XG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZ3VyYWJsZSc7XG5leHBvcnQgKiBmcm9tICcuL25nLXByZXJlbmRlcic7XG5leHBvcnQgeyBBbmd1bGFyQ29uZmlnSGFuZGxlciB9IGZyb20gJy4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcbmV4cG9ydCAqIGZyb20gJy4vbmcvY29tbW9uJztcblxuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgZnMgPSByZXF1aXJlKCdmcy1leHRyYScpO1xuLy8gY29uc3Qgc3lzRnMgPSBmcyBhcyB0eXBlb2YgX2ZzICYge21rZGlyc1N5bmM6IChmaWxlOiBzdHJpbmcpID0+IHZvaWR9O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcbiAgLy8gcmV0dXJuIHNldHVwQXBpRm9yQW5ndWxhckNsaSgpO1xufVxuXG5leHBvcnQgbGV0IHRzSGFuZGxlcjogVHNIYW5kbGVyID0gcmVzb2x2ZUltcG9ydHM7XG5mdW5jdGlvbiByZXNvbHZlSW1wb3J0cyhzcmM6IHRzLlNvdXJjZUZpbGUpOiBSZXBsYWNlbWVudEluZltdIHtcbiAgcmV0dXJuIFtdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcbiAgLy8gcHJpbnRIZWxwKCk7XG4gIGlmIChfZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcycpKSB7XG4gICAgX2ZzLnJlbW92ZVN5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKTtcbiAgfVxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7IC8vIHdhaXQgZm9yIGRlbGV0ZVxuICBpZiAoIWNoZWNrQW5ndWxhclZlcnNpb24oKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgdmVyc2lvbiBjaGVjayBFcnJvcicpO1xuICAvLyB3cml0ZVRzY29uZmlnKCk7XG4gIGhhY2tGaXhXYXRjaHBhY2soKTtcbiAgd3JpdGVUc2NvbmZpZzRFZGl0b3IoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiBzZXR1cEFwaUZvckFuZ3VsYXJDbGkoKSB7XG4vLyBcdGNvbnN0IG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IGFwaS5jb25maWcoKS5fYW5ndWxhckNsaTtcbi8vIFx0aWYgKCFuZ1BhcmFtIHx8IGFwaS5uZ0VudHJ5Q29tcG9uZW50KVxuLy8gXHRcdHJldHVybjtcbi8vIFx0Y29uc3QgZGVwbG95VXJsID0gd2VicGFja0NvbmZpZy5vdXRwdXQucHVibGljUGF0aCB8fCBhcGkuY29uZmlnLmdldCgncHVibGljUGF0aCcpO1xuXG4vLyBcdGNvbnN0IHB1YmxpY1VybE9iaiA9IFVybC5wYXJzZShkZXBsb3lVcmwsIHRydWUsIHRydWUpO1xuLy8gXHRPYmplY3QuYXNzaWduKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpLCB7XG4vLyBcdFx0ZGVwbG95VXJsLFxuLy8gXHRcdHNzcjogbmdQYXJhbS5zc3IsXG4vLyBcdFx0bmdCYXNlUm91dGVyUGF0aDogXy50cmltKHB1YmxpY1VybE9iai5wYXRobmFtZSwgJy8nKSxcbi8vIFx0XHRuZ1JvdXRlclBhdGgsXG4vLyBcdFx0c3NyUmVxdWlyZShyZXF1aXJlUGF0aDogc3RyaW5nKSB7XG4vLyBcdFx0XHRpZiAobmdQYXJhbS5zc3IpXG4vLyBcdFx0XHRcdHJldHVybiByZXF1aXJlKFBhdGguam9pbih0aGlzLl9fZGlybmFtZSwgcmVxdWlyZVBhdGgpKTtcbi8vIFx0XHR9XG4vLyBcdH0pO1xuLy8gXHRhd2FpdCBjaGFuZ2VXZWJwYWNrQ29uZmlnKG5nUGFyYW0sIHdlYnBhY2tDb25maWcsIGFwaS5jb25maWcoKSk7XG4vLyBcdGxvZy5pbmZvKCdTZXR1cCBhcGkgb2JqZWN0IGZvciBBbmd1bGFyJyk7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoZWNrQW5ndWxhclZlcnNpb24oKSB7XG4gIGNvbnN0IGRlcHM6IHtbazogc3RyaW5nXTogc3RyaW5nfSA9IHtcbiAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiAnfjAuODAyLjAnLFxuICAgICdAYW5ndWxhci9jbGknOiAnfjguMi4wJyxcbiAgICAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJzogJ344LjIuMCcsXG4gICAgJ0Bhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2UnOiAnfjguMi4wJ1xuICB9O1xuICBsZXQgdmFsaWQgPSB0cnVlO1xuICBfLmVhY2goZGVwcywgKGV4cGVjdFZlciwgbW9kKSA9PiB7XG4gICAgY29uc3QgdmVyID0gcmVxdWlyZShtb2QgKyAnL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG4gICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlciwgZXhwZWN0VmVyKSkge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgIGxvZy5lcnJvcih5ZWxsb3coYEluc3RhbGxlZCBkZXBlbmRlbmN5IFwiJHttb2R9QGApICsgcmVkKHZlcikgKyB5ZWxsb3coYFwiIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCwgaW5zdGFsbCAke2V4cGVjdFZlcn0gaW5zdGVhZC5gKSk7XG4gICAgfVxuICB9KTtcblxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL3dlYnBhY2svcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuXG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdCcpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXRcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2snKSkge1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFja1wiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZV9tb2R1bGVzL3J4anMvcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbi8vIGZ1bmN0aW9uIHByaW50SGVscCgpIHtcbi8vIFx0Ly8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuLy8gXHRjb25zb2xlLmxvZygnXFxuXFxuICBJZiB5b3Ugd2FudCB0byBuYXJyb3cgZG93biB0byBvbmx5IHNwZWNpZmljIG1vZHVsZXMgZm9yIEFuZ3VsYXIgdG8gYnVpbGQvc2VydmUsIHRyeVxcbiAgICAnICtcbi8vIFx0XHR5ZWxsb3coJ2RyY3AgaW5pdCAtLXByb3AgQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIucGFja2FnZXM9PHBhY2thZ2VOYW1lLC4uLj4nKSArICdcXG4gICcgK1xuLy8gXHRcdCdPciB0aHJvdWdoIGEgY29uZmlndXJhdGlvbiBmaWxlOlxcbicgK1xuLy8gXHRcdHllbGxvdygnICAgIGRyY3AgaW5pdCAtYyA8b3RoZXIgZmlsZXM+IG1vZHVsZXMueWFtbFxcbicpICtcbi8vIFx0XHQnICBtb2R1bGVzLnlhbWw6XFxuJyArXG4vLyBcdFx0Y3lhbignICAnLnJlcGVhdCgxKSArICdAZHItY29yZS9uZy1hcHAtYnVpbGRlcjpcXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDIpICsgJ3BhY2thZ2VzOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMT5cXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDMpICsgJy0gPHBhY2thZ2VOYW1lIDI+XFxuJylcbi8vIFx0KTtcbi8vIH1cblxuZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRFZGl0b3IoKSB7XG4gIGNvbnN0IHRzanNvbjogYW55ID0ge1xuICAgIGV4dGVuZHM6IG51bGxcbiAgfTtcbiAgLy8gLS0tLS0tLSBXcml0ZSB0c2NvbmZpZy5qc29uIGZvciBWaXN1YWwgQ29kZSBFZGl0b3IgLS0tLS0tLS1cblxuICBsZXQgc3JjRGlyQ291bnQgPSAwO1xuICBjb25zdCByb290ID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuXG4gIGNvbnN0IHBhY2thZ2VUb1JlYWxQYXRoOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuICByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpXG4gIC5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcmVhbERpciA9IF9mcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICAgIC8vIFBhdGgucmVsYXRpdmUocm9vdCwgcmVhbERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhY2thZ2VUb1JlYWxQYXRoLnB1c2goW25hbWUsIHJlYWxEaXJdKTtcbiAgfSwgJ3NyYycpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGxldCBwcm9qIG9mIGFwaS5jb25maWcoKS5wcm9qZWN0TGlzdCkge1xuICAgIHRzanNvbi5pbmNsdWRlID0gW107XG4gICAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJykpO1xuICAgIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gICAgfVxuICAgIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgdHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgICBzcmNEaXJDb3VudCsrO1xuICAgIH0pO1xuICAgIGxvZy5pbmZvKCdXcml0ZSB0c2NvbmZpZy5qc29uIHRvICcgKyBwcm9qKTtcbiAgICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICAgIGZvciAoY29uc3QgW25hbWUsIHJlYWxQYXRoXSBvZiBwYWNrYWdlVG9SZWFsUGF0aCkge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG5cbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBfZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAgIC8vIHBhdGhNYXBwaW5nWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJywgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKiddO1xuXG4gICAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIHJvb3REaXI6ICcuLycsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgbm9SZXNvbHZlOiB0cnVlLFxuICAgICAgcGF0aHM6IHBhdGhNYXBwaW5nLFxuICAgICAgdHlwZVJvb3RzOiBbXG4gICAgICAgIFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcbiAgICAgICAgUGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcbiAgICAgIF0sXG4gICAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICAgIG1vZHVsZTogJ2NvbW1vbmpzJ1xuICAgIH07XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gICAgaWYgKF9mcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKF9mcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgICAgIGNvbnN0IGNvID0gZXhpc3RpbmdKc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGNvbnN0IG5ld0NvID0gdHNqc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGNvLnR5cGVSb290cyA9IG5ld0NvLnR5cGVSb290cztcbiAgICAgIGNvLmJhc2VVcmwgPSBuZXdDby5iYXNlVXJsO1xuICAgICAgY28ucGF0aHMgPSBuZXdDby5wYXRocztcbiAgICAgIGNvLnJvb3REaXIgPSBuZXdDby5yb290RGlyO1xuXG4gICAgICBleGlzdGluZ0pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzO1xuICAgICAgZXhpc3RpbmdKc29uLmluY2x1ZGUgPSB0c2pzb24uaW5jbHVkZTtcblxuICAgICAgX2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cblxuICBpZiAoc3JjRGlyQ291bnQgPiAwKSB7XG4gICAgbG9nLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoJ1RvIGJlIGZyaWVuZGx5IHRvIHlvdXIgZWRpdG9yLCB3ZSBqdXN0IGFkZGVkIHRzY29uZmlnLmpzb24gZmlsZSB0byBlYWNoIG9mIHlvdXIgcHJvamVjdCBkaXJlY3RvcmllcyxcXG4nICtcbiAgICAnQnV0IHBsZWFzZSBhZGQgXCJ0c2NvbmZpZy5qc29uXCIgdG8geW91ciAuZ2l0aW5nb3JlIGZpbGUsXFxuJyArXG4gICAgJ3NpbmNlIHRoZXNlIHRzY29uZmlnLmpzb24gYXJlIGdlbmVyYXRlZCBiYXNlZCBvbiB5b3VyIGxvY2FsIHdvcmtzcGFjZSBsb2NhdGlvbi4nKSk7XG4gIH1cbn1cblxuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFcbiAqL1xuZnVuY3Rpb24gaGFja0ZpeFdhdGNocGFjaygpIHtcbiAgY29uc3Qgd2F0Y2hwYWNrUGF0aCA9IFsnd2VicGFjay9ub2RlX21vZHVsZXMvd2F0Y2hwYWNrJywgJ3dhdGNocGFjayddLmZpbmQocGF0aCA9PiB7XG4gICAgcmV0dXJuIF9mcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyBwYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpKTtcbiAgfSk7XG4gIGlmICghd2F0Y2hwYWNrUGF0aCkge1xuICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgd2F0Y2hwYWNrLCBwbGVhc2UgbWFrZSBzdXJlIFdlYnBhY2sgaXMgaW5zdGFsbGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgd2F0Y2hwYWNrUGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKTtcbiAgaWYgKF9mcy5leGlzdHNTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnKSlcbiAgICByZXR1cm47XG4gIGxvZy5pbmZvKGBoYWNraW5nICR7dGFyZ2V0fVxcblxcdCB0byB3b3JrYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxYCk7XG4gIF9mcy5yZW5hbWVTeW5jKHRhcmdldCwgdGFyZ2V0ICsgJy5kcmNwLWJhaycpO1xuICBfZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsXG4gICAgX2ZzLnJlYWRGaWxlU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJywgJ3V0ZjgnKS5yZXBsYWNlKC9cXFdmb2xsb3dTeW1saW5rczpcXHNmYWxzZS9nLCAnZm9sbG93U3ltbGlua3M6IHRydWUnKSwgJ3V0ZjgnKTtcbn1cbiJdfQ==
