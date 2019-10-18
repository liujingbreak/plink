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
NodeApi.prototype.eventBus = new events_1.default();
assetsUrl.patchToApi(NodeApi.prototype);
module.exports = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsb0RBQWtDO0FBRWxDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRWxFLGtGQUFrRTtBQUVsRSxpRUFBbUQ7QUFFbkQsd0RBQXdEO0FBQ3hELG9EQUF1QjtBQUV2Qiw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFnQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWIvRSxlQUFVLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsaUJBQVksR0FBRyxZQUFZLENBQUM7UUFDNUIsb0JBQWUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLFdBQU0sR0FBRyxNQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLEtBQVU7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtB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QyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxXQUFtQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FhRjtBQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksZ0JBQVksRUFBRSxDQUFDO0FBQ2hELFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXhDLGlCQUFTLE9BQU8sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9saWIvY29uZmlnJyk7XG5jb25zdCBwYWNrYWdlVWl0bHMgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuaW1wb3J0IG5wbWltcG9ydENzc0xvYWRlciBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvY3NzLWxvYWRlcic7XG5pbXBvcnQgSW5qZWN0IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0ICogYXMgYXNzZXRzVXJsIGZyb20gJy4uLy4uL2Rpc3QvYXNzZXRzLXVybCc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCBwYWNrYWdlSW5zdGFuY2UgYXMgUGFja2FnZUluc3RhbmNlfSBmcm9tICcuLi9idWlsZC11dGlsL3RzJztcbi8vIGltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSB7XG4gIHBhY2thZ2VTaG9ydE5hbWU6IHN0cmluZztcbiAgY29udGV4dFBhdGg6IHN0cmluZztcbiAgYnVpbGRVdGlscyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9ndWxwL2J1aWxkVXRpbHMnKTtcbiAgcGFja2FnZVV0aWxzID0gcGFja2FnZVVpdGxzO1xuICBjb21waWxlTm9kZVBhdGggPSBbY29uZmlnKCkubm9kZVBhdGhdO1xuICBldmVudEJ1czogRXZlbnRFbWl0dGVyO1xuICBjb25maWcgPSBjb25maWc7XG4gIGFyZ3Y6IGFueTtcbiAgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuICBkZWZhdWx0OiBOb2RlQXBpO1xuXG4gIGJyb3dzZXJJbmplY3RvcjogSW5qZWN0O1xuICBmaW5kUGFja2FnZUJ5RmlsZTogKGZpbGU6IHN0cmluZykgPT4gUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkO1xuICBnZXROb2RlQXBpRm9yUGFja2FnZTogKHBrSW5zdGFuY2U6IGFueSwgTm9kZUFwaTogYW55KSA9PiBhbnk7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHB1YmxpYyBwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHRoaXMucGFja2FnZVNob3J0TmFtZSA9IHBhY2thZ2VVaXRscy5wYXJzZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgdGhpcy5jb250ZXh0UGF0aCA9IHRoaXMuX2NvbnRleHRQYXRoKCk7XG4gIH1cblxuICBpc0Jyb3dzZXIoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNOb2RlKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkQnJvd3NlclNpZGVDb25maWcocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgdGhpcy5jb25maWcuc2V0KHBhdGgsIHZhbHVlKTtcbiAgICB0aGlzLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgZ2V0UHJvamVjdERpcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnKCkucHJvamVjdExpc3Q7XG4gIH1cbiAgLyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUZpbGVcblx0ICogQHJldHVybiB7c3RyaW5nfSB8IHtwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGlzVGlsZGU6IGJvb2xlYW4sIGlzUGFnZTogYm9vbGVhbn0sIHJldHVybnMgc3RyaW5nIGlmIGl0IGlzIGEgcmVsYXRpdmUgcGF0aCwgb3Igb2JqZWN0IGlmXG5cdCAqIGl0IGlzIGluIGZvcm1hdCBvZiAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXlxcL10rXFwvKT9bXlxcL10rKT9cXC8oLiopJC9cblx0ICovXG4gIG5vcm1hbGl6ZUFzc2V0c1VybCh1cmw6IHN0cmluZywgc291cmNlRmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHVybCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBsZXQgcGFja2FnZU5hbWUgPSBtYXRjaFsyXTtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSBtYXRjaFszXSB8fCAnJztcbiAgICAgIGlmICghcGFja2FnZU5hbWUgfHwgcGFja2FnZU5hbWUgPT09ICcnKSB7XG4gICAgICAgIGNvbnN0IGNvbXBQYWNrYWdlID0gdGhpcy5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlKTtcbiAgICAgICAgaWYgKGNvbXBQYWNrYWdlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3NvdXJjZUZpbGV9IGRvZXMgbm90IGJlbG9uZyB0byBhbnkga25vd24gcGFja2FnZWApO1xuICAgICAgICBwYWNrYWdlTmFtZSA9IGNvbXBQYWNrYWdlLmxvbmdOYW1lO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5qZWN0ZWRQYWNrYWdlTmFtZSA9IG5wbWltcG9ydENzc0xvYWRlci5nZXRJbmplY3RlZFBhY2thZ2UocGFja2FnZU5hbWUsIHNvdXJjZUZpbGUsIHRoaXMuYnJvd3NlckluamVjdG9yKTtcbiAgICAgIGlmIChpbmplY3RlZFBhY2thZ2VOYW1lKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IGluamVjdGVkUGFja2FnZU5hbWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwYXRoOiByZWxQYXRoLFxuICAgICAgICBpc1RpbGRlOiB1cmwuY2hhckF0KDApID09PSAnficsXG4gICAgICAgIGlzUGFnZTogbWF0Y2hbMV0gIT0gbnVsbCB8fCBfLnN0YXJ0c1dpdGgodXJsLCAncGFnZTovLycpLFxuICAgICAgICBsb2NhbGU6IG1hdGNoWzFdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfVxuICAvKipcblx0ICogam9pbiBjb250ZXh0UGF0aFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIGpvaW5Db250ZXh0UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKHRoaXMuY29udGV4dFBhdGggKyAnLycgKyBwYXRoKS5yZXBsYWNlKC9cXC9cXC8vZywgJy8nKTtcbiAgfVxuXG4gIF9jb250ZXh0UGF0aChwYWNrYWdlTmFtZT86IHN0cmluZykge1xuICAgIGxldCBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICghcGFja2FnZU5hbWUpIHtcbiAgICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgfVxuICAgIHZhciBwYXRoID0gY29uZmlnLmdldCgncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZ1snICsgcGFja2FnZVNob3J0TmFtZSArICddJykgfHxcbiAgICAgIGNvbmZpZy5nZXQoWydwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJywgcGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCkge1xuICAgICAgcGF0aCA9IHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCArICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgfVxuXG4gIHBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLnBhY2thZ2VVdGlscy5wYXJzZU5hbWUocGFja2FnZU5hbWUpO1xuICB9XG5cbi8vICAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4vLyAgIH1cblxuLy8gICBsb2NhbGVCdW5kbGVGb2xkZXIoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyAnJyA6IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKSArICcvJztcbi8vICAgfVxuXG4vLyAgIGlzRGVmYXVsdExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbi8vICAgfVxufVxuTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5hc3NldHNVcmwucGF0Y2hUb0FwaShOb2RlQXBpLnByb3RvdHlwZSk7XG5cbmV4cG9ydCA9IE5vZGVBcGk7XG4iXX0=