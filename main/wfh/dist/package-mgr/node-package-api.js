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
// eslint-disable  max-len
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
        let path = config_1.default.get('packageContextPathMapping[' + this.packageShortName + ']') ||
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMEJBQTBCO0FBQzFCLG1DQUFvQztBQUVwQyx1REFBK0I7QUFDL0Isa0ZBQWtFO0FBRWxFLGlFQUFtRDtBQUduRCxvREFBdUI7QUFDdkIsbUNBQXlDO0FBRXpDLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLFNBQVMsU0FBUyxDQUFDLFFBQWdCO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDeEMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxJQUFJLEtBQUssRUFBRTtRQUNULEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBQ0QsNEJBQTRCO0FBQzVCLGlGQUFpRjtBQUVqRixxR0FBcUc7QUFFckcsTUFBTSxPQUFPO0lBeUJYLFlBQW1CLFdBQW1CLEVBQVMsZUFBZ0M7UUFBNUQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFwQi9FLFdBQU0sR0FBRyxnQkFBTSxDQUFDO1FBcUJkLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGtCQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lB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RyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUN6RCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDL0IsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztTQUNqRDtRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQW1CO1FBQ2xDLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxrQkFBa0I7SUFDbEIsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFDRCxrQkFBa0I7SUFDbEIsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNGO0FBRUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxxQkFBWSxFQUFFLENBQUM7QUFFaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFeEMsa0JBQWUsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUgIG1heC1sZW5cbmltcG9ydCB7RXZlbnRFbWl0dGVyfSBmcm9tICdldmVudHMnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbnBtaW1wb3J0Q3NzTG9hZGVyIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9jc3MtbG9hZGVyJztcbmltcG9ydCBJbmplY3QgZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgKiBhcyBhc3NldHNVcmwgZnJvbSAnLi4vLi4vZGlzdC9hc3NldHMtdXJsJztcbmltcG9ydCB7UGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7TG9nZ2VyLCBnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5mdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZykge1xuICBjb25zdCByZXQgPSB7bmFtZTogbG9uZ05hbWUsIHNjb3BlOiAnJ307XG4gIGNvbnN0IG1hdGNoID0gbW9kdWxlTmFtZVJlZy5leGVjKGxvbmdOYW1lKTtcbiAgaWYgKG1hdGNoKSB7XG4gICAgcmV0LnNjb3BlID0gbWF0Y2hbMV07XG4gICAgcmV0Lm5hbWUgPSBtYXRjaFsyXTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuLy8gbW9kdWxlLmV4cG9ydHMgPSBOb2RlQXBpO1xuLy8gbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IE5vZGVBcGk7IC8vIFRvIGJlIGF2YWlsYWJsZSBmb3IgRVM2L1RTIGltcG9ydCBzeW50YXggXG5cbi8vIHZhciBzdXBwcmVzc1dhcm40VXJscyA9IGNvbmZpZy5nZXQoJ3N1cHByZXNzV2FybmluZy5hc3NldHNVcmwnLCBbXSkubWFwKGxpbmUgPT4gbmV3IFJlZ0V4cChsaW5lKSk7XG5cbmNsYXNzIE5vZGVBcGkgaW1wbGVtZW50cyBhc3NldHNVcmwuUGFja2FnZUFwaSwgYXNzZXRzVXJsLkV4dGVuZGVkQXBpIHtcbiAgcGFja2FnZVNob3J0TmFtZTogc3RyaW5nO1xuICAvLyBwYWNrYWdlVXRpbHMgPSBwYWNrYWdlVWl0bHM7XG4gIC8vIGNvbXBpbGVOb2RlUGF0aCA9IFtjb25maWcoKS5ub2RlUGF0aF07XG4gIGV2ZW50QnVzOiBFdmVudEVtaXR0ZXI7XG4gIGNvbmZpZyA9IGNvbmZpZztcbiAgYXJndjogYW55O1xuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4gIGRlZmF1bHQ6IE5vZGVBcGk7XG4gIGxvZ2dlcjogTG9nZ2VyO1xuXG4gIGJyb3dzZXJJbmplY3RvcjogSW5qZWN0O1xuICBmaW5kUGFja2FnZUJ5RmlsZTogKGZpbGU6IHN0cmluZykgPT4gUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkO1xuICBnZXROb2RlQXBpRm9yUGFja2FnZTogKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkgPT4gTm9kZUFwaTtcblxuICBhc3NldHNVcmw6IHR5cGVvZiBhc3NldHNVcmwuYXNzZXRzVXJsO1xuICBzZXJ2ZXJVcmw6IHR5cGVvZiBhc3NldHNVcmwuc2VydmVyVXJsO1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZW50cnlQYWdlVXJsOiB0eXBlb2YgYXNzZXRzVXJsLmVudHJ5UGFnZVVybDtcblxuICBnZXQgY29udGV4dFBhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRleHRQYXRoKCk7XG4gIH1cblxuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlTmFtZTogc3RyaW5nLCBwdWJsaWMgcGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgPSBwYXJzZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgLy8gdGhpcy5jb250ZXh0UGF0aCA9IHRoaXMuX2NvbnRleHRQYXRoKCk7XG4gICAgdGhpcy5sb2dnZXIgPSBnZXRMb2dnZXIodGhpcy5wYWNrYWdlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogcmV0dXJuIEEgbG9nIHdpdGNoIGNhdGdvcnkgbmFtZSBcIjxwYWNrYWdlIG5hbWU+LjxuYW1lQWZ0ZXJQYWNrYWdlTmFtZT5cIlxuICAgKiBAcGFyYW0gbmFtZUFmdGVyUGFja2FnZU5hbWUgXG4gICAqL1xuICBnZXRMb2dnZXIobmFtZUFmdGVyUGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBnZXRMb2dnZXIodGhpcy5wYWNrYWdlTmFtZSArICcuJyArIG5hbWVBZnRlclBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vZGUoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRCcm93c2VyU2lkZUNvbmZpZyhwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLmNvbmZpZy5zZXQocGF0aCwgdmFsdWUpO1xuICAgIHRoaXMuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2gocGF0aCk7XG4gIH1cblxuICAvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHVybFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlRmlsZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHwge3BhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaXNUaWxkZTogYm9vbGVhbiwgaXNQYWdlOiBib29sZWFufSwgcmV0dXJucyBzdHJpbmcgaWYgaXQgaXMgYSByZWxhdGl2ZSBwYXRoLCBvciBvYmplY3QgaWZcblx0ICogaXQgaXMgaW4gZm9ybWF0IG9mIC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteXFwvXStcXC8pP1teXFwvXSspP1xcLyguKikkL1xuXHQgKi9cbiAgbm9ybWFsaXplQXNzZXRzVXJsKHVybDogc3RyaW5nLCBzb3VyY2VGaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWModXJsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IG1hdGNoWzNdIHx8ICcnO1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSB8fCBwYWNrYWdlTmFtZSA9PT0gJycpIHtcbiAgICAgICAgY29uc3QgY29tcFBhY2thZ2UgPSB0aGlzLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29tcFBhY2thZ2UgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZX0gZG9lcyBub3QgYmVsb25nIHRvIGFueSBrbm93biBwYWNrYWdlYCk7XG4gICAgICAgIHBhY2thZ2VOYW1lID0gY29tcFBhY2thZ2UubG9uZ05hbWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbmplY3RlZFBhY2thZ2VOYW1lID0gbnBtaW1wb3J0Q3NzTG9hZGVyLmdldEluamVjdGVkUGFja2FnZShwYWNrYWdlTmFtZSwgc291cmNlRmlsZSwgdGhpcy5icm93c2VySW5qZWN0b3IpO1xuICAgICAgaWYgKGluamVjdGVkUGFja2FnZU5hbWUpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gaW5qZWN0ZWRQYWNrYWdlTmFtZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHBhdGg6IHJlbFBhdGgsXG4gICAgICAgIGlzVGlsZGU6IHVybC5jaGFyQXQoMCkgPT09ICd+JyxcbiAgICAgICAgaXNQYWdlOiBtYXRjaFsxXSAhPSBudWxsIHx8IF8uc3RhcnRzV2l0aCh1cmwsICdwYWdlOi8vJyksXG4gICAgICAgIGxvY2FsZTogbWF0Y2hbMV1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG4gIC8qKlxuXHQgKiBqb2luIGNvbnRleHRQYXRoXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgam9pbkNvbnRleHRQYXRoKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiAodGhpcy5jb250ZXh0UGF0aCArICcvJyArIHBhdGgpLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICB9XG5cbiAgX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBsZXQgcGFja2FnZVNob3J0TmFtZTtcbiAgICAvLyBpZiAoIXBhY2thZ2VOYW1lKSB7XG4gICAgLy8gICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gICAgLy8gICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYXJzZVBhY2thZ2VOYW1lKHBhY2thZ2VOYW1lKS5uYW1lO1xuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICBwYWNrYWdlU2hvcnROYW1lID0gdGhpcy5wYWNrYWdlU2hvcnROYW1lO1xuICAgIC8vIH1cbiAgICBsZXQgcGF0aDogc3RyaW5nID0gY29uZmlnLmdldCgncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZ1snICsgdGhpcy5wYWNrYWdlU2hvcnROYW1lICsgJ10nKSB8fFxuICAgICAgY29uZmlnLmdldChbJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLCBwYWNrYWdlTmFtZSB8fCB0aGlzLnBhY2thZ2VOYW1lXSk7XG4gICAgcGF0aCA9IHBhdGggIT0gbnVsbCA/IHBhdGggOiAnLycgKyB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCkge1xuICAgICAgcGF0aCA9IHRoaXMuY29uZmlnKCkubm9kZVJvdXRlUGF0aCArICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgfVxuXG4gIHBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBwYXJzZU5hbWUocGFja2FnZU5hbWUpO1xuICB9XG5cbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGlzRGVmYXVsdExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJykgPT09IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgfVxuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cbn1cblxuTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbmFzc2V0c1VybC5wYXRjaFRvQXBpKE5vZGVBcGkucHJvdG90eXBlKTtcblxuZXhwb3J0IGRlZmF1bHQgTm9kZUFwaTtcbiJdfQ==