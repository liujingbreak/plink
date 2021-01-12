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
// import PackageInstance from '../packageNodeInstance';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsbUNBQW9DO0FBRXBDLHVEQUErQjtBQUUvQixrRkFBa0U7QUFFbEUsaUVBQW1EO0FBR25ELHdEQUF3RDtBQUN4RCxvREFBdUI7QUFDdkIsbUNBQXlDO0FBRXpDLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLFNBQVMsU0FBUyxDQUFDLFFBQWdCO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDeEMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxJQUFJLEtBQUssRUFBRTtRQUNULEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBQ0QsNEJBQTRCO0FBQzVCLGlGQUFpRjtBQUVqRixxR0FBcUc7QUFFckcsTUFBTSxPQUFPO0lBbUJYLFlBQW1CLFdBQW1CLEVBQVMsZUFBZ0M7UUFBNUQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFmL0Usc0NBQXNDO1FBQ3RDLGVBQVUsR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUNsRCwrQkFBK0I7UUFDL0Isb0JBQWUsR0FBRyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV0QyxXQUFNLEdBQUcsZ0JBQU0sQ0FBQztRQVdkLElB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Z0IsR0FBRyxHQUFHLENBQUM7WUFDMUUsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQztRQUNwRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDL0IsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztTQUNqRDtRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQW1CO1FBQ2xDLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDakUsQ0FBQztJQUNELGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FhRjtBQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUkscUJBQVksRUFBRSxDQUFDO0FBQ2hELFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3hDLGlCQUFTLE9BQU8sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcblxuaW1wb3J0IG5wbWltcG9ydENzc0xvYWRlciBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvY3NzLWxvYWRlcic7XG5pbXBvcnQgSW5qZWN0IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0ICogYXMgYXNzZXRzVXJsIGZyb20gJy4uLy4uL2Rpc3QvYXNzZXRzLXVybCc7XG5pbXBvcnQge1BhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2UtaW5zdGFuY2UnO1xuLy8gaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0xvZ2dlciwgZ2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuZnVuY3Rpb24gcGFyc2VOYW1lKGxvbmdOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgcmV0ID0ge25hbWU6IGxvbmdOYW1lLCBzY29wZTogJyd9O1xuICBjb25zdCBtYXRjaCA9IG1vZHVsZU5hbWVSZWcuZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldC5zY29wZSA9IG1hdGNoWzFdO1xuICAgIHJldC5uYW1lID0gbWF0Y2hbMl07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbi8vIG1vZHVsZS5leHBvcnRzID0gTm9kZUFwaTtcbi8vIG1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXBpOyAvLyBUbyBiZSBhdmFpbGFibGUgZm9yIEVTNi9UUyBpbXBvcnQgc3ludGF4IFxuXG4vLyB2YXIgc3VwcHJlc3NXYXJuNFVybHMgPSBjb25maWcuZ2V0KCdzdXBwcmVzc1dhcm5pbmcuYXNzZXRzVXJsJywgW10pLm1hcChsaW5lID0+IG5ldyBSZWdFeHAobGluZSkpO1xuXG5jbGFzcyBOb2RlQXBpIGltcGxlbWVudHMgYXNzZXRzVXJsLlBhY2thZ2VBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIGNvbnRleHRQYXRoOiBzdHJpbmc7XG5cbiAgLy8gVE9ETzogZGVwcmVjYXRlZCwgc2hvdWxkIGJlIHJlbW92ZWRcbiAgYnVpbGRVdGlscyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9ndWxwL2J1aWxkVXRpbHMnKTtcbiAgLy8gcGFja2FnZVV0aWxzID0gcGFja2FnZVVpdGxzO1xuICBjb21waWxlTm9kZVBhdGggPSBbY29uZmlnKCkubm9kZVBhdGhdO1xuICBldmVudEJ1czogRXZlbnRFbWl0dGVyO1xuICBjb25maWcgPSBjb25maWc7XG4gIGFyZ3Y6IGFueTtcbiAgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuICBkZWZhdWx0OiBOb2RlQXBpO1xuICBsb2dnZXI6IExvZ2dlcjtcblxuICBicm93c2VySW5qZWN0b3I6IEluamVjdDtcbiAgZmluZFBhY2thZ2VCeUZpbGU6IChmaWxlOiBzdHJpbmcpID0+IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbiAgZ2V0Tm9kZUFwaUZvclBhY2thZ2U6IChwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IGFueSkgPT4gYW55O1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlTmFtZTogc3RyaW5nLCBwdWJsaWMgcGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgPSBwYXJzZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgdGhpcy5jb250ZXh0UGF0aCA9IHRoaXMuX2NvbnRleHRQYXRoKCk7XG4gICAgdGhpcy5sb2dnZXIgPSBnZXRMb2dnZXIodGhpcy5wYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0Jyb3dzZXIoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNOb2RlKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkQnJvd3NlclNpZGVDb25maWcocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgdGhpcy5jb25maWcuc2V0KHBhdGgsIHZhbHVlKTtcbiAgICB0aGlzLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgZ2V0UHJvamVjdERpcnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnKCkucHJvamVjdExpc3Q7XG4gIH1cbiAgLyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUZpbGVcblx0ICogQHJldHVybiB7c3RyaW5nfSB8IHtwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGlzVGlsZGU6IGJvb2xlYW4sIGlzUGFnZTogYm9vbGVhbn0sIHJldHVybnMgc3RyaW5nIGlmIGl0IGlzIGEgcmVsYXRpdmUgcGF0aCwgb3Igb2JqZWN0IGlmXG5cdCAqIGl0IGlzIGluIGZvcm1hdCBvZiAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXlxcL10rXFwvKT9bXlxcL10rKT9cXC8oLiopJC9cblx0ICovXG4gIG5vcm1hbGl6ZUFzc2V0c1VybCh1cmw6IHN0cmluZywgc291cmNlRmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHVybCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBsZXQgcGFja2FnZU5hbWUgPSBtYXRjaFsyXTtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSBtYXRjaFszXSB8fCAnJztcbiAgICAgIGlmICghcGFja2FnZU5hbWUgfHwgcGFja2FnZU5hbWUgPT09ICcnKSB7XG4gICAgICAgIGNvbnN0IGNvbXBQYWNrYWdlID0gdGhpcy5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlKTtcbiAgICAgICAgaWYgKGNvbXBQYWNrYWdlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3NvdXJjZUZpbGV9IGRvZXMgbm90IGJlbG9uZyB0byBhbnkga25vd24gcGFja2FnZWApO1xuICAgICAgICBwYWNrYWdlTmFtZSA9IGNvbXBQYWNrYWdlLmxvbmdOYW1lO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5qZWN0ZWRQYWNrYWdlTmFtZSA9IG5wbWltcG9ydENzc0xvYWRlci5nZXRJbmplY3RlZFBhY2thZ2UocGFja2FnZU5hbWUsIHNvdXJjZUZpbGUsIHRoaXMuYnJvd3NlckluamVjdG9yKTtcbiAgICAgIGlmIChpbmplY3RlZFBhY2thZ2VOYW1lKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IGluamVjdGVkUGFja2FnZU5hbWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwYXRoOiByZWxQYXRoLFxuICAgICAgICBpc1RpbGRlOiB1cmwuY2hhckF0KDApID09PSAnficsXG4gICAgICAgIGlzUGFnZTogbWF0Y2hbMV0gIT0gbnVsbCB8fCBfLnN0YXJ0c1dpdGgodXJsLCAncGFnZTovLycpLFxuICAgICAgICBsb2NhbGU6IG1hdGNoWzFdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfVxuICAvKipcblx0ICogam9pbiBjb250ZXh0UGF0aFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIGpvaW5Db250ZXh0UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKHRoaXMuY29udGV4dFBhdGggKyAnLycgKyBwYXRoKS5yZXBsYWNlKC9cXC9cXC8vZywgJy8nKTtcbiAgfVxuXG4gIF9jb250ZXh0UGF0aChwYWNrYWdlTmFtZT86IHN0cmluZykge1xuICAgIGxldCBwYWNrYWdlU2hvcnROYW1lO1xuICAgIGlmICghcGFja2FnZU5hbWUpIHtcbiAgICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgfVxuICAgIHZhciBwYXRoID0gY29uZmlnLmdldCgncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZ1snICsgcGFja2FnZVNob3J0TmFtZSArICddJykgfHxcbiAgICAgIGNvbmZpZy5nZXQoWydwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJywgcGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCkge1xuICAgICAgcGF0aCA9IHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCArICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgfVxuXG4gIHBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBwYXJzZU5hbWUocGFja2FnZU5hbWUpO1xuICB9XG5cbiAgaXNEZWZhdWx0TG9jYWxlKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuICB9XG4gIGdldEJ1aWxkTG9jYWxlKCkge1xuICAgIHJldHVybiB0aGlzLmFyZ3YubG9jYWxlIHx8IHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpO1xuICB9XG5cbi8vICAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4vLyAgIH1cblxuLy8gICBsb2NhbGVCdW5kbGVGb2xkZXIoKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyAnJyA6IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKSArICcvJztcbi8vICAgfVxuXG4vLyAgIGlzRGVmYXVsdExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbi8vICAgfVxufVxuTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5hc3NldHNVcmwucGF0Y2hUb0FwaShOb2RlQXBpLnByb3RvdHlwZSk7XG5leHBvcnQgPSBOb2RlQXBpO1xuIl19