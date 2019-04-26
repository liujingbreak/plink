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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQVksSUFBSSxDQUFDO0FBRW5DLFNBQVMsTUFBTSxDQUF5QixPQUF3QixFQUFFLFNBQXdCO0lBRXpGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDM0UsSUFBSSxjQUFjLEtBQUssSUFBSTtRQUMxQixjQUFjLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUNwRSxJQUFJLElBQUksQ0FBQyxTQUFTO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRWpELE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ2xELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSwrQkFBK0I7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQ1osT0FBTyxDQUFDLE9BQU87UUFDZixJQUFJLENBQUMsV0FBVztR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QUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN0QjtBQUNGLENBQUM7QUF4QkQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5saWtlIGZpbGUtbG9hZGVyLCBpdCBsb2FkcyBhc3NldHMgcmVzb3VyY2UgZnJvbSBcIkRSQ1BcIiBwYWNrYWdlIHJlbGF0aXZlIGRpcmVjdG9yeSwgbm90IGZyb20gY3VycmVudFxuICogcHJvY2Vzcy5jd2QoKSBkaXJlY3RvcnkgXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2x9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgbG9hZGVyVXRpbHMgZnJvbSAnbG9hZGVyLXV0aWxzJztcbnZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kci1maWxlLWxvYWRlcicpO1xubGV0IHJlc29sdmVTeW1saW5rOiBib29sZWFuID0gbnVsbDtcblxuZnVuY3Rpb24gbG9hZGVyKHRoaXM6IHdsLkxvYWRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKTpcblx0c3RyaW5nIHwgQnVmZmVyIHwgdm9pZCB8IHVuZGVmaW5lZCB7XG5cdGlmICghdGhpcy5lbWl0RmlsZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgTG9hZGVyXFxuXFxuZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG5cdGlmIChyZXNvbHZlU3ltbGluayA9PT0gbnVsbClcblx0XHRyZXNvbHZlU3ltbGluayA9IF8uZ2V0KHRoaXMsICdfY29tcGlsZXIub3B0aW9ucy5yZXNvbHZlLnN5bWxpbmtzJyk7XG5cdGlmICh0aGlzLmNhY2hlYWJsZSlcblx0XHR0aGlzLmNhY2hlYWJsZSgpO1xuXHQvLyB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cblx0aWYgKCF0aGlzLmVtaXRGaWxlKSB0aHJvdyBuZXcgRXJyb3IoJ2VtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuXG5cdHZhciBvcHRpb25zID0gbG9hZGVyVXRpbHMuZ2V0T3B0aW9ucyh0aGlzKSB8fCB7fTtcblxuXHRvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7cHVibGljUGF0aDogZmFsc2UsXG5cdFx0dXNlUmVsYXRpdmVQYXRoOiBmYWxzZSxcblx0XHRuYW1lOiAnW25hbWVdLlttZDU6aGFzaDpoZXg6OF0uW2V4dF0nXG5cdH0pO1xuXG5cdGNvbnN0IGNvbnRleHQgPVxuXHRcdG9wdGlvbnMuY29udGV4dCB8fFxuXHRcdHRoaXMucm9vdENvbnRleHQgfHxcblx0XHQoKHRoaXMgYXMgYW55KS5vcHRpb25zICYmICh0aGlzIGFzIGFueSkub3B0aW9ucy5jb250ZXh0KTtcblxuXHR2YXIgdXJsID0gbG9hZGVyVXRpbHMuaW50ZXJwb2xhdGVOYW1lKHRoaXMsIG9wdGlvbnMubmFtZSwge1xuXHRcdGNvbnRleHQsXG5cdFx0Y29udGVudCxcblx0XHRyZWdFeHA6IG9wdGlvbnMucmVnRXhwXG5cdH0pO1xuXG5cdGxldCBvdXRwdXRQYXRoID0gdXJsO1xuXHRpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dFBhdGggPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdG91dHB1dFBhdGggPSBvcHRpb25zLm91dHB1dFBhdGgodXJsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvcHRpb25zLm91dHB1dFBhdGgsIHVybCk7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IGRyY3BPdXRwdXREaXIgPSBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpO1xuXHRvdXRwdXRQYXRoID0gZHJjcE91dHB1dERpciArICcvJyArIF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG5cdG91dHB1dFBhdGggPSBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuXHQvLyBjb25zb2xlLmxvZyhkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXMpKTtcblx0Ly8gLS0tLS0tLSBEUkNQOiBub3Qgc3VwcG9ydGluZyB1c2VSZWxhdGl2ZVBhdGggLS0tLS0tLS1cblx0Ly8gaWYgKG9wdGlvbnMudXNlUmVsYXRpdmVQYXRoKSB7XG5cdC8vIFx0Y29uc3QgZmlsZVBhdGggPSB0aGlzLnJlc291cmNlUGF0aDtcblxuXHQvLyBcdGNvbnN0IGlzc3VlciA9IG9wdGlvbnMuY29udGV4dFxuXHQvLyBcdD8gY29udGV4dFxuXHQvLyBcdDogdGhpcy5fbW9kdWxlICYmIHRoaXMuX21vZHVsZS5pc3N1ZXIgJiYgdGhpcy5fbW9kdWxlLmlzc3Vlci5jb250ZXh0O1xuXG5cdC8vIFx0Y29uc3QgcmVsYXRpdmVVcmwgPVxuXHQvLyBcdGlzc3VlciAmJlxuXHQvLyBcdHBhdGhcblx0Ly8gXHRcdC5yZWxhdGl2ZShpc3N1ZXIsIGZpbGVQYXRoKVxuXHQvLyBcdFx0LnNwbGl0KHBhdGguc2VwKVxuXHQvLyBcdFx0LmpvaW4oJy8nKTtcblxuXHQvLyBcdGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlVXJsICYmIGAke3BhdGguZGlybmFtZShyZWxhdGl2ZVVybCl9L2A7XG5cdC8vIFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWJpdHdpc2Vcblx0Ly8gXHRpZiAofnJlbGF0aXZlUGF0aC5pbmRleE9mKCcuLi8nKSkge1xuXHQvLyBcdG91dHB1dFBhdGggPSBwYXRoLnBvc2l4LmpvaW4ob3V0cHV0UGF0aCwgcmVsYXRpdmVQYXRoLCB1cmwpO1xuXHQvLyBcdH0gZWxzZSB7XG5cdC8vIFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihyZWxhdGl2ZVBhdGgsIHVybCk7XG5cdC8vIFx0fVxuXHQvLyB9XG5cdGxldCBwdWJsaWNQYXRoID0gYF9fd2VicGFja19wdWJsaWNfcGF0aF9fICsgJHtKU09OLnN0cmluZ2lmeShvdXRwdXRQYXRoKX1gO1xuXG5cdGlmIChvcHRpb25zLnB1YmxpY1BhdGgpIHtcblx0XHRpZiAodHlwZW9mIG9wdGlvbnMucHVibGljUGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCh1cmwpO1xuXHRcdH0gZWxzZSBpZiAob3B0aW9ucy5wdWJsaWNQYXRoLmVuZHNXaXRoKCcvJykpIHtcblx0XHRcdHB1YmxpY1BhdGggPSBvcHRpb25zLnB1YmxpY1BhdGggKyB1cmw7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHB1YmxpY1BhdGggPSBgJHtvcHRpb25zLnB1YmxpY1BhdGh9LyR7dXJsfWA7XG5cdFx0fVxuXG5cdFx0cHVibGljUGF0aCA9IEpTT04uc3RyaW5naWZ5KHB1YmxpY1BhdGgpO1xuXHR9XG5cblx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmaW5lZFxuXHRpZiAob3B0aW9ucy5lbWl0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMuZW1pdEZpbGUpIHtcblx0XHR0aGlzLmVtaXRGaWxlKG91dHB1dFBhdGgsIGNvbnRlbnQsIG51bGwpO1xuXHR9XG5cblx0Ly8gVE9ETyByZXZlcnQgdG8gRVMyMDE1IE1vZHVsZSBleHBvcnQsIHdoZW4gbmV3IENTUyBQaXBlbGluZSBpcyBpbiBwbGFjZVxuXHRsb2cuaW5mbygncmVzb3VyY2UgVVJMOicsIHB1YmxpY1BhdGgpO1xuXHRyZXR1cm4gYG1vZHVsZS5leHBvcnRzID0gJHtwdWJsaWNQYXRofTtgO1xuXG5cblx0Ly8gdmFyIGZpbGVQYXRoID0gdGhpcy5yZXNvdXJjZVBhdGg7XG5cdC8vIHZhciBicm93c2VyUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlUGF0aCk7XG5cdC8vIGxldCBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQoYXBpLmNvbmZpZy5nZXQoWydvdXRwdXRQYXRoTWFwJywgYnJvd3NlclBhY2thZ2UubG9uZ05hbWVdKSwgJy8nKTtcblxuXHQvLyBsZXQgcGFja2FnZURpcjtcblx0Ly8gaWYgKGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aC5zdGFydHNXaXRoKHByb2Nlc3MuY3dkKCkpIHx8IHJlc29sdmVTeW1saW5rKSB7XG5cdC8vIFx0cGFja2FnZURpciA9IGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aDtcblx0Ly8gXHRmaWxlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhmaWxlUGF0aCk7XG5cdC8vIH0gZWxzZSB7XG5cdC8vIFx0cGFja2FnZURpciA9IGJyb3dzZXJQYWNrYWdlLnBhY2thZ2VQYXRoO1xuXHQvLyB9XG5cdC8vIG91dHB1dFBhdGggPSBwYXRoLmpvaW4ob3V0cHV0UGF0aCwgcGF0aC5kaXJuYW1lKHBhdGgucmVsYXRpdmUocGFja2FnZURpciwgZmlsZVBhdGgpKSk7XG5cblx0Ly8gdXJsID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIHVybC5zcGxpdCgnLycpLnBvcCgpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7IC8vIG9ubHkgZmlsZSBuYW1lIHBhcnRcblx0Ly8gdXJsID0gdXJsLnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMW4tbSQyJykucmVwbGFjZSgvQC9nLCAnYScpO1xuXG5cdC8vIHZhciBwdWJsaWNQYXRoID0gJ19fd2VicGFja19wdWJsaWNfcGF0aF9fICsgJyArIEpTT04uc3RyaW5naWZ5KHVybCk7XG5cblx0Ly8gaWYgKG9wdGlvbnMuZW1pdEZpbGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmVtaXRGaWxlKSB7XG5cdC8vIFx0dGhpcy5lbWl0RmlsZSh1cmwsIGNvbnRlbnQsIHNvdXJjZU1hcCk7XG5cdC8vIH1cblx0Ly8gY2FsbGJhY2sobnVsbCwgJ21vZHVsZS5leHBvcnRzID0gJyArIHB1YmxpY1BhdGggKyAnOycpO1xufVxuXG5uYW1lc3BhY2UgbG9hZGVyIHtcblx0ZXhwb3J0IGNvbnN0IHJhdyA9IHRydWU7XG59XG5leHBvcnQgPSBsb2FkZXI7XG5cbi8qKlxuICogcmV0dXJuIHByb3BlcnQgcGF0aHMgb2YgYSByZXNvdXJjZSBmcm9tIERSQ1AgcGFja2FnZSwgaW5jbHVkaW5nIGVtaXQoKSBwYXRoIGFuZCBzb3VyY2UgVVJMXG4gKiBAcGFyYW0gdGhpcyBudWxsXG4gKiBAcGFyYW0gbG9hZGVyQ3R4IFdlYnBhY2sgbG9hZGVyIGNvbnRleHQgaW5zdGFuY2VcbiAqIEByZXR1cm4gWzw+ICwgPGVtaXQgPl1cbiAqL1xuZnVuY3Rpb24gZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzOiB1bmtub3duLCBsb2FkZXJDdHg6IHdsLkxvYWRlckNvbnRleHQpIHtcblx0aWYgKHJlc29sdmVTeW1saW5rID09PSBudWxsKVxuXHRcdHJlc29sdmVTeW1saW5rID0gXy5nZXQodGhpcywgJ19jb21waWxlci5vcHRpb25zLnJlc29sdmUuc3ltbGlua3MnKTtcblx0dmFyIGRpciA9IGxvYWRlckN0eC5jb250ZXh0O1xuXHR2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZGlyKTtcblx0aWYgKGJyb3dzZXJQYWNrYWdlKSB7XG5cdFx0bGV0IG91dERpciA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG5cdFx0bGV0IHNvdXJjZVBrZ0RpciA9IHJlc29sdmVTeW1saW5rID8gYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoIDogYnJvd3NlclBhY2thZ2UucGFja2FnZVBhdGg7XG5cdFx0bGV0IHJlbGF0aXZlSW5Qa2cgPSBwYXRoLnJlbGF0aXZlKHNvdXJjZVBrZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cmV0dXJuIG91dERpciArICcvJyArIHJlbGF0aXZlSW5Qa2c7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHBhdGgucmVsYXRpdmUobG9hZGVyQ3R4LnJvb3RDb250ZXh0LCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuXHRcdFx0LnJlcGxhY2UoL1xcLlxcLi9nLCAnXycpXG5cdFx0XHQucmVwbGFjZSgvKF58XFwvKW5vZGVfbW9kdWxlcyhcXC98JCkvZywgJyQxdmVuZG9yJDInKVxuXHRcdFx0LnJlcGxhY2UoL0AvZywgJ2FfJyk7XG5cdH1cbn1cbiJdfQ==
