"use strict";
/**
 * Unlike file-loader, it loads assets resource from "DRCP" package relative directory, not from current
 * process.cwd() directory
 */
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const _ = tslib_1.__importStar(require("lodash"));
const lru_cache_1 = tslib_1.__importDefault(require("lru-cache"));
const loaderUtils = tslib_1.__importStar(require("loader-utils"));
const fs_1 = tslib_1.__importDefault(require("fs"));
var log = require('log4js').getLogger(__api_1.default.packageName + '.dr-file-loader');
const realpathCache = new lru_cache_1.default({ max: 100, maxAge: 30000 });
function loader(content, sourceMap) {
    if (!this.emitFile)
        throw new Error('File Loader\n\nemitFile is required from module system');
    if (this.cacheable)
        this.cacheable();
    // var callback = this.async();
    if (!this.emitFile)
        throw new Error('emitFile is required from module system');
    var options = loaderUtils.getOptions(this) || {};
    options = Object.assign(options, { publicPath: false,
        useRelativePath: false,
        name: '[name].[md5:hash:hex:8].[ext]'
    });
    const context = options.context ||
        this.rootContext ||
        (this.options && this.options.context);
    var url = loaderUtils.interpolateName(this, options.name, {
        context,
        content,
        regExp: options.regExp
    });
    let outputPath = url;
    if (options.outputPath) {
        if (typeof options.outputPath === 'function') {
            outputPath = options.outputPath(url);
        }
        else {
            outputPath = path.posix.join(options.outputPath, url);
        }
    }
    const drcpOutputDir = drPackageOutputPath(this);
    outputPath = drcpOutputDir + '/' + _.trimStart(outputPath, '/');
    outputPath = _.trimStart(outputPath, '/');
    let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;
    if (options.publicPath) {
        if (typeof options.publicPath === 'function') {
            publicPath = options.publicPath(url);
        }
        else if (options.publicPath.endsWith('/')) {
            publicPath = options.publicPath + url;
        }
        else {
            publicPath = `${options.publicPath}/${url}`;
        }
        publicPath = JSON.stringify(publicPath);
    }
    // eslint-disable-next-line no-undefined
    if (options.emitFile === undefined || options.emitFile) {
        this.emitFile(outputPath, content, null);
    }
    // TODO revert to ES2015 Module export, when new CSS Pipeline is in place
    log.debug('resource URL:', publicPath);
    return `module.exports = ${publicPath};`;
}
(function (loader) {
    loader.raw = true;
})(loader || (loader = {}));
/**
 * return propert paths of a resource from DRCP package, including emit() path and source URL
 * @param this null
 * @param loaderCtx Webpack loader context instance
 * @return [<> , <emit >]
 */
function drPackageOutputPath(loaderCtx) {
    const dir = loaderCtx.context;
    let realpathDir = realpathCache.get(dir);
    if (!realpathDir) {
        realpathDir = fs_1.default.realpathSync(dir);
        realpathCache.set(dir, realpathDir);
    }
    var browserPackage = __api_1.default.findPackageByFile(dir);
    // debug
    log.debug(`context: ${realpathDir}, browserPackage: ${browserPackage && browserPackage.longName}`);
    if (browserPackage) {
        let outDir = _.trimStart(__api_1.default.config.get(['outputPathMap', browserPackage.longName]), '/');
        let sourcePkgDir = browserPackage.realPackagePath;
        let relativeInPkg = path.relative(sourcePkgDir, realpathDir).replace(/\\/g, '/');
        return outDir + '/' + relativeInPkg;
    }
    else {
        return path.relative(loaderCtx.rootContext, dir).replace(/\\/g, '/')
            .replace(/\.\./g, '_')
            .replace(/(^|\/)node_modules(\/|$)/g, '$1vendor$2')
            .replace(/@/g, 'a_');
    }
}
module.exports = loader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUM1QixrRUFBNEI7QUFHNUIsa0VBQTRDO0FBQzVDLG9EQUFvQjtBQUNwQixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxJQUFJLG1CQUFHLENBQWlCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztBQUV6RSxTQUFTLE1BQU0sQ0FBeUIsT0FBd0IsRUFBRSxTQUF3QjtJQUV4RixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0lBQzVFLElBQUksSUFBSSxDQUFDLFNBQVM7UUFDaEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLCtCQUErQjtJQUUvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7SUFFL0UsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFakQsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUMsVUFBVSxFQUFFLEtBQUs7UUFDakQsZUFBZSxFQUFFLEtBQUs7UUFDdEIsSUFBSSxFQUFFLCtCQUErQjtLQUN0QyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FDWCxPQUFPLENBQUMsT0FBTztRQUNmLElBQUksQ0FBQyxXQUFXO1FB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QUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUVuRyxJQUFJLGNBQWMsRUFBRTtRQUNsQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFGLElBQUksWUFBWSxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUM7UUFDbEQsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqRixPQUFPLE1BQU0sR0FBRyxHQUFHLEdBQUcsYUFBYSxDQUFDO0tBQ3JDO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQzthQUNqRSxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQzthQUNyQixPQUFPLENBQUMsMkJBQTJCLEVBQUUsWUFBWSxDQUFDO2FBQ2xELE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEI7QUFDSCxDQUFDO0FBL0JELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVubGlrZSBmaWxlLWxvYWRlciwgaXQgbG9hZHMgYXNzZXRzIHJlc291cmNlIGZyb20gXCJEUkNQXCIgcGFja2FnZSByZWxhdGl2ZSBkaXJlY3RvcnksIG5vdCBmcm9tIGN1cnJlbnRcbiAqIHByb2Nlc3MuY3dkKCkgZGlyZWN0b3J5IFxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCB7bG9hZGVyIGFzIHdsfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCAqIGFzIGxvYWRlclV0aWxzIGZyb20gJ2xvYWRlci11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xudmFyIGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmRyLWZpbGUtbG9hZGVyJyk7XG5cbmNvbnN0IHJlYWxwYXRoQ2FjaGUgPSBuZXcgTFJVPHN0cmluZywgc3RyaW5nPih7bWF4OiAxMDAsIG1heEFnZTogMzAwMDB9KTtcblxuZnVuY3Rpb24gbG9hZGVyKHRoaXM6IHdsLkxvYWRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKTpcbiAgc3RyaW5nIHwgQnVmZmVyIHwgdm9pZCB8IHVuZGVmaW5lZCB7XG4gIGlmICghdGhpcy5lbWl0RmlsZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgTG9hZGVyXFxuXFxuZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG4gIGlmICh0aGlzLmNhY2hlYWJsZSlcbiAgICB0aGlzLmNhY2hlYWJsZSgpO1xuICAvLyB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cbiAgaWYgKCF0aGlzLmVtaXRGaWxlKSB0aHJvdyBuZXcgRXJyb3IoJ2VtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuXG4gIHZhciBvcHRpb25zID0gbG9hZGVyVXRpbHMuZ2V0T3B0aW9ucyh0aGlzKSB8fCB7fTtcblxuICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7cHVibGljUGF0aDogZmFsc2UsXG4gICAgdXNlUmVsYXRpdmVQYXRoOiBmYWxzZSxcbiAgICBuYW1lOiAnW25hbWVdLlttZDU6aGFzaDpoZXg6OF0uW2V4dF0nXG4gIH0pO1xuXG4gIGNvbnN0IGNvbnRleHQgPVxuICAgIG9wdGlvbnMuY29udGV4dCB8fFxuICAgIHRoaXMucm9vdENvbnRleHQgfHxcbiAgICAoKHRoaXMgYXMgYW55KS5vcHRpb25zICYmICh0aGlzIGFzIGFueSkub3B0aW9ucy5jb250ZXh0KTtcblxuICB2YXIgdXJsID0gbG9hZGVyVXRpbHMuaW50ZXJwb2xhdGVOYW1lKHRoaXMsIG9wdGlvbnMubmFtZSwge1xuICAgIGNvbnRleHQsXG4gICAgY29udGVudCxcbiAgICByZWdFeHA6IG9wdGlvbnMucmVnRXhwXG4gIH0pO1xuXG4gIGxldCBvdXRwdXRQYXRoID0gdXJsO1xuICBpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dFBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG91dHB1dFBhdGggPSBvcHRpb25zLm91dHB1dFBhdGgodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvcHRpb25zLm91dHB1dFBhdGgsIHVybCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGRyY3BPdXRwdXREaXIgPSBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpO1xuICBvdXRwdXRQYXRoID0gZHJjcE91dHB1dERpciArICcvJyArIF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG4gIG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuXG4gIGxldCBwdWJsaWNQYXRoID0gYF9fd2VicGFja19wdWJsaWNfcGF0aF9fICsgJHtKU09OLnN0cmluZ2lmeShvdXRwdXRQYXRoKX1gO1xuXG4gIGlmIChvcHRpb25zLnB1YmxpY1BhdGgpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMucHVibGljUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCh1cmwpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5wdWJsaWNQYXRoLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIHB1YmxpY1BhdGggPSBvcHRpb25zLnB1YmxpY1BhdGggKyB1cmw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHB1YmxpY1BhdGggPSBgJHtvcHRpb25zLnB1YmxpY1BhdGh9LyR7dXJsfWA7XG4gICAgfVxuXG4gICAgcHVibGljUGF0aCA9IEpTT04uc3RyaW5naWZ5KHB1YmxpY1BhdGgpO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmaW5lZFxuICBpZiAob3B0aW9ucy5lbWl0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuZW1pdEZpbGUpIHtcbiAgICB0aGlzLmVtaXRGaWxlKG91dHB1dFBhdGgsIGNvbnRlbnQsIG51bGwpO1xuICB9XG5cbiAgLy8gVE9ETyByZXZlcnQgdG8gRVMyMDE1IE1vZHVsZSBleHBvcnQsIHdoZW4gbmV3IENTUyBQaXBlbGluZSBpcyBpbiBwbGFjZVxuICBsb2cuZGVidWcoJ3Jlc291cmNlIFVSTDonLCBwdWJsaWNQYXRoKTtcbiAgcmV0dXJuIGBtb2R1bGUuZXhwb3J0cyA9ICR7cHVibGljUGF0aH07YDtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG4gIGV4cG9ydCBjb25zdCByYXcgPSB0cnVlO1xufVxuZXhwb3J0ID0gbG9hZGVyO1xuXG4vKipcbiAqIHJldHVybiBwcm9wZXJ0IHBhdGhzIG9mIGEgcmVzb3VyY2UgZnJvbSBEUkNQIHBhY2thZ2UsIGluY2x1ZGluZyBlbWl0KCkgcGF0aCBhbmQgc291cmNlIFVSTFxuICogQHBhcmFtIHRoaXMgbnVsbFxuICogQHBhcmFtIGxvYWRlckN0eCBXZWJwYWNrIGxvYWRlciBjb250ZXh0IGluc3RhbmNlXG4gKiBAcmV0dXJuIFs8PiAsIDxlbWl0ID5dXG4gKi9cbmZ1bmN0aW9uIGRyUGFja2FnZU91dHB1dFBhdGgodGhpczogdW5rbm93biwgbG9hZGVyQ3R4OiB3bC5Mb2FkZXJDb250ZXh0KSB7XG4gIGNvbnN0IGRpciA9IGxvYWRlckN0eC5jb250ZXh0O1xuICBsZXQgcmVhbHBhdGhEaXIgPSByZWFscGF0aENhY2hlLmdldChkaXIpO1xuICBpZiAoIXJlYWxwYXRoRGlyKSB7XG4gICAgcmVhbHBhdGhEaXIgPSBmcy5yZWFscGF0aFN5bmMoZGlyKTtcbiAgICByZWFscGF0aENhY2hlLnNldChkaXIsIHJlYWxwYXRoRGlyKTtcbiAgfVxuICB2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZGlyKTtcblxuICAvLyBkZWJ1Z1xuICBsb2cuZGVidWcoYGNvbnRleHQ6ICR7cmVhbHBhdGhEaXJ9LCBicm93c2VyUGFja2FnZTogJHticm93c2VyUGFja2FnZSAmJiBicm93c2VyUGFja2FnZS5sb25nTmFtZX1gKTtcblxuICBpZiAoYnJvd3NlclBhY2thZ2UpIHtcbiAgICBsZXQgb3V0RGlyID0gXy50cmltU3RhcnQoYXBpLmNvbmZpZy5nZXQoWydvdXRwdXRQYXRoTWFwJywgYnJvd3NlclBhY2thZ2UubG9uZ05hbWVdKSwgJy8nKTtcbiAgICBsZXQgc291cmNlUGtnRGlyID0gYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoO1xuICAgIGxldCByZWxhdGl2ZUluUGtnID0gcGF0aC5yZWxhdGl2ZShzb3VyY2VQa2dEaXIsIHJlYWxwYXRoRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmV0dXJuIG91dERpciArICcvJyArIHJlbGF0aXZlSW5Qa2c7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUobG9hZGVyQ3R4LnJvb3RDb250ZXh0LCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLnJlcGxhY2UoL1xcLlxcLi9nLCAnXycpXG4gICAgICAucmVwbGFjZSgvKF58XFwvKW5vZGVfbW9kdWxlcyhcXC98JCkvZywgJyQxdmVuZG9yJDInKVxuICAgICAgLnJlcGxhY2UoL0AvZywgJ2FfJyk7XG4gIH1cbn1cbiJdfQ==
