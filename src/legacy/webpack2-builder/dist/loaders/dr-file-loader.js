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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=dr-file-loader.js.map
