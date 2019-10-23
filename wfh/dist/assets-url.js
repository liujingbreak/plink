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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBaUIzQixTQUFnQixVQUFVLENBQUMsWUFBaUI7SUFDMUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFFbkMsWUFBWSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFFekMsWUFBWSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFDckMsQ0FBQztBQU5ELGdDQU1DO0FBRUQsU0FBZ0IsWUFBWSxDQUFtQixXQUFtQixFQUFFLElBQVksRUFBRSxNQUFjO0lBQzlGLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDMUIsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztLQUNoQztJQUNELElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFDekUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNsRyxDQUFDO0FBUkQsb0NBUUM7QUFFRCxxRUFBcUU7QUFDckUsU0FBZ0IsU0FBUyxDQUFtQixXQUEwQixFQUFFLElBQWE7SUFDbkYsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3RCLElBQUksR0FBRyxTQUFTLENB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RUFBRTtRQUM5QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQy9DLFNBQVM7UUFDWCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHO1lBQy9ELE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFDMUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztRQUNoQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBbUIsaUJBQXlCLEVBQUUsSUFBYTtJQUNsRixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ2xCLDJCQUEyQjtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHdHQUF3RyxpQkFBaUIsT0FBTyxJQUFJLGFBQWEsQ0FBRSxDQUFDO0tBQ25LO0lBQ0QsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1FBQ2hCLElBQUksR0FBRyxpQkFBaUIsQ0FBQztRQUN6QixpQkFBaUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ3RDO0lBQ0QsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzdFLENBQUM7QUFWRCw4QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VBcGkge1xuICBwYWNrYWdlTmFtZTogc3RyaW5nO1xuICBjb25maWcoKToge1trZXk6IHN0cmluZ106IGFueX07XG4gIGlzRGVmYXVsdExvY2FsZSgpOiBib29sZWFuO1xuICBnZXRCdWlsZExvY2FsZSgpOiBzdHJpbmc7XG4gIGlzTm9kZSgpOiBib29sZWFuO1xuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5kZWRBcGkge1xuICBhc3NldHNVcmw6IHR5cGVvZiBhc3NldHNVcmw7XG4gIGVudHJ5UGFnZVVybDogdHlwZW9mIGVudHJ5UGFnZVVybDtcbiAgc2VydmVyVXJsOiB0eXBlb2Ygc2VydmVyVXJsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hUb0FwaShhcGlQcm90b3R5cGU6IGFueSkge1xuICBhcGlQcm90b3R5cGUuYXNzZXRzVXJsID0gYXNzZXRzVXJsO1xuXG4gIGFwaVByb3RvdHlwZS5lbnRyeVBhZ2VVcmwgPSBlbnRyeVBhZ2VVcmw7XG5cbiAgYXBpUHJvdG90eXBlLnNlcnZlclVybCA9IHNlcnZlclVybDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVudHJ5UGFnZVVybCh0aGlzOiBQYWNrYWdlQXBpLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGxvY2FsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBwYXRoID0gYXJndW1lbnRzWzBdO1xuICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICBwYXRoID0gcGF0aC5yZXBsYWNlKC8oW14uL1xcXFxdK1xcLilbXj8uL1xcXFxdKyhcXD8uKik/JC8sICckMWh0bWwkMicpO1xuICByZXR1cm4gcHVibGljVXJsKHRoaXMuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCB0aGlzLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsXG4gICAgbG9jYWxlID8gbG9jYWxlIDogKHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyBudWxsIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpKSwgcGFja2FnZU5hbWUsIHBhdGgpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gYXNzZXRzVXJsKHRoaXM6IFBhY2thZ2VBcGksIHBhdGg6IHN0cmluZyk6IHN0cmluZztcbmV4cG9ydCBmdW5jdGlvbiBhc3NldHNVcmwodGhpczogUGFja2FnZUFwaSwgcGFja2FnZU5hbWU6IHN0cmluZyB8IG51bGwsIHBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgcmV0dXJuIHB1YmxpY1VybCh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLFxuICAgIHBhY2thZ2VOYW1lLCBwYXRoISk7XG59XG4vKipcbiAqIEhlbHBlciBmb3IgZGVhbGluZyB3aXRoIHVybCBsaWtlIFwibnBtOi8vPHBhY2thZ2U+LzxwYXRoPlwiLCBcImFzc2V0czovLzxwYWNrYWdlPi88cGF0aD5cIlxuICogQHBhcmFtIHtzdHJpbmd9IHN0YXRpY0Fzc2V0c1VSTCwgbGlrZSBXZWJwYWNrJ3Mgb3V0cHV0LnB1YmxpY1BhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBvdXRwdXRQYXRoTWFwXG4gKiBAcGFyYW0ge3N0cmluZ30gdXNlTG9jYWxlIHRoZSBmaW5hbCBVUkwgd2lsbCBpbmNsdWRlcyBsb2NhbGUgcGF0aCAoZm9yIGVudHJ5IHBhZ2UgVVJMKSBcInpoXCIgb3IgXCJ1c1wiLFxuICogdXNlIGBudWxsYCBvciBcIlwiIGRlbm90ZXMgZGVmYXVsdCBsb2NhbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrYWdlTmFtZSBpZiBudWxsLCB0aGUgcGFja2FnZSBuYW1lIHdpbGwgYmUgZXh0cmFjdGVkIGZyb20gdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHVibGljVXJsKHN0YXRpY0Fzc2V0c1VSTDogc3RyaW5nLCBvdXRwdXRQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIHVzZUxvY2FsZTogc3RyaW5nIHwgbnVsbCwgcGFja2FnZU5hbWU6IHN0cmluZyB8IG51bGwsIHBhdGg6IHN0cmluZykge1xuICB2YXIgbSA9IC9eKGFzc2V0czpcXC9cXC98fnxucG06XFwvXFwvfHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWMocGF0aCk7XG4gIGlmIChtKSB7XG4gICAgaWYgKG1bMV0gJiYgIW1bM10pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZXNvbHZlIHBhY2thZ2UgbmFtZSBmcm9tIFwiJHtwYXRofVwiYCk7XG4gICAgfVxuICAgIGlmIChtWzNdKVxuICAgICAgcGFja2FnZU5hbWUgPSBtWzNdO1xuICAgIHBhdGggPSBtWzRdO1xuICB9XG4gIC8vIGlmIChwYWNrYWdlTmFtZSA9PSBudWxsKSB7XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlc29sdmUgcGFja2FnZSBuYW1lIGZyb20gXCIke3BhdGh9XCJgKTtcbiAgLy8gfVxuICBsZXQgZmluYWxVcmw6IHN0cmluZztcbiAgaWYgKHBhY2thZ2VOYW1lKSB7XG4gICAgbGV0IG91dHB1dFBhdGggPSBvdXRwdXRQYXRoTWFwW3BhY2thZ2VOYW1lXTtcbiAgICBpZiAob3V0cHV0UGF0aCAhPSBudWxsKSB7XG4gICAgICBvdXRwdXRQYXRoID0gL15cXC8qKC4qPylcXC8qJC8uZXhlYyhvdXRwdXRQYXRoKSFbMV07Ly8gXy50cmltKG91dHB1dFBhdGgsICcvJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSAvKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhwYWNrYWdlTmFtZSk7XG4gICAgICBvdXRwdXRQYXRoID0gbSA/IG1bMl0gOiBwYWNrYWdlTmFtZTtcbiAgICB9XG4gICAgZmluYWxVcmwgPSBqb2luVXJsKHN0YXRpY0Fzc2V0c1VSTCwgdXNlTG9jYWxlIHx8ICcnLCBvdXRwdXRQYXRoLCBwYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBmaW5hbFVybCA9IGpvaW5Vcmwoc3RhdGljQXNzZXRzVVJMLCB1c2VMb2NhbGUgfHwgJycsIHBhdGgpO1xuICB9XG5cbiAgaWYgKCEvXmh0dHBzPzpcXC9cXC8vLnRlc3QoZmluYWxVcmwpICYmIGZpbmFsVXJsLmNoYXJBdCgwKSAhPT0gJy8nKVxuICAgIGZpbmFsVXJsID0gJy8nICsgZmluYWxVcmw7XG4gIHJldHVybiBmaW5hbFVybDtcbn1cblxuZnVuY3Rpb24gam9pblVybCguLi5wYXRoRWxzOiBzdHJpbmdbXSkge1xuICBwYXRoRWxzID0gcGF0aEVscy5tYXAoZWwgPT4ge1xuICAgIC8vIFRyaW0gbGFzdCAnLydcbiAgICBpZiAoZWwgJiYgZWwuY2hhckF0KGVsLmxlbmd0aCAtIDEpID09PSAnLycgJiYgZWwubGVuZ3RoID4gMSlcbiAgICAgIHJldHVybiBlbC5zdWJzdHJpbmcoMCwgZWwubGVuZ3RoIC0gMSk7XG4gICAgcmV0dXJuIGVsO1xuICB9KTtcbiAgdmFyIGpvaW5lZCA9IHBhdGhFbHNbMF07XG4gIGZvciAodmFyIGkgPSAxLCBsID0gcGF0aEVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGF0aEVsc1tpXSA9PSBudWxsIHx8IHBhdGhFbHNbaV0ubGVuZ3RoID09PSAwKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGpvaW5lZC5sZW5ndGggPiAwICYmIGpvaW5lZC5jaGFyQXQoam9pbmVkLmxlbmd0aCAtIDEpICE9PSAnLycgJiZcbiAgICAgIHBhdGhFbHNbaV0gJiYgcGF0aEVsc1tpXS5jaGFyQXQoMCkgIT09ICcvJylcbiAgICAgIGpvaW5lZCArPSAnLyc7XG4gICAgam9pbmVkICs9IHBhdGhFbHNbaV07XG4gIH1cbiAgcmV0dXJuIGpvaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZlclVybCh0aGlzOiBQYWNrYWdlQXBpLCBwYWNrYWdlTmFtZU9yUGF0aDogc3RyaW5nLCBwYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0aGlzLmlzTm9kZSgpKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBhcGkuc2VydmVyVXJsKCkgb25seSBhdmFpbGFibGUgYXQgc2VydmVyIHNpZGUgZHVyaW5nIGNvbXBpbGUtdGltZSBhbmQgcnVudGltZSwgdXNlIFwiX19hcGkuc2VydmVyVXJsKCcke3BhY2thZ2VOYW1lT3JQYXRofScsICcke3BhdGh9JylcIiBpbnN0ZWFkYCApO1xuICB9XG4gIGlmIChwYXRoID09IG51bGwpIHtcbiAgICBwYXRoID0gcGFja2FnZU5hbWVPclBhdGg7XG4gICAgcGFja2FnZU5hbWVPclBhdGggPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIHJldHVybiBVcmwucmVzb2x2ZSgnLycsIHRoaXMuX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lT3JQYXRoKSArICcvJyArIHBhdGgpO1xufVxuIl19