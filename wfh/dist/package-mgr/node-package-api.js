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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsb0RBQWtDO0FBRWxDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRWxFLGtGQUFrRTtBQUVsRSxpRUFBbUQ7QUFFbkQsd0RBQXdEO0FBQ3hELG9EQUF1QjtBQUV2Qiw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFnQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWIvRSxlQUFVLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsaUJBQVksR0FBRyxZQUFZLENBQUM7UUFDNUIsb0JBQWUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLFdBQU0sR0FBRyxNQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLEtBQVU7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtB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QyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxXQUFtQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDakUsQ0FBQztJQUNELGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FhRjtBQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksZ0JBQVksRUFBRSxDQUFDO0FBQ2hELFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3hDLGlCQUFTLE9BQU8sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9saWIvY29uZmlnJyk7XG5jb25zdCBwYWNrYWdlVWl0bHMgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuaW1wb3J0IG5wbWltcG9ydENzc0xvYWRlciBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvY3NzLWxvYWRlcic7XG5pbXBvcnQgSW5qZWN0IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0ICogYXMgYXNzZXRzVXJsIGZyb20gJy4uLy4uL2Rpc3QvYXNzZXRzLXVybCc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCBwYWNrYWdlSW5zdGFuY2UgYXMgUGFja2FnZUluc3RhbmNlfSBmcm9tICcuLi9idWlsZC11dGlsL3RzJztcbi8vIGltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSBpbXBsZW1lbnRzIGFzc2V0c1VybC5QYWNrYWdlQXBpIHtcbiAgcGFja2FnZVNob3J0TmFtZTogc3RyaW5nO1xuICBjb250ZXh0UGF0aDogc3RyaW5nO1xuICBidWlsZFV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbGliL2d1bHAvYnVpbGRVdGlscycpO1xuICBwYWNrYWdlVXRpbHMgPSBwYWNrYWdlVWl0bHM7XG4gIGNvbXBpbGVOb2RlUGF0aCA9IFtjb25maWcoKS5ub2RlUGF0aF07XG4gIGV2ZW50QnVzOiBFdmVudEVtaXR0ZXI7XG4gIGNvbmZpZyA9IGNvbmZpZztcbiAgYXJndjogYW55O1xuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4gIGRlZmF1bHQ6IE5vZGVBcGk7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogYW55LCBOb2RlQXBpOiBhbnkpID0+IGFueTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGFja2FnZU5hbWU6IHN0cmluZywgcHVibGljIHBhY2thZ2VJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSB7XG4gICAgdGhpcy5wYWNrYWdlU2hvcnROYW1lID0gcGFja2FnZVVpdGxzLnBhcnNlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICB0aGlzLmNvbnRleHRQYXRoID0gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgfVxuXG4gIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vZGUoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRCcm93c2VyU2lkZUNvbmZpZyhwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLmNvbmZpZy5zZXQocGF0aCwgdmFsdWUpO1xuICAgIHRoaXMuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2gocGF0aCk7XG4gIH1cblxuICBnZXRQcm9qZWN0RGlycygpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcoKS5wcm9qZWN0TGlzdDtcbiAgfVxuICAvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHVybFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlRmlsZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHwge3BhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaXNUaWxkZTogYm9vbGVhbiwgaXNQYWdlOiBib29sZWFufSwgcmV0dXJucyBzdHJpbmcgaWYgaXQgaXMgYSByZWxhdGl2ZSBwYXRoLCBvciBvYmplY3QgaWZcblx0ICogaXQgaXMgaW4gZm9ybWF0IG9mIC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteXFwvXStcXC8pP1teXFwvXSspP1xcLyguKikkL1xuXHQgKi9cbiAgbm9ybWFsaXplQXNzZXRzVXJsKHVybDogc3RyaW5nLCBzb3VyY2VGaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWModXJsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IG1hdGNoWzNdIHx8ICcnO1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSB8fCBwYWNrYWdlTmFtZSA9PT0gJycpIHtcbiAgICAgICAgY29uc3QgY29tcFBhY2thZ2UgPSB0aGlzLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29tcFBhY2thZ2UgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZX0gZG9lcyBub3QgYmVsb25nIHRvIGFueSBrbm93biBwYWNrYWdlYCk7XG4gICAgICAgIHBhY2thZ2VOYW1lID0gY29tcFBhY2thZ2UubG9uZ05hbWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbmplY3RlZFBhY2thZ2VOYW1lID0gbnBtaW1wb3J0Q3NzTG9hZGVyLmdldEluamVjdGVkUGFja2FnZShwYWNrYWdlTmFtZSwgc291cmNlRmlsZSwgdGhpcy5icm93c2VySW5qZWN0b3IpO1xuICAgICAgaWYgKGluamVjdGVkUGFja2FnZU5hbWUpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gaW5qZWN0ZWRQYWNrYWdlTmFtZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHBhdGg6IHJlbFBhdGgsXG4gICAgICAgIGlzVGlsZGU6IHVybC5jaGFyQXQoMCkgPT09ICd+JyxcbiAgICAgICAgaXNQYWdlOiBtYXRjaFsxXSAhPSBudWxsIHx8IF8uc3RhcnRzV2l0aCh1cmwsICdwYWdlOi8vJyksXG4gICAgICAgIGxvY2FsZTogbWF0Y2hbMV1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG4gIC8qKlxuXHQgKiBqb2luIGNvbnRleHRQYXRoXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgam9pbkNvbnRleHRQYXRoKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiAodGhpcy5jb250ZXh0UGF0aCArICcvJyArIHBhdGgpLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICB9XG5cbiAgX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lPzogc3RyaW5nKSB7XG4gICAgbGV0IHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKCFwYWNrYWdlTmFtZSkge1xuICAgICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICB9XG4gICAgdmFyIHBhdGggPSBjb25maWcuZ2V0KCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nWycgKyBwYWNrYWdlU2hvcnROYW1lICsgJ10nKSB8fFxuICAgICAgY29uZmlnLmdldChbJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLCBwYWNrYWdlTmFtZV0pO1xuICAgIHBhdGggPSBwYXRoICE9IG51bGwgPyBwYXRoIDogJy8nICsgcGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAodGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoKSB7XG4gICAgICBwYXRoID0gdGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoICsgJy8nICsgcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICB9XG5cbiAgcGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMucGFja2FnZVV0aWxzLnBhcnNlTmFtZShwYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4gIH1cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cblxuLy8gICBnZXRCdWlsZExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbi8vICAgfVxuXG4vLyAgIGxvY2FsZUJ1bmRsZUZvbGRlcigpIHtcbi8vICAgICByZXR1cm4gdGhpcy5pc0RlZmF1bHRMb2NhbGUoKSA/ICcnIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpICsgJy8nO1xuLy8gICB9XG5cbi8vICAgaXNEZWZhdWx0TG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuLy8gICB9XG59XG5Ob2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbmFzc2V0c1VybC5wYXRjaFRvQXBpKE5vZGVBcGkucHJvdG90eXBlKTtcbmV4cG9ydCA9IE5vZGVBcGk7XG4iXX0=