"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
        this.logger = (0, log4js_1.getLogger)(this.packageName);
    }
    get contextPath() {
        return this._contextPath();
    }
    /**
     * return A log witch catgory name "<package name>.<nameAfterPackageName>"
     * @param nameAfterPackageName
     */
    getLogger(nameAfterPackageName) {
        return (0, log4js_1.getLogger)(this.packageName + '.' + nameAfterPackageName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBCQUEwQjtBQUMxQixtQ0FBb0M7QUFFcEMsdURBQStCO0FBQy9CLGtGQUFrRTtBQUVsRSxpRUFBbUQ7QUFHbkQsb0RBQXVCO0FBQ3ZCLG1DQUF5QztBQUV6QyxNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxTQUFTLFNBQVMsQ0FBQyxRQUFnQjtJQUNqQyxNQUFNLEdBQUcsR0FBRyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQ3hDLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0MsSUFBSSxLQUFLLEVBQUU7UUFDVCxHQUFHLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNyQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUNELDRCQUE0QjtBQUM1QixpRkFBaUY7QUFFakYscUdBQXFHO0FBRXJHLE1BQU0sT0FBTztJQXlCWCxZQUFtQixXQUFtQixFQUFTLGVBQWdDO1FBQTVELGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBcEIvRSxXQUFNLEdBQUcsZ0JBQU0sQ0FBQztRQXFCZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLGtCQUFTLEVBQUMsSUFBSSxDQUFDLFdBQVcsQ0FB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LENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQ3pELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRTtZQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsV0FBbUI7UUFDbEMsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELGtCQUFrQjtJQUNsQixlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDakUsQ0FBQztJQUNELGtCQUFrQjtJQUNsQixjQUFjO1FBQ1osT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0Y7QUFFRCxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFZLEVBQUUsQ0FBQztBQUVoRCxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUV4QyxrQkFBZSxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlblxuaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBucG1pbXBvcnRDc3NMb2FkZXIgZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Nzcy1sb2FkZXInO1xuaW1wb3J0IEluamVjdCBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCAqIGFzIGFzc2V0c1VybCBmcm9tICcuLi8uLi9kaXN0L2Fzc2V0cy11cmwnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtMb2dnZXIsIGdldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJldCA9IHtuYW1lOiBsb25nTmFtZSwgc2NvcGU6ICcnfTtcbiAgY29uc3QgbWF0Y2ggPSBtb2R1bGVOYW1lUmVnLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXQuc2NvcGUgPSBtYXRjaFsxXTtcbiAgICByZXQubmFtZSA9IG1hdGNoWzJdO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4vLyBtb2R1bGUuZXhwb3J0cyA9IE5vZGVBcGk7XG4vLyBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFwaTsgLy8gVG8gYmUgYXZhaWxhYmxlIGZvciBFUzYvVFMgaW1wb3J0IHN5bnRheCBcblxuLy8gdmFyIHN1cHByZXNzV2FybjRVcmxzID0gY29uZmlnLmdldCgnc3VwcHJlc3NXYXJuaW5nLmFzc2V0c1VybCcsIFtdKS5tYXAobGluZSA9PiBuZXcgUmVnRXhwKGxpbmUpKTtcblxuY2xhc3MgTm9kZUFwaSBpbXBsZW1lbnRzIGFzc2V0c1VybC5QYWNrYWdlQXBpLCBhc3NldHNVcmwuRXh0ZW5kZWRBcGkge1xuICBwYWNrYWdlU2hvcnROYW1lOiBzdHJpbmc7XG4gIC8vIHBhY2thZ2VVdGlscyA9IHBhY2thZ2VVaXRscztcbiAgLy8gY29tcGlsZU5vZGVQYXRoID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgZXZlbnRCdXM6IEV2ZW50RW1pdHRlcjtcbiAgY29uZmlnID0gY29uZmlnO1xuICBhcmd2OiBhbnk7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZGVmYXVsdDogTm9kZUFwaTtcbiAgbG9nZ2VyOiBMb2dnZXI7XG5cbiAgYnJvd3NlckluamVjdG9yOiBJbmplY3Q7XG4gIGZpbmRQYWNrYWdlQnlGaWxlOiAoZmlsZTogc3RyaW5nKSA9PiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG4gIGdldE5vZGVBcGlGb3JQYWNrYWdlOiAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSA9PiBOb2RlQXBpO1xuXG4gIGFzc2V0c1VybDogdHlwZW9mIGFzc2V0c1VybC5hc3NldHNVcmw7XG4gIHNlcnZlclVybDogdHlwZW9mIGFzc2V0c1VybC5zZXJ2ZXJVcmw7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBlbnRyeVBhZ2VVcmw6IHR5cGVvZiBhc3NldHNVcmwuZW50cnlQYWdlVXJsO1xuXG4gIGdldCBjb250ZXh0UGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgfVxuXG5cbiAgY29uc3RydWN0b3IocHVibGljIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHB1YmxpYyBwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHRoaXMucGFja2FnZVNob3J0TmFtZSA9IHBhcnNlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICAvLyB0aGlzLmNvbnRleHRQYXRoID0gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgICB0aGlzLmxvZ2dlciA9IGdldExvZ2dlcih0aGlzLnBhY2thZ2VOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiByZXR1cm4gQSBsb2cgd2l0Y2ggY2F0Z29yeSBuYW1lIFwiPHBhY2thZ2UgbmFtZT4uPG5hbWVBZnRlclBhY2thZ2VOYW1lPlwiXG4gICAqIEBwYXJhbSBuYW1lQWZ0ZXJQYWNrYWdlTmFtZSBcbiAgICovXG4gIGdldExvZ2dlcihuYW1lQWZ0ZXJQYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGdldExvZ2dlcih0aGlzLnBhY2thZ2VOYW1lICsgJy4nICsgbmFtZUFmdGVyUGFja2FnZU5hbWUpO1xuICB9XG5cbiAgaXNCcm93c2VyKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzTm9kZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZEJyb3dzZXJTaWRlQ29uZmlnKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgIHRoaXMuY29uZmlnLnNldChwYXRoLCB2YWx1ZSk7XG4gICAgdGhpcy5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaChwYXRoKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VGaWxlXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gfCB7cGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpc1RpbGRlOiBib29sZWFuLCBpc1BhZ2U6IGJvb2xlYW59LCByZXR1cm5zIHN0cmluZyBpZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGgsIG9yIG9iamVjdCBpZlxuXHQgKiBpdCBpcyBpbiBmb3JtYXQgb2YgL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW15cXC9dK1xcLyk/W15cXC9dKyk/XFwvKC4qKSQvXG5cdCAqL1xuICBub3JtYWxpemVBc3NldHNVcmwodXJsOiBzdHJpbmcsIHNvdXJjZUZpbGU6IHN0cmluZykge1xuICAgIGNvbnN0IG1hdGNoID0gL14oPzphc3NldHM6XFwvXFwvfH58cGFnZSg/Oi0oW146XSspKT86XFwvXFwvKSgoPzpAW14vXStcXC8pP1teL0BdW14vXSopPyg/OlxcLyhbXkBdLiopPyk/JC8uZXhlYyh1cmwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gbWF0Y2hbMl07XG4gICAgICBjb25zdCByZWxQYXRoID0gbWF0Y2hbM10gfHwgJyc7XG4gICAgICBpZiAoIXBhY2thZ2VOYW1lIHx8IHBhY2thZ2VOYW1lID09PSAnJykge1xuICAgICAgICBjb25zdCBjb21wUGFja2FnZSA9IHRoaXMuZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb21wUGFja2FnZSA9PSBudWxsKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlfSBkb2VzIG5vdCBiZWxvbmcgdG8gYW55IGtub3duIHBhY2thZ2VgKTtcbiAgICAgICAgcGFja2FnZU5hbWUgPSBjb21wUGFja2FnZS5sb25nTmFtZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluamVjdGVkUGFja2FnZU5hbWUgPSBucG1pbXBvcnRDc3NMb2FkZXIuZ2V0SW5qZWN0ZWRQYWNrYWdlKHBhY2thZ2VOYW1lLCBzb3VyY2VGaWxlLCB0aGlzLmJyb3dzZXJJbmplY3Rvcik7XG4gICAgICBpZiAoaW5qZWN0ZWRQYWNrYWdlTmFtZSlcbiAgICAgICAgcGFja2FnZU5hbWUgPSBpbmplY3RlZFBhY2thZ2VOYW1lO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgcGF0aDogcmVsUGF0aCxcbiAgICAgICAgaXNUaWxkZTogdXJsLmNoYXJBdCgwKSA9PT0gJ34nLFxuICAgICAgICBpc1BhZ2U6IG1hdGNoWzFdICE9IG51bGwgfHwgXy5zdGFydHNXaXRoKHVybCwgJ3BhZ2U6Ly8nKSxcbiAgICAgICAgbG9jYWxlOiBtYXRjaFsxXVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cbiAgLyoqXG5cdCAqIGpvaW4gY29udGV4dFBhdGhcblx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBqb2luQ29udGV4dFBhdGgocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuICh0aGlzLmNvbnRleHRQYXRoICsgJy8nICsgcGF0aCkucmVwbGFjZSgvXFwvXFwvL2csICcvJyk7XG4gIH1cblxuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGxldCBwYWNrYWdlU2hvcnROYW1lO1xuICAgIC8vIGlmICghcGFja2FnZU5hbWUpIHtcbiAgICAvLyAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgICAvLyAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhcnNlUGFja2FnZU5hbWUocGFja2FnZU5hbWUpLm5hbWU7XG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHBhY2thZ2VTaG9ydE5hbWUgPSB0aGlzLnBhY2thZ2VTaG9ydE5hbWU7XG4gICAgLy8gfVxuICAgIGxldCBwYXRoOiBzdHJpbmcgPSBjb25maWcuZ2V0KCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nWycgKyB0aGlzLnBhY2thZ2VTaG9ydE5hbWUgKyAnXScpIHx8XG4gICAgICBjb25maWcuZ2V0KFsncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsIHBhY2thZ2VOYW1lIHx8IHRoaXMucGFja2FnZU5hbWVdKTtcbiAgICBwYXRoID0gcGF0aCAhPSBudWxsID8gcGF0aCA6ICcvJyArIHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAodGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoKSB7XG4gICAgICBwYXRoID0gdGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoICsgJy8nICsgcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICB9XG5cbiAgcGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhcnNlTmFtZShwYWNrYWdlTmFtZSk7XG4gIH1cblxuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgaXNEZWZhdWx0TG9jYWxlKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuICB9XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBnZXRCdWlsZExvY2FsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbiAgfVxufVxuXG5Ob2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuYXNzZXRzVXJsLnBhdGNoVG9BcGkoTm9kZUFwaS5wcm90b3R5cGUpO1xuXG5leHBvcnQgZGVmYXVsdCBOb2RlQXBpO1xuIl19