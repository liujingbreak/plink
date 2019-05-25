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
        outputPath = m[2];
    }
    var finalUrl = joinUrl(staticAssetsURL, useLocale, outputPath, path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBRTNCLFNBQWdCLFVBQVUsQ0FBQyxZQUFpQjtJQUMzQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUVuQyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUV6QyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUNwQyxDQUFDO0FBTkQsZ0NBTUM7QUFFRCxTQUFnQixZQUFZLENBQUMsV0FBbUIsRUFBRSxJQUFZLEVBQUUsTUFBYztJQUM3RSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzNCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDL0I7SUFDRCxJQUFJLENBQUMsTUFBTTtRQUNWLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2hFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFDMUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBVkQsb0NBVUM7QUFFRCxTQUFnQixTQUFTLENBQUMsV0FBbUIsRUFBRSxJQUFhO0lBQzNELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUN2QixJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FB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