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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xvYWRlcnMvZHItZmlsZS1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCxtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUk1QixrRUFBNEM7QUFDNUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFDM0UsSUFBSSxjQUFjLEdBQW1CLElBQUksQ0FBQztBQUUxQyxTQUFTLE1BQU0sQ0FBeUIsT0FBd0IsRUFBRSxTQUF3QjtJQUV4RixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0lBQzVFLElBQUksY0FBYyxLQUFLLElBQUk7UUFDekIsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7SUFDckUsSUFBSSxJQUFJLENBQUMsU0FBUztRQUNoQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkIsK0JBQStCO0lBRS9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUUvRSxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUVqRCxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBQyxVQUFVLEVBQUUsS0FBSztRQUNqRCxlQUFlLEVBQUUsS0FBSztRQUN0QixJQUFJLEVBQUUsK0JBQStCO0tBQ3RDLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUNYLE9BQU8sQ0FBQyxPQUFPO1FBQ2YsSUFBSSxDQUFDLFdBQVc7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QUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEI7QUFDSCxDQUFDO0FBeEJELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVubGlrZSBmaWxlLWxvYWRlciwgaXQgbG9hZHMgYXNzZXRzIHJlc291cmNlIGZyb20gXCJEUkNQXCIgcGFja2FnZSByZWxhdGl2ZSBkaXJlY3RvcnksIG5vdCBmcm9tIGN1cnJlbnRcbiAqIHByb2Nlc3MuY3dkKCkgZGlyZWN0b3J5IFxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9hZGVyIGFzIHdsfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCAqIGFzIGxvYWRlclV0aWxzIGZyb20gJ2xvYWRlci11dGlscyc7XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZHItZmlsZS1sb2FkZXInKTtcbmxldCByZXNvbHZlU3ltbGluazogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuXG5mdW5jdGlvbiBsb2FkZXIodGhpczogd2wuTG9hZGVyQ29udGV4dCwgY29udGVudDogc3RyaW5nIHwgQnVmZmVyLCBzb3VyY2VNYXA/OiBSYXdTb3VyY2VNYXApOlxuICBzdHJpbmcgfCBCdWZmZXIgfCB2b2lkIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF0aGlzLmVtaXRGaWxlKVxuICAgIHRocm93IG5ldyBFcnJvcignRmlsZSBMb2FkZXJcXG5cXG5lbWl0RmlsZSBpcyByZXF1aXJlZCBmcm9tIG1vZHVsZSBzeXN0ZW0nKTtcbiAgaWYgKHJlc29sdmVTeW1saW5rID09PSBudWxsKVxuICAgIHJlc29sdmVTeW1saW5rID0gXy5nZXQodGhpcywgJ19jb21waWxlci5vcHRpb25zLnJlc29sdmUuc3ltbGlua3MnKTtcbiAgaWYgKHRoaXMuY2FjaGVhYmxlKVxuICAgIHRoaXMuY2FjaGVhYmxlKCk7XG4gIC8vIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcblxuICBpZiAoIXRoaXMuZW1pdEZpbGUpIHRocm93IG5ldyBFcnJvcignZW1pdEZpbGUgaXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgc3lzdGVtJyk7XG5cbiAgdmFyIG9wdGlvbnMgPSBsb2FkZXJVdGlscy5nZXRPcHRpb25zKHRoaXMpIHx8IHt9O1xuXG4gIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtwdWJsaWNQYXRoOiBmYWxzZSxcbiAgICB1c2VSZWxhdGl2ZVBhdGg6IGZhbHNlLFxuICAgIG5hbWU6ICdbbmFtZV0uW21kNTpoYXNoOmhleDo4XS5bZXh0XSdcbiAgfSk7XG5cbiAgY29uc3QgY29udGV4dCA9XG4gICAgb3B0aW9ucy5jb250ZXh0IHx8XG4gICAgdGhpcy5yb290Q29udGV4dCB8fFxuICAgICgodGhpcyBhcyBhbnkpLm9wdGlvbnMgJiYgKHRoaXMgYXMgYW55KS5vcHRpb25zLmNvbnRleHQpO1xuXG4gIHZhciB1cmwgPSBsb2FkZXJVdGlscy5pbnRlcnBvbGF0ZU5hbWUodGhpcywgb3B0aW9ucy5uYW1lLCB7XG4gICAgY29udGV4dCxcbiAgICBjb250ZW50LFxuICAgIHJlZ0V4cDogb3B0aW9ucy5yZWdFeHBcbiAgfSk7XG5cbiAgbGV0IG91dHB1dFBhdGggPSB1cmw7XG4gIGlmIChvcHRpb25zLm91dHB1dFBhdGgpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0UGF0aCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgb3V0cHV0UGF0aCA9IG9wdGlvbnMub3V0cHV0UGF0aCh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKG9wdGlvbnMub3V0cHV0UGF0aCwgdXJsKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgZHJjcE91dHB1dERpciA9IGRyUGFja2FnZU91dHB1dFBhdGgodGhpcyk7XG4gIG91dHB1dFBhdGggPSBkcmNwT3V0cHV0RGlyICsgJy8nICsgXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcbiAgb3V0cHV0UGF0aCA9IF8udHJpbVN0YXJ0KG91dHB1dFBhdGgsICcvJyk7XG4gIC8vIGNvbnNvbGUubG9nKGRyUGFja2FnZU91dHB1dFBhdGgodGhpcykpO1xuICAvLyAtLS0tLS0tIERSQ1A6IG5vdCBzdXBwb3J0aW5nIHVzZVJlbGF0aXZlUGF0aCAtLS0tLS0tLVxuICAvLyBpZiAob3B0aW9ucy51c2VSZWxhdGl2ZVBhdGgpIHtcbiAgLy8gXHRjb25zdCBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VQYXRoO1xuXG4gIC8vIFx0Y29uc3QgaXNzdWVyID0gb3B0aW9ucy5jb250ZXh0XG4gIC8vIFx0PyBjb250ZXh0XG4gIC8vIFx0OiB0aGlzLl9tb2R1bGUgJiYgdGhpcy5fbW9kdWxlLmlzc3VlciAmJiB0aGlzLl9tb2R1bGUuaXNzdWVyLmNvbnRleHQ7XG5cbiAgLy8gXHRjb25zdCByZWxhdGl2ZVVybCA9XG4gIC8vIFx0aXNzdWVyICYmXG4gIC8vIFx0cGF0aFxuICAvLyBcdFx0LnJlbGF0aXZlKGlzc3VlciwgZmlsZVBhdGgpXG4gIC8vIFx0XHQuc3BsaXQocGF0aC5zZXApXG4gIC8vIFx0XHQuam9pbignLycpO1xuXG4gIC8vIFx0Y29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmVVcmwgJiYgYCR7cGF0aC5kaXJuYW1lKHJlbGF0aXZlVXJsKX0vYDtcbiAgLy8gXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuICAvLyBcdGlmICh+cmVsYXRpdmVQYXRoLmluZGV4T2YoJy4uLycpKSB7XG4gIC8vIFx0b3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvdXRwdXRQYXRoLCByZWxhdGl2ZVBhdGgsIHVybCk7XG4gIC8vIFx0fSBlbHNlIHtcbiAgLy8gXHRvdXRwdXRQYXRoID0gcGF0aC5wb3NpeC5qb2luKHJlbGF0aXZlUGF0aCwgdXJsKTtcbiAgLy8gXHR9XG4gIC8vIH1cbiAgbGV0IHB1YmxpY1BhdGggPSBgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gKyAke0pTT04uc3RyaW5naWZ5KG91dHB1dFBhdGgpfWA7XG5cbiAgaWYgKG9wdGlvbnMucHVibGljUGF0aCkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5wdWJsaWNQYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoKHVybCk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLnB1YmxpY1BhdGguZW5kc1dpdGgoJy8nKSkge1xuICAgICAgcHVibGljUGF0aCA9IG9wdGlvbnMucHVibGljUGF0aCArIHVybDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHVibGljUGF0aCA9IGAke29wdGlvbnMucHVibGljUGF0aH0vJHt1cmx9YDtcbiAgICB9XG5cbiAgICBwdWJsaWNQYXRoID0gSlNPTi5zdHJpbmdpZnkocHVibGljUGF0aCk7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZpbmVkXG4gIGlmIChvcHRpb25zLmVtaXRGaWxlID09PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5lbWl0RmlsZSkge1xuICAgIHRoaXMuZW1pdEZpbGUob3V0cHV0UGF0aCwgY29udGVudCwgbnVsbCk7XG4gIH1cblxuICAvLyBUT0RPIHJldmVydCB0byBFUzIwMTUgTW9kdWxlIGV4cG9ydCwgd2hlbiBuZXcgQ1NTIFBpcGVsaW5lIGlzIGluIHBsYWNlXG4gIGxvZy5kZWJ1ZygncmVzb3VyY2UgVVJMOicsIHB1YmxpY1BhdGgpO1xuICByZXR1cm4gYG1vZHVsZS5leHBvcnRzID0gJHtwdWJsaWNQYXRofTtgO1xuXG5cbiAgLy8gdmFyIGZpbGVQYXRoID0gdGhpcy5yZXNvdXJjZVBhdGg7XG4gIC8vIHZhciBicm93c2VyUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlUGF0aCk7XG4gIC8vIGxldCBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQoYXBpLmNvbmZpZy5nZXQoWydvdXRwdXRQYXRoTWFwJywgYnJvd3NlclBhY2thZ2UubG9uZ05hbWVdKSwgJy8nKTtcblxuICAvLyBsZXQgcGFja2FnZURpcjtcbiAgLy8gaWYgKGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aC5zdGFydHNXaXRoKHByb2Nlc3MuY3dkKCkpIHx8IHJlc29sdmVTeW1saW5rKSB7XG4gIC8vIFx0cGFja2FnZURpciA9IGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aDtcbiAgLy8gXHRmaWxlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhmaWxlUGF0aCk7XG4gIC8vIH0gZWxzZSB7XG4gIC8vIFx0cGFja2FnZURpciA9IGJyb3dzZXJQYWNrYWdlLnBhY2thZ2VQYXRoO1xuICAvLyB9XG4gIC8vIG91dHB1dFBhdGggPSBwYXRoLmpvaW4ob3V0cHV0UGF0aCwgcGF0aC5kaXJuYW1lKHBhdGgucmVsYXRpdmUocGFja2FnZURpciwgZmlsZVBhdGgpKSk7XG5cbiAgLy8gdXJsID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIHVybC5zcGxpdCgnLycpLnBvcCgpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7IC8vIG9ubHkgZmlsZSBuYW1lIHBhcnRcbiAgLy8gdXJsID0gdXJsLnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMW4tbSQyJykucmVwbGFjZSgvQC9nLCAnYScpO1xuXG4gIC8vIHZhciBwdWJsaWNQYXRoID0gJ19fd2VicGFja19wdWJsaWNfcGF0aF9fICsgJyArIEpTT04uc3RyaW5naWZ5KHVybCk7XG5cbiAgLy8gaWYgKG9wdGlvbnMuZW1pdEZpbGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmVtaXRGaWxlKSB7XG4gIC8vIFx0dGhpcy5lbWl0RmlsZSh1cmwsIGNvbnRlbnQsIHNvdXJjZU1hcCk7XG4gIC8vIH1cbiAgLy8gY2FsbGJhY2sobnVsbCwgJ21vZHVsZS5leHBvcnRzID0gJyArIHB1YmxpY1BhdGggKyAnOycpO1xufVxuXG5uYW1lc3BhY2UgbG9hZGVyIHtcbiAgZXhwb3J0IGNvbnN0IHJhdyA9IHRydWU7XG59XG5leHBvcnQgPSBsb2FkZXI7XG5cbi8qKlxuICogcmV0dXJuIHByb3BlcnQgcGF0aHMgb2YgYSByZXNvdXJjZSBmcm9tIERSQ1AgcGFja2FnZSwgaW5jbHVkaW5nIGVtaXQoKSBwYXRoIGFuZCBzb3VyY2UgVVJMXG4gKiBAcGFyYW0gdGhpcyBudWxsXG4gKiBAcGFyYW0gbG9hZGVyQ3R4IFdlYnBhY2sgbG9hZGVyIGNvbnRleHQgaW5zdGFuY2VcbiAqIEByZXR1cm4gWzw+ICwgPGVtaXQgPl1cbiAqL1xuZnVuY3Rpb24gZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzOiB1bmtub3duLCBsb2FkZXJDdHg6IHdsLkxvYWRlckNvbnRleHQpIHtcbiAgaWYgKHJlc29sdmVTeW1saW5rID09PSBudWxsKVxuICAgIHJlc29sdmVTeW1saW5rID0gXy5nZXQodGhpcywgJ19jb21waWxlci5vcHRpb25zLnJlc29sdmUuc3ltbGlua3MnKTtcbiAgdmFyIGRpciA9IGxvYWRlckN0eC5jb250ZXh0O1xuICB2YXIgYnJvd3NlclBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZGlyKTtcbiAgaWYgKGJyb3dzZXJQYWNrYWdlKSB7XG4gICAgbGV0IG91dERpciA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG4gICAgbGV0IHNvdXJjZVBrZ0RpciA9IHJlc29sdmVTeW1saW5rID8gYnJvd3NlclBhY2thZ2UucmVhbFBhY2thZ2VQYXRoIDogYnJvd3NlclBhY2thZ2UucGFja2FnZVBhdGg7XG4gICAgbGV0IHJlbGF0aXZlSW5Qa2cgPSBwYXRoLnJlbGF0aXZlKHNvdXJjZVBrZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcmV0dXJuIG91dERpciArICcvJyArIHJlbGF0aXZlSW5Qa2c7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUobG9hZGVyQ3R4LnJvb3RDb250ZXh0LCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLnJlcGxhY2UoL1xcLlxcLi9nLCAnXycpXG4gICAgICAucmVwbGFjZSgvKF58XFwvKW5vZGVfbW9kdWxlcyhcXC98JCkvZywgJyQxdmVuZG9yJDInKVxuICAgICAgLnJlcGxhY2UoL0AvZywgJ2FfJyk7XG4gIH1cbn1cbiJdfQ==
