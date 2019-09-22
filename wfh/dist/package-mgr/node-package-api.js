"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
// tslint:disable max-line-length
const events_1 = __importDefault(require("events"));
const config = require('../../lib/config');
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
        this.compileNodePath = [config().nodePath];
        this.config = config;
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
        var path = config.get('packageContextPathMapping[' + packageShortName + ']') ||
            config.get(['packageContextPathMapping', packageName]);
        path = path != null ? path : '/' + packageShortName;
        if (this.config().nodeRoutePath) {
            path = this.config().nodeRoutePath + '/' + path;
        }
        return path.replace(/\/\/+/g, '/');
    }
    parsePackageName(packageName) {
        return this.packageUtils.parseName(packageName);
    }
}
;
NodeApi.prototype.eventBus = new events_1.default();
assetsUrl.patchToApi(NodeApi.prototype);
module.exports = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsb0RBQWtDO0FBRWxDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRWxFLGtGQUFrRTtBQUVsRSxpRUFBbUQ7QUFFbkQsd0RBQXdEO0FBQ3hELG9EQUF1QjtBQUV2Qiw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFnQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWIvRSxlQUFVLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsaUJBQVksR0FBRyxZQUFZLENBQUM7UUFDNUIsb0JBQWUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLFdBQU0sR0FBRyxNQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLEtBQVU7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtB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QyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxXQUFtQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FhRjtBQUFBLENBQUM7QUFDRixPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxJQUFJLGdCQUFZLEVBQUUsQ0FBQztBQUNoRCxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUV4QyxpQkFBUyxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vbGliL2NvbmZpZycpO1xuY29uc3QgcGFja2FnZVVpdGxzID0gcmVxdWlyZSgnLi4vLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5cbmltcG9ydCBucG1pbXBvcnRDc3NMb2FkZXIgZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Nzcy1sb2FkZXInO1xuaW1wb3J0IEluamVjdCBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCAqIGFzIGFzc2V0c1VybCBmcm9tICcuLi8uLi9kaXN0L2Fzc2V0cy11cmwnO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgcGFja2FnZUluc3RhbmNlIGFzIFBhY2thZ2VJbnN0YW5jZX0gZnJvbSAnLi4vYnVpbGQtdXRpbC90cyc7XG4vLyBpbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuLy8gbW9kdWxlLmV4cG9ydHMgPSBOb2RlQXBpO1xuLy8gbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IE5vZGVBcGk7IC8vIFRvIGJlIGF2YWlsYWJsZSBmb3IgRVM2L1RTIGltcG9ydCBzeW50YXggXG5cbi8vIHZhciBzdXBwcmVzc1dhcm40VXJscyA9IGNvbmZpZy5nZXQoJ3N1cHByZXNzV2FybmluZy5hc3NldHNVcmwnLCBbXSkubWFwKGxpbmUgPT4gbmV3IFJlZ0V4cChsaW5lKSk7XG5cbmNsYXNzIE5vZGVBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIGNvbnRleHRQYXRoOiBzdHJpbmc7XG4gIGJ1aWxkVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9saWIvZ3VscC9idWlsZFV0aWxzJyk7XG4gIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcblxuICBicm93c2VySW5qZWN0b3I6IEluamVjdDtcbiAgZmluZFBhY2thZ2VCeUZpbGU6IChmaWxlOiBzdHJpbmcpID0+IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbiAgZ2V0Tm9kZUFwaUZvclBhY2thZ2U6IChwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IGFueSkgPT4gYW55O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlTmFtZTogc3RyaW5nLCBwdWJsaWMgcGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgPSBwYWNrYWdlVWl0bHMucGFyc2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIHRoaXMuY29udGV4dFBhdGggPSB0aGlzLl9jb250ZXh0UGF0aCgpO1xuICB9XG5cbiAgaXNCcm93c2VyKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzTm9kZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEJyb3dzZXJTaWRlQ29uZmlnKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgIHRoaXMuY29uZmlnLnNldChwYXRoLCB2YWx1ZSk7XG4gICAgdGhpcy5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaChwYXRoKTtcbiAgfVxuXG4gIGdldFByb2plY3REaXJzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZygpLnByb2plY3RMaXN0O1xuICB9XG4gIC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VGaWxlXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gfCB7cGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpc1RpbGRlOiBib29sZWFuLCBpc1BhZ2U6IGJvb2xlYW59LCByZXR1cm5zIHN0cmluZyBpZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGgsIG9yIG9iamVjdCBpZlxuXHQgKiBpdCBpcyBpbiBmb3JtYXQgb2YgL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW15cXC9dK1xcLyk/W15cXC9dKyk/XFwvKC4qKSQvXG5cdCAqL1xuICBub3JtYWxpemVBc3NldHNVcmwodXJsOiBzdHJpbmcsIHNvdXJjZUZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IG1hdGNoID0gL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW14vXStcXC8pP1teL0BdW14vXSopPyg/OlxcLyhbXkBdLiopPyk/JC8uZXhlYyh1cmwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gbWF0Y2hbMl07XG4gICAgICBjb25zdCByZWxQYXRoID0gbWF0Y2hbM10gfHwgJyc7XG4gICAgICBpZiAoIXBhY2thZ2VOYW1lIHx8IHBhY2thZ2VOYW1lID09PSAnJykge1xuICAgICAgICBjb25zdCBjb21wUGFja2FnZSA9IHRoaXMuZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb21wUGFja2FnZSA9PSBudWxsKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlfSBkb2VzIG5vdCBiZWxvbmcgdG8gYW55IGtub3duIHBhY2thZ2VgKTtcbiAgICAgICAgcGFja2FnZU5hbWUgPSBjb21wUGFja2FnZS5sb25nTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluamVjdGVkUGFja2FnZU5hbWUgPSBucG1pbXBvcnRDc3NMb2FkZXIuZ2V0SW5qZWN0ZWRQYWNrYWdlKHBhY2thZ2VOYW1lLCBzb3VyY2VGaWxlLCB0aGlzLmJyb3dzZXJJbmplY3Rvcik7XG4gICAgICBpZiAoaW5qZWN0ZWRQYWNrYWdlTmFtZSlcbiAgICAgICAgcGFja2FnZU5hbWUgPSBpbmplY3RlZFBhY2thZ2VOYW1lO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgcGF0aDogcmVsUGF0aCxcbiAgICAgICAgaXNUaWxkZTogdXJsLmNoYXJBdCgwKSA9PT0gJ34nLFxuICAgICAgICBpc1BhZ2U6IG1hdGNoWzFdICE9IG51bGwgfHwgXy5zdGFydHNXaXRoKHVybCwgJ3BhZ2U6Ly8nKSxcbiAgICAgICAgbG9jYWxlOiBtYXRjaFsxXVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cbiAgLyoqXG5cdCAqIGpvaW4gY29udGV4dFBhdGhcblx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBqb2luQ29udGV4dFBhdGgocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuICh0aGlzLmNvbnRleHRQYXRoICsgJy8nICsgcGF0aCkucmVwbGFjZSgvXFwvXFwvL2csICcvJyk7XG4gIH1cblxuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpIHtcbiAgICBsZXQgcGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAoIXBhY2thZ2VOYW1lKSB7XG4gICAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYWNrYWdlU2hvcnROYW1lO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGNvbmZpZy5nZXQoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmdbJyArIHBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lXSk7XG4gICAgcGF0aCA9IHBhdGggIT0gbnVsbCA/IHBhdGggOiAnLycgKyBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICh0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGgpIHtcbiAgICAgIHBhdGggPSB0aGlzLmNvbmZpZygpLm5vZGVSb3V0ZVBhdGggKyAnLycgKyBwYXRoO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7XG4gIH1cblxuICBwYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKHBhY2thZ2VOYW1lKTtcbiAgfVxuXG4vLyAgIGdldEJ1aWxkTG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmFyZ3YubG9jYWxlIHx8IHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpO1xuLy8gICB9XG5cbi8vICAgbG9jYWxlQnVuZGxlRm9sZGVyKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmlzRGVmYXVsdExvY2FsZSgpID8gJycgOiB0aGlzLmdldEJ1aWxkTG9jYWxlKCkgKyAnLyc7XG4vLyAgIH1cblxuLy8gICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4vLyAgIH1cbn07XG5Ob2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbmFzc2V0c1VybC5wYXRjaFRvQXBpKE5vZGVBcGkucHJvdG90eXBlKTtcblxuZXhwb3J0ID0gTm9kZUFwaTtcbiJdfQ==