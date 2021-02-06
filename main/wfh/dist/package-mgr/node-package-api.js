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
    isDefaultLocale() {
        return this.config.get('locales[0]') === this.getBuildLocale();
    }
    getBuildLocale() {
        return this.argv.locale || this.config.get('locales[0]');
    }
}
NodeApi.prototype.eventBus = new events_1.EventEmitter();
assetsUrl.patchToApi(NodeApi.prototype);
exports.default = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDLG1DQUFvQztBQUVwQyx1REFBK0I7QUFDL0Isa0ZBQWtFO0FBRWxFLGlFQUFtRDtBQUduRCxvREFBdUI7QUFDdkIsbUNBQXlDO0FBRXpDLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLFNBQVMsU0FBUyxDQUFDLFFBQWdCO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDeEMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxJQUFJLEtBQUssRUFBRTtRQUNULEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBQ0QsNEJBQTRCO0FBQzVCLGlGQUFpRjtBQUVqRixxR0FBcUc7QUFFckcsTUFBTSxPQUFPO0lBeUJYLFlBQW1CLFdBQW1CLEVBQVMsZUFBZ0M7UUFBNUQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBUyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFwQi9FLFdBQU0sR0FBRyxnQkFBTSxDQUFDO1FBcUJkLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLGtCQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lB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QyxhQUFhLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztTQUNqRDtRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFdBQW1CO1FBQ2xDLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDakUsQ0FBQztJQUNELGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FVRjtBQUVELE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUkscUJBQVksRUFBRSxDQUFDO0FBRWhELFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRXhDLGtCQUFlLE9BQU8sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBucG1pbXBvcnRDc3NMb2FkZXIgZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Nzcy1sb2FkZXInO1xuaW1wb3J0IEluamVjdCBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCAqIGFzIGFzc2V0c1VybCBmcm9tICcuLi8uLi9kaXN0L2Fzc2V0cy11cmwnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtMb2dnZXIsIGdldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJldCA9IHtuYW1lOiBsb25nTmFtZSwgc2NvcGU6ICcnfTtcbiAgY29uc3QgbWF0Y2ggPSBtb2R1bGVOYW1lUmVnLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXQuc2NvcGUgPSBtYXRjaFsxXTtcbiAgICByZXQubmFtZSA9IG1hdGNoWzJdO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSBpbXBsZW1lbnRzIGFzc2V0c1VybC5QYWNrYWdlQXBpLCBhc3NldHNVcmwuRXh0ZW5kZWRBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIC8vIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgLy8gY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcbiAgbG9nZ2VyOiBMb2dnZXI7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSA9PiBOb2RlQXBpO1xuXG4gIGFzc2V0c1VybDogdHlwZW9mIGFzc2V0c1VybC5hc3NldHNVcmw7XG4gIHNlcnZlclVybDogdHlwZW9mIGFzc2V0c1VybC5zZXJ2ZXJVcmw7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbnRyeVBhZ2VVcmw6IHR5cGVvZiBhc3NldHNVcmwuZW50cnlQYWdlVXJsO1xuXG4gIGdldCBjb250ZXh0UGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgfVxuXG5cbiAgY29uc3RydWN0b3IocHVibGljIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHB1YmxpYyBwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHRoaXMucGFja2FnZVNob3J0TmFtZSA9IHBhcnNlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICAvLyB0aGlzLmNvbnRleHRQYXRoID0gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgICB0aGlzLmxvZ2dlciA9IGdldExvZ2dlcih0aGlzLnBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vZGUoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRCcm93c2VyU2lkZUNvbmZpZyhwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLmNvbmZpZy5zZXQocGF0aCwgdmFsdWUpO1xuICAgIHRoaXMuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2gocGF0aCk7XG4gIH1cblxuICAvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHVybFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlRmlsZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHwge3BhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaXNUaWxkZTogYm9vbGVhbiwgaXNQYWdlOiBib29sZWFufSwgcmV0dXJucyBzdHJpbmcgaWYgaXQgaXMgYSByZWxhdGl2ZSBwYXRoLCBvciBvYmplY3QgaWZcblx0ICogaXQgaXMgaW4gZm9ybWF0IG9mIC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteXFwvXStcXC8pP1teXFwvXSspP1xcLyguKikkL1xuXHQgKi9cbiAgbm9ybWFsaXplQXNzZXRzVXJsKHVybDogc3RyaW5nLCBzb3VyY2VGaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWModXJsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IG1hdGNoWzNdIHx8ICcnO1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSB8fCBwYWNrYWdlTmFtZSA9PT0gJycpIHtcbiAgICAgICAgY29uc3QgY29tcFBhY2thZ2UgPSB0aGlzLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29tcFBhY2thZ2UgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZX0gZG9lcyBub3QgYmVsb25nIHRvIGFueSBrbm93biBwYWNrYWdlYCk7XG4gICAgICAgIHBhY2thZ2VOYW1lID0gY29tcFBhY2thZ2UubG9uZ05hbWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbmplY3RlZFBhY2thZ2VOYW1lID0gbnBtaW1wb3J0Q3NzTG9hZGVyLmdldEluamVjdGVkUGFja2FnZShwYWNrYWdlTmFtZSwgc291cmNlRmlsZSwgdGhpcy5icm93c2VySW5qZWN0b3IpO1xuICAgICAgaWYgKGluamVjdGVkUGFja2FnZU5hbWUpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gaW5qZWN0ZWRQYWNrYWdlTmFtZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHBhdGg6IHJlbFBhdGgsXG4gICAgICAgIGlzVGlsZGU6IHVybC5jaGFyQXQoMCkgPT09ICd+JyxcbiAgICAgICAgaXNQYWdlOiBtYXRjaFsxXSAhPSBudWxsIHx8IF8uc3RhcnRzV2l0aCh1cmwsICdwYWdlOi8vJyksXG4gICAgICAgIGxvY2FsZTogbWF0Y2hbMV1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG4gIC8qKlxuXHQgKiBqb2luIGNvbnRleHRQYXRoXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgam9pbkNvbnRleHRQYXRoKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiAodGhpcy5jb250ZXh0UGF0aCArICcvJyArIHBhdGgpLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICB9XG5cbiAgX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lPzogc3RyaW5nKSB7XG4gICAgLy8gbGV0IHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgLy8gaWYgKCFwYWNrYWdlTmFtZSkge1xuICAgIC8vICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgIC8vICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICAvLyB9XG4gICAgdmFyIHBhdGggPSBjb25maWcuZ2V0KCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nWycgKyB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lIHx8IHRoaXMucGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAodGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoKSB7XG4gICAgICBwYXRoID0gdGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoICsgJy8nICsgcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICB9XG5cbiAgcGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhcnNlTmFtZShwYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4gIH1cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cblxuICAvLyBzZXJ2ZXJVcmwocGFja2FnZU5hbWVPclBhdGg6IHN0cmluZywgcGF0aD86IHN0cmluZykge1xuICAvLyAgIHJldHVybiBhc3NldHNVcmwuc2VydmVyVXJsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH1cblxuICAvLyBwdWJsaWNVcmwoc3RhdGljQXNzZXRzVVJMOiBzdHJpbmcsIG91dHB1dFBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgLy8gICB1c2VMb2NhbGU6IHN0cmluZyB8IG51bGwsIHBhY2thZ2VOYW1lOiBzdHJpbmcgfCBudWxsLCBwYXRoOiBzdHJpbmcpIHtcbiAgLy8gICAgIHJldHVybiBcbiAgLy8gICB9XG59XG5cbk5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG5hc3NldHNVcmwucGF0Y2hUb0FwaShOb2RlQXBpLnByb3RvdHlwZSk7XG5cbmV4cG9ydCBkZWZhdWx0IE5vZGVBcGk7XG4iXX0=