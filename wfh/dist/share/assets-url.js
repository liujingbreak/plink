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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBRzNCLFNBQWdCLFVBQVUsQ0FBQyxZQUFpQjtJQUMxQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUVuQyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUV6QyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUNyQyxDQUFDO0FBTkQsZ0NBTUM7QUFFRCxTQUFnQixZQUFZLENBQUMsV0FBbUIsRUFBRSxJQUFZLEVBQUUsTUFBYztJQUM1RSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDaEM7SUFDRCxJQUFJLENBQUMsTUFBTTtRQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2pFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFDekUsTUFBTSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBVkQsb0NBVUM7QUFFRCxTQUFnQixTQUFTLENBQWdCLFdBQW1CLEVBQUUsSUFBYTtJQUN6RSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDdEIsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FB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O1lBQy9DLFNBQVM7UUFDWCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHO1lBQy9ELE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFDMUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztRQUNoQixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxpQkFBeUIsRUFBRSxJQUFhO0lBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEIsMkJBQTJCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0dBQXdHLGlCQUFpQixPQUFPLElBQUksYUFBYSxDQUFFLENBQUM7S0FDbks7SUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3ZHLENBQUM7QUFWRCw4QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IE5vZGVBcGkgZnJvbSAnLi4vdHMvcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaFRvQXBpKGFwaVByb3RvdHlwZTogYW55KSB7XG4gIGFwaVByb3RvdHlwZS5hc3NldHNVcmwgPSBhc3NldHNVcmw7XG5cbiAgYXBpUHJvdG90eXBlLmVudHJ5UGFnZVVybCA9IGVudHJ5UGFnZVVybDtcblxuICBhcGlQcm90b3R5cGUuc2VydmVyVXJsID0gc2VydmVyVXJsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW50cnlQYWdlVXJsKHBhY2thZ2VOYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgbG9jYWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHBhdGggPSBhcmd1bWVudHNbMF07XG4gICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIGlmICghbG9jYWxlKVxuICAgIGxvY2FsZSA9IHRoaXMuaXNEZWZhdWx0TG9jYWxlKCkgPyBudWxsIDogdGhpcy5nZXRCdWlsZExvY2FsZSgpO1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC8oW14uL1xcXFxdK1xcLilbXj8uL1xcXFxdKyhcXD8uKik/JC8sICckMWh0bWwkMicpO1xuICByZXR1cm4gcHVibGljVXJsKHRoaXMuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCB0aGlzLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsXG4gICAgbG9jYWxlLCBwYWNrYWdlTmFtZSwgcGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NldHNVcmwodGhpczogTm9kZUFwaSwgcGFja2FnZU5hbWU6IHN0cmluZywgcGF0aD86IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChwYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICBwYXRoID0gYXJndW1lbnRzWzBdO1xuICAgIHBhY2thZ2VOYW1lID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICByZXR1cm4gcHVibGljVXJsKHRoaXMuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCB0aGlzLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsIG51bGwsXG4gICAgcGFja2FnZU5hbWUsIHBhdGghKTtcbn1cbi8qKlxuICogSGVscGVyIGZvciBkZWFsaW5nIHdpdGggdXJsIGxpa2UgXCJucG06Ly88cGFja2FnZT4vPHBhdGg+XCIsIFwiYXNzZXRzOi8vPHBhY2thZ2U+LzxwYXRoPlwiXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RhdGljQXNzZXRzVVJMLCBsaWtlIFdlYnBhY2sncyBvdXRwdXQucHVibGljUGF0aFxuICogQHBhcmFtIHtvYmplY3R9IG91dHB1dFBhdGhNYXBcbiAqIEBwYXJhbSB7c3RyaW5nfSB1c2VMb2NhbGUgdGhlIGZpbmFsIFVSTCB3aWxsIGluY2x1ZGVzIGxvY2FsZSBwYXRoIChmb3IgZW50cnkgcGFnZSBVUkwpIFwiemhcIiBvciBcInVzXCIsXG4gKiB1c2UgYG51bGxgIG9yIFwiXCIgZGVub3RlcyBkZWZhdWx0IGxvY2FsZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhY2thZ2VOYW1lIGlmIG51bGwsIHRoZSBwYWNrYWdlIG5hbWUgd2lsbCBiZSBleHRyYWN0ZWQgZnJvbSB1cmxcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwdWJsaWNVcmwoc3RhdGljQXNzZXRzVVJMOiBzdHJpbmcsIG91dHB1dFBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgdXNlTG9jYWxlOiBzdHJpbmcgfCBudWxsLCBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgdmFyIG0gPSAvXihhc3NldHM6XFwvXFwvfH58bnBtOlxcL1xcL3xwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHBhdGgpO1xuICBpZiAobSkge1xuICAgIGlmIChtWzFdICYmICFtWzNdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgcmVzb2x2ZSBwYWNrYWdlIG5hbWUgZnJvbSBcIiR7cGF0aH1cImApO1xuICAgIH1cbiAgICBpZiAocGFja2FnZU5hbWUgPT0gbnVsbClcbiAgICAgIHBhY2thZ2VOYW1lID0gbVszXTtcbiAgICBwYXRoID0gbVs0XTtcbiAgfVxuICBpZiAocGFja2FnZU5hbWUgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZXNvbHZlIHBhY2thZ2UgbmFtZSBmcm9tIFwiJHtwYXRofVwiYCk7XG4gIH1cbiAgdmFyIG91dHB1dFBhdGggPSBvdXRwdXRQYXRoTWFwW3BhY2thZ2VOYW1lXTtcbiAgaWYgKG91dHB1dFBhdGggIT0gbnVsbCkge1xuICAgIG91dHB1dFBhdGggPSAvXlxcLyooLio/KVxcLyokLy5leGVjKG91dHB1dFBhdGgpIVsxXTsvLyBfLnRyaW0ob3V0cHV0UGF0aCwgJy8nKTtcbiAgfSBlbHNlIHtcbiAgICBtID0gLyg/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMocGFja2FnZU5hbWUpO1xuICAgIG91dHB1dFBhdGggPSBtID8gbVsyXSA6IHBhY2thZ2VOYW1lO1xuICB9XG4gIHZhciBmaW5hbFVybCA9IGpvaW5Vcmwoc3RhdGljQXNzZXRzVVJMLCB1c2VMb2NhbGUgfHwgJycsIG91dHB1dFBhdGgsIHBhdGgpO1xuXG4gIGlmICghL15odHRwcz86XFwvXFwvLy50ZXN0KGZpbmFsVXJsKSAmJiBmaW5hbFVybC5jaGFyQXQoMCkgIT09ICcvJylcbiAgICBmaW5hbFVybCA9ICcvJyArIGZpbmFsVXJsO1xuICByZXR1cm4gZmluYWxVcmw7XG59XG5cbmZ1bmN0aW9uIGpvaW5VcmwoLi4ucGF0aEVsczogc3RyaW5nW10pIHtcbiAgcGF0aEVscyA9IHBhdGhFbHMubWFwKGVsID0+IHtcbiAgICAvLyBUcmltIGxhc3QgJy8nXG4gICAgaWYgKGVsICYmIGVsLmNoYXJBdChlbC5sZW5ndGggLSAxKSA9PT0gJy8nICYmIGVsLmxlbmd0aCA+IDEpXG4gICAgICByZXR1cm4gZWwuc3Vic3RyaW5nKDAsIGVsLmxlbmd0aCAtIDEpO1xuICAgIHJldHVybiBlbDtcbiAgfSk7XG4gIHZhciBqb2luZWQgPSBwYXRoRWxzWzBdO1xuICBmb3IgKHZhciBpID0gMSwgbCA9IHBhdGhFbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHBhdGhFbHNbaV0gPT0gbnVsbCB8fCBwYXRoRWxzW2ldLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChqb2luZWQubGVuZ3RoID4gMCAmJiBqb2luZWQuY2hhckF0KGpvaW5lZC5sZW5ndGggLSAxKSAhPT0gJy8nICYmXG4gICAgICBwYXRoRWxzW2ldICYmIHBhdGhFbHNbaV0uY2hhckF0KDApICE9PSAnLycpXG4gICAgICBqb2luZWQgKz0gJy8nO1xuICAgIGpvaW5lZCArPSBwYXRoRWxzW2ldO1xuICB9XG4gIHJldHVybiBqb2luZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2ZXJVcmwocGFja2FnZU5hbWVPclBhdGg6IHN0cmluZywgcGF0aD86IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdGhpcy5pc05vZGUoKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdHRocm93IG5ldyBFcnJvcihgYXBpLnNlcnZlclVybCgpIG9ubHkgYXZhaWxhYmxlIGF0IHNlcnZlciBzaWRlIGR1cmluZyBjb21waWxlLXRpbWUgYW5kIHJ1bnRpbWUsIHVzZSBcIl9fYXBpLnNlcnZlclVybCgnJHtwYWNrYWdlTmFtZU9yUGF0aH0nLCAnJHtwYXRofScpXCIgaW5zdGVhZGAgKTtcbiAgfVxuICBpZiAocGF0aCA9PSBudWxsKSB7XG4gICAgcGF0aCA9IHBhY2thZ2VOYW1lT3JQYXRoO1xuICAgIHBhY2thZ2VOYW1lT3JQYXRoID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICByZXR1cm4gVXJsLnJlc29sdmUodGhpcy5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIHRoaXMuX2NvbnRleHRQYXRoKHBhY2thZ2VOYW1lT3JQYXRoKSArICcvJyArIHBhdGgpO1xufVxuIl19