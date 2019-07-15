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
var log = require('log4js').getLogger(__api_1.default.packageName + '.dr-file-loader');
let resolveSymlink = null;
function loader(content, sourceMap) {
    if (!this.emitFile)
        throw new Error('File Loader\n\nemitFile is required from module system');
    if (resolveSymlink === null)
        resolveSymlink = _.get(this, '_compiler.options.resolve.symlinks');
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
    // console.log(drPackageOutputPath(this));
    // ------- DRCP: not supporting useRelativePath --------
    // if (options.useRelativePath) {
    // 	const filePath = this.resourcePath;
    // 	const issuer = options.context
    // 	? context
    // 	: this._module && this._module.issuer && this._module.issuer.context;
    // 	const relativeUrl =
    // 	issuer &&
    // 	path
    // 		.relative(issuer, filePath)
    // 		.split(path.sep)
    // 		.join('/');
    // 	const relativePath = relativeUrl && `${path.dirname(relativeUrl)}/`;
    // 	// eslint-disable-next-line no-bitwise
    // 	if (~relativePath.indexOf('../')) {
    // 	outputPath = path.posix.join(outputPath, relativePath, url);
    // 	} else {
    // 	outputPath = path.posix.join(relativePath, url);
    // 	}
    // }
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
    // var filePath = this.resourcePath;
    // var browserPackage = api.findPackageByFile(filePath);
    // let outputPath = _.trimStart(api.config.get(['outputPathMap', browserPackage.longName]), '/');
    // let packageDir;
    // if (browserPackage.realPackagePath.startsWith(process.cwd()) || resolveSymlink) {
    // 	packageDir = browserPackage.realPackagePath;
    // 	filePath = fs.realpathSync(filePath);
    // } else {
    // 	packageDir = browserPackage.packagePath;
    // }
    // outputPath = path.join(outputPath, path.dirname(path.relative(packageDir, filePath)));
    // url = path.join(outputPath, url.split('/').pop()).replace(/\\/g, '/'); // only file name part
    // url = url.replace(/(^|\/)node_modules(\/|$)/g, '$1n-m$2').replace(/@/g, 'a');
    // var publicPath = '__webpack_public_path__ + ' + JSON.stringify(url);
    // if (options.emitFile === undefined || options.emitFile) {
    // 	this.emitFile(url, content, sourceMap);
    // }
    // callback(null, 'module.exports = ' + publicPath + ';');
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
    if (resolveSymlink === null)
        resolveSymlink = _.get(this, '_compiler.options.resolve.symlinks');
    var dir = loaderCtx.context;
    var browserPackage = __api_1.default.findPackageByFile(dir);
    if (browserPackage) {
        let outDir = _.trimStart(__api_1.default.config.get(['outputPathMap', browserPackage.longName]), '/');
        let sourcePkgDir = resolveSymlink ? browserPackage.realPackagePath : browserPackage.packagePath;
        let relativeInPkg = path.relative(sourcePkgDir, dir).replace(/\\/g, '/');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQVksSUFBSSxDQUFDO0FBRW5DLFNBQVMsTUFBTSxDQUF5QixPQUF3QixFQUFFLFNBQXdCO0lBRXhGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDNUUsSUFBSSxjQUFjLEtBQUssSUFBSTtRQUN6QixjQUFjLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUNyRSxJQUFJLElBQUksQ0FBQyxTQUFTO1FBQ2hCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuQiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWpELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ2pELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSwrQkFBK0I7S0FDdEMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQ1gsT0FBTyxDQUFDLE9BQU87UUFDZixJQUFJLENBQUMsV0FBVztR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QUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QjtBQUNILENBQUM7QUF4QkQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5saWtlIGZpbGUtbG9hZGVyLCBpdCBsb2FkcyBhc3NldHMgcmVzb3VyY2UgZnJvbSBcIkRSQ1BcIiBwYWNrYWdlIHJlbGF0aXZlIGRpcmVjdG9yeSwgbm90IGZyb20gY3VycmVudFxuICogcHJvY2Vzcy5jd2QoKSBkaXJlY3RvcnkgXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2x9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgbG9hZGVyVXRpbHMgZnJvbSAnbG9hZGVyLXV0aWxzJztcbnZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kci1maWxlLWxvYWRlcicpO1xubGV0IHJlc29sdmVTeW1saW5rOiBib29sZWFuID0gbnVsbDtcblxuZnVuY3Rpb24gbG9hZGVyKHRoaXM6IHdsLkxvYWRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKTpcbiAgc3RyaW5nIHwgQnVmZmVyIHwgdm9pZCB8IHVuZGVmaW5lZCB7XG4gIGlmICghdGhpcy5lbWl0RmlsZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgTG9hZGVyXFxuXFxuZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG4gIGlmIChyZXNvbHZlU3ltbGluayA9PT0gbnVsbClcbiAgICByZXNvbHZlU3ltbGluayA9IF8uZ2V0KHRoaXMsICdfY29tcGlsZXIub3B0aW9ucy5yZXNvbHZlLnN5bWxpbmtzJyk7XG4gIGlmICh0aGlzLmNhY2hlYWJsZSlcbiAgICB0aGlzLmNhY2hlYWJsZSgpO1xuICAvLyB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cbiAgaWYgKCF0aGlzLmVtaXRGaWxlKSB0aHJvdyBuZXcgRXJyb3IoJ2VtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuXG4gIHZhciBvcHRpb25zID0gbG9hZGVyVXRpbHMuZ2V0T3B0aW9ucyh0aGlzKSB8fCB7fTtcblxuICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7cHVibGljUGF0aDogZmFsc2UsXG4gICAgdXNlUmVsYXRpdmVQYXRoOiBmYWxzZSxcbiAgICBuYW1lOiAnW25hbWVdLlttZDU6aGFzaDpoZXg6OF0uW2V4dF0nXG4gIH0pO1xuXG4gIGNvbnN0IGNvbnRleHQgPVxuICAgIG9wdGlvbnMuY29udGV4dCB8fFxuICAgIHRoaXMucm9vdENvbnRleHQgfHxcbiAgICAoKHRoaXMgYXMgYW55KS5vcHRpb25zICYmICh0aGlzIGFzIGFueSkub3B0aW9ucy5jb250ZXh0KTtcblxuICB2YXIgdXJsID0gbG9hZGVyVXRpbHMuaW50ZXJwb2xhdGVOYW1lKHRoaXMsIG9wdGlvbnMubmFtZSwge1xuICAgIGNvbnRleHQsXG4gICAgY29udGVudCxcbiAgICByZWdFeHA6IG9wdGlvbnMucmVnRXhwXG4gIH0pO1xuXG4gIGxldCBvdXRwdXRQYXRoID0gdXJsO1xuICBpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dFBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG91dHB1dFBhdGggPSBvcHRpb25zLm91dHB1dFBhdGgodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvcHRpb25zLm91dHB1dFBhdGgsIHVybCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGRyY3BPdXRwdXREaXIgPSBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpO1xuICBvdXRwdXRQYXRoID0gZHJjcE91dHB1dERpciArICcvJyArIF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG4gIG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuICAvLyBjb25zb2xlLmxvZyhkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpKTtcbiAgLy8gLS0tLS0tLSBEUkNQOiBub3Qgc3VwcG9ydGluZyB1c2VSZWxhdGl2ZVBhdGggLS0tLS0tLS1cbiAgLy8gaWYgKG9wdGlvbnMudXNlUmVsYXRpdmVQYXRoKSB7XG4gIC8vIFx0Y29uc3QgZmlsZVBhdGggPSB0aGlzLnJlc291cmNlUGF0aDtcblxuICAvLyBcdGNvbnN0IGlzc3VlciA9IG9wdGlvbnMuY29udGV4dFxuICAvLyBcdD8gY29udGV4dFxuICAvLyBcdDogdGhpcy5fbW9kdWxlICYmIHRoaXMuX21vZHVsZS5pc3N1ZXIgJiYgdGhpcy5fbW9kdWxlLmlzc3Vlci5jb250ZXh0O1xuXG4gIC8vIFx0Y29uc3QgcmVsYXRpdmVVcmwgPVxuICAvLyBcdGlzc3VlciAmJlxuICAvLyBcdHBhdGhcbiAgLy8gXHRcdC5yZWxhdGl2ZShpc3N1ZXIsIGZpbGVQYXRoKVxuICAvLyBcdFx0LnNwbGl0KHBhdGguc2VwKVxuICAvLyBcdFx0LmpvaW4oJy8nKTtcblxuICAvLyBcdGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlVXJsICYmIGAke3BhdGguZGlybmFtZShyZWxhdGl2ZVVybCl9L2A7XG4gIC8vIFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWJpdHdpc2VcbiAgLy8gXHRpZiAofnJlbGF0aXZlUGF0aC5pbmRleE9mKCcuLi8nKSkge1xuICAvLyBcdG91dHB1dFBhdGggPSBwYXRoLnBvc2l4LmpvaW4ob3V0cHV0UGF0aCwgcmVsYXRpdmVQYXRoLCB1cmwpO1xuICAvLyBcdH0gZWxzZSB7XG4gIC8vIFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihyZWxhdGl2ZVBhdGgsIHVybCk7XG4gIC8vIFx0fVxuICAvLyB9XG4gIGxldCBwdWJsaWNQYXRoID0gYF9fd2VicGFja19wdWJsaWNfcGF0aF9fICsgJHtKU09OLnN0cmluZ2lmeShvdXRwdXRQYXRoKX1gO1xuXG4gIGlmIChvcHRpb25zLnB1YmxpY1BhdGgpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMucHVibGljUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCh1cmwpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5wdWJsaWNQYXRoLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIHB1YmxpY1BhdGggPSBvcHRpb25zLnB1YmxpY1BhdGggKyB1cmw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHB1YmxpY1BhdGggPSBgJHtvcHRpb25zLnB1YmxpY1BhdGh9LyR7dXJsfWA7XG4gICAgfVxuXG4gICAgcHVibGljUGF0aCA9IEpTT04uc3RyaW5naWZ5KHB1YmxpY1BhdGgpO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmaW5lZFxuICBpZiAob3B0aW9ucy5lbWl0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuZW1pdEZpbGUpIHtcbiAgICB0aGlzLmVtaXRGaWxlKG91dHB1dFBhdGgsIGNvbnRlbnQsIG51bGwpO1xuICB9XG5cbiAgLy8gVE9ETyByZXZlcnQgdG8gRVMyMDE1IE1vZHVsZSBleHBvcnQsIHdoZW4gbmV3IENTUyBQaXBlbGluZSBpcyBpbiBwbGFjZVxuICBsb2cuZGVidWcoJ3Jlc291cmNlIFVSTDonLCBwdWJsaWNQYXRoKTtcbiAgcmV0dXJuIGBtb2R1bGUuZXhwb3J0cyA9ICR7cHVibGljUGF0aH07YDtcblxuXG4gIC8vIHZhciBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VQYXRoO1xuICAvLyB2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZVBhdGgpO1xuICAvLyBsZXQgb3V0cHV0UGF0aCA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG5cbiAgLy8gbGV0IHBhY2thZ2VEaXI7XG4gIC8vIGlmIChicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGguc3RhcnRzV2l0aChwcm9jZXNzLmN3ZCgpKSB8fCByZXNvbHZlU3ltbGluaykge1xuICAvLyBcdHBhY2thZ2VEaXIgPSBicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGg7XG4gIC8vIFx0ZmlsZVBhdGggPSBmcy5yZWFscGF0aFN5bmMoZmlsZVBhdGgpO1xuICAvLyB9IGVsc2Uge1xuICAvLyBcdHBhY2thZ2VEaXIgPSBicm93c2VyUGFja2FnZS5wYWNrYWdlUGF0aDtcbiAgLy8gfVxuICAvLyBvdXRwdXRQYXRoID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIHBhdGguZGlybmFtZShwYXRoLnJlbGF0aXZlKHBhY2thZ2VEaXIsIGZpbGVQYXRoKSkpO1xuXG4gIC8vIHVybCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCB1cmwuc3BsaXQoJy8nKS5wb3AoKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpOyAvLyBvbmx5IGZpbGUgbmFtZSBwYXJ0XG4gIC8vIHVybCA9IHVybC5yZXBsYWNlKC8oXnxcXC8pbm9kZV9tb2R1bGVzKFxcL3wkKS9nLCAnJDFuLW0kMicpLnJlcGxhY2UoL0AvZywgJ2EnKTtcblxuICAvLyB2YXIgcHVibGljUGF0aCA9ICdfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArICcgKyBKU09OLnN0cmluZ2lmeSh1cmwpO1xuXG4gIC8vIGlmIChvcHRpb25zLmVtaXRGaWxlID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5lbWl0RmlsZSkge1xuICAvLyBcdHRoaXMuZW1pdEZpbGUodXJsLCBjb250ZW50LCBzb3VyY2VNYXApO1xuICAvLyB9XG4gIC8vIGNhbGxiYWNrKG51bGwsICdtb2R1bGUuZXhwb3J0cyA9ICcgKyBwdWJsaWNQYXRoICsgJzsnKTtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG4gIGV4cG9ydCBjb25zdCByYXcgPSB0cnVlO1xufVxuZXhwb3J0ID0gbG9hZGVyO1xuXG4vKipcbiAqIHJldHVybiBwcm9wZXJ0IHBhdGhzIG9mIGEgcmVzb3VyY2UgZnJvbSBEUkNQIHBhY2thZ2UsIGluY2x1ZGluZyBlbWl0KCkgcGF0aCBhbmQgc291cmNlIFVSTFxuICogQHBhcmFtIHRoaXMgbnVsbFxuICogQHBhcmFtIGxvYWRlckN0eCBXZWJwYWNrIGxvYWRlciBjb250ZXh0IGluc3RhbmNlXG4gKiBAcmV0dXJuIFs8PiAsIDxlbWl0ID5dXG4gKi9cbmZ1bmN0aW9uIGRyUGFja2FnZU91dHB1dFBhdGgodGhpczogdW5rbm93biwgbG9hZGVyQ3R4OiB3bC5Mb2FkZXJDb250ZXh0KSB7XG4gIGlmIChyZXNvbHZlU3ltbGluayA9PT0gbnVsbClcbiAgICByZXNvbHZlU3ltbGluayA9IF8uZ2V0KHRoaXMsICdfY29tcGlsZXIub3B0aW9ucy5yZXNvbHZlLnN5bWxpbmtzJyk7XG4gIHZhciBkaXIgPSBsb2FkZXJDdHguY29udGV4dDtcbiAgdmFyIGJyb3dzZXJQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGRpcik7XG4gIGlmIChicm93c2VyUGFja2FnZSkge1xuICAgIGxldCBvdXREaXIgPSBfLnRyaW1TdGFydChhcGkuY29uZmlnLmdldChbJ291dHB1dFBhdGhNYXAnLCBicm93c2VyUGFja2FnZS5sb25nTmFtZV0pLCAnLycpO1xuICAgIGxldCBzb3VyY2VQa2dEaXIgPSByZXNvbHZlU3ltbGluayA/IGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aCA6IGJyb3dzZXJQYWNrYWdlLnBhY2thZ2VQYXRoO1xuICAgIGxldCByZWxhdGl2ZUluUGtnID0gcGF0aC5yZWxhdGl2ZShzb3VyY2VQa2dEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJldHVybiBvdXREaXIgKyAnLycgKyByZWxhdGl2ZUluUGtnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGxvYWRlckN0eC5yb290Q29udGV4dCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC5yZXBsYWNlKC9cXC5cXC4vZywgJ18nKVxuICAgICAgLnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMXZlbmRvciQyJylcbiAgICAgIC5yZXBsYWNlKC9AL2csICdhXycpO1xuICB9XG59XG4iXX0=
