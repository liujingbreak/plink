"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    if (!locale)
        locale = this.isDefaultLocale() ? null : this.getBuildLocale();
    path = path.replace(/([^./\\]+\.)[^?./\\]+(\?.*)?$/, '$1html$2');
    return publicUrl(this.config().staticAssetsURL, this.config().outputPathMap, locale, packageName, path);
}
exports.entryPageUrl = entryPageUrl;
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
    var m = /^(?:assets:\/\/|~|npm:\/\/|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(path);
    if (m) {
        packageName = m[2];
        path = m[3];
    }
    var outputPath = outputPathMap[packageName];
    if (outputPath != null) {
        outputPath = /^\/*(.*?)\/*$/.exec(outputPath)[1]; // _.trim(outputPath, '/');
    }
    else {
        m = /(?:@([^/]+)\/)?(\S+)/.exec(packageName);
        outputPath = m ? m[2] : packageName;
    }
    var finalUrl = joinUrl(staticAssetsURL, useLocale || '', outputPath, path);
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
    return Url.resolve(this.config().staticAssetsURL, this._contextPath(packageNameOrPath) + '/' + path);
}
exports.serverUrl = serverUrl;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBRTNCLFNBQWdCLFVBQVUsQ0FBQyxZQUFpQjtJQUMxQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUVuQyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUV6QyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUNyQyxDQUFDO0FBTkQsZ0NBTUM7QUFFRCxTQUFnQixZQUFZLENBQUMsV0FBbUIsRUFBRSxJQUFZLEVBQUUsTUFBYztJQUM1RSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDaEM7SUFDRCxJQUFJLENBQUMsTUFBTTtRQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFDekUsTUFBTSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBVkQsb0NBVUM7QUFFRCxTQUFnQixTQUFTLENBQUMsV0FBbUIsRUFBRSxJQUFhO0lBQzFELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUN0QixJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FB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TyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxpQkFBeUIsRUFBRSxJQUFhO0lBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEIsMkJBQTJCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0dBQXdHLGlCQUFpQixPQUFPLElBQUksYUFBYSxDQUFFLENBQUM7S0FDbks7SUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3ZHLENBQUM7QUFWRCw4QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hUb0FwaShhcGlQcm90b3R5cGU6IGFueSkge1xuICBhcGlQcm90b3R5cGUuYXNzZXRzVXJsID0gYXNzZXRzVXJsO1xuXG4gIGFwaVByb3RvdHlwZS5lbnRyeVBhZ2VVcmwgPSBlbnRyeVBhZ2VVcmw7XG5cbiAgYXBpUHJvdG90eXBlLnNlcnZlclVybCA9IHNlcnZlclVybDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVudHJ5UGFnZVVybChwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGxvY2FsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBwYXRoID0gYXJndW1lbnRzWzBdO1xuICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICBpZiAoIWxvY2FsZSlcbiAgICBsb2NhbGUgPSB0aGlzLmlzRGVmYXVsdExvY2FsZSgpID8gbnVsbCA6IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvKFteLi9cXFxcXStcXC4pW14/Li9cXFxcXSsoXFw/LiopPyQvLCAnJDFodG1sJDInKTtcbiAgcmV0dXJuIHB1YmxpY1VybCh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5jb25maWcoKS5vdXRwdXRQYXRoTWFwLFxuICAgIGxvY2FsZSwgcGFja2FnZU5hbWUsIHBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXRzVXJsKHBhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgcmV0dXJuIHB1YmxpY1VybCh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLFxuICAgIHBhY2thZ2VOYW1lLCBwYXRoISk7XG59XG4vKipcbiAqIEhlbHBlciBmb3IgZGVhbGluZyB3aXRoIHVybCBsaWtlIFwibnBtOi8vPHBhY2thZ2U+LzxwYXRoPlwiLCBcImFzc2V0czovLzxwYWNrYWdlPi88cGF0aD5cIlxuICogQHBhcmFtIHtzdHJpbmd9IHN0YXRpY0Fzc2V0c1VSTCwgbGlrZSBXZWJwYWNrJ3Mgb3V0cHV0LnB1YmxpY1BhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBvdXRwdXRQYXRoTWFwXG4gKiBAcGFyYW0ge3N0cmluZ30gdXNlTG9jYWxlIHRoZSBmaW5hbCBVUkwgd2lsbCBpbmNsdWRlcyBsb2NhbGUgcGF0aCAoZm9yIGVudHJ5IHBhZ2UgVVJMKSBcInpoXCIgb3IgXCJ1c1wiLFxuICogdXNlIGBudWxsYCBvciBcIlwiIGRlbm90ZXMgZGVmYXVsdCBsb2NhbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrYWdlTmFtZSBpZiBudWxsLCB0aGUgcGFja2FnZSBuYW1lIHdpbGwgYmUgZXh0cmFjdGVkIGZyb20gdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHVibGljVXJsKHN0YXRpY0Fzc2V0c1VSTDogc3RyaW5nLCBvdXRwdXRQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIHVzZUxvY2FsZTogc3RyaW5nIHwgbnVsbCwgcGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIHZhciBtID0gL14oPzphc3NldHM6XFwvXFwvfH58bnBtOlxcL1xcL3xwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHBhdGgpO1xuICBpZiAobSkge1xuICAgIHBhY2thZ2VOYW1lID0gbVsyXTtcbiAgICBwYXRoID0gbVszXTtcbiAgfVxuXG4gIHZhciBvdXRwdXRQYXRoID0gb3V0cHV0UGF0aE1hcFtwYWNrYWdlTmFtZV07XG4gIGlmIChvdXRwdXRQYXRoICE9IG51bGwpIHtcbiAgICBvdXRwdXRQYXRoID0gL15cXC8qKC4qPylcXC8qJC8uZXhlYyhvdXRwdXRQYXRoKSFbMV07Ly8gXy50cmltKG91dHB1dFBhdGgsICcvJyk7XG4gIH0gZWxzZSB7XG4gICAgbSA9IC8oPzpAKFteL10rKVxcLyk/KFxcUyspLy5leGVjKHBhY2thZ2VOYW1lKTtcbiAgICBvdXRwdXRQYXRoID0gbSA/IG1bMl0gOiBwYWNrYWdlTmFtZTtcbiAgfVxuICB2YXIgZmluYWxVcmwgPSBqb2luVXJsKHN0YXRpY0Fzc2V0c1VSTCwgdXNlTG9jYWxlIHx8ICcnLCBvdXRwdXRQYXRoLCBwYXRoKTtcblxuICBpZiAoIS9eaHR0cHM/OlxcL1xcLy8udGVzdChmaW5hbFVybCkgJiYgZmluYWxVcmwuY2hhckF0KDApICE9PSAnLycpXG4gICAgZmluYWxVcmwgPSAnLycgKyBmaW5hbFVybDtcbiAgcmV0dXJuIGZpbmFsVXJsO1xufVxuXG5mdW5jdGlvbiBqb2luVXJsKC4uLnBhdGhFbHM6IHN0cmluZ1tdKSB7XG4gIHBhdGhFbHMgPSBwYXRoRWxzLm1hcChlbCA9PiB7XG4gICAgLy8gVHJpbSBsYXN0ICcvJ1xuICAgIGlmIChlbCAmJiBlbC5jaGFyQXQoZWwubGVuZ3RoIC0gMSkgPT09ICcvJyAmJiBlbC5sZW5ndGggPiAxKVxuICAgICAgcmV0dXJuIGVsLnN1YnN0cmluZygwLCBlbC5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gZWw7XG4gIH0pO1xuICB2YXIgam9pbmVkID0gcGF0aEVsc1swXTtcbiAgZm9yICh2YXIgaSA9IDEsIGwgPSBwYXRoRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChwYXRoRWxzW2ldID09IG51bGwgfHwgcGF0aEVsc1tpXS5sZW5ndGggPT09IDApXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoam9pbmVkLmxlbmd0aCA+IDAgJiYgam9pbmVkLmNoYXJBdChqb2luZWQubGVuZ3RoIC0gMSkgIT09ICcvJyAmJlxuICAgICAgcGF0aEVsc1tpXSAmJiBwYXRoRWxzW2ldLmNoYXJBdCgwKSAhPT0gJy8nKVxuICAgICAgam9pbmVkICs9ICcvJztcbiAgICBqb2luZWQgKz0gcGF0aEVsc1tpXTtcbiAgfVxuICByZXR1cm4gam9pbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VydmVyVXJsKHBhY2thZ2VOYW1lT3JQYXRoOiBzdHJpbmcsIHBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIXRoaXMuaXNOb2RlKCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGFwaS5zZXJ2ZXJVcmwoKSBvbmx5IGF2YWlsYWJsZSBhdCBzZXJ2ZXIgc2lkZSBkdXJpbmcgY29tcGlsZS10aW1lIGFuZCBydW50aW1lLCB1c2UgXCJfX2FwaS5zZXJ2ZXJVcmwoJyR7cGFja2FnZU5hbWVPclBhdGh9JywgJyR7cGF0aH0nKVwiIGluc3RlYWRgICk7XG4gIH1cbiAgaWYgKHBhdGggPT0gbnVsbCkge1xuICAgIHBhdGggPSBwYWNrYWdlTmFtZU9yUGF0aDtcbiAgICBwYWNrYWdlTmFtZU9yUGF0aCA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgcmV0dXJuIFVybC5yZXNvbHZlKHRoaXMuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCB0aGlzLl9jb250ZXh0UGF0aChwYWNrYWdlTmFtZU9yUGF0aCkgKyAnLycgKyBwYXRoKTtcbn1cbiJdfQ==