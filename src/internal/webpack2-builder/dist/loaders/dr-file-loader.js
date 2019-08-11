"use strict";
/**
 * Unlike file-loader, it loads assets resource from "DRCP" package relative directory, not from current
 * process.cwd() directory
 */
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const _ = tslib_1.__importStar(require("lodash"));
const loaderUtils = tslib_1.__importStar(require("loader-utils"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const LRU = require('lru-cache');
var log = require('log4js').getLogger(__api_1.default.packageName + '.dr-file-loader');
const lru = new LRU({ max: 20, maxAge: 10000 });
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
    var dir = loaderCtx.context;
    let realDir = lru.get(dir);
    if (!realDir) {
        realDir = fs_1.default.realpathSync(dir);
        lru.set(dir, realDir);
    }
    var browserPackage = __api_1.default.findPackageByFile(dir);
    if (browserPackage) {
        let outDir = _.trimStart(__api_1.default.config.get(['outputPathMap', browserPackage.longName]), '/');
        let relativeInPkg = path.relative(browserPackage.realPackagePath, realDir).replace(/\\/g, '/');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsb0RBQW9CO0FBQ3BCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNqQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztBQUUzRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7QUFFOUMsU0FBUyxNQUFNLENBQXlCLE9BQXdCLEVBQUUsU0FBd0I7SUFFeEYsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztJQUM1RSxJQUFJLElBQUksQ0FBQyxTQUFTO1FBQ2hCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuQiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWpELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ2pELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSwrQkFBK0I7S0FDdEMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQ1gsT0FBTyxD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QU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFGLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9GLE9BQU8sTUFBTSxHQUFHLEdBQUcsR0FBRyxhQUFhLENBQUM7S0FDckM7U0FBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ2pFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxZQUFZLENBQUM7YUFDbEQsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QjtBQUNILENBQUM7QUExQkQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5saWtlIGZpbGUtbG9hZGVyLCBpdCBsb2FkcyBhc3NldHMgcmVzb3VyY2UgZnJvbSBcIkRSQ1BcIiBwYWNrYWdlIHJlbGF0aXZlIGRpcmVjdG9yeSwgbm90IGZyb20gY3VycmVudFxuICogcHJvY2Vzcy5jd2QoKSBkaXJlY3RvcnkgXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2x9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgbG9hZGVyVXRpbHMgZnJvbSAnbG9hZGVyLXV0aWxzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5jb25zdCBMUlUgPSByZXF1aXJlKCdscnUtY2FjaGUnKTtcbnZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kci1maWxlLWxvYWRlcicpO1xuXG5jb25zdCBscnUgPSBuZXcgTFJVKHttYXg6IDIwLCBtYXhBZ2U6IDEwMDAwfSk7XG5cbmZ1bmN0aW9uIGxvYWRlcih0aGlzOiB3bC5Mb2FkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCk6XG4gIHN0cmluZyB8IEJ1ZmZlciB8IHZvaWQgfCB1bmRlZmluZWQge1xuICBpZiAoIXRoaXMuZW1pdEZpbGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlIExvYWRlclxcblxcbmVtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuICBpZiAodGhpcy5jYWNoZWFibGUpXG4gICAgdGhpcy5jYWNoZWFibGUoKTtcbiAgLy8gdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXG4gIGlmICghdGhpcy5lbWl0RmlsZSkgdGhyb3cgbmV3IEVycm9yKCdlbWl0RmlsZSBpcyByZXF1aXJlZCBmcm9tIG1vZHVsZSBzeXN0ZW0nKTtcblxuICB2YXIgb3B0aW9ucyA9IGxvYWRlclV0aWxzLmdldE9wdGlvbnModGhpcykgfHwge307XG5cbiAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywge3B1YmxpY1BhdGg6IGZhbHNlLFxuICAgIHVzZVJlbGF0aXZlUGF0aDogZmFsc2UsXG4gICAgbmFtZTogJ1tuYW1lXS5bbWQ1Omhhc2g6aGV4OjhdLltleHRdJ1xuICB9KTtcblxuICBjb25zdCBjb250ZXh0ID1cbiAgICBvcHRpb25zLmNvbnRleHQgfHxcbiAgICB0aGlzLnJvb3RDb250ZXh0IHx8XG4gICAgKCh0aGlzIGFzIGFueSkub3B0aW9ucyAmJiAodGhpcyBhcyBhbnkpLm9wdGlvbnMuY29udGV4dCk7XG5cbiAgdmFyIHVybCA9IGxvYWRlclV0aWxzLmludGVycG9sYXRlTmFtZSh0aGlzLCBvcHRpb25zLm5hbWUsIHtcbiAgICBjb250ZXh0LFxuICAgIGNvbnRlbnQsXG4gICAgcmVnRXhwOiBvcHRpb25zLnJlZ0V4cFxuICB9KTtcblxuICBsZXQgb3V0cHV0UGF0aCA9IHVybDtcbiAgaWYgKG9wdGlvbnMub3V0cHV0UGF0aCkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXRQYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBvdXRwdXRQYXRoID0gb3B0aW9ucy5vdXRwdXRQYXRoKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dFBhdGggPSBwYXRoLnBvc2l4LmpvaW4ob3B0aW9ucy5vdXRwdXRQYXRoLCB1cmwpO1xuICAgIH1cbiAgfVxuICBjb25zdCBkcmNwT3V0cHV0RGlyID0gZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzKTtcbiAgb3V0cHV0UGF0aCA9IGRyY3BPdXRwdXREaXIgKyAnLycgKyBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuICBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblxuICBsZXQgcHVibGljUGF0aCA9IGBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArICR7SlNPTi5zdHJpbmdpZnkob3V0cHV0UGF0aCl9YDtcblxuICBpZiAob3B0aW9ucy5wdWJsaWNQYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLnB1YmxpY1BhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHB1YmxpY1BhdGggPSBvcHRpb25zLnB1YmxpY1BhdGgodXJsKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMucHVibGljUGF0aC5lbmRzV2l0aCgnLycpKSB7XG4gICAgICBwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoICsgdXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICBwdWJsaWNQYXRoID0gYCR7b3B0aW9ucy5wdWJsaWNQYXRofS8ke3VybH1gO1xuICAgIH1cblxuICAgIHB1YmxpY1BhdGggPSBKU09OLnN0cmluZ2lmeShwdWJsaWNQYXRoKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZmluZWRcbiAgaWYgKG9wdGlvbnMuZW1pdEZpbGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmVtaXRGaWxlKSB7XG4gICAgdGhpcy5lbWl0RmlsZShvdXRwdXRQYXRoLCBjb250ZW50LCBudWxsKTtcbiAgfVxuXG4gIC8vIFRPRE8gcmV2ZXJ0IHRvIEVTMjAxNSBNb2R1bGUgZXhwb3J0LCB3aGVuIG5ldyBDU1MgUGlwZWxpbmUgaXMgaW4gcGxhY2VcbiAgbG9nLmRlYnVnKCdyZXNvdXJjZSBVUkw6JywgcHVibGljUGF0aCk7XG4gIHJldHVybiBgbW9kdWxlLmV4cG9ydHMgPSAke3B1YmxpY1BhdGh9O2A7XG5cbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG4gIGV4cG9ydCBjb25zdCByYXcgPSB0cnVlO1xufVxuZXhwb3J0ID0gbG9hZGVyO1xuXG4vKipcbiAqIHJldHVybiBwcm9wZXJ0IHBhdGhzIG9mIGEgcmVzb3VyY2UgZnJvbSBEUkNQIHBhY2thZ2UsIGluY2x1ZGluZyBlbWl0KCkgcGF0aCBhbmQgc291cmNlIFVSTFxuICogQHBhcmFtIHRoaXMgbnVsbFxuICogQHBhcmFtIGxvYWRlckN0eCBXZWJwYWNrIGxvYWRlciBjb250ZXh0IGluc3RhbmNlXG4gKiBAcmV0dXJuIFs8PiAsIDxlbWl0ID5dXG4gKi9cbmZ1bmN0aW9uIGRyUGFja2FnZU91dHB1dFBhdGgodGhpczogdW5rbm93biwgbG9hZGVyQ3R4OiB3bC5Mb2FkZXJDb250ZXh0KSB7XG4gIHZhciBkaXIgPSBsb2FkZXJDdHguY29udGV4dDtcbiAgbGV0IHJlYWxEaXI6IHN0cmluZyA9IGxydS5nZXQoZGlyKTtcbiAgaWYgKCFyZWFsRGlyKSB7XG4gICAgcmVhbERpciA9IGZzLnJlYWxwYXRoU3luYyhkaXIpO1xuICAgIGxydS5zZXQoZGlyLCByZWFsRGlyKTtcbiAgfVxuICB2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZGlyKTtcbiAgaWYgKGJyb3dzZXJQYWNrYWdlKSB7XG4gICAgbGV0IG91dERpciA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG4gICAgbGV0IHJlbGF0aXZlSW5Qa2cgPSBwYXRoLnJlbGF0aXZlKGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aCwgcmVhbERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJldHVybiBvdXREaXIgKyAnLycgKyByZWxhdGl2ZUluUGtnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGxvYWRlckN0eC5yb290Q29udGV4dCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC5yZXBsYWNlKC9cXC5cXC4vZywgJ18nKVxuICAgICAgLnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMXZlbmRvciQyJylcbiAgICAgIC5yZXBsYWNlKC9AL2csICdhXycpO1xuICB9XG59XG4iXX0=
