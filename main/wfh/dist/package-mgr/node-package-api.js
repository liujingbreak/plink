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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
// import PackageInstance from '../packageNodeInstance';
const lodash_1 = __importDefault(require("lodash"));
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
        this.buildUtils = require('../../lib/gulp/buildUtils');
        // packageUtils = packageUitls;
        this.compileNodePath = [config_1.default().nodePath];
        this.config = config_1.default;
        this.packageShortName = parseName(packageName).name;
        this.contextPath = this._contextPath();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsbUNBQW9DO0FBRXBDLHVEQUErQjtBQUUvQixrRkFBa0U7QUFFbEUsaUVBQW1EO0FBRW5ELHdEQUF3RDtBQUN4RCxvREFBdUI7QUFHdkIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsU0FBUyxTQUFTLENBQUMsUUFBZ0I7SUFDakMsTUFBTSxHQUFHLEdBQUcsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLElBQUksS0FBSyxFQUFFO1FBQ1QsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFDRCw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFnQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWIvRSxlQUFVLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsK0JBQStCO1FBQy9CLG9CQUFlLEdBQUcsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEMsV0FBTSxHQUFHLGdCQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxD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SUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFnQixDQUFDO1FBQ3BELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRTtZQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsV0FBbUI7UUFDbEMsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0lBQ0QsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQWFGO0FBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxxQkFBWSxFQUFFLENBQUM7QUFDaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEMsaUJBQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQge0V2ZW50RW1pdHRlcn0gZnJvbSAnZXZlbnRzJztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG5pbXBvcnQgbnBtaW1wb3J0Q3NzTG9hZGVyIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9jc3MtbG9hZGVyJztcbmltcG9ydCBJbmplY3QgZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgKiBhcyBhc3NldHNVcmwgZnJvbSAnLi4vLi4vZGlzdC9hc3NldHMtdXJsJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHBhY2thZ2VJbnN0YW5jZSBhcyBQYWNrYWdlSW5zdGFuY2V9IGZyb20gJy4uL2J1aWxkLXV0aWwvdHMnO1xuLy8gaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5cblxuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJldCA9IHtuYW1lOiBsb25nTmFtZSwgc2NvcGU6ICcnfTtcbiAgY29uc3QgbWF0Y2ggPSBtb2R1bGVOYW1lUmVnLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXQuc2NvcGUgPSBtYXRjaFsxXTtcbiAgICByZXQubmFtZSA9IG1hdGNoWzJdO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSBpbXBsZW1lbnRzIGFzc2V0c1VybC5QYWNrYWdlQXBpIHtcbiAgcGFja2FnZVNob3J0TmFtZTogc3RyaW5nO1xuICBjb250ZXh0UGF0aDogc3RyaW5nO1xuICBidWlsZFV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbGliL2d1bHAvYnVpbGRVdGlscycpO1xuICAvLyBwYWNrYWdlVXRpbHMgPSBwYWNrYWdlVWl0bHM7XG4gIGNvbXBpbGVOb2RlUGF0aCA9IFtjb25maWcoKS5ub2RlUGF0aF07XG4gIGV2ZW50QnVzOiBFdmVudEVtaXR0ZXI7XG4gIGNvbmZpZyA9IGNvbmZpZztcbiAgYXJndjogYW55O1xuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4gIGRlZmF1bHQ6IE5vZGVBcGk7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogYW55LCBOb2RlQXBpOiBhbnkpID0+IGFueTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGFja2FnZU5hbWU6IHN0cmluZywgcHVibGljIHBhY2thZ2VJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSB7XG4gICAgdGhpcy5wYWNrYWdlU2hvcnROYW1lID0gcGFyc2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIHRoaXMuY29udGV4dFBhdGggPSB0aGlzLl9jb250ZXh0UGF0aCgpO1xuICB9XG5cbiAgaXNCcm93c2VyKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzTm9kZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEJyb3dzZXJTaWRlQ29uZmlnKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgIHRoaXMuY29uZmlnLnNldChwYXRoLCB2YWx1ZSk7XG4gICAgdGhpcy5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaChwYXRoKTtcbiAgfVxuXG4gIGdldFByb2plY3REaXJzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZygpLnByb2plY3RMaXN0O1xuICB9XG4gIC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VGaWxlXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gfCB7cGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpc1RpbGRlOiBib29sZWFuLCBpc1BhZ2U6IGJvb2xlYW59LCByZXR1cm5zIHN0cmluZyBpZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGgsIG9yIG9iamVjdCBpZlxuXHQgKiBpdCBpcyBpbiBmb3JtYXQgb2YgL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW15cXC9dK1xcLyk/W15cXC9dKyk/XFwvKC4qKSQvXG5cdCAqL1xuICBub3JtYWxpemVBc3NldHNVcmwodXJsOiBzdHJpbmcsIHNvdXJjZUZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IG1hdGNoID0gL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW14vXStcXC8pP1teL0BdW14vXSopPyg/OlxcLyhbXkBdLiopPyk/JC8uZXhlYyh1cmwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gbWF0Y2hbMl07XG4gICAgICBjb25zdCByZWxQYXRoID0gbWF0Y2hbM10gfHwgJyc7XG4gICAgICBpZiAoIXBhY2thZ2VOYW1lIHx8IHBhY2thZ2VOYW1lID09PSAnJykge1xuICAgICAgICBjb25zdCBjb21wUGFja2FnZSA9IHRoaXMuZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb21wUGFja2FnZSA9PSBudWxsKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlfSBkb2VzIG5vdCBiZWxvbmcgdG8gYW55IGtub3duIHBhY2thZ2VgKTtcbiAgICAgICAgcGFja2FnZU5hbWUgPSBjb21wUGFja2FnZS5sb25nTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluamVjdGVkUGFja2FnZU5hbWUgPSBucG1pbXBvcnRDc3NMb2FkZXIuZ2V0SW5qZWN0ZWRQYWNrYWdlKHBhY2thZ2VOYW1lLCBzb3VyY2VGaWxlLCB0aGlzLmJyb3dzZXJJbmplY3Rvcik7XG4gICAgICBpZiAoaW5qZWN0ZWRQYWNrYWdlTmFtZSlcbiAgICAgICAgcGFja2FnZU5hbWUgPSBpbmplY3RlZFBhY2thZ2VOYW1lO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgcGF0aDogcmVsUGF0aCxcbiAgICAgICAgaXNUaWxkZTogdXJsLmNoYXJBdCgwKSA9PT0gJ34nLFxuICAgICAgICBpc1BhZ2U6IG1hdGNoWzFdICE9IG51bGwgfHwgXy5zdGFydHNXaXRoKHVybCwgJ3BhZ2U6Ly8nKSxcbiAgICAgICAgbG9jYWxlOiBtYXRjaFsxXVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cbiAgLyoqXG5cdCAqIGpvaW4gY29udGV4dFBhdGhcblx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBqb2luQ29udGV4dFBhdGgocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuICh0aGlzLmNvbnRleHRQYXRoICsgJy8nICsgcGF0aCkucmVwbGFjZSgvXFwvXFwvL2csICcvJyk7XG4gIH1cblxuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpIHtcbiAgICBsZXQgcGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAoIXBhY2thZ2VOYW1lKSB7XG4gICAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYWNrYWdlU2hvcnROYW1lO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGNvbmZpZy5nZXQoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmdbJyArIHBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lXSk7XG4gICAgcGF0aCA9IHBhdGggIT0gbnVsbCA/IHBhdGggOiAnLycgKyBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICh0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGgpIHtcbiAgICAgIHBhdGggPSB0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGggKyAnLycgKyBwYXRoO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7XG4gIH1cblxuICBwYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFyc2VOYW1lKHBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlzRGVmYXVsdExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgfVxuICBnZXRCdWlsZExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbiAgfVxuXG4vLyAgIGdldEJ1aWxkTG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmFyZ3YubG9jYWxlIHx8IHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpO1xuLy8gICB9XG5cbi8vICAgbG9jYWxlQnVuZGxlRm9sZGVyKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmlzRGVmYXVsdExvY2FsZSgpID8gJycgOiB0aGlzLmdldEJ1aWxkTG9jYWxlKCkgKyAnLyc7XG4vLyAgIH1cblxuLy8gICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4vLyAgIH1cbn1cbk5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuYXNzZXRzVXJsLnBhdGNoVG9BcGkoTm9kZUFwaS5wcm90b3R5cGUpO1xuZXhwb3J0ID0gTm9kZUFwaTtcbiJdfQ==