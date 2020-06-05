"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const _fs = tslib_1.__importStar(require("fs-extra"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const Path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
// export * from './ng-prerender';
tslib_1.__exportStar(require("./ng/common"), exports);
const semver = require('semver');
const { red, yellow } = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLHNEQUFnQztBQUNoQyxrREFBNEI7QUFDNUIsdURBQWlDO0FBQ2pDLG1EQUE2QjtBQUU3QiwwREFBd0I7QUFJeEIsa0NBQWtDO0FBQ2xDLHNEQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxFQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbkMsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQseUJBQXlCLEVBQUUsQ0FBQztRQUM1QixtQkFBbUI7UUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFORCxvQkFNQztBQUVELFNBQWdCLFFBQVE7QUFDeEIsQ0FBQztBQURELDRCQUNDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsTUFBTSxJQUFJLEdBQTBCO1FBQ2xDLCtCQUErQixFQUFFLFdBQVc7UUFDNUMsY0FBYyxFQUFFLFNBQVM7UUFDekIsdUJBQXVCLEVBQUUsU0FBUztRQUNsQywyQkFBMkIsRUFBRSxTQUFTO0tBQ3ZDLENBQUM7SUFDRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDakIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFT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LE9BQU87S0FDUjtJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO0lBQzFGLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBQ3RDLE9BQU87SUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSwwRUFBMEUsQ0FBQyxDQUFDO0lBQ3RHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztJQUM3QyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFDdEIsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pILENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3Qvc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IFJlcGxhY2VtZW50SW5mLCBUc0hhbmRsZXIgfSBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZ3VyYWJsZSc7XG4vLyBleHBvcnQgKiBmcm9tICcuL25nLXByZXJlbmRlcic7XG5leHBvcnQgKiBmcm9tICcuL25nL2NvbW1vbic7XG5cbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3Qge3JlZCwgeWVsbG93fSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuXG5leHBvcnQgbGV0IHRzSGFuZGxlcjogVHNIYW5kbGVyID0gcmVzb2x2ZUltcG9ydHM7XG5mdW5jdGlvbiByZXNvbHZlSW1wb3J0cyhzcmM6IHRzLlNvdXJjZUZpbGUpOiBSZXBsYWNlbWVudEluZltdIHtcbiAgcmV0dXJuIFtdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcbiAgaWYgKCFjaGVja0FuZ3VsYXJWZXJzaW9uKCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBbmd1bGFyIHZlcnNpb24gY2hlY2sgRXJyb3InKTtcbiAgY2hlY2tBbmd1bGFyQ2xpRGVwVmVyc2lvbigpO1xuICAvLyB3cml0ZVRzY29uZmlnKCk7XG4gIGhhY2tGaXhXYXRjaHBhY2soKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJWZXJzaW9uKCkge1xuICBjb25zdCBkZXBzOiB7W2s6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogJ34wLjgwMy4xMicsXG4gICAgJ0Bhbmd1bGFyL2NsaSc6ICd+OC4zLjEyJyxcbiAgICAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJzogJ344LjIuMTEnLFxuICAgICdAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlJzogJ344LjIuMTEnXG4gIH07XG4gIGxldCB2YWxpZCA9IHRydWU7XG4gIF8uZWFjaChkZXBzLCAoZXhwZWN0VmVyLCBtb2QpID0+IHtcbiAgICBjb25zdCB2ZXIgPSByZXF1aXJlKG1vZCArICcvcGFja2FnZS5qc29uJykudmVyc2lvbjtcbiAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXModmVyLCBleHBlY3RWZXIpKSB7XG4gICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgbG9nLmVycm9yKHllbGxvdyhgSW5zdGFsbGVkIGRlcGVuZGVuY3kgXCIke21vZH1AYCkgKyByZWQodmVyKSArIHllbGxvdyhgXCIgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLCBpbnN0YWxsICR7ZXhwZWN0VmVyfSBpbnN0ZWFkLmApKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvd2VicGFjay9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG5cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0JykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdFwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgaWYgKF9mcy5leGlzdHNTeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFjaycpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrXCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9ub2RlX21vZHVsZXMvcnhqcy9wYWNrYWdlLmpzb24nKTtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiJHtkdXBsaWNhdGV9XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfSBjYXRjaCAoZXgpIHt9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuZnVuY3Rpb24gY2hlY2tBbmd1bGFyQ2xpRGVwVmVyc2lvbigpIHtcbiAgY29uc3QgbmdEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSByZXF1aXJlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9wYWNrYWdlLmpzb24nKS5kZXBlbmRlbmNpZXM7XG4gIGNvbnN0IG91ckRlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLmRlcGVuZGVuY2llcztcblxuICBsZXQgbXNnID0gJyc7XG4gIGZvciAoY29uc3QgbmdEZXAgb2YgT2JqZWN0LmtleXMobmdEZXBzKSkge1xuICAgIGlmIChfLmhhcyhvdXJEZXBzLCBuZ0RlcCkgJiYgb3VyRGVwc1tuZ0RlcF0gIT09IG5nRGVwc1tuZ0RlcF0pIHtcbiAgICAgIG1zZyArPSBgRGlmZmVyZW50IHZlcnNpb24gb2YgZGVwZW5kZW5jeSBiZXR3ZWVuIEBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyIGFuZCBuZy1hcHAtYnVpbGRlcjpcXG4gICR7bmdEZXB9QCR7bmdEZXBzW25nRGVwXX0gdnMgJHtuZ0RlcH1AJHtvdXJEZXBzW25nRGVwXX1cXG5gO1xuICAgIH1cbiAgfVxuICBpZiAobXNnLmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFlvdSBuZWVkIHRvIGNvbnRhY3QgYXV0aG9yIG9mIG5nLWFwcC1idWlsZGVyIGZvcjpcXG4ke21zZ31gKTtcbiAgfVxufVxuXG5cbi8qKlxuICogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MVxuICovXG5mdW5jdGlvbiBoYWNrRml4V2F0Y2hwYWNrKCkge1xuICBjb25zdCB3YXRjaHBhY2tQYXRoID0gWyd3ZWJwYWNrL25vZGVfbW9kdWxlcy93YXRjaHBhY2snLCAnd2F0Y2hwYWNrJ10uZmluZChwYXRoID0+IHtcbiAgICByZXR1cm4gX2ZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHBhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJykpO1xuICB9KTtcbiAgaWYgKCF3YXRjaHBhY2tQYXRoKSB7XG4gICAgbG9nLndhcm4oJ0NhbiBub3QgZmluZCB3YXRjaHBhY2ssIHBsZWFzZSBtYWtlIHN1cmUgV2VicGFjayBpcyBpbnN0YWxsZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyB3YXRjaHBhY2tQYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpO1xuICBpZiAoX2ZzLmV4aXN0c1N5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycpKVxuICAgIHJldHVybjtcbiAgbG9nLmluZm8oYGhhY2tpbmcgJHt0YXJnZXR9XFxuXFx0IHRvIHdvcmthcm91bmQgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFgKTtcbiAgX2ZzLnJlbmFtZVN5bmModGFyZ2V0LCB0YXJnZXQgKyAnLmRyY3AtYmFrJyk7XG4gIF9mcy53cml0ZUZpbGVTeW5jKHRhcmdldCxcbiAgICBfZnMucmVhZEZpbGVTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnLCAndXRmOCcpLnJlcGxhY2UoL1xcV2ZvbGxvd1N5bWxpbmtzOlxcc2ZhbHNlL2csICdmb2xsb3dTeW1saW5rczogdHJ1ZScpLCAndXRmOCcpO1xufVxuIl19
