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
/* eslint-disable  max-len */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsOENBQWdDO0FBQ2hDLDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsMkNBQTZCO0FBRTdCLGtEQUF3QjtBQUd4QixpREFBK0I7QUFDL0Isa0NBQWtDO0FBQ2xDLDhDQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxFQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFdkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFHbkMsUUFBQSxTQUFTLEdBQWMsY0FBYyxDQUFDO0FBQ2pELFNBQVMsY0FBYyxDQUFDLEdBQWtCO0lBQ3hDLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQXNCLElBQUk7O1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQseUJBQXlCLEVBQUUsQ0FBQztRQUM1QixtQkFBbUI7UUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFORCxvQkFNQztBQUVELFNBQWdCLFFBQVE7QUFDeEIsQ0FBQztBQURELDRCQUNDO0FBRUQsU0FBUyxtQkFBbUI7SUFDMUIsTUFBTSxJQUFJLEdBQTBCO1FBQ2xDLCtCQUErQixFQUFFLFdBQVc7UUFDNUMsY0FBYyxFQUFFLFNBQVM7UUFDekIsdUJBQXVCLEVBQUUsU0FBUztRQUNsQywyQkFBMkIsRUFBRSxTQUFTO0tBQ3ZDLENBQUM7SUFDRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7SUFD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R0FBRyxDQUFDLElBQUksQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzNFLE9BQU87S0FDUjtJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxDQUFDO0lBQzFGLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBQ3RDLE9BQU87SUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSwwRUFBMEUsQ0FBQyxDQUFDO0lBQ3RHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztJQUM3QyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFDdEIsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuaW1wb3J0ICogYXMgX2ZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBSZXBsYWNlbWVudEluZiwgVHNIYW5kbGVyIH0gZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcblxuZXhwb3J0ICogZnJvbSAnLi9jb25maWd1cmFibGUnO1xuLy8gZXhwb3J0ICogZnJvbSAnLi9uZy1wcmVyZW5kZXInO1xuZXhwb3J0ICogZnJvbSAnLi9uZy9jb21tb24nO1xuXG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IHtyZWQsIHllbGxvd30gPSByZXF1aXJlKCdjaGFsaycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cblxuZXhwb3J0IGxldCB0c0hhbmRsZXI6IFRzSGFuZGxlciA9IHJlc29sdmVJbXBvcnRzO1xuZnVuY3Rpb24gcmVzb2x2ZUltcG9ydHMoc3JjOiB0cy5Tb3VyY2VGaWxlKTogUmVwbGFjZW1lbnRJbmZbXSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gIGlmICghY2hlY2tBbmd1bGFyVmVyc2lvbigpKVxuICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciB2ZXJzaW9uIGNoZWNrIEVycm9yJyk7XG4gIGNoZWNrQW5ndWxhckNsaURlcFZlcnNpb24oKTtcbiAgLy8gd3JpdGVUc2NvbmZpZygpO1xuICBoYWNrRml4V2F0Y2hwYWNrKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbn1cblxuZnVuY3Rpb24gY2hlY2tBbmd1bGFyVmVyc2lvbigpIHtcbiAgY29uc3QgZGVwczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic6ICd+MC44MDMuMTInLFxuICAgICdAYW5ndWxhci9jbGknOiAnfjguMy4xMicsXG4gICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6ICd+OC4yLjExJyxcbiAgICAnQGFuZ3VsYXIvbGFuZ3VhZ2Utc2VydmljZSc6ICd+OC4yLjExJ1xuICB9O1xuICBsZXQgdmFsaWQgPSB0cnVlO1xuICBfLmVhY2goZGVwcywgKGV4cGVjdFZlciwgbW9kKSA9PiB7XG4gICAgY29uc3QgdmVyID0gcmVxdWlyZShtb2QgKyAnL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG4gICAgaWYgKCFzZW12ZXIuc2F0aXNmaWVzKHZlciwgZXhwZWN0VmVyKSkge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgIGxvZy5lcnJvcih5ZWxsb3coYEluc3RhbGxlZCBkZXBlbmRlbmN5IFwiJHttb2R9QGApICsgcmVkKHZlcikgKyB5ZWxsb3coYFwiIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCwgaW5zdGFsbCAke2V4cGVjdFZlcn0gaW5zdGVhZC5gKSk7XG4gICAgfVxuICB9KTtcblxuICB0cnkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL3dlYnBhY2svcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuXG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdCcpKSB7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIkBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXRcIixcXG5cblx0XHREUkNQIGZhaWxlZCB0byBkZWxldGUgc29tZSBmaWxlcyBmb3IgdW5rbm93IHJlYXNvbiwgcGxlYXNlIHRyeSB0aGlzIGNvbW1hbmQgYWdhaW5gKTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIGlmIChfZnMuZXhpc3RzU3luYygnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvbm9kZV9tb2R1bGVzL0BuZ3Rvb2xzL3dlYnBhY2snKSkge1xuICAgIGxvZy5lcnJvcihgRHVwbGljYXRlIGRlcGVuZGVuY3kgaXMgZm91bmQgaW4gXCJAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9ub2RlX21vZHVsZXMvQG5ndG9vbHMvd2VicGFja1wiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBkdXBsaWNhdGUgPSByZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZV9tb2R1bGVzL3J4anMvcGFja2FnZS5qc29uJyk7XG4gICAgbG9nLmVycm9yKGBEdXBsaWNhdGUgZGVwZW5kZW5jeSBpcyBmb3VuZCBpbiBcIiR7ZHVwbGljYXRlfVwiLFxcblxuXHRcdERSQ1AgZmFpbGVkIHRvIGRlbGV0ZSBzb21lIGZpbGVzIGZvciB1bmtub3cgcmVhc29uLCBwbGVhc2UgdHJ5IHRoaXMgY29tbWFuZCBhZ2FpbmApO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH0gY2F0Y2ggKGV4KSB7fVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQW5ndWxhckNsaURlcFZlcnNpb24oKSB7XG4gIGNvbnN0IG5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0gcmVxdWlyZSgnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvcGFja2FnZS5qc29uJykuZGVwZW5kZW5jaWVzO1xuICBjb25zdCBvdXJEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS5kZXBlbmRlbmNpZXM7XG5cbiAgbGV0IG1zZyA9ICcnO1xuICBmb3IgKGNvbnN0IG5nRGVwIG9mIE9iamVjdC5rZXlzKG5nRGVwcykpIHtcbiAgICBpZiAoXy5oYXMob3VyRGVwcywgbmdEZXApICYmIG91ckRlcHNbbmdEZXBdICE9PSBuZ0RlcHNbbmdEZXBdKSB7XG4gICAgICBtc2cgKz0gYERpZmZlcmVudCB2ZXJzaW9uIG9mIGRlcGVuZGVuY3kgYmV0d2VlbiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhciBhbmQgbmctYXBwLWJ1aWxkZXI6XFxuICAke25nRGVwfUAke25nRGVwc1tuZ0RlcF19IHZzICR7bmdEZXB9QCR7b3VyRGVwc1tuZ0RlcF19XFxuYDtcbiAgICB9XG4gIH1cbiAgaWYgKG1zZy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBZb3UgbmVlZCB0byBjb250YWN0IGF1dGhvciBvZiBuZy1hcHAtYnVpbGRlciBmb3I6XFxuJHttc2d9YCk7XG4gIH1cbn1cblxuXG4vKipcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dhdGNocGFjay9pc3N1ZXMvNjFcbiAqL1xuZnVuY3Rpb24gaGFja0ZpeFdhdGNocGFjaygpIHtcbiAgY29uc3Qgd2F0Y2hwYWNrUGF0aCA9IFsnd2VicGFjay9ub2RlX21vZHVsZXMvd2F0Y2hwYWNrJywgJ3dhdGNocGFjayddLmZpbmQocGF0aCA9PiB7XG4gICAgcmV0dXJuIF9mcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzLycgKyBwYXRoICsgJy9saWIvRGlyZWN0b3J5V2F0Y2hlci5qcycpKTtcbiAgfSk7XG4gIGlmICghd2F0Y2hwYWNrUGF0aCkge1xuICAgIGxvZy53YXJuKCdDYW4gbm90IGZpbmQgd2F0Y2hwYWNrLCBwbGVhc2UgbWFrZSBzdXJlIFdlYnBhY2sgaXMgaW5zdGFsbGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy8nICsgd2F0Y2hwYWNrUGF0aCArICcvbGliL0RpcmVjdG9yeVdhdGNoZXIuanMnKTtcbiAgaWYgKF9mcy5leGlzdHNTeW5jKHRhcmdldCArICcuZHJjcC1iYWsnKSlcbiAgICByZXR1cm47XG4gIGxvZy5pbmZvKGBoYWNraW5nICR7dGFyZ2V0fVxcblxcdCB0byB3b3JrYXJvdW5kIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93YXRjaHBhY2svaXNzdWVzLzYxYCk7XG4gIF9mcy5yZW5hbWVTeW5jKHRhcmdldCwgdGFyZ2V0ICsgJy5kcmNwLWJhaycpO1xuICBfZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsXG4gICAgX2ZzLnJlYWRGaWxlU3luYyh0YXJnZXQgKyAnLmRyY3AtYmFrJywgJ3V0ZjgnKS5yZXBsYWNlKC9cXFdmb2xsb3dTeW1saW5rczpcXHNmYWxzZS9nLCAnZm9sbG93U3ltbGlua3M6IHRydWUnKSwgJ3V0ZjgnKTtcbn1cbiJdfQ==