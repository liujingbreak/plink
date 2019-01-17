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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQVksSUFBSSxDQUFDO0FBRW5DLFNBQVMsTUFBTSxDQUF5QixPQUF3QixFQUFFLFNBQXdCO0lBRXpGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDM0UsSUFBSSxjQUFjLEtBQUssSUFBSTtRQUMxQixjQUFjLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUNwRSxJQUFJLElBQUksQ0FBQyxTQUFTO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWpELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ2xELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSwrQkFBK0I7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQ1osT0FBTyxDQUFDLE9BQU87UUFDZixJQUFJLENBQUMsV0FBVztRQUNoQixDQUFFLElB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ZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2x9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgbG9hZGVyVXRpbHMgZnJvbSAnbG9hZGVyLXV0aWxzJztcbnZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kci1maWxlLWxvYWRlcicpO1xubGV0IHJlc29sdmVTeW1saW5rOiBib29sZWFuID0gbnVsbDtcblxuZnVuY3Rpb24gbG9hZGVyKHRoaXM6IHdsLkxvYWRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKTpcblx0c3RyaW5nIHwgQnVmZmVyIHwgdm9pZCB8IHVuZGVmaW5lZCB7XG5cdGlmICghdGhpcy5lbWl0RmlsZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgTG9hZGVyXFxuXFxuZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG5cdGlmIChyZXNvbHZlU3ltbGluayA9PT0gbnVsbClcblx0XHRyZXNvbHZlU3ltbGluayA9IF8uZ2V0KHRoaXMsICdfY29tcGlsZXIub3B0aW9ucy5yZXNvbHZlLnN5bWxpbmtzJyk7XG5cdGlmICh0aGlzLmNhY2hlYWJsZSlcblx0XHR0aGlzLmNhY2hlYWJsZSgpO1xuXHQvLyB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cblx0aWYgKCF0aGlzLmVtaXRGaWxlKSB0aHJvdyBuZXcgRXJyb3IoJ2VtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuXG5cdHZhciBvcHRpb25zID0gbG9hZGVyVXRpbHMuZ2V0T3B0aW9ucyh0aGlzKSB8fCB7fTtcblxuXHRvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7cHVibGljUGF0aDogZmFsc2UsXG5cdFx0dXNlUmVsYXRpdmVQYXRoOiBmYWxzZSxcblx0XHRuYW1lOiAnW25hbWVdLlttZDU6aGFzaDpoZXg6OF0uW2V4dF0nXG5cdH0pO1xuXG5cdGNvbnN0IGNvbnRleHQgPVxuXHRcdG9wdGlvbnMuY29udGV4dCB8fFxuXHRcdHRoaXMucm9vdENvbnRleHQgfHxcblx0XHQoKHRoaXMgYXMgYW55KS5vcHRpb25zICYmICh0aGlzIGFzIGFueSkub3B0aW9ucy5jb250ZXh0KTtcblxuXHR2YXIgdXJsID0gbG9hZGVyVXRpbHMuaW50ZXJwb2xhdGVOYW1lKHRoaXMsIG9wdGlvbnMubmFtZSwge1xuXHRcdGNvbnRleHQsXG5cdFx0Y29udGVudCxcblx0XHRyZWdFeHA6IG9wdGlvbnMucmVnRXhwXG5cdH0pO1xuXG5cdGxldCBvdXRwdXRQYXRoID0gdXJsO1xuXHRpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dFBhdGggPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdG91dHB1dFBhdGggPSBvcHRpb25zLm91dHB1dFBhdGgodXJsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvcHRpb25zLm91dHB1dFBhdGgsIHVybCk7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IGRyY3BPdXRwdXREaXIgPSBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpO1xuXHRvdXRwdXRQYXRoID0gZHJjcE91dHB1dERpciArICcvJyArIF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG5cdC8vIGNvbnNvbGUubG9nKGRyUGFja2FnZU91dHB1dFBhdGgodGhpcykpO1xuXHQvLyAtLS0tLS0tIERSQ1A6IG5vdCBzdXBwb3J0aW5nIHVzZVJlbGF0aXZlUGF0aCAtLS0tLS0tLVxuXHQvLyBpZiAob3B0aW9ucy51c2VSZWxhdGl2ZVBhdGgpIHtcblx0Ly8gXHRjb25zdCBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VQYXRoO1xuXG5cdC8vIFx0Y29uc3QgaXNzdWVyID0gb3B0aW9ucy5jb250ZXh0XG5cdC8vIFx0PyBjb250ZXh0XG5cdC8vIFx0OiB0aGlzLl9tb2R1bGUgJiYgdGhpcy5fbW9kdWxlLmlzc3VlciAmJiB0aGlzLl9tb2R1bGUuaXNzdWVyLmNvbnRleHQ7XG5cblx0Ly8gXHRjb25zdCByZWxhdGl2ZVVybCA9XG5cdC8vIFx0aXNzdWVyICYmXG5cdC8vIFx0cGF0aFxuXHQvLyBcdFx0LnJlbGF0aXZlKGlzc3VlciwgZmlsZVBhdGgpXG5cdC8vIFx0XHQuc3BsaXQocGF0aC5zZXApXG5cdC8vIFx0XHQuam9pbignLycpO1xuXG5cdC8vIFx0Y29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmVVcmwgJiYgYCR7cGF0aC5kaXJuYW1lKHJlbGF0aXZlVXJsKX0vYDtcblx0Ly8gXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuXHQvLyBcdGlmICh+cmVsYXRpdmVQYXRoLmluZGV4T2YoJy4uLycpKSB7XG5cdC8vIFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvdXRwdXRQYXRoLCByZWxhdGl2ZVBhdGgsIHVybCk7XG5cdC8vIFx0fSBlbHNlIHtcblx0Ly8gXHRvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKHJlbGF0aXZlUGF0aCwgdXJsKTtcblx0Ly8gXHR9XG5cdC8vIH1cblx0bGV0IHB1YmxpY1BhdGggPSBgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyAke0pTT04uc3RyaW5naWZ5KG91dHB1dFBhdGgpfWA7XG5cblx0aWYgKG9wdGlvbnMucHVibGljUGF0aCkge1xuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5wdWJsaWNQYXRoID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoKHVybCk7XG5cdFx0fSBlbHNlIGlmIChvcHRpb25zLnB1YmxpY1BhdGguZW5kc1dpdGgoJy8nKSkge1xuXHRcdFx0cHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCArIHVybDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cHVibGljUGF0aCA9IGAke29wdGlvbnMucHVibGljUGF0aH0vJHt1cmx9YDtcblx0XHR9XG5cblx0XHRwdWJsaWNQYXRoID0gSlNPTi5zdHJpbmdpZnkocHVibGljUGF0aCk7XG5cdH1cblxuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZpbmVkXG5cdGlmIChvcHRpb25zLmVtaXRGaWxlID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5lbWl0RmlsZSkge1xuXHRcdHRoaXMuZW1pdEZpbGUob3V0cHV0UGF0aCwgY29udGVudCwgbnVsbCk7XG5cdH1cblxuXHQvLyBUT0RPIHJldmVydCB0byBFUzIwMTUgTW9kdWxlIGV4cG9ydCwgd2hlbiBuZXcgQ1NTIFBpcGVsaW5lIGlzIGluIHBsYWNlXG5cdGxvZy5pbmZvKCdyZXNvdXJjZSBVUkw6JywgcHVibGljUGF0aCk7XG5cdHJldHVybiBgbW9kdWxlLmV4cG9ydHMgPSAke3B1YmxpY1BhdGh9O2A7XG5cblxuXHQvLyB2YXIgZmlsZVBhdGggPSB0aGlzLnJlc291cmNlUGF0aDtcblx0Ly8gdmFyIGJyb3dzZXJQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGVQYXRoKTtcblx0Ly8gbGV0IG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChhcGkuY29uZmlnLmdldChbJ291dHB1dFBhdGhNYXAnLCBicm93c2VyUGFja2FnZS5sb25nTmFtZV0pLCAnLycpO1xuXG5cdC8vIGxldCBwYWNrYWdlRGlyO1xuXHQvLyBpZiAoYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoLnN0YXJ0c1dpdGgocHJvY2Vzcy5jd2QoKSkgfHwgcmVzb2x2ZVN5bWxpbmspIHtcblx0Ly8gXHRwYWNrYWdlRGlyID0gYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoO1xuXHQvLyBcdGZpbGVQYXRoID0gZnMucmVhbHBhdGhTeW5jKGZpbGVQYXRoKTtcblx0Ly8gfSBlbHNlIHtcblx0Ly8gXHRwYWNrYWdlRGlyID0gYnJvd3NlclBhY2thZ2UucGFja2FnZVBhdGg7XG5cdC8vIH1cblx0Ly8gb3V0cHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCBwYXRoLmRpcm5hbWUocGF0aC5yZWxhdGl2ZShwYWNrYWdlRGlyLCBmaWxlUGF0aCkpKTtcblxuXHQvLyB1cmwgPSBwYXRoLmpvaW4ob3V0cHV0UGF0aCwgdXJsLnNwbGl0KCcvJykucG9wKCkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTsgLy8gb25seSBmaWxlIG5hbWUgcGFydFxuXHQvLyB1cmwgPSB1cmwucmVwbGFjZSgvKF58XFwvKW5vZGVfbW9kdWxlcyhcXC98JCkvZywgJyQxbi1tJDInKS5yZXBsYWNlKC9AL2csICdhJyk7XG5cblx0Ly8gdmFyIHB1YmxpY1BhdGggPSAnX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyAnICsgSlNPTi5zdHJpbmdpZnkodXJsKTtcblxuXHQvLyBpZiAob3B0aW9ucy5lbWl0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuZW1pdEZpbGUpIHtcblx0Ly8gXHR0aGlzLmVtaXRGaWxlKHVybCwgY29udGVudCwgc291cmNlTWFwKTtcblx0Ly8gfVxuXHQvLyBjYWxsYmFjayhudWxsLCAnbW9kdWxlLmV4cG9ydHMgPSAnICsgcHVibGljUGF0aCArICc7Jyk7XG59XG5cbm5hbWVzcGFjZSBsb2FkZXIge1xuXHRleHBvcnQgY29uc3QgcmF3ID0gdHJ1ZTtcbn1cbmV4cG9ydCA9IGxvYWRlcjtcblxuLyoqXG4gKiByZXR1cm4gcHJvcGVydCBwYXRocyBvZiBhIHJlc291cmNlIGZyb20gRFJDUCBwYWNrYWdlLCBpbmNsdWRpbmcgZW1pdCgpIHBhdGggYW5kIHNvdXJjZSBVUkxcbiAqIEBwYXJhbSB0aGlzIG51bGxcbiAqIEBwYXJhbSBsb2FkZXJDdHggV2VicGFjayBsb2FkZXIgY29udGV4dCBpbnN0YW5jZVxuICogQHJldHVybiBbPD4gLCA8ZW1pdCA+XVxuICovXG5mdW5jdGlvbiBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXM6IHVua25vd24sIGxvYWRlckN0eDogd2wuTG9hZGVyQ29udGV4dCkge1xuXHRpZiAocmVzb2x2ZVN5bWxpbmsgPT09IG51bGwpXG5cdFx0cmVzb2x2ZVN5bWxpbmsgPSBfLmdldCh0aGlzLCAnX2NvbXBpbGVyLm9wdGlvbnMucmVzb2x2ZS5zeW1saW5rcycpO1xuXHR2YXIgZGlyID0gbG9hZGVyQ3R4LmNvbnRleHQ7XG5cdHZhciBicm93c2VyUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShkaXIpO1xuXHRpZiAoYnJvd3NlclBhY2thZ2UpIHtcblx0XHRsZXQgb3V0RGlyID0gXy50cmltU3RhcnQoYXBpLmNvbmZpZy5nZXQoWydvdXRwdXRQYXRoTWFwJywgYnJvd3NlclBhY2thZ2UubG9uZ05hbWVdKSwgJy8nKTtcblx0XHRsZXQgc291cmNlUGtnRGlyID0gcmVzb2x2ZVN5bWxpbmsgPyBicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGggOiBicm93c2VyUGFja2FnZS5wYWNrYWdlUGF0aDtcblx0XHRsZXQgcmVsYXRpdmVJblBrZyA9IHBhdGgucmVsYXRpdmUoc291cmNlUGtnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRyZXR1cm4gb3V0RGlyICsgJy8nICsgcmVsYXRpdmVJblBrZztcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gcGF0aC5yZWxhdGl2ZShsb2FkZXJDdHgucm9vdENvbnRleHQsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cdFx0XHQucmVwbGFjZSgvXFwuXFwuL2csICdfJylcblx0XHRcdC5yZXBsYWNlKC8oXnxcXC8pbm9kZV9tb2R1bGVzKFxcL3wkKS9nLCAnJDF2ZW5kb3IkMicpXG5cdFx0XHQucmVwbGFjZSgvQC9nLCAnYV8nKTtcblx0fVxufVxuIl19
