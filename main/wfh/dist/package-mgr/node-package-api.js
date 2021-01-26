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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable max-line-length
const events_1 = require("events");
const config_1 = __importDefault(require("../config"));
const css_loader_1 = __importDefault(require("require-injector/dist/css-loader"));
const assetsUrl = __importStar(require("../../dist/assets-url"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = require("log4js");
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
function parseName(longName) {
    const ret = { name: longName, scope: '' };
    const match = moduleNameReg.exec(longName);
    if (match) {
        ret.scope = match[1];
        ret.name = match[2];
    }
    return ret;
}
// module.exports = NodeApi;
// module.exports.default = NodeApi; // To be available for ES6/TS import syntax 
// var suppressWarn4Urls = config.get('suppressWarning.assetsUrl', []).map(line => new RegExp(line));
class NodeApi {
    constructor(packageName, packageInstance) {
        this.packageName = packageName;
        this.packageInstance = packageInstance;
        // TODO: deprecated, should be removed
        this.buildUtils = require('../../lib/gulp/buildUtils');
        // packageUtils = packageUitls;
        this.compileNodePath = [config_1.default().nodePath];
        this.config = config_1.default;
        this.packageShortName = parseName(packageName).name;
        this.contextPath = this._contextPath();
        this.logger = log4js_1.getLogger(this.packageName);
    }
    isBrowser() {
        return false;
    }
    isNode() {
        return true;
    }
    addBrowserSideConfig(path, value) {
        this.config.set(path, value);
        this.config().browserSideConfigProp.push(path);
    }
    getProjectDirs() {
        return this.config().projectList;
    }
    /**
       * @param {string} url
       * @param {string} sourceFile
       * @return {string} | {packageName: string, path: string, isTilde: boolean, isPage: boolean}, returns string if it is a relative path, or object if
       * it is in format of /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^\/]+\/)?[^\/]+)?\/(.*)$/
       */
    normalizeAssetsUrl(url, sourceFile) {
        const match = /^(?:assets:\/\/|~|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(url);
        if (match) {
            let packageName = match[2];
            const relPath = match[3] || '';
            if (!packageName || packageName === '') {
                const compPackage = this.findPackageByFile(sourceFile);
                if (compPackage == null)
                    throw new Error(`${sourceFile} does not belong to any known package`);
                packageName = compPackage.longName;
            }
            const injectedPackageName = css_loader_1.default.getInjectedPackage(packageName, sourceFile, this.browserInjector);
            if (injectedPackageName)
                packageName = injectedPackageName;
            return {
                packageName,
                path: relPath,
                isTilde: url.charAt(0) === '~',
                isPage: match[1] != null || lodash_1.default.startsWith(url, 'page://'),
                locale: match[1]
            };
        }
        else {
            return url;
        }
    }
    /**
       * join contextPath
       * @param {string} path
       * @return {[type]} [description]
       */
    joinContextPath(path) {
        return (this.contextPath + '/' + path).replace(/\/\//g, '/');
    }
    _contextPath(packageName) {
        let packageShortName;
        if (!packageName) {
            packageName = this.packageName;
            packageShortName = this.parsePackageName(packageName).name;
        }
        else {
            packageShortName = this.packageShortName;
        }
        var path = config_1.default.get('packageContextPathMapping[' + packageShortName + ']') ||
            config_1.default.get(['packageContextPathMapping', packageName]);
        path = path != null ? path : '/' + packageShortName;
        if (this.config().nodeRoutePath) {
            path = this.config().nodeRoutePath + '/' + path;
        }
        return path.replace(/\/\/+/g, '/');
    }
    parsePackageName(packageName) {
        return parseName(packageName);
    }
    isDefaultLocale() {
        return this.config.get('locales[0]') === this.getBuildLocale();
    }
    getBuildLocale() {
        return this.argv.locale || this.config.get('locales[0]');
    }
}
NodeApi.prototype.eventBus = new events_1.EventEmitter();
assetsUrl.patchToApi(NodeApi.prototype);
module.exports = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsbUNBQW9DO0FBRXBDLHVEQUErQjtBQUUvQixrRkFBa0U7QUFFbEUsaUVBQW1EO0FBS25ELG9EQUF1QjtBQUN2QixtQ0FBeUM7QUFFekMsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsU0FBUyxTQUFTLENBQUMsUUFBZ0I7SUFDakMsTUFBTSxHQUFHLEdBQUcsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLElBQUksS0FBSyxFQUFFO1FBQ1QsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFDRCw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFtQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWYvRSxzQ0FBc0M7UUFDdEMsZUFBVSxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2xELCtCQUErQjtRQUMvQixvQkFBZSxHQUFHLENBQUMsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLFdBQU0sR0FBRyxnQkFBTSxDQUFDO1FBV2QsSUFBSSxDQUFDLGdCQUFn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Q0FBQztZQUMxRSxnQkFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDekQsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFnQixDQUFDO1FBQ3BELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRTtZQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsV0FBbUI7UUFDbEMsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0lBQ0QsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQWFGO0FBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxxQkFBWSxFQUFFLENBQUM7QUFDaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEMsaUJBQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQge0V2ZW50RW1pdHRlcn0gZnJvbSAnZXZlbnRzJztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5pbXBvcnQgbnBtaW1wb3J0Q3NzTG9hZGVyIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9jc3MtbG9hZGVyJztcbmltcG9ydCBJbmplY3QgZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgKiBhcyBhc3NldHNVcmwgZnJvbSAnLi4vLi4vZGlzdC9hc3NldHMtdXJsJztcbmltcG9ydCB7UGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG4vLyBpbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZS1pbnN0YW5jZSc7XG4vLyBpbXBvcnQgTm9kZVBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtMb2dnZXIsIGdldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJldCA9IHtuYW1lOiBsb25nTmFtZSwgc2NvcGU6ICcnfTtcbiAgY29uc3QgbWF0Y2ggPSBtb2R1bGVOYW1lUmVnLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXQuc2NvcGUgPSBtYXRjaFsxXTtcbiAgICByZXQubmFtZSA9IG1hdGNoWzJdO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSBpbXBsZW1lbnRzIGFzc2V0c1VybC5QYWNrYWdlQXBpIHtcbiAgcGFja2FnZVNob3J0TmFtZTogc3RyaW5nO1xuICBjb250ZXh0UGF0aDogc3RyaW5nO1xuXG4gIC8vIFRPRE86IGRlcHJlY2F0ZWQsIHNob3VsZCBiZSByZW1vdmVkXG4gIGJ1aWxkVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9saWIvZ3VscC9idWlsZFV0aWxzJyk7XG4gIC8vIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcbiAgbG9nZ2VyOiBMb2dnZXI7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSA9PiBOb2RlQXBpO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlTmFtZTogc3RyaW5nLCBwdWJsaWMgcGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgPSBwYXJzZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgdGhpcy5jb250ZXh0UGF0aCA9IHRoaXMuX2NvbnRleHRQYXRoKCk7XG4gICAgdGhpcy5sb2dnZXIgPSBnZXRMb2dnZXIodGhpcy5wYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0Jyb3dzZXIoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNOb2RlKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkQnJvd3NlclNpZGVDb25maWcocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgdGhpcy5jb25maWcuc2V0KHBhdGgsIHZhbHVlKTtcbiAgICB0aGlzLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgZ2V0UHJvamVjdERpcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnKCkucHJvamVjdExpc3Q7XG4gIH1cbiAgLyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUZpbGVcblx0ICogQHJldHVybiB7c3RyaW5nfSB8IHtwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGlzVGlsZGU6IGJvb2xlYW4sIGlzUGFnZTogYm9vbGVhbn0sIHJldHVybnMgc3RyaW5nIGlmIGl0IGlzIGEgcmVsYXRpdmUgcGF0aCwgb3Igb2JqZWN0IGlmXG5cdCAqIGl0IGlzIGluIGZvcm1hdCBvZiAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXlxcL10rXFwvKT9bXlxcL10rKT9cXC8oLiopJC9cblx0ICovXG4gIG5vcm1hbGl6ZUFzc2V0c1VybCh1cmw6IHN0cmluZywgc291cmNlRmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHVybCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBsZXQgcGFja2FnZU5hbWUgPSBtYXRjaFsyXTtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSBtYXRjaFszXSB8fCAnJztcbiAgICAgIGlmICghcGFja2FnZU5hbWUgfHwgcGFja2FnZU5hbWUgPT09ICcnKSB7XG4gICAgICAgIGNvbnN0IGNvbXBQYWNrYWdlID0gdGhpcy5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlKTtcbiAgICAgICAgaWYgKGNvbXBQYWNrYWdlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3NvdXJjZUZpbGV9IGRvZXMgbm90IGJlbG9uZyB0byBhbnkga25vd24gcGFja2FnZWApO1xuICAgICAgICBwYWNrYWdlTmFtZSA9IGNvbXBQYWNrYWdlLmxvbmdOYW1lO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5qZWN0ZWRQYWNrYWdlTmFtZSA9IG5wbWltcG9ydENzc0xvYWRlci5nZXRJbmplY3RlZFBhY2thZ2UocGFja2FnZU5hbWUsIHNvdXJjZUZpbGUsIHRoaXMuYnJvd3NlckluamVjdG9yKTtcbiAgICAgIGlmIChpbmplY3RlZFBhY2thZ2VOYW1lKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IGluamVjdGVkUGFja2FnZU5hbWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwYXRoOiByZWxQYXRoLFxuICAgICAgICBpc1RpbGRlOiB1cmwuY2hhckF0KDApID09PSAnficsXG4gICAgICAgIGlzUGFnZTogbWF0Y2hbMV0gIT0gbnVsbCB8fCBfLnN0YXJ0c1dpdGgodXJsLCAncGFnZTovLycpLFxuICAgICAgICBsb2NhbGU6IG1hdGNoWzFdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfVxuICAvKipcblx0ICogam9pbiBjb250ZXh0UGF0aFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIGpvaW5Db250ZXh0UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKHRoaXMuY29udGV4dFBhdGggKyAnLycgKyBwYXRoKS5yZXBsYWNlKC9cXC9cXC8vZywgJy8nKTtcbiAgfVxuXG4gIF9jb250ZXh0UGF0aChwYWNrYWdlTmFtZT86IHN0cmluZykge1xuICAgIGxldCBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICghcGFja2FnZU5hbWUpIHtcbiAgICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgfVxuICAgIHZhciBwYXRoID0gY29uZmlnLmdldCgncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZ1snICsgcGFja2FnZVNob3J0TmFtZSArICddJykgfHxcbiAgICAgIGNvbmZpZy5nZXQoWydwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJywgcGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCkge1xuICAgICAgcGF0aCA9IHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCArICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgfVxuXG4gIHBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBwYXJzZU5hbWUocGFja2FnZU5hbWUpO1xuICB9XG5cbiAgaXNEZWZhdWx0TG9jYWxlKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuICB9XG4gIGdldEJ1aWxkTG9jYWxlKCkge1xuICAgIHJldHVybiB0aGlzLmFyZ3YubG9jYWxlIHx8IHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpO1xuICB9XG5cbi8vICAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4vLyAgIH1cblxuLy8gICBsb2NhbGVCdW5kbGVGb2xkZXIoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyAnJyA6IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKSArICcvJztcbi8vICAgfVxuXG4vLyAgIGlzRGVmYXVsdExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbi8vICAgfVxufVxuTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5hc3NldHNVcmwucGF0Y2hUb0FwaShOb2RlQXBpLnByb3RvdHlwZSk7XG5leHBvcnQgPSBOb2RlQXBpO1xuIl19