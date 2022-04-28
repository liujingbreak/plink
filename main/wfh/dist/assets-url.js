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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXVybC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NoYXJlL2Fzc2V0cy11cmwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5Q0FBMkI7QUFzQjNCLFNBQWdCLFVBQVUsQ0FBQyxZQUFpQjtJQUUxQyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUVuQyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUV6QyxZQUFZLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUNyQyxDQUFDO0FBUEQsZ0NBT0M7QUFFRCxTQUFnQixZQUFZLENBQW1CLFdBQW1CLEVBQUUsSUFBWSxFQUFFLE1BQWM7SUFDOUYsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ2hDO0lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsK0JBQStCLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDakUsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxFQUN6RSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2xHLENBQUM7QUFSRCxvQ0FRQztBQUVELHFFQUFxRTtBQUNyRSxTQUFnQixTQUFTLENBQW1CLFdBQTBCLEVBQUUsSUFBYTtJQUNuRixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDdEIs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QyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDL0MsU0FBUztRQUNYLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFDL0QsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztZQUMxQyxNQUFNLElBQUksR0FBRyxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdEI7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBZ0IsU0FBUyxDQUFtQixpQkFBeUIsRUFBRSxJQUFhO0lBQ2xGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEIsMkJBQTJCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0dBQXdHLGlCQUFpQixPQUFPLElBQUksYUFBYSxDQUFFLENBQUM7S0FDbks7SUFDRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDN0UsQ0FBQztBQVZELDhCQVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5cbmludGVyZmFjZSBDb25maWdTZXR0aW5nIHtcbiAgc3RhdGljQXNzZXRzVVJMOiBzdHJpbmc7XG4gIG91dHB1dFBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlQXBpIHtcbiAgcGFja2FnZU5hbWU6IHN0cmluZztcbiAgY29uZmlnKCk6IENvbmZpZ1NldHRpbmc7XG4gIGlzRGVmYXVsdExvY2FsZSgpOiBib29sZWFuO1xuICBnZXRCdWlsZExvY2FsZSgpOiBzdHJpbmc7XG4gIGlzTm9kZSgpOiBib29sZWFuO1xuICBfY29udGV4dFBhdGgocGFja2FnZU5hbWU/OiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5kZWRBcGkge1xuICBhc3NldHNVcmw6IHR5cGVvZiBhc3NldHNVcmw7XG4gIGVudHJ5UGFnZVVybDogdHlwZW9mIGVudHJ5UGFnZVVybDtcbiAgc2VydmVyVXJsOiB0eXBlb2Ygc2VydmVyVXJsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hUb0FwaShhcGlQcm90b3R5cGU6IGFueSkge1xuICBcbiAgYXBpUHJvdG90eXBlLmFzc2V0c1VybCA9IGFzc2V0c1VybDtcblxuICBhcGlQcm90b3R5cGUuZW50cnlQYWdlVXJsID0gZW50cnlQYWdlVXJsO1xuXG4gIGFwaVByb3RvdHlwZS5zZXJ2ZXJVcmwgPSBzZXJ2ZXJVcmw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnRyeVBhZ2VVcmwodGhpczogUGFja2FnZUFwaSwgcGFja2FnZU5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBsb2NhbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcGF0aCA9IGFyZ3VtZW50c1swXTtcbiAgICBwYWNrYWdlTmFtZSA9IHRoaXMucGFja2FnZU5hbWU7XG4gIH1cbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvKFteLi9cXFxcXStcXC4pW14/Li9cXFxcXSsoXFw/LiopPyQvLCAnJDFodG1sJDInKTtcbiAgcmV0dXJuIHB1YmxpY1VybCh0aGlzLmNvbmZpZygpLnN0YXRpY0Fzc2V0c1VSTCwgdGhpcy5jb25maWcoKS5vdXRwdXRQYXRoTWFwLFxuICAgIGxvY2FsZSA/IGxvY2FsZSA6ICh0aGlzLmlzRGVmYXVsdExvY2FsZSgpID8gbnVsbCA6IHRoaXMuZ2V0QnVpbGRMb2NhbGUoKSksIHBhY2thZ2VOYW1lLCBwYXRoKTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGFzc2V0c1VybCh0aGlzOiBQYWNrYWdlQXBpLCBwYXRoOiBzdHJpbmcpOiBzdHJpbmc7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXRzVXJsKHRoaXM6IFBhY2thZ2VBcGksIHBhY2thZ2VOYW1lOiBzdHJpbmcgfCBudWxsLCBwYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHBhdGggPSBhcmd1bWVudHNbMF07XG4gICAgcGFja2FnZU5hbWUgPSB0aGlzLnBhY2thZ2VOYW1lO1xuICB9XG4gIHJldHVybiBwdWJsaWNVcmwodGhpcy5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIHRoaXMuY29uZmlnKCkub3V0cHV0UGF0aE1hcCwgbnVsbCxcbiAgICBwYWNrYWdlTmFtZSwgcGF0aCEpO1xufVxuLyoqXG4gKiBIZWxwZXIgZm9yIGRlYWxpbmcgd2l0aCB1cmwgbGlrZSBcIm5wbTovLzxwYWNrYWdlPi88cGF0aD5cIiwgXCJhc3NldHM6Ly88cGFja2FnZT4vPHBhdGg+XCJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdGF0aWNBc3NldHNVUkwsIGxpa2UgV2VicGFjaydzIG91dHB1dC5wdWJsaWNQYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gb3V0cHV0UGF0aE1hcFxuICogQHBhcmFtIHtzdHJpbmd9IHVzZUxvY2FsZSB0aGUgZmluYWwgVVJMIHdpbGwgaW5jbHVkZXMgbG9jYWxlIHBhdGggKGZvciBlbnRyeSBwYWdlIFVSTCkgXCJ6aFwiIG9yIFwidXNcIixcbiAqIHVzZSBgbnVsbGAgb3IgXCJcIiBkZW5vdGVzIGRlZmF1bHQgbG9jYWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFja2FnZU5hbWUgaWYgbnVsbCwgdGhlIHBhY2thZ2UgbmFtZSB3aWxsIGJlIGV4dHJhY3RlZCBmcm9tIHVybFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHB1YmxpY1VybChzdGF0aWNBc3NldHNVUkw6IHN0cmluZywgb3V0cHV0UGF0aE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICB1c2VMb2NhbGU6IHN0cmluZyB8IG51bGwsIHBhY2thZ2VOYW1lOiBzdHJpbmcgfCBudWxsLCBwYXRoOiBzdHJpbmcpIHtcbiAgdmFyIG0gPSAvXihhc3NldHM6XFwvXFwvfH58bnBtOlxcL1xcL3xwYWdlKD86LShbXjpdKykpPzpcXC9cXC8pKCg/OkBbXi9dK1xcLyk/W14vQF1bXi9dKik/KD86XFwvKFteQF0uKik/KT8kLy5leGVjKHBhdGgpO1xuICBpZiAobSkge1xuICAgIGlmIChtWzFdICYmICFtWzNdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgcmVzb2x2ZSBwYWNrYWdlIG5hbWUgZnJvbSBcIiR7cGF0aH1cImApO1xuICAgIH1cbiAgICBpZiAobVszXSlcbiAgICAgIHBhY2thZ2VOYW1lID0gbVszXTtcbiAgICBwYXRoID0gbVs0XTtcbiAgfVxuICAvLyBpZiAocGFja2FnZU5hbWUgPT0gbnVsbCkge1xuICAvLyAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCByZXNvbHZlIHBhY2thZ2UgbmFtZSBmcm9tIFwiJHtwYXRofVwiYCk7XG4gIC8vIH1cbiAgbGV0IGZpbmFsVXJsOiBzdHJpbmc7XG4gIGlmIChwYWNrYWdlTmFtZSkge1xuICAgIGxldCBvdXRwdXRQYXRoID0gb3V0cHV0UGF0aE1hcFtwYWNrYWdlTmFtZV07XG4gICAgaWYgKG91dHB1dFBhdGggIT0gbnVsbCkge1xuICAgICAgb3V0cHV0UGF0aCA9IC9eXFwvKiguKj8pXFwvKiQvLmV4ZWMob3V0cHV0UGF0aCkhWzFdOy8vIF8udHJpbShvdXRwdXRQYXRoLCAnLycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gLyg/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMocGFja2FnZU5hbWUpO1xuICAgICAgb3V0cHV0UGF0aCA9IG0gPyBtWzJdIDogcGFja2FnZU5hbWU7XG4gICAgfVxuICAgIGZpbmFsVXJsID0gam9pblVybChzdGF0aWNBc3NldHNVUkwsIHVzZUxvY2FsZSB8fCAnJywgb3V0cHV0UGF0aCwgcGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgZmluYWxVcmwgPSBqb2luVXJsKHN0YXRpY0Fzc2V0c1VSTCwgdXNlTG9jYWxlIHx8ICcnLCBwYXRoKTtcbiAgfVxuXG4gIGlmICghL15odHRwcz86XFwvXFwvLy50ZXN0KGZpbmFsVXJsKSAmJiBmaW5hbFVybC5jaGFyQXQoMCkgIT09ICcvJylcbiAgICBmaW5hbFVybCA9ICcvJyArIGZpbmFsVXJsO1xuICByZXR1cm4gZmluYWxVcmw7XG59XG5cbmZ1bmN0aW9uIGpvaW5VcmwoLi4ucGF0aEVsczogc3RyaW5nW10pIHtcbiAgcGF0aEVscyA9IHBhdGhFbHMubWFwKGVsID0+IHtcbiAgICAvLyBUcmltIGxhc3QgJy8nXG4gICAgaWYgKGVsICYmIGVsLmNoYXJBdChlbC5sZW5ndGggLSAxKSA9PT0gJy8nICYmIGVsLmxlbmd0aCA+IDEpXG4gICAgICByZXR1cm4gZWwuc3Vic3RyaW5nKDAsIGVsLmxlbmd0aCAtIDEpO1xuICAgIHJldHVybiBlbDtcbiAgfSk7XG4gIHZhciBqb2luZWQgPSBwYXRoRWxzWzBdO1xuICBmb3IgKHZhciBpID0gMSwgbCA9IHBhdGhFbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHBhdGhFbHNbaV0gPT0gbnVsbCB8fCBwYXRoRWxzW2ldLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChqb2luZWQubGVuZ3RoID4gMCAmJiBqb2luZWQuY2hhckF0KGpvaW5lZC5sZW5ndGggLSAxKSAhPT0gJy8nICYmXG4gICAgICBwYXRoRWxzW2ldICYmIHBhdGhFbHNbaV0uY2hhckF0KDApICE9PSAnLycpXG4gICAgICBqb2luZWQgKz0gJy8nO1xuICAgIGpvaW5lZCArPSBwYXRoRWxzW2ldO1xuICB9XG4gIHJldHVybiBqb2luZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2ZXJVcmwodGhpczogUGFja2FnZUFwaSwgcGFja2FnZU5hbWVPclBhdGg6IHN0cmluZywgcGF0aD86IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdGhpcy5pc05vZGUoKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdHRocm93IG5ldyBFcnJvcihgYXBpLnNlcnZlclVybCgpIG9ubHkgYXZhaWxhYmxlIGF0IHNlcnZlciBzaWRlIGR1cmluZyBjb21waWxlLXRpbWUgYW5kIHJ1bnRpbWUsIHVzZSBcIl9fYXBpLnNlcnZlclVybCgnJHtwYWNrYWdlTmFtZU9yUGF0aH0nLCAnJHtwYXRofScpXCIgaW5zdGVhZGAgKTtcbiAgfVxuICBpZiAocGF0aCA9PSBudWxsKSB7XG4gICAgcGF0aCA9IHBhY2thZ2VOYW1lT3JQYXRoO1xuICAgIHBhY2thZ2VOYW1lT3JQYXRoID0gdGhpcy5wYWNrYWdlTmFtZTtcbiAgfVxuICByZXR1cm4gVXJsLnJlc29sdmUoJy8nLCB0aGlzLl9jb250ZXh0UGF0aChwYWNrYWdlTmFtZU9yUGF0aCkgKyAnLycgKyBwYXRoKTtcbn1cbiJdfQ==