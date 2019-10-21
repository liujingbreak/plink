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
    var m = /^(assets:\/\/|~|npm:\/\/|page(?:-([^:]+))?:\/\/)((?:@[^/]+\/)?[^/@][^/]*)?(?:\/([^@].*)?)?$/.exec(path);
    if (m) {
        if (m[1] && !m[3]) {
            throw new Error(`Can not resolve package name from "${path}"`);
        }
        if (packageName == null)
            packageName = m[3];
        path = m[4];
    }
    if (packageName == null) {
        throw new Error(`Can not resolve package name from "${path}"`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBRzNCLFNBQWdCLFVBQVUsQ0FBQyxZQUFpQjtJQUMxQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUVuQyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUV6QyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUNyQyxDQUFDO0FBTkQsZ0NBTUM7QUFFRCxTQUFnQixZQUFZLENBQUMsV0FBbUIsRUFBRSxJQUFZLEVBQUUsTUFBYztJQUM1RSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDaEM7SUFDRCxJQUFJLENBQUMsTUFBTTtRQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFDekUsTUFBTSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBVkQsb0NBVUM7QUFFRCxTQUFnQixTQUFTLENBQWdCLFdBQW1CLEVBQUUsSUFBYTtJQUN6RSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDdEIsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztR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Qy9DLFNBQVM7UUFDWCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHO1lBQy9ELE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFDMUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztRQUNoQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxpQkFBeUIsRUFBRSxJQUFhO0lBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEIsMkJBQTJCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0dBQXdHLGlCQUFpQixPQUFPLElBQUksYUFBYSxDQUFFLENBQUM7S0FDbks7SUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3ZHLENBQUM7QUFWRCw4QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IE5vZGVBcGkgZnJvbSAnLi4vZGlzdC9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoVG9BcGkoYXBpUHJvdG90eXBlOiBhbnkpIHtcbiAgYXBpUHJvdG90eXBlLmFzc2V0c1VybCA9IGFzc2V0c1VybDtcblxuICBhcGlQcm90b3R5cGUuZW50cnlQYWdlVXJsID0gZW50cnlQYWdlVXJsO1xuXG4gIGFwaVByb3RvdHlwZS5zZXJ2ZXJVcmwgPSBzZXJ2ZXJVcmw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnRyeVBhZ2VVcmwocGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBsb2NhbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgaWYgKCFsb2NhbGUpXG4gICAgbG9jYWxlID0gdGhpcy5pc0RlZmF1bHRMb2NhbGUoKSA/IG51bGwgOiB0aGlzLmdldEJ1aWxkTG9jYWxlKCk7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoLyhbXi4vXFxcXF0rXFwuKVtePy4vXFxcXF0rKFxcPy4qKT8kLywgJyQxaHRtbCQyJyk7XG4gIHJldHVybiBwdWJsaWNVcmwodGhpcy5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIHRoaXMuY29uZmlnKCkub3V0cHV0UGF0aE1hcCxcbiAgICBsb2NhbGUsIHBhY2thZ2VOYW1lLCBwYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2V0c1VybCh0aGlzOiBOb2RlQXBpLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSBhcmd1bWVudHNbMF07XG4gICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIHJldHVybiBwdWJsaWNVcmwodGhpcy5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIHRoaXMuY29uZmlnKCkub3V0cHV0UGF0aE1hcCwgbnVsbCxcbiAgICBwYWNrYWdlTmFtZSwgcGF0aCEpO1xufVxuLyoqXG4gKiBIZWxwZXIgZm9yIGRlYWxpbmcgd2l0aCB1cmwgbGlrZSBcIm5wbTovLzxwYWNrYWdlPi88cGF0aD5cIiwgXCJhc3NldHM6Ly88cGFja2FnZT4vPHBhdGg+XCJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdGF0aWNBc3NldHNVUkwsIGxpa2UgV2VicGFjaydzIG91dHB1dC5wdWJsaWNQYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gb3V0cHV0UGF0aE1hcFxuICogQHBhcmFtIHtzdHJpbmd9IHVzZUxvY2FsZSB0aGUgZmluYWwgVVJMIHdpbGwgaW5jbHVkZXMgbG9jYWxlIHBhdGggKGZvciBlbnRyeSBwYWdlIFVSTCkgXCJ6aFwiIG9yIFwidXNcIixcbiAqIHVzZSBgbnVsbGAgb3IgXCJcIiBkZW5vdGVzIGRlZmF1bHQgbG9jYWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFja2FnZU5hbWUgaWYgbnVsbCwgdGhlIHBhY2thZ2UgbmFtZSB3aWxsIGJlIGV4dHJhY3RlZCBmcm9tIHVybFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHB1YmxpY1VybChzdGF0aWNBc3NldHNVUkw6IHN0cmluZywgb3V0cHV0UGF0aE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICB1c2VMb2NhbGU6IHN0cmluZyB8IG51bGwsIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICB2YXIgbSA9IC9eKGFzc2V0czpcXC9cXC98fnxucG06XFwvXFwvfHBhZ2UoPzotKFteOl0rKSk/OlxcL1xcLykoKD86QFteL10rXFwvKT9bXi9AXVteL10qKT8oPzpcXC8oW15AXS4qKT8pPyQvLmV4ZWMocGF0aCk7XG4gIGlmIChtKSB7XG4gICAgaWYgKG1bMV0gJiYgIW1bM10pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZXNvbHZlIHBhY2thZ2UgbmFtZSBmcm9tIFwiJHtwYXRofVwiYCk7XG4gICAgfVxuICAgIGlmIChwYWNrYWdlTmFtZSA9PSBudWxsKVxuICAgICAgcGFja2FnZU5hbWUgPSBtWzNdO1xuICAgIHBhdGggPSBtWzRdO1xuICB9XG4gIGlmIChwYWNrYWdlTmFtZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHJlc29sdmUgcGFja2FnZSBuYW1lIGZyb20gXCIke3BhdGh9XCJgKTtcbiAgfVxuICB2YXIgb3V0cHV0UGF0aCA9IG91dHB1dFBhdGhNYXBbcGFja2FnZU5hbWVdO1xuICBpZiAob3V0cHV0UGF0aCAhPSBudWxsKSB7XG4gICAgb3V0cHV0UGF0aCA9IC9eXFwvKiguKj8pXFwvKiQvLmV4ZWMob3V0cHV0UGF0aCkhWzFdOy8vIF8udHJpbShvdXRwdXRQYXRoLCAnLycpO1xuICB9IGVsc2Uge1xuICAgIG0gPSAvKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhwYWNrYWdlTmFtZSk7XG4gICAgb3V0cHV0UGF0aCA9IG0gPyBtWzJdIDogcGFja2FnZU5hbWU7XG4gIH1cbiAgdmFyIGZpbmFsVXJsID0gam9pblVybChzdGF0aWNBc3NldHNVUkwsIHVzZUxvY2FsZSB8fCAnJywgb3V0cHV0UGF0aCwgcGF0aCk7XG5cbiAgaWYgKCEvXmh0dHBzPzpcXC9cXC8vLnRlc3QoZmluYWxVcmwpICYmIGZpbmFsVXJsLmNoYXJBdCgwKSAhPT0gJy8nKVxuICAgIGZpbmFsVXJsID0gJy8nICsgZmluYWxVcmw7XG4gIHJldHVybiBmaW5hbFVybDtcbn1cblxuZnVuY3Rpb24gam9pblVybCguLi5wYXRoRWxzOiBzdHJpbmdbXSkge1xuICBwYXRoRWxzID0gcGF0aEVscy5tYXAoZWwgPT4ge1xuICAgIC8vIFRyaW0gbGFzdCAnLydcbiAgICBpZiAoZWwgJiYgZWwuY2hhckF0KGVsLmxlbmd0aCAtIDEpID09PSAnLycgJiYgZWwubGVuZ3RoID4gMSlcbiAgICAgIHJldHVybiBlbC5zdWJzdHJpbmcoMCwgZWwubGVuZ3RoIC0gMSk7XG4gICAgcmV0dXJuIGVsO1xuICB9KTtcbiAgdmFyIGpvaW5lZCA9IHBhdGhFbHNbMF07XG4gIGZvciAodmFyIGkgPSAxLCBsID0gcGF0aEVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAocGF0aEVsc1tpXSA9PSBudWxsIHx8IHBhdGhFbHNbaV0ubGVuZ3RoID09PSAwKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGpvaW5lZC5sZW5ndGggPiAwICYmIGpvaW5lZC5jaGFyQXQoam9pbmVkLmxlbmd0aCAtIDEpICE9PSAnLycgJiZcbiAgICAgIHBhdGhFbHNbaV0gJiYgcGF0aEVsc1tpXS5jaGFyQXQoMCkgIT09ICcvJylcbiAgICAgIGpvaW5lZCArPSAnLyc7XG4gICAgam9pbmVkICs9IHBhdGhFbHNbaV07XG4gIH1cbiAgcmV0dXJuIGpvaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZlclVybChwYWNrYWdlTmFtZU9yUGF0aDogc3RyaW5nLCBwYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0aGlzLmlzTm9kZSgpKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBhcGkuc2VydmVyVXJsKCkgb25seSBhdmFpbGFibGUgYXQgc2VydmVyIHNpZGUgZHVyaW5nIGNvbXBpbGUtdGltZSBhbmQgcnVudGltZSwgdXNlIFwiX19hcGkuc2VydmVyVXJsKCcke3BhY2thZ2VOYW1lT3JQYXRofScsICcke3BhdGh9JylcIiBpbnN0ZWFkYCApO1xuICB9XG4gIGlmIChwYXRoID09IG51bGwpIHtcbiAgICBwYXRoID0gcGFja2FnZU5hbWVPclBhdGg7XG4gICAgcGFja2FnZU5hbWVPclBhdGggPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIHJldHVybiBVcmwucmVzb2x2ZSh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5fY29udGV4dFBhdGgocGFja2FnZU5hbWVPclBhdGgpICsgJy8nICsgcGF0aCk7XG59XG4iXX0=