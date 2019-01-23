"use strict";
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
    log.info('resource URL:', publicPath);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQVksSUFBSSxDQUFDO0FBRW5DLFNBQVMsTUFBTSxDQUF5QixPQUF3QixFQUFFLFNBQXdCO0lBRXpGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDM0UsSUFBSSxjQUFjLEtBQUssSUFBSTtRQUMxQixjQUFjLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUNwRSxJQUFJLElBQUksQ0FBQyxTQUFTO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWpELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ2xELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSwrQkFBK0I7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQ1osT0FBTyxDQUFDLE9BQU87UUFDZixJQUFJLENBQUMsV0FBVztRQUNoQixDQUFFLElB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LENBQUMsQ0FBQztLQUN0QjtBQUNGLENBQUM7QUF4QkQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9hZGVyIGFzIHdsfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCAqIGFzIGxvYWRlclV0aWxzIGZyb20gJ2xvYWRlci11dGlscyc7XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZHItZmlsZS1sb2FkZXInKTtcbmxldCByZXNvbHZlU3ltbGluazogYm9vbGVhbiA9IG51bGw7XG5cbmZ1bmN0aW9uIGxvYWRlcih0aGlzOiB3bC5Mb2FkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCk6XG5cdHN0cmluZyB8IEJ1ZmZlciB8IHZvaWQgfCB1bmRlZmluZWQge1xuXHRpZiAoIXRoaXMuZW1pdEZpbGUpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdGaWxlIExvYWRlclxcblxcbmVtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuXHRpZiAocmVzb2x2ZVN5bWxpbmsgPT09IG51bGwpXG5cdFx0cmVzb2x2ZVN5bWxpbmsgPSBfLmdldCh0aGlzLCAnX2NvbXBpbGVyLm9wdGlvbnMucmVzb2x2ZS5zeW1saW5rcycpO1xuXHRpZiAodGhpcy5jYWNoZWFibGUpXG5cdFx0dGhpcy5jYWNoZWFibGUoKTtcblx0Ly8gdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXG5cdGlmICghdGhpcy5lbWl0RmlsZSkgdGhyb3cgbmV3IEVycm9yKCdlbWl0RmlsZSBpcyByZXF1aXJlZCBmcm9tIG1vZHVsZSBzeXN0ZW0nKTtcblxuXHR2YXIgb3B0aW9ucyA9IGxvYWRlclV0aWxzLmdldE9wdGlvbnModGhpcykgfHwge307XG5cblx0b3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywge3B1YmxpY1BhdGg6IGZhbHNlLFxuXHRcdHVzZVJlbGF0aXZlUGF0aDogZmFsc2UsXG5cdFx0bmFtZTogJ1tuYW1lXS5bbWQ1Omhhc2g6aGV4OjhdLltleHRdJ1xuXHR9KTtcblxuXHRjb25zdCBjb250ZXh0ID1cblx0XHRvcHRpb25zLmNvbnRleHQgfHxcblx0XHR0aGlzLnJvb3RDb250ZXh0IHx8XG5cdFx0KCh0aGlzIGFzIGFueSkub3B0aW9ucyAmJiAodGhpcyBhcyBhbnkpLm9wdGlvbnMuY29udGV4dCk7XG5cblx0dmFyIHVybCA9IGxvYWRlclV0aWxzLmludGVycG9sYXRlTmFtZSh0aGlzLCBvcHRpb25zLm5hbWUsIHtcblx0XHRjb250ZXh0LFxuXHRcdGNvbnRlbnQsXG5cdFx0cmVnRXhwOiBvcHRpb25zLnJlZ0V4cFxuXHR9KTtcblxuXHRsZXQgb3V0cHV0UGF0aCA9IHVybDtcblx0aWYgKG9wdGlvbnMub3V0cHV0UGF0aCkge1xuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXRQYXRoID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRvdXRwdXRQYXRoID0gb3B0aW9ucy5vdXRwdXRQYXRoKHVybCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dHB1dFBhdGggPSBwYXRoLnBvc2l4LmpvaW4ob3B0aW9ucy5vdXRwdXRQYXRoLCB1cmwpO1xuXHRcdH1cblx0fVxuXHRjb25zdCBkcmNwT3V0cHV0RGlyID0gZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzKTtcblx0b3V0cHV0UGF0aCA9IGRyY3BPdXRwdXREaXIgKyAnLycgKyBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuXHRvdXRwdXRQYXRoID0gXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblx0Ly8gY29uc29sZS5sb2coZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzKSk7XG5cdC8vIC0tLS0tLS0gRFJDUDogbm90IHN1cHBvcnRpbmcgdXNlUmVsYXRpdmVQYXRoIC0tLS0tLS0tXG5cdC8vIGlmIChvcHRpb25zLnVzZVJlbGF0aXZlUGF0aCkge1xuXHQvLyBcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5yZXNvdXJjZVBhdGg7XG5cblx0Ly8gXHRjb25zdCBpc3N1ZXIgPSBvcHRpb25zLmNvbnRleHRcblx0Ly8gXHQ/IGNvbnRleHRcblx0Ly8gXHQ6IHRoaXMuX21vZHVsZSAmJiB0aGlzLl9tb2R1bGUuaXNzdWVyICYmIHRoaXMuX21vZHVsZS5pc3N1ZXIuY29udGV4dDtcblxuXHQvLyBcdGNvbnN0IHJlbGF0aXZlVXJsID1cblx0Ly8gXHRpc3N1ZXIgJiZcblx0Ly8gXHRwYXRoXG5cdC8vIFx0XHQucmVsYXRpdmUoaXNzdWVyLCBmaWxlUGF0aClcblx0Ly8gXHRcdC5zcGxpdChwYXRoLnNlcClcblx0Ly8gXHRcdC5qb2luKCcvJyk7XG5cblx0Ly8gXHRjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZVVybCAmJiBgJHtwYXRoLmRpcm5hbWUocmVsYXRpdmVVcmwpfS9gO1xuXHQvLyBcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1iaXR3aXNlXG5cdC8vIFx0aWYgKH5yZWxhdGl2ZVBhdGguaW5kZXhPZignLi4vJykpIHtcblx0Ly8gXHRvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKG91dHB1dFBhdGgsIHJlbGF0aXZlUGF0aCwgdXJsKTtcblx0Ly8gXHR9IGVsc2Uge1xuXHQvLyBcdG91dHB1dFBhdGggPSBwYXRoLnBvc2l4LmpvaW4ocmVsYXRpdmVQYXRoLCB1cmwpO1xuXHQvLyBcdH1cblx0Ly8gfVxuXHRsZXQgcHVibGljUGF0aCA9IGBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArICR7SlNPTi5zdHJpbmdpZnkob3V0cHV0UGF0aCl9YDtcblxuXHRpZiAob3B0aW9ucy5wdWJsaWNQYXRoKSB7XG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zLnB1YmxpY1BhdGggPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHB1YmxpY1BhdGggPSBvcHRpb25zLnB1YmxpY1BhdGgodXJsKTtcblx0XHR9IGVsc2UgaWYgKG9wdGlvbnMucHVibGljUGF0aC5lbmRzV2l0aCgnLycpKSB7XG5cdFx0XHRwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoICsgdXJsO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwdWJsaWNQYXRoID0gYCR7b3B0aW9ucy5wdWJsaWNQYXRofS8ke3VybH1gO1xuXHRcdH1cblxuXHRcdHB1YmxpY1BhdGggPSBKU09OLnN0cmluZ2lmeShwdWJsaWNQYXRoKTtcblx0fVxuXG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZmluZWRcblx0aWYgKG9wdGlvbnMuZW1pdEZpbGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmVtaXRGaWxlKSB7XG5cdFx0dGhpcy5lbWl0RmlsZShvdXRwdXRQYXRoLCBjb250ZW50LCBudWxsKTtcblx0fVxuXG5cdC8vIFRPRE8gcmV2ZXJ0IHRvIEVTMjAxNSBNb2R1bGUgZXhwb3J0LCB3aGVuIG5ldyBDU1MgUGlwZWxpbmUgaXMgaW4gcGxhY2Vcblx0bG9nLmluZm8oJ3Jlc291cmNlIFVSTDonLCBwdWJsaWNQYXRoKTtcblx0cmV0dXJuIGBtb2R1bGUuZXhwb3J0cyA9ICR7cHVibGljUGF0aH07YDtcblxuXG5cdC8vIHZhciBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VQYXRoO1xuXHQvLyB2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZVBhdGgpO1xuXHQvLyBsZXQgb3V0cHV0UGF0aCA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG5cblx0Ly8gbGV0IHBhY2thZ2VEaXI7XG5cdC8vIGlmIChicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGguc3RhcnRzV2l0aChwcm9jZXNzLmN3ZCgpKSB8fCByZXNvbHZlU3ltbGluaykge1xuXHQvLyBcdHBhY2thZ2VEaXIgPSBicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGg7XG5cdC8vIFx0ZmlsZVBhdGggPSBmcy5yZWFscGF0aFN5bmMoZmlsZVBhdGgpO1xuXHQvLyB9IGVsc2Uge1xuXHQvLyBcdHBhY2thZ2VEaXIgPSBicm93c2VyUGFja2FnZS5wYWNrYWdlUGF0aDtcblx0Ly8gfVxuXHQvLyBvdXRwdXRQYXRoID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIHBhdGguZGlybmFtZShwYXRoLnJlbGF0aXZlKHBhY2thZ2VEaXIsIGZpbGVQYXRoKSkpO1xuXG5cdC8vIHVybCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCB1cmwuc3BsaXQoJy8nKS5wb3AoKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpOyAvLyBvbmx5IGZpbGUgbmFtZSBwYXJ0XG5cdC8vIHVybCA9IHVybC5yZXBsYWNlKC8oXnxcXC8pbm9kZV9tb2R1bGVzKFxcL3wkKS9nLCAnJDFuLW0kMicpLnJlcGxhY2UoL0AvZywgJ2EnKTtcblxuXHQvLyB2YXIgcHVibGljUGF0aCA9ICdfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArICcgKyBKU09OLnN0cmluZ2lmeSh1cmwpO1xuXG5cdC8vIGlmIChvcHRpb25zLmVtaXRGaWxlID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5lbWl0RmlsZSkge1xuXHQvLyBcdHRoaXMuZW1pdEZpbGUodXJsLCBjb250ZW50LCBzb3VyY2VNYXApO1xuXHQvLyB9XG5cdC8vIGNhbGxiYWNrKG51bGwsICdtb2R1bGUuZXhwb3J0cyA9ICcgKyBwdWJsaWNQYXRoICsgJzsnKTtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG5cdGV4cG9ydCBjb25zdCByYXcgPSB0cnVlO1xufVxuZXhwb3J0ID0gbG9hZGVyO1xuXG4vKipcbiAqIHJldHVybiBwcm9wZXJ0IHBhdGhzIG9mIGEgcmVzb3VyY2UgZnJvbSBEUkNQIHBhY2thZ2UsIGluY2x1ZGluZyBlbWl0KCkgcGF0aCBhbmQgc291cmNlIFVSTFxuICogQHBhcmFtIHRoaXMgbnVsbFxuICogQHBhcmFtIGxvYWRlckN0eCBXZWJwYWNrIGxvYWRlciBjb250ZXh0IGluc3RhbmNlXG4gKiBAcmV0dXJuIFs8PiAsIDxlbWl0ID5dXG4gKi9cbmZ1bmN0aW9uIGRyUGFja2FnZU91dHB1dFBhdGgodGhpczogdW5rbm93biwgbG9hZGVyQ3R4OiB3bC5Mb2FkZXJDb250ZXh0KSB7XG5cdGlmIChyZXNvbHZlU3ltbGluayA9PT0gbnVsbClcblx0XHRyZXNvbHZlU3ltbGluayA9IF8uZ2V0KHRoaXMsICdfY29tcGlsZXIub3B0aW9ucy5yZXNvbHZlLnN5bWxpbmtzJyk7XG5cdHZhciBkaXIgPSBsb2FkZXJDdHguY29udGV4dDtcblx0dmFyIGJyb3dzZXJQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGRpcik7XG5cdGlmIChicm93c2VyUGFja2FnZSkge1xuXHRcdGxldCBvdXREaXIgPSBfLnRyaW1TdGFydChhcGkuY29uZmlnLmdldChbJ291dHB1dFBhdGhNYXAnLCBicm93c2VyUGFja2FnZS5sb25nTmFtZV0pLCAnLycpO1xuXHRcdGxldCBzb3VyY2VQa2dEaXIgPSByZXNvbHZlU3ltbGluayA/IGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aCA6IGJyb3dzZXJQYWNrYWdlLnBhY2thZ2VQYXRoO1xuXHRcdGxldCByZWxhdGl2ZUluUGtnID0gcGF0aC5yZWxhdGl2ZShzb3VyY2VQa2dEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHJldHVybiBvdXREaXIgKyAnLycgKyByZWxhdGl2ZUluUGtnO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBwYXRoLnJlbGF0aXZlKGxvYWRlckN0eC5yb290Q29udGV4dCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJylcblx0XHRcdC5yZXBsYWNlKC9cXC5cXC4vZywgJ18nKVxuXHRcdFx0LnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMXZlbmRvciQyJylcblx0XHRcdC5yZXBsYWNlKC9AL2csICdhXycpO1xuXHR9XG59XG4iXX0=
