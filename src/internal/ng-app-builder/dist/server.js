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
        checkAngularCliDepVersion();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUEyRDtBQUMzRCxzREFBZ0M7QUFDaEMsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyxtREFBNkI7QUFFN0IsMERBQXdCO0FBRXhCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsMkRBQWlDO0FBRWpDLHlEQUErQjtBQUUvQixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUNyQixrQ0FBa0M7QUFDcEMsQ0FBQztBQUZELDBCQUVDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQseUJBQXlCLEVBQUUsQ0FBQztRQUM1QixtQkFBbUI7UUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixvQkFBb0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FBQTtBQVBELG9CQU9DO0FBRUQsU0FBZ0IsUUFBUTtBQUN4QixDQUFDO0FBREQsNEJBQ0M7QUFFRCxTQUFTLG1CQUFtQjtJQUMxQixNQUFNLElBQUks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LENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDN0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQ3RCLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN6SCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IHsgYm94U3RyaW5nIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgUmVwbGFjZW1lbnRJbmYsIFRzSGFuZGxlciB9IGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5cbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnLXdlYnBhY2snO1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWd1cmFibGUnO1xuZXhwb3J0ICogZnJvbSAnLi9uZy1wcmVyZW5kZXInO1xuZXhwb3J0IHsgQW5ndWxhckNvbmZpZ0hhbmRsZXIgfSBmcm9tICcuL25nL2NoYW5nZS1jbGktb3B0aW9ucyc7XG5leHBvcnQgKiBmcm9tICcuL25nL2NvbW1vbic7XG5cbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3Qge3JlZCwgeWVsbG93fSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8vIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcbi8vIGNvbnN0IHN5c0ZzID0gZnMgYXMgdHlwZW9mIF9mcyAmIHtta2RpcnNTeW5jOiAoZmlsZTogc3RyaW5nKSA9PiB2b2lkfTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoKSB7XG4gIC8vIHJldHVybiBzZXR1cEFwaUZvckFuZ3VsYXJDbGkoKTtcbn1cblxuZXhwb3J0IGxldCB0c0hhbmRsZXI6IFRzSGFuZGxlciA9IHJlc29sdmVJbXBvcnRzO1xuZnVuY3Rpb24gcmVzb2x2ZUltcG9ydHMoc3JjOiB0cy5Tb3VyY2VGaWxlKTogUmVwbGFjZW1lbnRJbmZbXSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gIGlmICghY2hlY2tBbmd1bGFyVmVyc2lvbigpKVxuICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciB2ZXJzaW9uIGNoZWNrIEVycm9yJyk7XG4gIGNoZWNrQW5ndWxhckNsaURlcFZlcnNpb24oKTtcbiAgLy8gd3JpdGVUc2NvbmZpZygpO1xuICBoYWNrRml4V2F0Y2hwYWNrKCk7XG4gIHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuZnVuY3Rpb24gY2hlY2tBbmd1bGFyVmVyc2lvbigpIHtcbiAgY29uc3QgZGVwczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic6ICd+MC44MDMuMTInLFxuICAgICdAYW5ndWxhci9jbGknOiAnfjguMy4xMicsXG4gICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICd+OC4yLjExJyxcbiAgICAnQGFuZ3VsYXIvbGFuZ3VhZ2Utc2VydmljZSc6ICd+OC4yLjExJ1xuICB9O1xuICBsZXQgdmFsaWQgPSB0cnVlO1xuICBfLmVhY2goZGVwcywgKGV4cGVjdFZlciwgbW9kKSA9PiB7XG4gICAgY29uc3QgdmVyID0gcmVxdWlyZShtb2QgKyAnL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG4gICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlciwgZXhwZWN0VmVyKSkge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgIGxvZy5lcnJvcih5ZWxsb3coYEluc3RhbGxlZCBkZXBlbmRlbmN5IFwiJHttb2R9QGApICsgcmVkKHZlcikgKyB5ZWxsb3coYFwiIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCwgaW5zdGFsbCAke2V4cGVjdFZlcn0gaW5zdGVhZC5gKSk7XG4gICAgfVxuICB9KTtcblxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL3dlYnBhY2svcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuXG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdCcpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXRcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2snKSkge1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFja1wiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZV9tb2R1bGVzL3J4anMvcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQW5ndWxhckNsaURlcFZlcnNpb24oKSB7XG4gIGNvbnN0IG5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0gcmVxdWlyZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvcGFja2FnZS5qc29uJykuZGVwZW5kZW5jaWVzO1xuICBjb25zdCBvdXJEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS5kZXBlbmRlbmNpZXM7XG5cbiAgbGV0IG1zZyA9ICcnO1xuICBmb3IgKGNvbnN0IG5nRGVwIG9mIE9iamVjdC5rZXlzKG5nRGVwcykpIHtcbiAgICBpZiAoXy5oYXMob3VyRGVwcywgbmdEZXApICYmIG91ckRlcHNbbmdEZXBdICE9PSBuZ0RlcHNbbmdEZXBdKSB7XG4gICAgICBtc2cgKz0gYERpZmZlcmVudCB2ZXJzaW9uIG9mIGRlcGVuZGVuY3kgYmV0d2VlbiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhciBhbmQgbmctYXBwLWJ1aWxkZXI6XFxuICAke25nRGVwfUAke25nRGVwc1tuZ0RlcF19IHZzICR7bmdEZXB9QCR7b3VyRGVwc1tuZ0RlcF19XFxuYDtcbiAgICB9XG4gIH1cbiAgaWYgKG1zZy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBZb3UgbmVlZCB0byBjb250YWN0IGF1dGhvciBvZiBuZy1hcHAtYnVpbGRlciBmb3I6XFxuJHttc2d9YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRFZGl0b3IoKSB7XG4gIGNvbnN0IHRzanNvbjogYW55ID0ge1xuICAgIGV4dGVuZHM6IG51bGxcbiAgfTtcbiAgLy8gLS0tLS0tLSBXcml0ZSB0c2NvbmZpZy5qc29uIGZvciBWaXN1YWwgQ29kZSBFZGl0b3IgLS0tLS0tLS1cblxuICBsZXQgc3JjRGlyQ291bnQgPSAwO1xuICBjb25zdCByb290ID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuXG4gIGNvbnN0IHBhY2thZ2VUb1JlYWxQYXRoOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuICByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpXG4gIC5maW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcmVhbERpciA9IF9mcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuICAgIC8vIFBhdGgucmVsYXRpdmUocm9vdCwgcmVhbERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhY2thZ2VUb1JlYWxQYXRoLnB1c2goW25hbWUsIHJlYWxEaXJdKTtcbiAgfSwgJ3NyYycpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGxldCBwcm9qIG9mIGFwaS5jb25maWcoKS5wcm9qZWN0TGlzdCkge1xuICAgIHRzanNvbi5pbmNsdWRlID0gW107XG4gICAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJykpO1xuICAgIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gICAgfVxuICAgIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICB0c2pzb24uaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgdHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgICBzcmNEaXJDb3VudCsrO1xuICAgIH0pO1xuICAgIGxvZy5pbmZvKCdXcml0ZSB0c2NvbmZpZy5qc29uIHRvICcgKyBwcm9qKTtcbiAgICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuICAgIGZvciAoY29uc3QgW25hbWUsIHJlYWxQYXRoXSBvZiBwYWNrYWdlVG9SZWFsUGF0aCkge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG5cbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBfZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAgIC8vIHBhdGhNYXBwaW5nWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJywgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKiddO1xuXG4gICAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIHJvb3REaXI6ICcuLycsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgICAgcGF0aHM6IHBhdGhNYXBwaW5nLFxuICAgICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICAgIC8vIHR5cGVSb290czogW1xuICAgICAgLy8gICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgIC8vICAgUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAvLyAgIFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG4gICAgICAvLyBdLFxuICAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgICBtb2R1bGU6ICdjb21tb25qcydcbiAgICB9O1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICAgIGlmIChfZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShfZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKSk7XG4gICAgICBjb25zdCBjbyA9IGV4aXN0aW5nSnNvbi5jb21waWxlck9wdGlvbnM7XG4gICAgICBjb25zdCBuZXdDbyA9IHRzanNvbi5jb21waWxlck9wdGlvbnM7XG4gICAgICBjby50eXBlUm9vdHMgPSBuZXdDby50eXBlUm9vdHM7XG4gICAgICBjby5iYXNlVXJsID0gbmV3Q28uYmFzZVVybDtcbiAgICAgIGNvLnBhdGhzID0gbmV3Q28ucGF0aHM7XG4gICAgICBjby5yb290RGlyID0gbmV3Q28ucm9vdERpcjtcblxuICAgICAgZXhpc3RpbmdKc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcztcbiAgICAgIGV4aXN0aW5nSnNvbi5pbmNsdWRlID0gdHNqc29uLmluY2x1ZGU7XG5cbiAgICAgIF9mcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH1cbiAgfVxuXG5cbiAgaWYgKHNyY0RpckNvdW50ID4gMCkge1xuICAgIGxvZy5pbmZvKCdcXG4nICsgYm94U3RyaW5nKCdUbyBiZSBmcmllbmRseSB0byB5b3VyIGVkaXRvciwgd2UganVzdCBhZGRlZCB0c2NvbmZpZy5qc29uIGZpbGUgdG8gZWFjaCBvZiB5b3VyIHByb2plY3QgZGlyZWN0b3JpZXMsXFxuJyArXG4gICAgJ0J1dCBwbGVhc2UgYWRkIFwidHNjb25maWcuanNvblwiIHRvIHlvdXIgLmdpdGluZ29yZSBmaWxlLFxcbicgK1xuICAgICdzaW5jZSB0aGVzZSB0c2NvbmZpZy5qc29uIGFyZSBnZW5lcmF0ZWQgYmFzZWQgb24geW91ciBsb2NhbCB3b3Jrc3BhY2UgbG9jYXRpb24uJykpO1xuICB9XG59XG5cblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxXG4gKi9cbmZ1bmN0aW9uIGhhY2tGaXhXYXRjaHBhY2soKSB7XG4gIGNvbnN0IHdhdGNocGFja1BhdGggPSBbJ3dlYnBhY2svbm9kZV9tb2R1bGVzL3dhdGNocGFjaycsICd3YXRjaHBhY2snXS5maW5kKHBhdGggPT4ge1xuICAgIHJldHVybiBfZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgcGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKSk7XG4gIH0pO1xuICBpZiAoIXdhdGNocGFja1BhdGgpIHtcbiAgICBsb2cud2FybignQ2FuIG5vdCBmaW5kIHdhdGNocGFjaywgcGxlYXNlIG1ha2Ugc3VyZSBXZWJwYWNrIGlzIGluc3RhbGxlZC4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHdhdGNocGFja1BhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJyk7XG4gIGlmIChfZnMuZXhpc3RzU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJykpXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbyhgaGFja2luZyAke3RhcmdldH1cXG5cXHQgdG8gd29ya2Fyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MWApO1xuICBfZnMucmVuYW1lU3luYyh0YXJnZXQsIHRhcmdldCArICcuZHJjcC1iYWsnKTtcbiAgX2ZzLndyaXRlRmlsZVN5bmModGFyZ2V0LFxuICAgIF9mcy5yZWFkRmlsZVN5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycsICd1dGY4JykucmVwbGFjZSgvXFxXZm9sbG93U3ltbGlua3M6XFxzZmFsc2UvZywgJ2ZvbGxvd1N5bWxpbmtzOiB0cnVlJyksICd1dGY4Jyk7XG59XG4iXX0=
