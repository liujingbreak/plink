"use strict";
/**
 * Unlike file-loader, it loads assets resource from "DRCP" package relative directory, not from current
 * process.cwd() directory
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path = __importStar(require("path"));
const __api_1 = __importDefault(require("__api"));
const _ = __importStar(require("lodash"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const loaderUtils = __importStar(require("loader-utils"));
const fs_1 = __importDefault(require("fs"));
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
    var url = loaderUtils.interpolateName(this, typeof options.name === 'string' ? options.name : '[contenthash].[ext]', {
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
        else if (typeof options.publicPath === 'string' && options.publicPath.endsWith('/')) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHItZmlsZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkci1maWxlLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILDJDQUE2QjtBQUM3QixrREFBd0I7QUFDeEIsMENBQTRCO0FBQzVCLDBEQUE0QjtBQUc1QiwwREFBNEM7QUFDNUMsNENBQW9CO0FBQ3BCLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTNFLE1BQU0sYUFBYSxHQUFHLElBQUksbUJBQUcsQ0FBaUIsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0FBRXpFLFNBQVMsTUFBTSxDQUF5QixPQUF3QixFQUFFLFNBQXdCO0lBRXhGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDNUUsSUFBSSxJQUFJLENBQUMsU0FBUztRQUNoQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkIsK0JBQStCO0lBRS9CLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUUvRSxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUVqRCxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBQyxVQUFVLEVBQUUsS0FBSztRQUNqRCxlQUFlLEVBQUUsS0FBSztRQUN0QixJQUFJLEVBQUUsK0JBQStCO0tBQ3RDLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUNYLE9BQU8sQ0FBQyxPQUFPO1FBQ2YsSUFB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Q0QsSUFBSSxjQUFjLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWhELFFBQVE7SUFDUixHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksV0FBVyxxQkFBcUIsY0FBYyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBRW5HLElBQUksY0FBYyxFQUFFO1FBQ2xCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUYsSUFBSSxZQUFZLEdBQUcsY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUNsRCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sTUFBTSxHQUFHLEdBQUcsR0FBRyxhQUFhLENBQUM7S0FDckM7U0FBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ2pFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxZQUFZLENBQUM7YUFDbEQsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QjtBQUNILENBQUM7QUEvQkQsaUJBQVMsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbmxpa2UgZmlsZS1sb2FkZXIsIGl0IGxvYWRzIGFzc2V0cyByZXNvdXJjZSBmcm9tIFwiRFJDUFwiIHBhY2thZ2UgcmVsYXRpdmUgZGlyZWN0b3J5LCBub3QgZnJvbSBjdXJyZW50XG4gKiBwcm9jZXNzLmN3ZCgpIGRpcmVjdG9yeSBcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQge2xvYWRlciBhcyB3bH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgKiBhcyBsb2FkZXJVdGlscyBmcm9tICdsb2FkZXItdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbnZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5kci1maWxlLWxvYWRlcicpO1xuXG5jb25zdCByZWFscGF0aENhY2hlID0gbmV3IExSVTxzdHJpbmcsIHN0cmluZz4oe21heDogMTAwLCBtYXhBZ2U6IDMwMDAwfSk7XG5cbmZ1bmN0aW9uIGxvYWRlcih0aGlzOiB3bC5Mb2FkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCk6XG4gIHN0cmluZyB8IEJ1ZmZlciB8IHZvaWQgfCB1bmRlZmluZWQge1xuICBpZiAoIXRoaXMuZW1pdEZpbGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlIExvYWRlclxcblxcbmVtaXRGaWxlIGlzIHJlcXVpcmVkIGZyb20gbW9kdWxlIHN5c3RlbScpO1xuICBpZiAodGhpcy5jYWNoZWFibGUpXG4gICAgdGhpcy5jYWNoZWFibGUoKTtcbiAgLy8gdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXG4gIGlmICghdGhpcy5lbWl0RmlsZSkgdGhyb3cgbmV3IEVycm9yKCdlbWl0RmlsZSBpcyByZXF1aXJlZCBmcm9tIG1vZHVsZSBzeXN0ZW0nKTtcblxuICB2YXIgb3B0aW9ucyA9IGxvYWRlclV0aWxzLmdldE9wdGlvbnModGhpcykgfHwge307XG5cbiAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywge3B1YmxpY1BhdGg6IGZhbHNlLFxuICAgIHVzZVJlbGF0aXZlUGF0aDogZmFsc2UsXG4gICAgbmFtZTogJ1tuYW1lXS5bbWQ1Omhhc2g6aGV4OjhdLltleHRdJ1xuICB9KTtcblxuICBjb25zdCBjb250ZXh0ID1cbiAgICBvcHRpb25zLmNvbnRleHQgfHxcbiAgICB0aGlzLnJvb3RDb250ZXh0IHx8XG4gICAgKCh0aGlzIGFzIGFueSkub3B0aW9ucyAmJiAodGhpcyBhcyBhbnkpLm9wdGlvbnMuY29udGV4dCk7XG5cbiAgdmFyIHVybCA9IGxvYWRlclV0aWxzLmludGVycG9sYXRlTmFtZSh0aGlzLCB0eXBlb2Ygb3B0aW9ucy5uYW1lID09PSAnc3RyaW5nJyA/IG9wdGlvbnMubmFtZSA6ICdbY29udGVudGhhc2hdLltleHRdJywge1xuICAgIGNvbnRleHQsXG4gICAgY29udGVudCxcbiAgICByZWdFeHA6IG9wdGlvbnMucmVnRXhwXG4gIH0pO1xuXG4gIGxldCBvdXRwdXRQYXRoID0gdXJsO1xuICBpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dFBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG91dHB1dFBhdGggPSAob3B0aW9ucy5vdXRwdXRQYXRoIGFzIGFueSkodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0UGF0aCA9IHBhdGgucG9zaXguam9pbihvcHRpb25zLm91dHB1dFBhdGggYXMgc3RyaW5nLCB1cmwpO1xuICAgIH1cbiAgfVxuICBjb25zdCBkcmNwT3V0cHV0RGlyID0gZHJQYWNrYWdlT3V0cHV0UGF0aCh0aGlzKTtcbiAgb3V0cHV0UGF0aCA9IGRyY3BPdXRwdXREaXIgKyAnLycgKyBfLnRyaW1TdGFydChvdXRwdXRQYXRoLCAnLycpO1xuICBvdXRwdXRQYXRoID0gXy50cmltU3RhcnQob3V0cHV0UGF0aCwgJy8nKTtcblxuICBsZXQgcHVibGljUGF0aCA9IGBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyArICR7SlNPTi5zdHJpbmdpZnkob3V0cHV0UGF0aCl9YDtcblxuICBpZiAob3B0aW9ucy5wdWJsaWNQYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLnB1YmxpY1BhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHB1YmxpY1BhdGggPSAob3B0aW9ucy5wdWJsaWNQYXRoIGFzIGFueSkodXJsKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLnB1YmxpY1BhdGggPT09ICdzdHJpbmcnICYmIG9wdGlvbnMucHVibGljUGF0aC5lbmRzV2l0aCgnLycpKSB7XG4gICAgICBwdWJsaWNQYXRoID0gb3B0aW9ucy5wdWJsaWNQYXRoICsgdXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICBwdWJsaWNQYXRoID0gYCR7b3B0aW9ucy5wdWJsaWNQYXRofS8ke3VybH1gO1xuICAgIH1cblxuICAgIHB1YmxpY1BhdGggPSBKU09OLnN0cmluZ2lmeShwdWJsaWNQYXRoKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZmluZWRcbiAgaWYgKG9wdGlvbnMuZW1pdEZpbGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmVtaXRGaWxlKSB7XG4gICAgdGhpcy5lbWl0RmlsZShvdXRwdXRQYXRoLCBjb250ZW50LCBudWxsKTtcbiAgfVxuXG4gIC8vIFRPRE8gcmV2ZXJ0IHRvIEVTMjAxNSBNb2R1bGUgZXhwb3J0LCB3aGVuIG5ldyBDU1MgUGlwZWxpbmUgaXMgaW4gcGxhY2VcbiAgbG9nLmRlYnVnKCdyZXNvdXJjZSBVUkw6JywgcHVibGljUGF0aCk7XG4gIHJldHVybiBgbW9kdWxlLmV4cG9ydHMgPSAke3B1YmxpY1BhdGh9O2A7XG59XG5cbm5hbWVzcGFjZSBsb2FkZXIge1xuICBleHBvcnQgY29uc3QgcmF3ID0gdHJ1ZTtcbn1cbmV4cG9ydCA9IGxvYWRlcjtcblxuLyoqXG4gKiByZXR1cm4gcHJvcGVydCBwYXRocyBvZiBhIHJlc291cmNlIGZyb20gRFJDUCBwYWNrYWdlLCBpbmNsdWRpbmcgZW1pdCgpIHBhdGggYW5kIHNvdXJjZSBVUkxcbiAqIEBwYXJhbSB0aGlzIG51bGxcbiAqIEBwYXJhbSBsb2FkZXJDdHggV2VicGFjayBsb2FkZXIgY29udGV4dCBpbnN0YW5jZVxuICogQHJldHVybiBbPD4gLCA8ZW1pdCA+XVxuICovXG5mdW5jdGlvbiBkclBhY2thZ2VPdXRwdXRQYXRoKHRoaXM6IHVua25vd24sIGxvYWRlckN0eDogd2wuTG9hZGVyQ29udGV4dCkge1xuICBjb25zdCBkaXIgPSBsb2FkZXJDdHguY29udGV4dDtcbiAgbGV0IHJlYWxwYXRoRGlyID0gcmVhbHBhdGhDYWNoZS5nZXQoZGlyKTtcbiAgaWYgKCFyZWFscGF0aERpcikge1xuICAgIHJlYWxwYXRoRGlyID0gZnMucmVhbHBhdGhTeW5jKGRpcik7XG4gICAgcmVhbHBhdGhDYWNoZS5zZXQoZGlyLCByZWFscGF0aERpcik7XG4gIH1cbiAgdmFyIGJyb3dzZXJQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGRpcik7XG5cbiAgLy8gZGVidWdcbiAgbG9nLmRlYnVnKGBjb250ZXh0OiAke3JlYWxwYXRoRGlyfSwgYnJvd3NlclBhY2thZ2U6ICR7YnJvd3NlclBhY2thZ2UgJiYgYnJvd3NlclBhY2thZ2UubG9uZ05hbWV9YCk7XG5cbiAgaWYgKGJyb3dzZXJQYWNrYWdlKSB7XG4gICAgbGV0IG91dERpciA9IF8udHJpbVN0YXJ0KGFwaS5jb25maWcuZ2V0KFsnb3V0cHV0UGF0aE1hcCcsIGJyb3dzZXJQYWNrYWdlLmxvbmdOYW1lXSksICcvJyk7XG4gICAgbGV0IHNvdXJjZVBrZ0RpciA9IGJyb3dzZXJQYWNrYWdlLnJlYWxQYWNrYWdlUGF0aDtcbiAgICBsZXQgcmVsYXRpdmVJblBrZyA9IHBhdGgucmVsYXRpdmUoc291cmNlUGtnRGlyLCByZWFscGF0aERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHJldHVybiBvdXREaXIgKyAnLycgKyByZWxhdGl2ZUluUGtnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGxvYWRlckN0eC5yb290Q29udGV4dCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC5yZXBsYWNlKC9cXC5cXC4vZywgJ18nKVxuICAgICAgLnJlcGxhY2UoLyhefFxcLylub2RlX21vZHVsZXMoXFwvfCQpL2csICckMXZlbmRvciQyJylcbiAgICAgIC5yZXBsYWNlKC9AL2csICdhXycpO1xuICB9XG59XG4iXX0=