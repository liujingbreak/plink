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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQW1CLElBQUksQ0FBQztBQUUxQyxTQUFTLE1BQU0sQ0FBeUIsT0FBd0IsRUFBRSxTQUF3QjtJQUV6RixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0lBQzNFLElBQUksY0FBYyxLQUFLLElBQUk7UUFDMUIsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7SUFDcEUsSUFBSSxJQUFJLENBQUMsU0FBUztRQUNqQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEIsK0JBQStCO0lBRS9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUUvRSxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUVqRCxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBQyxVQUFVLEVBQUUsS0FBSztRQUNsRCxlQUFlLEVBQUUsS0FBSztRQUN0QixJQUFJLEVBQUUsK0JBQStCO0tBQ3JDLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUNaLE9BQU8sQ0FBQyxPQUFPO1FBQ2YsSUFBSSxDQUFDLFdBQVc7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QUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDdEI7QUFDRixDQUFDO0FBeEJELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVubGlrZSBmaWxlLWxvYWRlciwgaXQgbG9hZHMgYXNzZXRzIHJlc291cmNlIGZyb20gXCJEUkNQXCIgcGFja2FnZSByZWxhdGl2ZSBkaXJlY3RvcnksIG5vdCBmcm9tIGN1cnJlbnRcbiAqIHByb2Nlc3MuY3dkKCkgZGlyZWN0b3J5IFxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9hZGVyIGFzIHdsfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCAqIGFzIGxvYWRlclV0aWxzIGZyb20gJ2xvYWRlci11dGlscyc7XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZHItZmlsZS1sb2FkZXInKTtcbmxldCByZXNvbHZlU3ltbGluazogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuXG5mdW5jdGlvbiBsb2FkZXIodGhpczogd2wuTG9hZGVyQ29udGV4dCwgY29udGVudDogc3RyaW5nIHwgQnVmZmVyLCBzb3VyY2VNYXA/OiBSYXdTb3VyY2VNYXApOlxuXHRzdHJpbmcgfCBCdWZmZXIgfCB2b2lkIHwgdW5kZWZpbmVkIHtcblx0aWYgKCF0aGlzLmVtaXRGaWxlKVxuXHRcdHRocm93IG5ldyBFcnJvcignRmlsZSBMb2FkZXJcXG5cXG5lbWl0RmlsZSBpcyByZXF1aXJlZCBmcm9tIG1vZHVsZSBzeXN0ZW0nKTtcblx0aWYgKHJlc29sdmVTeW1saW5rID09PSBudWxsKVxuXHRcdHJlc29sdmVTeW1saW5rID0gXy5nZXQodGhpcywgJ19jb21waWxlci5vcHRpb25zLnJlc29sdmUuc3ltbGlua3MnKTtcblx0aWYgKHRoaXMuY2FjaGVhYmxlKVxuXHRcdHRoaXMuY2FjaGVhYmxlKCk7XG5cdC8vIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcblxuXHRpZiAoIXRoaXMuZW1pdEZpbGUpIHRocm93IG5ldyBFcnJvcignZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG5cblx0dmFyIG9wdGlvbnMgPSBsb2FkZXJVdGlscy5nZXRPcHRpb25zKHRoaXMpIHx8IHt9O1xuXG5cdG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtwdWJsaWNQYXRoOiBmYWxzZSxcblx0XHR1c2VSZWxhdGl2ZVBhdGg6IGZhbHNlLFxuXHRcdG5hbWU6ICdbbmFtZV0uW21kNTpoYXNoOmhleDo4XS5bZXh0XSdcblx0fSk7XG5cblx0Y29uc3QgY29udGV4dCA9XG5cdFx0b3B0aW9ucy5jb250ZXh0IHx8XG5cdFx0dGhpcy5yb290Q29udGV4dCB8fFxuXHRcdCgodGhpcyBhcyBhbnkpLm9wdGlvbnMgJiYgKHRoaXMgYXMgYW55KS5vcHRpb25zLmNvbnRleHQpO1xuXG5cdHZhciB1cmwgPSBsb2FkZXJVdGlscy5pbnRlcnBvbGF0ZU5hbWUodGhpcywgb3B0aW9ucy5uYW1lLCB7XG5cdFx0Y29udGV4dCxcblx0XHRjb250ZW50LFxuXHRcdHJlZ0V4cDogb3B0aW9ucy5yZWdFeHBcblx0fSk7XG5cblx0bGV0IG91dHB1dFBhdGggPSB1cmw7XG5cdGlmIChvcHRpb25zLm91dHB1dFBhdGgpIHtcblx0XHRpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0UGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0b3V0cHV0UGF0aCA9IG9wdGlvbnMub3V0cHV0UGF0aCh1cmwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKG9wdGlvbnMub3V0cHV0UGF0aCwgdXJsKTtcblx0XHR9XG5cdH1cblx0Y29uc3QgZHJjcE91dHB1dERpciA9IGRyUGFja2FnZU91dHB1dFBhdGgodGhpcyk7XG5cdG91dHB1dFBhdGggPSBkcmNwT3V0cHV0RGlyICsgJy8nICsgXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblx0b3V0cHV0UGF0aCA9IF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG5cdC8vIGNvbnNvbGUubG9nKGRyUGFja2FnZU91dHB1dFBhdGgodGhpcykpO1xuXHQvLyAtLS0tLS0tIERSQ1A6IG5vdCBzdXBwb3J0aW5nIHVzZVJlbGF0aXZlUGF0aCAtLS0tLS0tLVxuXHQvLyBpZiAob3B0aW9ucy51c2VSZWxhdGl2ZVBhdGgpIHtcblx0Ly8gXHRjb25zdCBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VQYXRoO1xuXG5cdC8vIFx0Y29uc3QgaXNzdWVyID0gb3B0aW9ucy5jb250ZXh0XG5cdC8vIFx0PyBjb250ZXh0XG5cdC8vIFx0OiB0aGlzLl9tb2R1bGUgJiYgdGhpcy5fbW9kdWxlLmlzc3VlciAmJiB0aGlzLl9tb2R1bGUuaXNzdWVyLmNvbnRleHQ7XG5cblx0Ly8gXHRjb25zdCByZWxhdGl2ZVVybCA9XG5cdC8vIFx0aXNzdWVyICYmXG5cdC8vIFx0cGF0aFxuXHQvLyBcdFx0LnJlbGF0aXZlKGlzc3VlciwgZmlsZVBhdGgpXG5cdC8vIFx0XHQuc3BsaXQocGF0aC5zZXApXG5cdC8vIFx0XHQuam9pbignLycpO1xuXG5cdC8vIFx0Y29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmVVcmwgJiYgYCR7cGF0aC5kaXJuYW1lKHJlbGF0aXZlVXJsKX0vYDtcblx0Ly8gXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuXHQvLyBcdGlmICh+cmVsYXRpdmVQYXRoLmluZGV4T2YoJy4uLycpKSB7XG5cdC8vIFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvdXRwdXRQYXRoLCByZWxhdGl2ZVBhdGgsIHVybCk7XG5cdC8vIFx0fSBlbHNlIHtcblx0Ly8gXHRvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKHJlbGF0aXZlUGF0aCwgdXJsKTtcblx0Ly8gXHR9XG5cdC8vIH1cblx0bGV0IHB1YmxpY1BhdGggPSBgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyAke0pTT04uc3RyaW5naWZ5KG91dHB1dFBhdGgpfWA7XG5cblx0aWYgKG9wdGlvbnMucHVibGljUGF0aCkge1xuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5wdWJsaWNQYXRoID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoKHVybCk7XG5cdFx0fSBlbHNlIGlmIChvcHRpb25zLnB1YmxpY1BhdGguZW5kc1dpdGgoJy8nKSkge1xuXHRcdFx0cHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCArIHVybDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cHVibGljUGF0aCA9IGAke29wdGlvbnMucHVibGljUGF0aH0vJHt1cmx9YDtcblx0XHR9XG5cblx0XHRwdWJsaWNQYXRoID0gSlNPTi5zdHJpbmdpZnkocHVibGljUGF0aCk7XG5cdH1cblxuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZpbmVkXG5cdGlmIChvcHRpb25zLmVtaXRGaWxlID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5lbWl0RmlsZSkge1xuXHRcdHRoaXMuZW1pdEZpbGUob3V0cHV0UGF0aCwgY29udGVudCwgbnVsbCk7XG5cdH1cblxuXHQvLyBUT0RPIHJldmVydCB0byBFUzIwMTUgTW9kdWxlIGV4cG9ydCwgd2hlbiBuZXcgQ1NTIFBpcGVsaW5lIGlzIGluIHBsYWNlXG5cdGxvZy5pbmZvKCdyZXNvdXJjZSBVUkw6JywgcHVibGljUGF0aCk7XG5cdHJldHVybiBgbW9kdWxlLmV4cG9ydHMgPSAke3B1YmxpY1BhdGh9O2A7XG5cblxuXHQvLyB2YXIgZmlsZVBhdGggPSB0aGlzLnJlc291cmNlUGF0aDtcblx0Ly8gdmFyIGJyb3dzZXJQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGVQYXRoKTtcblx0Ly8gbGV0IG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChhcGkuY29uZmlnLmdldChbJ291dHB1dFBhdGhNYXAnLCBicm93c2VyUGFja2FnZS5sb25nTmFtZV0pLCAnLycpO1xuXG5cdC8vIGxldCBwYWNrYWdlRGlyO1xuXHQvLyBpZiAoYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoLnN0YXJ0c1dpdGgocHJvY2Vzcy5jd2QoKSkgfHwgcmVzb2x2ZVN5bWxpbmspIHtcblx0Ly8gXHRwYWNrYWdlRGlyID0gYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoO1xuXHQvLyBcdGZpbGVQYXRoID0gZnMucmVhbHBhdGhTeW5jKGZpbGVQYXRoKTtcblx0Ly8gfSBlbHNlIHtcblx0Ly8gXHRwYWNrYWdlRGlyID0gYnJvd3NlclBhY2thZ2UucGFja2FnZVBhdGg7XG5cdC8vIH1cblx0Ly8gb3V0cHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRQYXRoLCBwYXRoLmRpcm5hbWUocGF0aC5yZWxhdGl2ZShwYWNrYWdlRGlyLCBmaWxlUGF0aCkpKTtcblxuXHQvLyB1cmwgPSBwYXRoLmpvaW4ob3V0cHV0UGF0aCwgdXJsLnNwbGl0KCcvJykucG9wKCkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTsgLy8gb25seSBmaWxlIG5hbWUgcGFydFxuXHQvLyB1cmwgPSB1cmwucmVwbGFjZSgvKF58XFwvKW5vZGVfbW9kdWxlcyhcXC98JCkvZywgJyQxbi1tJDInKS5yZXBsYWNlKC9AL2csICdhJyk7XG5cblx0Ly8gdmFyIHB1YmxpY1BhdGggPSAnX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyAnICsgSlNPTi5zdHJpbmdpZnkodXJsKTtcblxuXHQvLyBpZiAob3B0aW9ucy5lbWl0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuZW1pdEZpbGUpIHtcblx0Ly8gXHR0aGlzLmVtaXRGaWxlKHVybCwgY29udGVudCwgc291cmNlTWFwKTtcblx0Ly8gfVxuXHQvLyBjYWxsYmFjayhudWxsLCAnbW9kdWxlLmV4cG9ydHMgPSAnICsgcHVibGljUGF0aCArICc7Jyk7XG59XG5cbm5hbWVzcGFjZSBsb2FkZXIge1xuXHRleHBvcnQgY29uc3QgcmF3ID0gdHJ1ZTtcbn1cbmV4cG9ydCA9IGxvYWRlcjtcblxuLyoqXG4gKiByZXR1cm4gcHJvcGVydCBwYXRocyBvZiBhIHJlc291cmNlIGZyb20gRFJDUCBwYWNrYWdlLCBpbmNsdWRpbmcgZW1pdCgpIHBhdGggYW5kIHNvdXJjZSBVUkxcbiAqIEBwYXJhbSB0aGlzIG51bGxcbiAqIEBwYXJhbSBsb2FkZXJDdHggV2VicGFjayBsb2FkZXIgY29udGV4dCBpbnN0YW5jZVxuICogQHJldHVybiBbPD4gLCA8ZW1pdCA+XVxuICovXG5mdW5jdGlvbiBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXM6IHVua25vd24sIGxvYWRlckN0eDogd2wuTG9hZGVyQ29udGV4dCkge1xuXHRpZiAocmVzb2x2ZVN5bWxpbmsgPT09IG51bGwpXG5cdFx0cmVzb2x2ZVN5bWxpbmsgPSBfLmdldCh0aGlzLCAnX2NvbXBpbGVyLm9wdGlvbnMucmVzb2x2ZS5zeW1saW5rcycpO1xuXHR2YXIgZGlyID0gbG9hZGVyQ3R4LmNvbnRleHQ7XG5cdHZhciBicm93c2VyUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShkaXIpO1xuXHRpZiAoYnJvd3NlclBhY2thZ2UpIHtcblx0XHRsZXQgb3V0RGlyID0gXy50cmltU3RhcnQoYXBpLmNvbmZpZy5nZXQoWydvdXRwdXRQYXRoTWFwJywgYnJvd3NlclBhY2thZ2UubG9uZ05hbWVdKSwgJy8nKTtcblx0XHRsZXQgc291cmNlUGtnRGlyID0gcmVzb2x2ZVN5bWxpbmsgPyBicm93c2VyUGFja2FnZS5yZWFsUGFja2FnZVBhdGggOiBicm93c2VyUGFja2FnZS5wYWNrYWdlUGF0aDtcblx0XHRsZXQgcmVsYXRpdmVJblBrZyA9IHBhdGgucmVsYXRpdmUoc291cmNlUGtnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRyZXR1cm4gb3V0RGlyICsgJy8nICsgcmVsYXRpdmVJblBrZztcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gcGF0aC5yZWxhdGl2ZShsb2FkZXJDdHgucm9vdENvbnRleHQsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cdFx0XHQucmVwbGFjZSgvXFwuXFwuL2csICdfJylcblx0XHRcdC5yZXBsYWNlKC8oXnxcXC8pbm9kZV9tb2R1bGVzKFxcL3wkKS9nLCAnJDF2ZW5kb3IkMicpXG5cdFx0XHQucmVwbGFjZSgvQC9nLCAnYV8nKTtcblx0fVxufVxuIl19
