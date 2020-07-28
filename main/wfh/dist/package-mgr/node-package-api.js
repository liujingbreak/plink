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
const events_1 = __importDefault(require("events"));
const config_1 = __importDefault(require("../config"));
const packageUitls = require('../../lib/packageMgr/packageUtils');
const css_loader_1 = __importDefault(require("require-injector/dist/css-loader"));
const assetsUrl = __importStar(require("../../dist/assets-url"));
// import PackageInstance from '../packageNodeInstance';
const lodash_1 = __importDefault(require("lodash"));
// module.exports = NodeApi;
// module.exports.default = NodeApi; // To be available for ES6/TS import syntax 
// var suppressWarn4Urls = config.get('suppressWarning.assetsUrl', []).map(line => new RegExp(line));
class NodeApi {
    constructor(packageName, packageInstance) {
        this.packageName = packageName;
        this.packageInstance = packageInstance;
        this.buildUtils = require('../../lib/gulp/buildUtils');
        this.packageUtils = packageUitls;
        this.compileNodePath = [config_1.default().nodePath];
        this.config = config_1.default;
        this.packageShortName = packageUitls.parseName(packageName).name;
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
        return this.packageUtils.parseName(packageName);
    }
    isDefaultLocale() {
        return this.config.get('locales[0]') === this.getBuildLocale();
    }
    getBuildLocale() {
        return this.argv.locale || this.config.get('locales[0]');
    }
}
NodeApi.prototype.eventBus = new events_1.default();
assetsUrl.patchToApi(NodeApi.prototype);
module.exports = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsb0RBQWtDO0FBRWxDLHVEQUErQjtBQUMvQixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUVsRSxrRkFBa0U7QUFFbEUsaUVBQW1EO0FBRW5ELHdEQUF3RDtBQUN4RCxvREFBdUI7QUFFdkIsNEJBQTRCO0FBQzVCLGlGQUFpRjtBQUVqRixxR0FBcUc7QUFFckcsTUFBTSxPQUFPO0lBZ0JYLFlBQW1CLFdBQW1CLEVBQVMsZUFBZ0M7UUFBNUQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFiL0UsZUFBVSxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2xELGlCQUFZLEdBQUcsWUFBWSxDQUFDO1FBQzVCLG9CQUFlLEdBQUcsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEMsV0FBTSxHQUFHLGdCQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLEtBQVU7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdCLElB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QUVELGdCQUFnQixDQUFDLFdBQW1CO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0lBQ0QsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQWFGO0FBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxnQkFBWSxFQUFFLENBQUM7QUFDaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEMsaUJBQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IHBhY2thZ2VVaXRscyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuXG5pbXBvcnQgbnBtaW1wb3J0Q3NzTG9hZGVyIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9jc3MtbG9hZGVyJztcbmltcG9ydCBJbmplY3QgZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgKiBhcyBhc3NldHNVcmwgZnJvbSAnLi4vLi4vZGlzdC9hc3NldHMtdXJsJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHBhY2thZ2VJbnN0YW5jZSBhcyBQYWNrYWdlSW5zdGFuY2V9IGZyb20gJy4uL2J1aWxkLXV0aWwvdHMnO1xuLy8gaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gTm9kZUFwaTtcbi8vIG1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXBpOyAvLyBUbyBiZSBhdmFpbGFibGUgZm9yIEVTNi9UUyBpbXBvcnQgc3ludGF4IFxuXG4vLyB2YXIgc3VwcHJlc3NXYXJuNFVybHMgPSBjb25maWcuZ2V0KCdzdXBwcmVzc1dhcm5pbmcuYXNzZXRzVXJsJywgW10pLm1hcChsaW5lID0+IG5ldyBSZWdFeHAobGluZSkpO1xuXG5jbGFzcyBOb2RlQXBpIGltcGxlbWVudHMgYXNzZXRzVXJsLlBhY2thZ2VBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIGNvbnRleHRQYXRoOiBzdHJpbmc7XG4gIGJ1aWxkVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9saWIvZ3VscC9idWlsZFV0aWxzJyk7XG4gIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcblxuICBicm93c2VySW5qZWN0b3I6IEluamVjdDtcbiAgZmluZFBhY2thZ2VCeUZpbGU6IChmaWxlOiBzdHJpbmcpID0+IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbiAgZ2V0Tm9kZUFwaUZvclBhY2thZ2U6IChwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IGFueSkgPT4gYW55O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlTmFtZTogc3RyaW5nLCBwdWJsaWMgcGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgPSBwYWNrYWdlVWl0bHMucGFyc2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIHRoaXMuY29udGV4dFBhdGggPSB0aGlzLl9jb250ZXh0UGF0aCgpO1xuICB9XG5cbiAgaXNCcm93c2VyKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzTm9kZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEJyb3dzZXJTaWRlQ29uZmlnKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgIHRoaXMuY29uZmlnLnNldChwYXRoLCB2YWx1ZSk7XG4gICAgdGhpcy5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaChwYXRoKTtcbiAgfVxuXG4gIGdldFByb2plY3REaXJzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZygpLnByb2plY3RMaXN0O1xuICB9XG4gIC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VGaWxlXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gfCB7cGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpc1RpbGRlOiBib29sZWFuLCBpc1BhZ2U6IGJvb2xlYW59LCByZXR1cm5zIHN0cmluZyBpZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGgsIG9yIG9iamVjdCBpZlxuXHQgKiBpdCBpcyBpbiBmb3JtYXQgb2YgL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW15cXC9dK1xcLyk/W15cXC9dKyk/XFwvKC4qKSQvXG5cdCAqL1xuICBub3JtYWxpemVBc3NldHNVcmwodXJsOiBzdHJpbmcsIHNvdXJjZUZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IG1hdGNoID0gL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW14vXStcXC8pP1teL0BdW14vXSopPyg/OlxcLyhbXkBdLiopPyk/JC8uZXhlYyh1cmwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gbWF0Y2hbMl07XG4gICAgICBjb25zdCByZWxQYXRoID0gbWF0Y2hbM10gfHwgJyc7XG4gICAgICBpZiAoIXBhY2thZ2VOYW1lIHx8IHBhY2thZ2VOYW1lID09PSAnJykge1xuICAgICAgICBjb25zdCBjb21wUGFja2FnZSA9IHRoaXMuZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb21wUGFja2FnZSA9PSBudWxsKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlfSBkb2VzIG5vdCBiZWxvbmcgdG8gYW55IGtub3duIHBhY2thZ2VgKTtcbiAgICAgICAgcGFja2FnZU5hbWUgPSBjb21wUGFja2FnZS5sb25nTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluamVjdGVkUGFja2FnZU5hbWUgPSBucG1pbXBvcnRDc3NMb2FkZXIuZ2V0SW5qZWN0ZWRQYWNrYWdlKHBhY2thZ2VOYW1lLCBzb3VyY2VGaWxlLCB0aGlzLmJyb3dzZXJJbmplY3Rvcik7XG4gICAgICBpZiAoaW5qZWN0ZWRQYWNrYWdlTmFtZSlcbiAgICAgICAgcGFja2FnZU5hbWUgPSBpbmplY3RlZFBhY2thZ2VOYW1lO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgcGF0aDogcmVsUGF0aCxcbiAgICAgICAgaXNUaWxkZTogdXJsLmNoYXJBdCgwKSA9PT0gJ34nLFxuICAgICAgICBpc1BhZ2U6IG1hdGNoWzFdICE9IG51bGwgfHwgXy5zdGFydHNXaXRoKHVybCwgJ3BhZ2U6Ly8nKSxcbiAgICAgICAgbG9jYWxlOiBtYXRjaFsxXVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cbiAgLyoqXG5cdCAqIGpvaW4gY29udGV4dFBhdGhcblx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBqb2luQ29udGV4dFBhdGgocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuICh0aGlzLmNvbnRleHRQYXRoICsgJy8nICsgcGF0aCkucmVwbGFjZSgvXFwvXFwvL2csICcvJyk7XG4gIH1cblxuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpIHtcbiAgICBsZXQgcGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAoIXBhY2thZ2VOYW1lKSB7XG4gICAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYWNrYWdlU2hvcnROYW1lO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGNvbmZpZy5nZXQoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmdbJyArIHBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lXSk7XG4gICAgcGF0aCA9IHBhdGggIT0gbnVsbCA/IHBhdGggOiAnLycgKyBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICh0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGgpIHtcbiAgICAgIHBhdGggPSB0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGggKyAnLycgKyBwYXRoO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7XG4gIH1cblxuICBwYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKHBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlzRGVmYXVsdExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgfVxuICBnZXRCdWlsZExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbiAgfVxuXG4vLyAgIGdldEJ1aWxkTG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmFyZ3YubG9jYWxlIHx8IHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpO1xuLy8gICB9XG5cbi8vICAgbG9jYWxlQnVuZGxlRm9sZGVyKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmlzRGVmYXVsdExvY2FsZSgpID8gJycgOiB0aGlzLmdldEJ1aWxkTG9jYWxlKCkgKyAnLyc7XG4vLyAgIH1cblxuLy8gICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4vLyAgIH1cbn1cbk5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuYXNzZXRzVXJsLnBhdGNoVG9BcGkoTm9kZUFwaS5wcm90b3R5cGUpO1xuZXhwb3J0ID0gTm9kZUFwaTtcbiJdfQ==