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
            // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
            paths: pathMapping,
            skipLibCheck: false,
            // typeRoots: [
            //   Path.join(root, 'node_modules/@types'),
            //   Path.join(root, 'node_modules/@dr-types'),
            //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
            // ],
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUEyRDtBQUMzRCxzREFBZ0M7QUFDaEMsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyxtREFBNkI7QUFFN0IsMERBQXdCO0FBRXhCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsMkRBQWlDO0FBRWpDLHlEQUErQjtBQUUvQixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUNyQixrQ0FBa0M7QUFDcEMsQ0FBQztBQUZELDBCQUVDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQsbUJBQW1CO1FBQ25CLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsb0JBQW9CLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQUE7QUFORCxvQkFNQztBQUVELFNBQWdCLFFBQVE7QUFDeEIsQ0FBQztBQURELDRCQUNDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsTUFBTSxJQUFJLEdBQTBCO1FBQ2xDLCtCQUErQixFQUFF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LFNBQVMsZ0JBQWdCO0lBQ3ZCLE1BQU0sYUFBYSxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2hGLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGdFQUFnRSxDQUFDLENBQUM7UUFDM0UsT0FBTztLQUNSO0lBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7SUFDMUYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFDdEMsT0FBTztJQUNULEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLDBFQUEwRSxDQUFDLENBQUM7SUFDdEcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzdDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUN0QixHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDekgsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IGJveFN0cmluZyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IFJlcGxhY2VtZW50SW5mLCBUc0hhbmRsZXIgfSBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy13ZWJwYWNrJztcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbmV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCB7IEFuZ3VsYXJDb25maWdIYW5kbGVyIH0gZnJvbSAnLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuZXhwb3J0ICogZnJvbSAnLi9uZy9jb21tb24nO1xuXG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSByZXF1aXJlKCdjaGFsaycpO1xuXG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG4vLyBjb25zdCBzeXNGcyA9IGZzIGFzIHR5cGVvZiBfZnMgJiB7bWtkaXJzU3luYzogKGZpbGU6IHN0cmluZykgPT4gdm9pZH07XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuICAvLyByZXR1cm4gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCk7XG59XG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICBpZiAoIWNoZWNrQW5ndWxhclZlcnNpb24oKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgdmVyc2lvbiBjaGVjayBFcnJvcicpO1xuICAvLyB3cml0ZVRzY29uZmlnKCk7XG4gIGhhY2tGaXhXYXRjaHBhY2soKTtcbiAgd3JpdGVUc2NvbmZpZzRFZGl0b3IoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuICBjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJ34wLjgwMy4xMicsXG4gICAgJ0Bhbmd1bGFyL2NsaSc6ICd+OC4zLjEyJyxcbiAgICAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJzogJ344LjIuMTEnLFxuICAgICdAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlJzogJ344LjIuMTEnXG4gIH07XG4gIGxldCB2YWxpZCA9IHRydWU7XG4gIF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcbiAgICBjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG4gICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgbG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG5cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuLy8gXHQvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG4vLyBcdGNvbnNvbGUubG9nKCdcXG5cXG4gIElmIHlvdSB3YW50IHRvIG5hcnJvdyBkb3duIHRvIG9ubHkgc3BlY2lmaWMgbW9kdWxlcyBmb3IgQW5ndWxhciB0byBidWlsZC9zZXJ2ZSwgdHJ5XFxuICAgICcgK1xuLy8gXHRcdHllbGxvdygnZHJjcCBpbml0IC0tcHJvcCBAZHItY29yZS9uZy1hcHAtYnVpbGRlci5wYWNrYWdlcz08cGFja2FnZU5hbWUsLi4uPicpICsgJ1xcbiAgJyArXG4vLyBcdFx0J09yIHRocm91Z2ggYSBjb25maWd1cmF0aW9uIGZpbGU6XFxuJyArXG4vLyBcdFx0eWVsbG93KCcgICAgZHJjcCBpbml0IC1jIDxvdGhlciBmaWxlcz4gbW9kdWxlcy55YW1sXFxuJykgK1xuLy8gXHRcdCcgIG1vZHVsZXMueWFtbDpcXG4nICtcbi8vIFx0XHRjeWFuKCcgICcucmVwZWF0KDEpICsgJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyOlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMikgKyAncGFja2FnZXM6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAxPlxcbicgK1xuLy8gXHRcdFx0JyAgJy5yZXBlYXQoMykgKyAnLSA8cGFja2FnZU5hbWUgMj5cXG4nKVxuLy8gXHQpO1xuLy8gfVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNEVkaXRvcigpIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbFxuICB9O1xuICAvLyAtLS0tLS0tIFdyaXRlIHRzY29uZmlnLmpzb24gZm9yIFZpc3VhbCBDb2RlIEVkaXRvciAtLS0tLS0tLVxuXG4gIGxldCBzcmNEaXJDb3VudCA9IDA7XG4gIGNvbnN0IHJvb3QgPSBhcGkuY29uZmlnKCkucm9vdFBhdGg7XG5cbiAgY29uc3QgcGFja2FnZVRvUmVhbFBhdGg6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG4gIHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJylcbiAgLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCByZWFsRGlyID0gX2ZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG4gICAgLy8gUGF0aC5yZWxhdGl2ZShyb290LCByZWFsRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGFja2FnZVRvUmVhbFBhdGgucHVzaChbbmFtZSwgcmVhbERpcl0pO1xuICB9LCAnc3JjJyk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGZvciAobGV0IHByb2ogb2YgYXBpLmNvbmZpZygpLnByb2plY3RMaXN0KSB7XG4gICAgdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKSk7XG4gICAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgICB9XG4gICAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICAgIHNyY0RpckNvdW50Kys7XG4gICAgfSk7XG4gICAgbG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnLmpzb24gdG8gJyArIHByb2opO1xuICAgIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gICAgZm9yIChjb25zdCBbbmFtZSwgcmVhbFBhdGhdIG9mIHBhY2thZ2VUb1JlYWxQYXRoKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cblxuICAgIGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIF9mcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gICAgLy8gcGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ107XG5cbiAgICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgICAgcm9vdERpcjogJy4vJyxcbiAgICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgICBwYXRoczogcGF0aE1hcHBpbmcsXG4gICAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgICAgLy8gdHlwZVJvb3RzOiBbXG4gICAgICAvLyAgIFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgLy8gICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcbiAgICAgIC8vICAgUGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcbiAgICAgIC8vIF0sXG4gICAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICAgIG1vZHVsZTogJ2NvbW1vbmpzJ1xuICAgIH07XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gICAgaWYgKF9mcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKF9mcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgICAgIGNvbnN0IGNvID0gZXhpc3RpbmdKc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGNvbnN0IG5ld0NvID0gdHNqc29uLmNvbXBpbGVyT3B0aW9ucztcbiAgICAgIGNvLnR5cGVSb290cyA9IG5ld0NvLnR5cGVSb290cztcbiAgICAgIGNvLmJhc2VVcmwgPSBuZXdDby5iYXNlVXJsO1xuICAgICAgY28ucGF0aHMgPSBuZXdDby5wYXRocztcbiAgICAgIGNvLnJvb3REaXIgPSBuZXdDby5yb290RGlyO1xuXG4gICAgICBleGlzdGluZ0pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzO1xuICAgICAgZXhpc3RpbmdKc29uLmluY2x1ZGUgPSB0c2pzb24uaW5jbHVkZTtcblxuICAgICAgX2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICB9XG5cblxuICBpZiAoc3JjRGlyQ291bnQgPiAwKSB7XG4gICAgbG9nLmluZm8oJ1xcbicgKyBib3hTdHJpbmcoJ1RvIGJlIGZyaWVuZGx5IHRvIHlvdXIgZWRpdG9yLCB3ZSBqdXN0IGFkZGVkIHRzY29uZmlnLmpzb24gZmlsZSB0byBlYWNoIG9mIHlvdXIgcHJvamVjdCBkaXJlY3RvcmllcyxcXG4nICtcbiAgICAnQnV0IHBsZWFzZSBhZGQgXCJ0c2NvbmZpZy5qc29uXCIgdG8geW91ciAuZ2l0aW5nb3JlIGZpbGUsXFxuJyArXG4gICAgJ3NpbmNlIHRoZXNlIHRzY29uZmlnLmpzb24gYXJlIGdlbmVyYXRlZCBiYXNlZCBvbiB5b3VyIGxvY2FsIHdvcmtzcGFjZSBsb2NhdGlvbi4nKSk7XG4gIH1cbn1cblxuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFcbiAqL1xuZnVuY3Rpb24gaGFja0ZpeFdhdGNocGFjaygpIHtcbiAgY29uc3Qgd2F0Y2hwYWNrUGF0aCA9IFsnd2VicGFjay9ub2RlX21vZHVsZXMvd2F0Y2hwYWNrJywgJ3dhdGNocGFjayddLmZpbmQocGF0aCA9PiB7XG4gICAgcmV0dXJuIF9mcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyBwYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpKTtcbiAgfSk7XG4gIGlmICghd2F0Y2hwYWNrUGF0aCkge1xuICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgd2F0Y2hwYWNrLCBwbGVhc2UgbWFrZSBzdXJlIFdlYnBhY2sgaXMgaW5zdGFsbGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgd2F0Y2hwYWNrUGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKTtcbiAgaWYgKF9mcy5leGlzdHNTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnKSlcbiAgICByZXR1cm47XG4gIGxvZy5pbmZvKGBoYWNraW5nICR7dGFyZ2V0fVxcblxcdCB0byB3b3JrYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxYCk7XG4gIF9mcy5yZW5hbWVTeW5jKHRhcmdldCwgdGFyZ2V0ICsgJy5kcmNwLWJhaycpO1xuICBfZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsXG4gICAgX2ZzLnJlYWRGaWxlU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJywgJ3V0ZjgnKS5yZXBsYWNlKC9cXFdmb2xsb3dTeW1saW5rczpcXHNmYWxzZS9nLCAnZm9sbG93U3ltbGlua3M6IHRydWUnKSwgJ3V0ZjgnKTtcbn1cbiJdfQ==
