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
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverUrl = exports.publicUrl = exports.assetsUrl = exports.entryPageUrl = exports.patchToApi = void 0;
const Url = __importStar(require("url"));
function patchToApi(apiPrototype) {
    apiPrototype.assetsUrl = assetsUrl;
    apiPrototype.entryPageUrl = entryPageUrl;
    apiPrototype.serverUrl = serverUrl;
}
exports.patchToApi = patchToApi;
function entryPageUrl(packageName, path, locale) {
    if (arguments.length === 1) {
        path = arguments[0];
        packageName = this.packageName;
    }
    path = path.replace(/([^./\\]+\.)[^?./\\]+(\?.*)?$/, '$1html$2');
    return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap, locale ? locale : (this.isDefaultLocale() ? null : this.getBuildLocale()), packageName, path);
}
exports.entryPageUrl = entryPageUrl;
// export function assetsUrl(this: PackageApi, path: string): string;
function assetsUrl(packageName, path) {
    if (path === undefined) {
        path = arguments[0];
        packageName = this.packageName;
    }
    return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap, null, packageName, path);
}
exports.assetsUrl = assetsUrl;
/**
 * Helper for dealing with url like "npm://<package>/<path>", "assets://<package>/<path>"
 * @param {string} staticAssetsURL, like Webpack's output.publicPath
 * @param {object} outputPathMap
 * @param {string} useLocale the final URL will includes locale path (for entry page URL) "zh" or "us",
 * use `null` or "" denotes default locale
 * @param {string} packageName if null, the package name will be extracted from url
 * @param {string} path
 * @return {string}
 */
function publicUrl(staticAssetsURL, outputPathMap, useLocale, packageName, path) {
    var m = /^(assets:\/\/|~|npm:\/\/|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(path);
    if (m) {
        if (m[1] && !m[3]) {
            throw new Error(`Can not resolve package name from "${path}"`);
        }
        if (m[3])
            packageName = m[3];
        path = m[4];
    }
    // if (packageName == null) {
    //   throw new Error(`Can not resolve package name from "${path}"`);
    // }
    let finalUrl;
    if (packageName) {
        let outputPath = outputPathMap[packageName];
        if (outputPath != null) {
            outputPath = /^\/*(.*?)\/*$/.exec(outputPath)[1]; // _.trim(outputPath, '/');
        }
        else {
            m = /(?:@([^/]+)\/)?(\S+)/.exec(packageName);
            outputPath = m ? m[2] : packageName;
        }
        finalUrl = joinUrl(staticAssetsURL, useLocale || '', outputPath, path);
    }
    else {
        finalUrl = joinUrl(staticAssetsURL, useLocale || '', path);
    }
    if (!/^https?:\/\//.test(finalUrl) && finalUrl.charAt(0) !== '/')
        finalUrl = '/' + finalUrl;
    return finalUrl;
}
exports.publicUrl = publicUrl;
function joinUrl(...pathEls) {
    pathEls = pathEls.map(el => {
        // Trim last '/'
        if (el && el.charAt(el.length - 1) === '/' && el.length > 1)
            return el.substring(0, el.length - 1);
        return el;
    });
    var joined = pathEls[0];
    for (var i = 1, l = pathEls.length; i < l; i++) {
        if (pathEls[i] == null || pathEls[i].length === 0)
            continue;
        if (joined.length > 0 && joined.charAt(joined.length - 1) !== '/' &&
            pathEls[i] && pathEls[i].charAt(0) !== '/')
            joined += '/';
        joined += pathEls[i];
    }
    return joined;
}
function serverUrl(packageNameOrPath, path) {
    if (!this.isNode()) {
        // tslint:disable-next-line
        throw new Error(`api.serverUrl() only available at server side during compile-time and runtime, use "__api.serverUrl('${packageNameOrPath}', '${path}')" instead`);
    }
    if (path == null) {
        path = packageNameOrPath;
        packageNameOrPath = this.packageName;
    }
    return Url.resolve('/', this._contextPath(packageNameOrPath) + '/' + path);
}
exports.serverUrl = serverUrl;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQXNCM0IsU0FBZ0IsVUFBVSxDQUFDLFlBQWlCO0lBRTFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBRW5DLFlBQVksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBRXpDLFlBQVksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQ3JDLENBQUM7QUFQRCxnQ0FPQztBQUVELFNBQWdCLFlBQVksQ0FBbUIsV0FBbUIsRUFBRSxJQUFZLEVBQUUsTUFBYztJQUM5RixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDaEM7SUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNqRSxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQ3pFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEcsQ0FBQztBQVJELG9DQVFDO0FBRUQscUVBQXFFO0FBQ3JFLFNBQWdCLFNBQVMsQ0FBbUIsV0FBMEIsRUFBRSxJQUFhO0lBQ25GLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUN0QixJQUFJ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QUUsQ0FBQyxFQUFFLEVBQUU7UUFDOUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUMvQyxTQUFTO1FBQ1gsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRztZQUMvRCxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO1lBQzFDLE1BQU0sSUFBSSxHQUFHLENBQUM7UUFDaEIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN0QjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFnQixTQUFTLENBQW1CLGlCQUF5QixFQUFFLElBQWE7SUFDbEYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNsQiwyQkFBMkI7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx3R0FBd0csaUJBQWlCLE9BQU8sSUFBSSxhQUFhLENBQUUsQ0FBQztLQUNuSztJQUNELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsaUJBQWlCLENBQUM7UUFDekIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztLQUN0QztJQUNELE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUM3RSxDQUFDO0FBVkQsOEJBVUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcblxuaW50ZXJmYWNlIENvbmZpZ1NldHRpbmcge1xuICBzdGF0aWNBc3NldHNVUkw6IHN0cmluZztcbiAgb3V0cHV0UGF0aE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VBcGkge1xuICBwYWNrYWdlTmFtZTogc3RyaW5nO1xuICBjb25maWcoKTogQ29uZmlnU2V0dGluZztcbiAgaXNEZWZhdWx0TG9jYWxlKCk6IGJvb2xlYW47XG4gIGdldEJ1aWxkTG9jYWxlKCk6IHN0cmluZztcbiAgaXNOb2RlKCk6IGJvb2xlYW47XG4gIF9jb250ZXh0UGF0aChwYWNrYWdlTmFtZT86IHN0cmluZyk6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHRlbmRlZEFwaSB7XG4gIGFzc2V0c1VybDogdHlwZW9mIGFzc2V0c1VybDtcbiAgZW50cnlQYWdlVXJsOiB0eXBlb2YgZW50cnlQYWdlVXJsO1xuICBzZXJ2ZXJVcmw6IHR5cGVvZiBzZXJ2ZXJVcmw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaFRvQXBpKGFwaVByb3RvdHlwZTogYW55KSB7XG4gIFxuICBhcGlQcm90b3R5cGUuYXNzZXRzVXJsID0gYXNzZXRzVXJsO1xuXG4gIGFwaVByb3RvdHlwZS5lbnRyeVBhZ2VVcmwgPSBlbnRyeVBhZ2VVcmw7XG5cbiAgYXBpUHJvdG90eXBlLnNlcnZlclVybCA9IHNlcnZlclVybDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVudHJ5UGFnZVVybCh0aGlzOiBQYWNrYWdlQXBpLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGxvY2FsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBwYXRoID0gYXJndW1lbnRzWzBdO1xuICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICBwYXRoID0gcGF0aC5yZXBsYWNlKC8oW14uL1xcXFxdK1xcLilbXj8uL1xcXFxdKyhcXD8uKik/JC8sICckMWh0bWwkMicpO1xuICByZXR1cm4gcHVibGljVXJsKHRoaXMuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCB0aGlzLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsXG4gICAgbG9jYWxlID8gbG9jYWxlIDogKHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyBudWxsIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpKSwgcGFja2FnZU5hbWUsIHBhdGgpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gYXNzZXRzVXJsKHRoaXM6IFBhY2thZ2VBcGksIHBhdGg6IHN0cmluZyk6IHN0cmluZztcbmV4cG9ydCBmdW5jdGlvbiBhc3NldHNVcmwodGhpczogUGFja2FnZUFwaSwgcGFja2FnZU5hbWU6IHN0cmluZyB8IG51bGwsIHBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgcmV0dXJuIHB1YmxpY1VybCh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLFxuICAgIHBhY2thZ2VOYW1lLCBwYXRoISk7XG59XG4vKipcbiAqIEhlbHBlciBmb3IgZGVhbGluZyB3aXRoIHVybCBsaWtlIFwibnBtOi8vPHBhY2thZ2U+LzxwYXRoPlwiLCBcImFzc2V0czovLzxwYWNrYWdlPi88cGF0aD5cIlxuICogQHBhcmFtIHtzdHJpbmd9IHN0YXRpY0Fzc2V0c1VSTCwgbGlrZSBXZWJwYWNrJ3Mgb3V0cHV0LnB1YmxpY1BhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBvdXRwdXRQYXRoTWFwXG4gKiBAcGFyYW0ge3N0cmluZ30gdXNlTG9jYWxlIHRoZSBmaW5hbCBVUkwgd2lsbCBpbmNsdWRlcyBsb2NhbGUgcGF0aCAoZm9yIGVudHJ5IHBhZ2UgVVJMKSBcInpoXCIgb3IgXCJ1c1wiLFxuICogdXNlIGBudWxsYCBvciBcIlwiIGRlbm90ZXMgZGVmYXVsdCBsb2NhbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrYWdlTmFtZSBpZiBudWxsLCB0aGUgcGFja2FnZSBuYW1lIHdpbGwgYmUgZXh0cmFjdGVkIGZyb20gdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHVibGljVXJsKHN0YXRpY0Fzc2V0c1VSTDogc3RyaW5nLCBvdXRwdXRQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIHVzZUxvY2FsZTogc3RyaW5nIHwgbnVsbCwgcGFja2FnZU5hbWU6IHN0cmluZyB8IG51bGwsIHBhdGg6IHN0cmluZykge1xuICB2YXIgbSA9IC9eKGFzc2V0czpcXC9cXC98fnxucG06XFwvXFwvfHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWMocGF0aCk7XG4gIGlmIChtKSB7XG4gICAgaWYgKG1bMV0gJiYgIW1bM10pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZXNvbHZlIHBhY2thZ2UgbmFtZSBmcm9tIFwiJHtwYXRofVwiYCk7XG4gICAgfVxuICAgIGlmIChtWzNdKVxuICAgICAgcGFja2FnZU5hbWUgPSBtWzNdO1xuICAgIHBhdGggPSBtWzRdO1xuICB9XG4gIC8vIGlmIChwYWNrYWdlTmFtZSA9PSBudWxsKSB7XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlc29sdmUgcGFja2FnZSBuYW1lIGZyb20gXCIke3BhdGh9XCJgKTtcbiAgLy8gfVxuICBsZXQgZmluYWxVcmw6IHN0cmluZztcbiAgaWYgKHBhY2thZ2VOYW1lKSB7XG4gICAgbGV0IG91dHB1dFBhdGggPSBvdXRwdXRQYXRoTWFwW3BhY2thZ2VOYW1lXTtcbiAgICBpZiAob3V0cHV0UGF0aCAhPSBudWxsKSB7XG4gICAgICBvdXRwdXRQYXRoID0gL15cXC8qKC4qPylcXC8qJC8uZXhlYyhvdXRwdXRQYXRoKSFbMV07Ly8gXy50cmltKG91dHB1dFBhdGgsICcvJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSAvKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhwYWNrYWdlTmFtZSk7XG4gICAgICBvdXRwdXRQYXRoID0gbSA/IG1bMl0gOiBwYWNrYWdlTmFtZTtcbiAgICB9XG4gICAgZmluYWxVcmwgPSBqb2luVXJsKHN0YXRpY0Fzc2V0c1VSTCwgdXNlTG9jYWxlIHx8ICcnLCBvdXRwdXRQYXRoLCBwYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBmaW5hbFVybCA9IGpvaW5Vcmwoc3RhdGljQXNzZXRzVVJMLCB1c2VMb2NhbGUgfHwgJycsIHBhdGgpO1xuICB9XG5cbiAgaWYgKCEvXmh0dHBzPzpcXC9cXC8vLnRlc3QoZmluYWxVcmwpICYmIGZpbmFsVXJsLmNoYXJBdCgwKSAhPT0gJy8nKVxuICAgIGZpbmFsVXJsID0gJy8nICsgZmluYWxVcmw7XG4gIHJldHVybiBmaW5hbFVybDtcbn1cblxuZnVuY3Rpb24gam9pblVybCguLi5wYXRoRWxzOiBzdHJpbmdbXSkge1xuICBwYXRoRWxzID0gcGF0aEVscy5tYXAoZWwgPT4ge1xuICAgIC8vIFRyaW0gbGFzdCAnLydcbiAgICBpZiAoZWwgJiYgZWwuY2hhckF0KGVsLmxlbmd0aCAtIDEpID09PSAnLycgJiYgZWwubGVuZ3RoID4gMSlcbiAgICAgIHJldHVybiBlbC5zdWJzdHJpbmcoMCwgZWwubGVuZ3RoIC0gMSk7XG4gICAgcmV0dXJuIGVsO1xuICB9KTtcbiAgdmFyIGpvaW5lZCA9IHBhdGhFbHNbMF07XG4gIGZvciAodmFyIGkgPSAxLCBsID0gcGF0aEVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGF0aEVsc1tpXSA9PSBudWxsIHx8IHBhdGhFbHNbaV0ubGVuZ3RoID09PSAwKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGpvaW5lZC5sZW5ndGggPiAwICYmIGpvaW5lZC5jaGFyQXQoam9pbmVkLmxlbmd0aCAtIDEpICE9PSAnLycgJiZcbiAgICAgIHBhdGhFbHNbaV0gJiYgcGF0aEVsc1tpXS5jaGFyQXQoMCkgIT09ICcvJylcbiAgICAgIGpvaW5lZCArPSAnLyc7XG4gICAgam9pbmVkICs9IHBhdGhFbHNbaV07XG4gIH1cbiAgcmV0dXJuIGpvaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZlclVybCh0aGlzOiBQYWNrYWdlQXBpLCBwYWNrYWdlTmFtZU9yUGF0aDogc3RyaW5nLCBwYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0aGlzLmlzTm9kZSgpKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBhcGkuc2VydmVyVXJsKCkgb25seSBhdmFpbGFibGUgYXQgc2VydmVyIHNpZGUgZHVyaW5nIGNvbXBpbGUtdGltZSBhbmQgcnVudGltZSwgdXNlIFwiX19hcGkuc2VydmVyVXJsKCcke3BhY2thZ2VOYW1lT3JQYXRofScsICcke3BhdGh9JylcIiBpbnN0ZWFkYCApO1xuICB9XG4gIGlmIChwYXRoID09IG51bGwpIHtcbiAgICBwYXRoID0gcGFja2FnZU5hbWVPclBhdGg7XG4gICAgcGFja2FnZU5hbWVPclBhdGggPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIHJldHVybiBVcmwucmVzb2x2ZSgnLycsIHRoaXMuX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lT3JQYXRoKSArICcvJyArIHBhdGgpO1xufVxuIl19