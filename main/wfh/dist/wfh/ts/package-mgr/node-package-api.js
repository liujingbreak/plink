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
const css_loader_1 = __importDefault(require("require-injector/dist/css-loader"));
const assetsUrl = __importStar(require("../../dist/assets-url"));
// import PackageInstance from '../packageNodeInstance';
const lodash_1 = __importDefault(require("lodash"));
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
        this.buildUtils = require('../../lib/gulp/buildUtils');
        // packageUtils = packageUitls;
        this.compileNodePath = [config_1.default().nodePath];
        this.config = config_1.default;
        this.packageShortName = parseName(packageName).name;
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
        return parseName(packageName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYWNrYWdlLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3RzL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsb0RBQWtDO0FBRWxDLHVEQUErQjtBQUUvQixrRkFBa0U7QUFFbEUsaUVBQW1EO0FBRW5ELHdEQUF3RDtBQUN4RCxvREFBdUI7QUFHdkIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsU0FBUyxTQUFTLENBQUMsUUFBZ0I7SUFDakMsTUFBTSxHQUFHLEdBQUcsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLElBQUksS0FBSyxFQUFFO1FBQ1QsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFDRCw0QkFBNEI7QUFDNUIsaUZBQWlGO0FBRWpGLHFHQUFxRztBQUVyRyxNQUFNLE9BQU87SUFnQlgsWUFBbUIsV0FBbUIsRUFBUyxlQUFnQztRQUE1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWIvRSxlQUFVLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsK0JBQStCO1FBQy9CLG9CQUFlLEdBQUcsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEMsV0FBTSxHQUFHLGdCQUFNLENBQUM7UUFVZCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcs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UUFDekQsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFnQixDQUFDO1FBQ3BELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRTtZQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsV0FBbUI7UUFDbEMsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0lBQ0QsY0FBYztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQWFGO0FBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxnQkFBWSxFQUFFLENBQUM7QUFDaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEMsaUJBQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcblxuaW1wb3J0IG5wbWltcG9ydENzc0xvYWRlciBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvY3NzLWxvYWRlcic7XG5pbXBvcnQgSW5qZWN0IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0ICogYXMgYXNzZXRzVXJsIGZyb20gJy4uLy4uL2Rpc3QvYXNzZXRzLXVybCc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCBwYWNrYWdlSW5zdGFuY2UgYXMgUGFja2FnZUluc3RhbmNlfSBmcm9tICcuLi9idWlsZC11dGlsL3RzJztcbi8vIGltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5cbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5mdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZykge1xuICBjb25zdCByZXQgPSB7bmFtZTogbG9uZ05hbWUsIHNjb3BlOiAnJ307XG4gIGNvbnN0IG1hdGNoID0gbW9kdWxlTmFtZVJlZy5leGVjKGxvbmdOYW1lKTtcbiAgaWYgKG1hdGNoKSB7XG4gICAgcmV0LnNjb3BlID0gbWF0Y2hbMV07XG4gICAgcmV0Lm5hbWUgPSBtYXRjaFsyXTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuLy8gbW9kdWxlLmV4cG9ydHMgPSBOb2RlQXBpO1xuLy8gbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IE5vZGVBcGk7IC8vIFRvIGJlIGF2YWlsYWJsZSBmb3IgRVM2L1RTIGltcG9ydCBzeW50YXggXG5cbi8vIHZhciBzdXBwcmVzc1dhcm40VXJscyA9IGNvbmZpZy5nZXQoJ3N1cHByZXNzV2FybmluZy5hc3NldHNVcmwnLCBbXSkubWFwKGxpbmUgPT4gbmV3IFJlZ0V4cChsaW5lKSk7XG5cbmNsYXNzIE5vZGVBcGkgaW1wbGVtZW50cyBhc3NldHNVcmwuUGFja2FnZUFwaSB7XG4gIHBhY2thZ2VTaG9ydE5hbWU6IHN0cmluZztcbiAgY29udGV4dFBhdGg6IHN0cmluZztcbiAgYnVpbGRVdGlscyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9ndWxwL2J1aWxkVXRpbHMnKTtcbiAgLy8gcGFja2FnZVV0aWxzID0gcGFja2FnZVVpdGxzO1xuICBjb21waWxlTm9kZVBhdGggPSBbY29uZmlnKCkubm9kZVBhdGhdO1xuICBldmVudEJ1czogRXZlbnRFbWl0dGVyO1xuICBjb25maWcgPSBjb25maWc7XG4gIGFyZ3Y6IGFueTtcbiAgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuICBkZWZhdWx0OiBOb2RlQXBpO1xuXG4gIGJyb3dzZXJJbmplY3RvcjogSW5qZWN0O1xuICBmaW5kUGFja2FnZUJ5RmlsZTogKGZpbGU6IHN0cmluZykgPT4gUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkO1xuICBnZXROb2RlQXBpRm9yUGFja2FnZTogKHBrSW5zdGFuY2U6IGFueSwgTm9kZUFwaTogYW55KSA9PiBhbnk7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHB1YmxpYyBwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHRoaXMucGFja2FnZVNob3J0TmFtZSA9IHBhcnNlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICB0aGlzLmNvbnRleHRQYXRoID0gdGhpcy5fY29udGV4dFBhdGgoKTtcbiAgfVxuXG4gIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vZGUoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRCcm93c2VyU2lkZUNvbmZpZyhwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLmNvbmZpZy5zZXQocGF0aCwgdmFsdWUpO1xuICAgIHRoaXMuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2gocGF0aCk7XG4gIH1cblxuICBnZXRQcm9qZWN0RGlycygpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcoKS5wcm9qZWN0TGlzdDtcbiAgfVxuICAvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IHVybFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlRmlsZVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IHwge3BhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaXNUaWxkZTogYm9vbGVhbiwgaXNQYWdlOiBib29sZWFufSwgcmV0dXJucyBzdHJpbmcgaWYgaXQgaXMgYSByZWxhdGl2ZSBwYXRoLCBvciBvYmplY3QgaWZcblx0ICogaXQgaXMgaW4gZm9ybWF0IG9mIC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteXFwvXStcXC8pP1teXFwvXSspP1xcLyguKikkL1xuXHQgKi9cbiAgbm9ybWFsaXplQXNzZXRzVXJsKHVybDogc3RyaW5nLCBzb3VyY2VGaWxlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eKD86YXNzZXRzOlxcL1xcL3x+fHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWModXJsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IG1hdGNoWzNdIHx8ICcnO1xuICAgICAgaWYgKCFwYWNrYWdlTmFtZSB8fCBwYWNrYWdlTmFtZSA9PT0gJycpIHtcbiAgICAgICAgY29uc3QgY29tcFBhY2thZ2UgPSB0aGlzLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29tcFBhY2thZ2UgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZX0gZG9lcyBub3QgYmVsb25nIHRvIGFueSBrbm93biBwYWNrYWdlYCk7XG4gICAgICAgIHBhY2thZ2VOYW1lID0gY29tcFBhY2thZ2UubG9uZ05hbWU7XG4gICAgICB9XG4gICAgICBjb25zdCBpbmplY3RlZFBhY2thZ2VOYW1lID0gbnBtaW1wb3J0Q3NzTG9hZGVyLmdldEluamVjdGVkUGFja2FnZShwYWNrYWdlTmFtZSwgc291cmNlRmlsZSwgdGhpcy5icm93c2VySW5qZWN0b3IpO1xuICAgICAgaWYgKGluamVjdGVkUGFja2FnZU5hbWUpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gaW5qZWN0ZWRQYWNrYWdlTmFtZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHBhdGg6IHJlbFBhdGgsXG4gICAgICAgIGlzVGlsZGU6IHVybC5jaGFyQXQoMCkgPT09ICd+JyxcbiAgICAgICAgaXNQYWdlOiBtYXRjaFsxXSAhPSBudWxsIHx8IF8uc3RhcnRzV2l0aCh1cmwsICdwYWdlOi8vJyksXG4gICAgICAgIGxvY2FsZTogbWF0Y2hbMV1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG4gIC8qKlxuXHQgKiBqb2luIGNvbnRleHRQYXRoXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cbiAgam9pbkNvbnRleHRQYXRoKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiAodGhpcy5jb250ZXh0UGF0aCArICcvJyArIHBhdGgpLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICB9XG5cbiAgX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lPzogc3RyaW5nKSB7XG4gICAgbGV0IHBhY2thZ2VTaG9ydE5hbWU7XG4gICAgaWYgKCFwYWNrYWdlTmFtZSkge1xuICAgICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICAgICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZSkubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFja2FnZVNob3J0TmFtZSA9IHRoaXMucGFja2FnZVNob3J0TmFtZTtcbiAgICB9XG4gICAgdmFyIHBhdGggPSBjb25maWcuZ2V0KCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nWycgKyBwYWNrYWdlU2hvcnROYW1lICsgJ10nKSB8fFxuICAgICAgY29uZmlnLmdldChbJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLCBwYWNrYWdlTmFtZV0pO1xuICAgIHBhdGggPSBwYXRoICE9IG51bGwgPyBwYXRoIDogJy8nICsgcGFja2FnZVNob3J0TmFtZTtcbiAgICBpZiAodGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoKSB7XG4gICAgICBwYXRoID0gdGhpcy5jb25maWcoKS5ub2RlUm91dGVQYXRoICsgJy8nICsgcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICB9XG5cbiAgcGFyc2VQYWNrYWdlTmFtZShwYWNrYWdlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhcnNlTmFtZShwYWNrYWdlTmFtZSk7XG4gIH1cblxuICBpc0RlZmF1bHRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnbG9jYWxlc1swXScpID09PSB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4gIH1cbiAgZ2V0QnVpbGRMb2NhbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXJndi5sb2NhbGUgfHwgdGhpcy5jb25maWcuZ2V0KCdsb2NhbGVzWzBdJyk7XG4gIH1cblxuLy8gICBnZXRCdWlsZExvY2FsZSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5hcmd2LmxvY2FsZSB8fCB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKTtcbi8vICAgfVxuXG4vLyAgIGxvY2FsZUJ1bmRsZUZvbGRlcigpIHtcbi8vICAgICByZXR1cm4gdGhpcy5pc0RlZmF1bHRMb2NhbGUoKSA/ICcnIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpICsgJy8nO1xuLy8gICB9XG5cbi8vICAgaXNEZWZhdWx0TG9jYWxlKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2xvY2FsZXNbMF0nKSA9PT0gdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuLy8gICB9XG59XG5Ob2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbmFzc2V0c1VybC5wYXRjaFRvQXBpKE5vZGVBcGkucHJvdG90eXBlKTtcbmV4cG9ydCA9IE5vZGVBcGk7XG4iXX0=