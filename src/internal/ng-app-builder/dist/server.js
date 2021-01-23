"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.init = exports.tsHandler = void 0;
/* tslint:disable max-line-length */
const _fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const log4js = __importStar(require("log4js"));
const Path = __importStar(require("path"));
const __api_1 = __importDefault(require("__api"));
__exportStar(require("./configurable"), exports);
// export * from './ng-prerender';
__exportStar(require("./ng/common"), exports);
const semver = require('semver');
const { red, yellow } = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
exports.tsHandler = resolveImports;
function resolveImports(src) {
    return [];
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsOENBQWdDO0FBQ2hDLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsMkNBQTZCO0FBRTdCLGtEQUF3QjtBQUd4QixpREFBK0I7QUFDL0Isa0NBQWtDO0FBQ2xDLDhDQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxFQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbkMsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQseUJBQXlCLEVBQUUsQ0FBQztRQUM1QixtQkFBbUI7UUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFORCxvQkFNQztBQUVELFNBQWdCLFFBQVE7QUFDeEIsQ0FBQztBQURELDRCQUNDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsTUFBTSxJQUFJLEdBQTBCO1FBQ2xDLCtCQUErQixFQUFFLFdBQVc7UUFDNUMsY0FBYyxFQUFFLFNBQVM7UUFDekIsdUJBQXVCLEVBQUUsU0FBUztRQUNsQywyQkFBMkIsRUFBRSxTQUFTO0tBQ3ZDLENBQUM7SUFDRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7SUFD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R0FBRyxDQUFDLElBQUksQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzNFLE9BQU87S0FDUjtJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO0lBQzFGLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBQ3RDLE9BQU87SUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSwwRUFBMEUsQ0FBQyxDQUFDO0lBQ3RHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztJQUM3QyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFDdEIsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIF9mcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgUmVwbGFjZW1lbnRJbmYsIFRzSGFuZGxlciB9IGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5cbmV4cG9ydCAqIGZyb20gJy4vY29uZmlndXJhYmxlJztcbi8vIGV4cG9ydCAqIGZyb20gJy4vbmctcHJlcmVuZGVyJztcbmV4cG9ydCAqIGZyb20gJy4vbmcvY29tbW9uJztcblxuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCB7cmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5cbmV4cG9ydCBsZXQgdHNIYW5kbGVyOiBUc0hhbmRsZXIgPSByZXNvbHZlSW1wb3J0cztcbmZ1bmN0aW9uIHJlc29sdmVJbXBvcnRzKHNyYzogdHMuU291cmNlRmlsZSk6IFJlcGxhY2VtZW50SW5mW10ge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICBpZiAoIWNoZWNrQW5ndWxhclZlcnNpb24oKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgdmVyc2lvbiBjaGVjayBFcnJvcicpO1xuICBjaGVja0FuZ3VsYXJDbGlEZXBWZXJzaW9uKCk7XG4gIC8vIHdyaXRlVHNjb25maWcoKTtcbiAgaGFja0ZpeFdhdGNocGFjaygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQW5ndWxhclZlcnNpb24oKSB7XG4gIGNvbnN0IGRlcHM6IHtbazogc3RyaW5nXTogc3RyaW5nfSA9IHtcbiAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiAnfjAuODAzLjEyJyxcbiAgICAnQGFuZ3VsYXIvY2xpJzogJ344LjMuMTInLFxuICAgICdAYW5ndWxhci9jb21waWxlci1jbGknOiAnfjguMi4xMScsXG4gICAgJ0Bhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2UnOiAnfjguMi4xMSdcbiAgfTtcbiAgbGV0IHZhbGlkID0gdHJ1ZTtcbiAgXy5lYWNoKGRlcHMsIChleHBlY3RWZXIsIG1vZCkgPT4ge1xuICAgIGNvbnN0IHZlciA9IHJlcXVpcmUobW9kICsgJy9wYWNrYWdlLmpzb24nKS52ZXJzaW9uO1xuICAgIGlmICghc2VtdmVyLnNhdGlzZmllcyh2ZXIsIGV4cGVjdFZlcikpIHtcbiAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICBsb2cuZXJyb3IoeWVsbG93KGBJbnN0YWxsZWQgZGVwZW5kZW5jeSBcIiR7bW9kfUBgKSArIHJlZCh2ZXIpICsgeWVsbG93KGBcIiB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQsIGluc3RhbGwgJHtleHBlY3RWZXJ9IGluc3RlYWQuYCkpO1xuICAgIH1cbiAgfSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy93ZWJwYWNrL3BhY2thZ2UuanNvbicpO1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9IGNhdGNoIChleCkge31cblxuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQnKSkge1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0XCIsXFxuXG5cdFx0RFJDUCBmYWlsZWQgdG8gZGVsZXRlIHNvbWUgZmlsZXMgZm9yIHVua25vdyByZWFzb24sIHBsZWFzZSB0cnkgdGhpcyBjb21tYW5kIGFnYWluYCk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICBpZiAoX2ZzLmV4aXN0c1N5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9Abmd0b29scy93ZWJwYWNrJykpIHtcbiAgICBsb2cuZXJyb3IoYER1cGxpY2F0ZSBkZXBlbmRlbmN5IGlzIGZvdW5kIGluIFwiQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2tcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIHRyeSB7XG4gICAgY29uc3QgZHVwbGljYXRlID0gcmVxdWlyZS5yZXNvbHZlKCdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L25vZGVfbW9kdWxlcy9yeGpzL3BhY2thZ2UuanNvbicpO1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCIke2R1cGxpY2F0ZX1cIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9IGNhdGNoIChleCkge31cbiAgcmV0dXJuIHZhbGlkO1xufVxuXG5mdW5jdGlvbiBjaGVja0FuZ3VsYXJDbGlEZXBWZXJzaW9uKCkge1xuICBjb25zdCBuZ0RlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHJlcXVpcmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3BhY2thZ2UuanNvbicpLmRlcGVuZGVuY2llcztcbiAgY29uc3Qgb3VyRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJykuZGVwZW5kZW5jaWVzO1xuXG4gIGxldCBtc2cgPSAnJztcbiAgZm9yIChjb25zdCBuZ0RlcCBvZiBPYmplY3Qua2V5cyhuZ0RlcHMpKSB7XG4gICAgaWYgKF8uaGFzKG91ckRlcHMsIG5nRGVwKSAmJiBvdXJEZXBzW25nRGVwXSAhPT0gbmdEZXBzW25nRGVwXSkge1xuICAgICAgbXNnICs9IGBEaWZmZXJlbnQgdmVyc2lvbiBvZiBkZXBlbmRlbmN5IGJldHdlZW4gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIgYW5kIG5nLWFwcC1idWlsZGVyOlxcbiAgJHtuZ0RlcH1AJHtuZ0RlcHNbbmdEZXBdfSB2cyAke25nRGVwfUAke291ckRlcHNbbmdEZXBdfVxcbmA7XG4gICAgfVxuICB9XG4gIGlmIChtc2cubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgWW91IG5lZWQgdG8gY29udGFjdCBhdXRob3Igb2YgbmctYXBwLWJ1aWxkZXIgZm9yOlxcbiR7bXNnfWApO1xuICB9XG59XG5cblxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxXG4gKi9cbmZ1bmN0aW9uIGhhY2tGaXhXYXRjaHBhY2soKSB7XG4gIGNvbnN0IHdhdGNocGFja1BhdGggPSBbJ3dlYnBhY2svbm9kZV9tb2R1bGVzL3dhdGNocGFjaycsICd3YXRjaHBhY2snXS5maW5kKHBhdGggPT4ge1xuICAgIHJldHVybiBfZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgcGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKSk7XG4gIH0pO1xuICBpZiAoIXdhdGNocGFja1BhdGgpIHtcbiAgICBsb2cud2FybignQ2FuIG5vdCBmaW5kIHdhdGNocGFjaywgcGxlYXNlIG1ha2Ugc3VyZSBXZWJwYWNrIGlzIGluc3RhbGxlZC4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvJyArIHdhdGNocGFja1BhdGggKyAnL2xpYi9EaXJlY3RvcnlXYXRjaGVyLmpzJyk7XG4gIGlmIChfZnMuZXhpc3RzU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJykpXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbyhgaGFja2luZyAke3RhcmdldH1cXG5cXHQgdG8gd29ya2Fyb3VuZCBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2F0Y2hwYWNrL2lzc3Vlcy82MWApO1xuICBfZnMucmVuYW1lU3luYyh0YXJnZXQsIHRhcmdldCArICcuZHJjcC1iYWsnKTtcbiAgX2ZzLndyaXRlRmlsZVN5bmModGFyZ2V0LFxuICAgIF9mcy5yZWFkRmlsZVN5bmModGFyZ2V0ICsgJy5kcmNwLWJhaycsICd1dGY4JykucmVwbGFjZSgvXFxXZm9sbG93U3ltbGlua3M6XFxzZmFsc2UvZywgJ2ZvbGxvd1N5bWxpbmtzOiB0cnVlJyksICd1dGY4Jyk7XG59XG4iXX0=