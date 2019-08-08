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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBEQUEyRDtBQUMzRCxzREFBZ0M7QUFDaEMsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyxtREFBNkI7QUFFN0IsMERBQXdCO0FBRXhCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsMkRBQWlDO0FBRWpDLHlEQUErQjtBQUUvQixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXZDLGtDQUFrQztBQUNsQyx5RUFBeUU7QUFDekUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsU0FBZ0IsT0FBTztJQUNyQixrQ0FBa0M7QUFDcEMsQ0FBQztBQUZELDBCQUVDO0FBRVUsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLGVBQWU7UUFDZixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMseURBQXlELENBQUMsRUFBRTtZQUM3RSxHQUFHLENBQUMsVUFBVSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO1FBQzFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FB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QUFhLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztJQUMxRixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztRQUN0QyxPQUFPO0lBQ1QsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLE1BQU0sMEVBQTBFLENBQUMsQ0FBQztJQUN0RyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDN0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQ3RCLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN6SCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NlcnZlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IHsgYm94U3RyaW5nIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgUmVwbGFjZW1lbnRJbmYsIFRzSGFuZGxlciB9IGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5cbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnLXdlYnBhY2snO1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWd1cmFibGUnO1xuZXhwb3J0ICogZnJvbSAnLi9uZy1wcmVyZW5kZXInO1xuZXhwb3J0IHsgQW5ndWxhckNvbmZpZ0hhbmRsZXIgfSBmcm9tICcuL25nL2NoYW5nZS1jbGktb3B0aW9ucyc7XG5leHBvcnQgKiBmcm9tICcuL25nL2NvbW1vbic7XG5cbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3Qge3JlZCwgeWVsbG93fSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8vIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcbi8vIGNvbnN0IHN5c0ZzID0gZnMgYXMgdHlwZW9mIF9mcyAmIHtta2RpcnNTeW5jOiAoZmlsZTogc3RyaW5nKSA9PiB2b2lkfTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoKSB7XG4gIC8vIHJldHVybiBzZXR1cEFwaUZvckFuZ3VsYXJDbGkoKTtcbn1cblxuZXhwb3J0IGxldCB0c0hhbmRsZXI6IFRzSGFuZGxlciA9IHJlc29sdmVJbXBvcnRzO1xuZnVuY3Rpb24gcmVzb2x2ZUltcG9ydHMoc3JjOiB0cy5Tb3VyY2VGaWxlKTogUmVwbGFjZW1lbnRJbmZbXSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gIC8vIHByaW50SGVscCgpO1xuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMnKSkge1xuICAgIF9mcy5yZW1vdmVTeW5jKCdub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzJyk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyB3YWl0IGZvciBkZWxldGVcbiAgaWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcbiAgLy8gd3JpdGVUc2NvbmZpZygpO1xuICBoYWNrRml4V2F0Y2hwYWNrKCk7XG4gIHdyaXRlVHNjb25maWc0RWRpdG9yKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gc2V0dXBBcGlGb3JBbmd1bGFyQ2xpKCkge1xuLy8gXHRjb25zdCBuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSBhcGkuY29uZmlnKCkuX2FuZ3VsYXJDbGk7XG4vLyBcdGlmICghbmdQYXJhbSB8fCBhcGkubmdFbnRyeUNvbXBvbmVudClcbi8vIFx0XHRyZXR1cm47XG4vLyBcdGNvbnN0IGRlcGxveVVybCA9IHdlYnBhY2tDb25maWcub3V0cHV0LnB1YmxpY1BhdGggfHwgYXBpLmNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKTtcblxuLy8gXHRjb25zdCBwdWJsaWNVcmxPYmogPSBVcmwucGFyc2UoZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbi8vIFx0T2JqZWN0LmFzc2lnbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSwge1xuLy8gXHRcdGRlcGxveVVybCxcbi8vIFx0XHRzc3I6IG5nUGFyYW0uc3NyLFxuLy8gXHRcdG5nQmFzZVJvdXRlclBhdGg6IF8udHJpbShwdWJsaWNVcmxPYmoucGF0aG5hbWUsICcvJyksXG4vLyBcdFx0bmdSb3V0ZXJQYXRoLFxuLy8gXHRcdHNzclJlcXVpcmUocmVxdWlyZVBhdGg6IHN0cmluZykge1xuLy8gXHRcdFx0aWYgKG5nUGFyYW0uc3NyKVxuLy8gXHRcdFx0XHRyZXR1cm4gcmVxdWlyZShQYXRoLmpvaW4odGhpcy5fX2Rpcm5hbWUsIHJlcXVpcmVQYXRoKSk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0YXdhaXQgY2hhbmdlV2VicGFja0NvbmZpZyhuZ1BhcmFtLCB3ZWJwYWNrQ29uZmlnLCBhcGkuY29uZmlnKCkpO1xuLy8gXHRsb2cuaW5mbygnU2V0dXAgYXBpIG9iamVjdCBmb3IgQW5ndWxhcicpO1xuLy8gfVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuICBjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJ34wLjgwMi4wJyxcbiAgICAnQGFuZ3VsYXIvY2xpJzogJ344LjIuMCcsXG4gICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICd+OC4yLjAnLFxuICAgICdAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlJzogJ344LjIuMCdcbiAgfTtcbiAgbGV0IHZhbGlkID0gdHJ1ZTtcbiAgXy5lYWNoKGRlcHMsIChleHBlY3RWZXIsIG1vZCkgPT4ge1xuICAgIGNvbnN0IHZlciA9IHJlcXVpcmUobW9kICsgJy9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuICAgIGlmICghc2VtdmVyLnNhdGlzZmllcyh2ZXIsIGV4cGVjdFZlcikpIHtcbiAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICBsb2cuZXJyb3IoeWVsbG93KGBJbnN0YWxsZWQgZGVwZW5kZW5jeSBcIiR7bW9kfUBgKSArIHJlZCh2ZXIpICsgeWVsbG93KGBcIiB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQsIGluc3RhbGwgJHtleHBlY3RWZXJ9IGluc3RlYWQuYCkpO1xuICAgIH1cbiAgfSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy93ZWJwYWNrL3BhY2thZ2UuanNvbicpO1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9IGNhdGNoIChleCkge31cblxuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQnKSkge1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrJykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2tcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGVfbW9kdWxlcy9yeGpzL3BhY2thZ2UuanNvbicpO1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9IGNhdGNoIChleCkge31cbiAgcmV0dXJuIHZhbGlkO1xufVxuXG4vLyBmdW5jdGlvbiBwcmludEhlbHAoKSB7XG4vLyBcdC8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbi8vIFx0Y29uc29sZS5sb2coJ1xcblxcbiAgSWYgeW91IHdhbnQgdG8gbmFycm93IGRvd24gdG8gb25seSBzcGVjaWZpYyBtb2R1bGVzIGZvciBBbmd1bGFyIHRvIGJ1aWxkL3NlcnZlLCB0cnlcXG4gICAgJyArXG4vLyBcdFx0eWVsbG93KCdkcmNwIGluaXQgLS1wcm9wIEBkci1jb3JlL25nLWFwcC1idWlsZGVyLnBhY2thZ2VzPTxwYWNrYWdlTmFtZSwuLi4+JykgKyAnXFxuICAnICtcbi8vIFx0XHQnT3IgdGhyb3VnaCBhIGNvbmZpZ3VyYXRpb24gZmlsZTpcXG4nICtcbi8vIFx0XHR5ZWxsb3coJyAgICBkcmNwIGluaXQgLWMgPG90aGVyIGZpbGVzPiBtb2R1bGVzLnlhbWxcXG4nKSArXG4vLyBcdFx0JyAgbW9kdWxlcy55YW1sOlxcbicgK1xuLy8gXHRcdGN5YW4oJyAgJy5yZXBlYXQoMSkgKyAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXI6XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgyKSArICdwYWNrYWdlczpcXG4nICtcbi8vIFx0XHRcdCcgICcucmVwZWF0KDMpICsgJy0gPHBhY2thZ2VOYW1lIDE+XFxuJyArXG4vLyBcdFx0XHQnICAnLnJlcGVhdCgzKSArICctIDxwYWNrYWdlTmFtZSAyPlxcbicpXG4vLyBcdCk7XG4vLyB9XG5cbmZ1bmN0aW9uIHdyaXRlVHNjb25maWc0RWRpdG9yKCkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsXG4gIH07XG4gIC8vIC0tLS0tLS0gV3JpdGUgdHNjb25maWcuanNvbiBmb3IgVmlzdWFsIENvZGUgRWRpdG9yIC0tLS0tLS0tXG5cbiAgbGV0IHNyY0RpckNvdW50ID0gMDtcbiAgY29uc3Qgcm9vdCA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcblxuICBjb25zdCBwYWNrYWdlVG9SZWFsUGF0aDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKVxuICAuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHJlYWxEaXIgPSBfZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcbiAgICAvLyBQYXRoLnJlbGF0aXZlKHJvb3QsIHJlYWxEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYWNrYWdlVG9SZWFsUGF0aC5wdXNoKFtuYW1lLCByZWFsRGlyXSk7XG4gIH0sICdzcmMnKTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgZm9yIChsZXQgcHJvaiBvZiBhcGkuY29uZmlnKCkucHJvamVjdExpc3QpIHtcbiAgICB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICAgIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpKTtcbiAgICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICAgIH1cbiAgICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgdHNqc29uLmluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIHRzanNvbi5pbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgICAgc3JjRGlyQ291bnQrKztcbiAgICB9KTtcbiAgICBsb2cuaW5mbygnV3JpdGUgdHNjb25maWcuanNvbiB0byAnICsgcHJvaik7XG4gICAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCByZWFsUGF0aF0gb2YgcGFja2FnZVRvUmVhbFBhdGgpIHtcbiAgICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gICAgfVxuXG4gICAgY29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgX2ZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgICAvLyBwYXRoTWFwcGluZ1snKiddID0gWydub2RlX21vZHVsZXMvKicsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXTtcblxuICAgIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgICByb290RGlyOiAnLi8nLFxuICAgICAgYmFzZVVybDogcm9vdCxcbiAgICAgIHBhdGhzOiBwYXRoTWFwcGluZyxcbiAgICAgIHR5cGVSb290czogW1xuICAgICAgICBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgICAgUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAgIFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG4gICAgICBdLFxuICAgICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgICBtb2R1bGU6ICdjb21tb25qcydcbiAgICB9O1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICAgIGlmIChfZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShfZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKSk7XG4gICAgICBjb25zdCBjbyA9IGV4aXN0aW5nSnNvbi5jb21waWxlck9wdGlvbnM7XG4gICAgICBjb25zdCBuZXdDbyA9IHRzanNvbi5jb21waWxlck9wdGlvbnM7XG4gICAgICBjby50eXBlUm9vdHMgPSBuZXdDby50eXBlUm9vdHM7XG4gICAgICBjby5iYXNlVXJsID0gbmV3Q28uYmFzZVVybDtcbiAgICAgIGNvLnBhdGhzID0gbmV3Q28ucGF0aHM7XG4gICAgICBjby5yb290RGlyID0gbmV3Q28ucm9vdERpcjtcblxuICAgICAgZXhpc3RpbmdKc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcztcbiAgICAgIGV4aXN0aW5nSnNvbi5pbmNsdWRlID0gdHNqc29uLmluY2x1ZGU7XG5cbiAgICAgIF9mcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2ZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyksIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH1cbiAgfVxuXG5cbiAgaWYgKHNyY0RpckNvdW50ID4gMCkge1xuICAgIGxvZy5pbmZvKCdcXG4nICsgYm94U3RyaW5nKCdUbyBiZSBmcmllbmRseSB0byB5b3VyIGVkaXRvciwgd2UganVzdCBhZGRlZCB0c2NvbmZpZy5qc29uIGZpbGUgdG8gZWFjaCBvZiB5b3VyIHByb2plY3QgZGlyZWN0b3JpZXMsXFxuJyArXG4gICAgJ0J1dCBwbGVhc2UgYWRkIFwidHNjb25maWcuanNvblwiIHRvIHlvdXIgLmdpdGluZ29yZSBmaWxlLFxcbicgK1xuICAgICdzaW5jZSB0aGVzZSB0c2NvbmZpZy5qc29uIGFyZSBnZW5lcmF0ZWQgYmFzZWQgb24geW91ciBsb2NhbCB3b3Jrc3BhY2UgbG9jYXRpb24uJykpO1xuICB9XG59XG5cblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxXG4gKi9cbmZ1bmN0aW9uIGhhY2tGaXhXYXRjaHBhY2soKSB7XG4gIGNvbnN0IHdhdGNocGFja1BhdGggPSBbJ3dlYnBhY2svbm9kZV9tb2R1bGVzL3dhdGNocGFjaycsICd3YXRjaHBhY2snXS5maW5kKHBhdGggPT4ge1xuICAgIHJldHVybiBfZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgcGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKSk7XG4gIH0pO1xuICBpZiAoIXdhdGNocGFja1BhdGgpIHtcbiAgICBsb2cud2FybignQ2FuIG5vdCBmaW5kIHdhdGNocGFjaywgcGxlYXNlIG1ha2Ugc3VyZSBXZWJwYWNrIGlzIGluc3RhbGxlZC4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHdhdGNocGFja1BhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJyk7XG4gIGlmIChfZnMuZXhpc3RzU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJykpXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbyhgaGFja2luZyAke3RhcmdldH1cXG5cXHQgdG8gd29ya2Fyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MWApO1xuICBfZnMucmVuYW1lU3luYyh0YXJnZXQsIHRhcmdldCArICcuZHJjcC1iYWsnKTtcbiAgX2ZzLndyaXRlRmlsZVN5bmModGFyZ2V0LFxuICAgIF9mcy5yZWFkRmlsZVN5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycsICd1dGY4JykucmVwbGFjZSgvXFxXZm9sbG93U3ltbGlua3M6XFxzZmFsc2UvZywgJ2ZvbGxvd1N5bWxpbmtzOiB0cnVlJyksICd1dGY4Jyk7XG59XG4iXX0=
