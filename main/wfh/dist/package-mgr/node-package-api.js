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
Object.defineProperty(exports, "__esModule", { value: true });
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
        this.config = config_1.default;
        this.packageShortName = parseName(packageName).name;
        // this.contextPath = this._contextPath();
        this.logger = log4js_1.getLogger(this.packageName);
    }
    get contextPath() {
        return this._contextPath();
    }
    /**
     * return A log witch catgory name "<package name>.<nameAfterPackageName>"
     * @param nameAfterPackageName
     */
    getLogger(nameAfterPackageName) {
        return log4js_1.getLogger(this.packageName + '.' + nameAfterPackageName);
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
        // let packageShortName;
        // if (!packageName) {
        //   packageName = this.packageName;
        //   packageShortName = this.parsePackageName(packageName).name;
        // } else {
        //   packageShortName = this.packageShortName;
        // }
        var path = config_1.default.get('packageContextPathMapping[' + this.packageShortName + ']') ||
            config_1.default.get(['packageContextPathMapping', packageName || this.packageName]);
        path = path != null ? path : '/' + this.packageShortName;
        if (this.config().nodeRoutePath) {
            path = this.config().nodeRoutePath + '/' + path;
        }
        return path.replace(/\/\/+/g, '/');
    }
    parsePackageName(packageName) {
        return parseName(packageName);
    }
    /** @deprecated */
    isDefaultLocale() {
        return this.config.get('locales[0]') === this.getBuildLocale();
    }
    /** @deprecated */
    getBuildLocale() {
        return this.argv.locale || this.config.get('locales[0]');
    }
}
NodeApi.prototype.eventBus = new events_1.EventEmitter();
assetsUrl.patchToApi(NodeApi.prototype);
exports.default = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDLG1DQUFvQztBQUVwQyx1REFBK0I7QUFDL0Isa0ZBQWtFO0FBRWxFLGlFQUFtRDtBQUduRCxvREFBdUI7QUFDdkIsbUNBQXlDO0FBRXpDLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLFNBQVMsU0FBUyxDQUFDLFFBQWdCO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDeEMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxJQUFJLEtBQUssRUFBRTtRQUNULEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBQ0QsNEJBQTRCO0FBQzVCLGlGQUFpRjtBQUVqRixxR0FBcUc7QUFFckcsTUFBTSxPQUFPO0lBeUJYLFlBQW1CLFdBQW1CLEVBQVMsZUFBZ0M7UUFBNUQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFwQi9FLFdBQU0sR0FBRyxnQkFBTSxDQUFDO1FBcUJkLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGtCQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lB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RyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUN6RCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDL0IsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztTQUNqRDtRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQW1CO1FBQ2xDLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxrQkFBa0I7SUFDbEIsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFDRCxrQkFBa0I7SUFDbEIsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQVVGO0FBRUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxxQkFBWSxFQUFFLENBQUM7QUFFaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFeEMsa0JBQWUsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQge0V2ZW50RW1pdHRlcn0gZnJvbSAnZXZlbnRzJztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IG5wbWltcG9ydENzc0xvYWRlciBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvY3NzLWxvYWRlcic7XG5pbXBvcnQgSW5qZWN0IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0ICogYXMgYXNzZXRzVXJsIGZyb20gJy4uLy4uL2Rpc3QvYXNzZXRzLXVybCc7XG5pbXBvcnQge1BhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0xvZ2dlciwgZ2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuZnVuY3Rpb24gcGFyc2VOYW1lKGxvbmdOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgcmV0ID0ge25hbWU6IGxvbmdOYW1lLCBzY29wZTogJyd9O1xuICBjb25zdCBtYXRjaCA9IG1vZHVsZU5hbWVSZWcuZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldC5zY29wZSA9IG1hdGNoWzFdO1xuICAgIHJldC5uYW1lID0gbWF0Y2hbMl07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbi8vIG1vZHVsZS5leHBvcnRzID0gTm9kZUFwaTtcbi8vIG1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXBpOyAvLyBUbyBiZSBhdmFpbGFibGUgZm9yIEVTNi9UUyBpbXBvcnQgc3ludGF4IFxuXG4vLyB2YXIgc3VwcHJlc3NXYXJuNFVybHMgPSBjb25maWcuZ2V0KCdzdXBwcmVzc1dhcm5pbmcuYXNzZXRzVXJsJywgW10pLm1hcChsaW5lID0+IG5ldyBSZWdFeHAobGluZSkpO1xuXG5jbGFzcyBOb2RlQXBpIGltcGxlbWVudHMgYXNzZXRzVXJsLlBhY2thZ2VBcGksIGFzc2V0c1VybC5FeHRlbmRlZEFwaSB7XG4gIHBhY2thZ2VTaG9ydE5hbWU6IHN0cmluZztcbiAgLy8gcGFja2FnZVV0aWxzID0gcGFja2FnZVVpdGxzO1xuICAvLyBjb21waWxlTm9kZVBhdGggPSBbY29uZmlnKCkubm9kZVBhdGhdO1xuICBldmVudEJ1czogRXZlbnRFbWl0dGVyO1xuICBjb25maWcgPSBjb25maWc7XG4gIGFyZ3Y6IGFueTtcbiAgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuICBkZWZhdWx0OiBOb2RlQXBpO1xuICBsb2dnZXI6IExvZ2dlcjtcblxuICBicm93c2VySW5qZWN0b3I6IEluamVjdDtcbiAgZmluZFBhY2thZ2VCeUZpbGU6IChmaWxlOiBzdHJpbmcpID0+IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbiAgZ2V0Tm9kZUFwaUZvclBhY2thZ2U6IChwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpID0+IE5vZGVBcGk7XG5cbiAgYXNzZXRzVXJsOiB0eXBlb2YgYXNzZXRzVXJsLmFzc2V0c1VybDtcbiAgc2VydmVyVXJsOiB0eXBlb2YgYXNzZXRzVXJsLnNlcnZlclVybDtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGVudHJ5UGFnZVVybDogdHlwZW9mIGFzc2V0c1VybC5lbnRyeVBhZ2VVcmw7XG5cbiAgZ2V0IGNvbnRleHRQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0UGF0aCgpO1xuICB9XG5cblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGFja2FnZU5hbWU6IHN0cmluZywgcHVibGljIHBhY2thZ2VJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSB7XG4gICAgdGhpcy5wYWNrYWdlU2hvcnROYW1lID0gcGFyc2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIC8vIHRoaXMuY29udGV4dFBhdGggPSB0aGlzLl9jb250ZXh0UGF0aCgpO1xuICAgIHRoaXMubG9nZ2VyID0gZ2V0TG9nZ2VyKHRoaXMucGFja2FnZU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIHJldHVybiBBIGxvZyB3aXRjaCBjYXRnb3J5IG5hbWUgXCI8cGFja2FnZSBuYW1lPi48bmFtZUFmdGVyUGFja2FnZU5hbWU+XCJcbiAgICogQHBhcmFtIG5hbWVBZnRlclBhY2thZ2VOYW1lIFxuICAgKi9cbiAgZ2V0TG9nZ2VyKG5hbWVBZnRlclBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZ2V0TG9nZ2VyKHRoaXMucGFja2FnZU5hbWUgKyAnLicgKyBuYW1lQWZ0ZXJQYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0Jyb3dzZXIoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNOb2RlKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkQnJvd3NlclNpZGVDb25maWcocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgdGhpcy5jb25maWcuc2V0KHBhdGgsIHZhbHVlKTtcbiAgICB0aGlzLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgLyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1cmxcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUZpbGVcblx0ICogQHJldHVybiB7c3RyaW5nfSB8IHtwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGlzVGlsZGU6IGJvb2xlYW4sIGlzUGFnZTogYm9vbGVhbn0sIHJldHVybnMgc3RyaW5nIGlmIGl0IGlzIGEgcmVsYXRpdmUgcGF0aCwgb3Igb2JqZWN0IGlmXG5cdCAqIGl0IGlzIGluIGZvcm1hdCBvZiAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXlxcL10rXFwvKT9bXlxcL10rKT9cXC8oLiopJC9cblx0ICovXG4gIG5vcm1hbGl6ZUFzc2V0c1VybCh1cmw6IHN0cmluZywgc291cmNlRmlsZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXig/OmFzc2V0czpcXC9cXC98fnxwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHVybCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBsZXQgcGFja2FnZU5hbWUgPSBtYXRjaFsyXTtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSBtYXRjaFszXSB8fCAnJztcbiAgICAgIGlmICghcGFja2FnZU5hbWUgfHwgcGFja2FnZU5hbWUgPT09ICcnKSB7XG4gICAgICAgIGNvbnN0IGNvbXBQYWNrYWdlID0gdGhpcy5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlKTtcbiAgICAgICAgaWYgKGNvbXBQYWNrYWdlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3NvdXJjZUZpbGV9IGRvZXMgbm90IGJlbG9uZyB0byBhbnkga25vd24gcGFja2FnZWApO1xuICAgICAgICBwYWNrYWdlTmFtZSA9IGNvbXBQYWNrYWdlLmxvbmdOYW1lO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5qZWN0ZWRQYWNrYWdlTmFtZSA9IG5wbWltcG9ydENzc0xvYWRlci5nZXRJbmplY3RlZFBhY2thZ2UocGFja2FnZU5hbWUsIHNvdXJjZUZpbGUsIHRoaXMuYnJvd3NlckluamVjdG9yKTtcbiAgICAgIGlmIChpbmplY3RlZFBhY2thZ2VOYW1lKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IGluamVjdGVkUGFja2FnZU5hbWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwYXRoOiByZWxQYXRoLFxuICAgICAgICBpc1RpbGRlOiB1cmwuY2hhckF0KDApID09PSAnficsXG4gICAgICAgIGlzUGFnZTogbWF0Y2hbMV0gIT0gbnVsbCB8fCBfLnN0YXJ0c1dpdGgodXJsLCAncGFnZTovLycpLFxuICAgICAgICBsb2NhbGU6IG1hdGNoWzFdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfVxuICAvKipcblx0ICogam9pbiBjb250ZXh0UGF0aFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIGpvaW5Db250ZXh0UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gKHRoaXMuY29udGV4dFBhdGggKyAnLycgKyBwYXRoKS5yZXBsYWNlKC9cXC9cXC8vZywgJy8nKTtcbiAgfVxuXG4gIF9jb250ZXh0UGF0aChwYWNrYWdlTmFtZT86IHN0cmluZykge1xuICAgIC8vIGxldCBwYWNrYWdlU2hvcnROYW1lO1xuICAgIC8vIGlmICghcGFja2FnZU5hbWUpIHtcbiAgICAvLyAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAvLyAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgLy8gfVxuICAgIHZhciBwYXRoID0gY29uZmlnLmdldCgncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZ1snICsgdGhpcy5wYWNrYWdlU2hvcnROYW1lICsgJ10nKSB8fFxuICAgICAgY29uZmlnLmdldChbJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLCBwYWNrYWdlTmFtZSB8fCB0aGlzLnBhY2thZ2VOYW1lXSk7XG4gICAgcGF0aCA9IHBhdGggIT0gbnVsbCA/IHBhdGggOiAnLycgKyB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCkge1xuICAgICAgcGF0aCA9IHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCArICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgfVxuXG4gIHBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBwYXJzZU5hbWUocGFja2FnZU5hbWUpO1xuICB9XG5cbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGlzRGVmYXVsdExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgfVxuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cblxuICAvLyBzZXJ2ZXJVcmwocGFja2FnZU5hbWVPclBhdGg6IHN0cmluZywgcGF0aD86IHN0cmluZykge1xuICAvLyAgIHJldHVybiBhc3NldHNVcmwuc2VydmVyVXJsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH1cblxuICAvLyBwdWJsaWNVcmwoc3RhdGljQXNzZXRzVVJMOiBzdHJpbmcsIG91dHB1dFBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgLy8gICB1c2VMb2NhbGU6IHN0cmluZyB8IG51bGwsIHBhY2thZ2VOYW1lOiBzdHJpbmcgfCBudWxsLCBwYXRoOiBzdHJpbmcpIHtcbiAgLy8gICAgIHJldHVybiBcbiAgLy8gICB9XG59XG5cbk5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG5hc3NldHNVcmwucGF0Y2hUb0FwaShOb2RlQXBpLnByb3RvdHlwZSk7XG5cbmV4cG9ydCBkZWZhdWx0IE5vZGVBcGk7XG4iXX0=