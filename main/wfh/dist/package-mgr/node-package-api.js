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
module.exports = NodeApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsbUNBQW9DO0FBRXBDLHVEQUErQjtBQUUvQixrRkFBa0U7QUFFbEUsaUVBQW1EO0FBS25ELG9EQUF1QjtBQUN2QixtQ0FBeUM7QUFFekMsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsU0FBUyxTQUFTLENBQUMsUUFBZ0I7SUFDakMsTUFBTSxHQUFHLEdBQUcsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLElBQUksS0FBSyxFQUFFO1FBQ1QsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFDRCw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFvQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWYvRSxXQUFNLEdBQUcsZ0JBQU0sQ0FBQztRQWdCZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM1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TUFBTSxFQUFFLENBQUMsYUFBYSxFQUFFO1lBQy9CLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7U0FDakQ7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxXQUFtQjtRQUNsQyxPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFDRCxjQUFjO1FBQ1osT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBYUY7QUFDRCxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFZLEVBQUUsQ0FBQztBQUNoRCxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QyxpQkFBUyxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCB7RXZlbnRFbWl0dGVyfSBmcm9tICdldmVudHMnO1xuXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5cbmltcG9ydCBucG1pbXBvcnRDc3NMb2FkZXIgZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Nzcy1sb2FkZXInO1xuaW1wb3J0IEluamVjdCBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCAqIGFzIGFzc2V0c1VybCBmcm9tICcuLi8uLi9kaXN0L2Fzc2V0cy11cmwnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbi8vIGltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcbi8vIGltcG9ydCBOb2RlUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0xvZ2dlciwgZ2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuZnVuY3Rpb24gcGFyc2VOYW1lKGxvbmdOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgcmV0ID0ge25hbWU6IGxvbmdOYW1lLCBzY29wZTogJyd9O1xuICBjb25zdCBtYXRjaCA9IG1vZHVsZU5hbWVSZWcuZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldC5zY29wZSA9IG1hdGNoWzFdO1xuICAgIHJldC5uYW1lID0gbWF0Y2hbMl07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbi8vIG1vZHVsZS5leHBvcnRzID0gTm9kZUFwaTtcbi8vIG1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXBpOyAvLyBUbyBiZSBhdmFpbGFibGUgZm9yIEVTNi9UUyBpbXBvcnQgc3ludGF4IFxuXG4vLyB2YXIgc3VwcHJlc3NXYXJuNFVybHMgPSBjb25maWcuZ2V0KCdzdXBwcmVzc1dhcm5pbmcuYXNzZXRzVXJsJywgW10pLm1hcChsaW5lID0+IG5ldyBSZWdFeHAobGluZSkpO1xuXG5jbGFzcyBOb2RlQXBpIGltcGxlbWVudHMgYXNzZXRzVXJsLlBhY2thZ2VBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIC8vIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgLy8gY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcbiAgbG9nZ2VyOiBMb2dnZXI7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSA9PiBOb2RlQXBpO1xuXG4gIGdldCBjb250ZXh0UGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgfVxuXG5cbiAgY29uc3RydWN0b3IocHVibGljIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHB1YmxpYyBwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHRoaXMucGFja2FnZVNob3J0TmFtZSA9IHBhcnNlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICAvLyB0aGlzLmNvbnRleHRQYXRoID0gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgICB0aGlzLmxvZ2dlciA9IGdldExvZ2dlcih0aGlzLnBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vZGUoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRCcm93c2VyU2lkZUNvbmZpZyhwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLmNvbmZpZy5zZXQocGF0aCwgdmFsdWUpO1xuICAgIHRoaXMuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2gocGF0aCk7XG4gIH1cblxuICBnZXRQcm9qZWN0RGlycygpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcoKS5wcm9qZWN0TGlzdDtcbiAgfVxuICAvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHVybFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlRmlsZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHwge3BhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaXNUaWxkZTogYm9vbGVhbiwgaXNQYWdlOiBib29sZWFufSwgcmV0dXJucyBzdHJpbmcgaWYgaXQgaXMgYSByZWxhdGl2ZSBwYXRoLCBvciBvYmplY3QgaWZcblx0ICogaXQgaXMgaW4gZm9ybWF0IG9mIC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteXFwvXStcXC8pP1teXFwvXSspP1xcLyguKikkL1xuXHQgKi9cbiAgbm9ybWFsaXplQXNzZXRzVXJsKHVybDogc3RyaW5nLCBzb3VyY2VGaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWModXJsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IG1hdGNoWzNdIHx8ICcnO1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSB8fCBwYWNrYWdlTmFtZSA9PT0gJycpIHtcbiAgICAgICAgY29uc3QgY29tcFBhY2thZ2UgPSB0aGlzLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29tcFBhY2thZ2UgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZX0gZG9lcyBub3QgYmVsb25nIHRvIGFueSBrbm93biBwYWNrYWdlYCk7XG4gICAgICAgIHBhY2thZ2VOYW1lID0gY29tcFBhY2thZ2UubG9uZ05hbWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbmplY3RlZFBhY2thZ2VOYW1lID0gbnBtaW1wb3J0Q3NzTG9hZGVyLmdldEluamVjdGVkUGFja2FnZShwYWNrYWdlTmFtZSwgc291cmNlRmlsZSwgdGhpcy5icm93c2VySW5qZWN0b3IpO1xuICAgICAgaWYgKGluamVjdGVkUGFja2FnZU5hbWUpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gaW5qZWN0ZWRQYWNrYWdlTmFtZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHBhdGg6IHJlbFBhdGgsXG4gICAgICAgIGlzVGlsZGU6IHVybC5jaGFyQXQoMCkgPT09ICd+JyxcbiAgICAgICAgaXNQYWdlOiBtYXRjaFsxXSAhPSBudWxsIHx8IF8uc3RhcnRzV2l0aCh1cmwsICdwYWdlOi8vJyksXG4gICAgICAgIGxvY2FsZTogbWF0Y2hbMV1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG4gIC8qKlxuXHQgKiBqb2luIGNvbnRleHRQYXRoXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgam9pbkNvbnRleHRQYXRoKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiAodGhpcy5jb250ZXh0UGF0aCArICcvJyArIHBhdGgpLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICB9XG5cbiAgX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lPzogc3RyaW5nKSB7XG4gICAgLy8gbGV0IHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgLy8gaWYgKCFwYWNrYWdlTmFtZSkge1xuICAgIC8vICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgIC8vICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICAvLyB9XG4gICAgdmFyIHBhdGggPSBjb25maWcuZ2V0KCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nWycgKyB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lIHx8IHRoaXMucGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAodGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoKSB7XG4gICAgICBwYXRoID0gdGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoICsgJy8nICsgcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICB9XG5cbiAgcGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhcnNlTmFtZShwYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4gIH1cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cblxuLy8gICBnZXRCdWlsZExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbi8vICAgfVxuXG4vLyAgIGxvY2FsZUJ1bmRsZUZvbGRlcigpIHtcbi8vICAgICByZXR1cm4gdGhpcy5pc0RlZmF1bHRMb2NhbGUoKSA/ICcnIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpICsgJy8nO1xuLy8gICB9XG5cbi8vICAgaXNEZWZhdWx0TG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuLy8gICB9XG59XG5Ob2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbmFzc2V0c1VybC5wYXRjaFRvQXBpKE5vZGVBcGkucHJvdG90eXBlKTtcbmV4cG9ydCA9IE5vZGVBcGk7XG4iXX0=