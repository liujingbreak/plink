"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIssuerNotAngular = exports.isIssuerAngular = exports.styleLoaders = exports.cssAutoPrefixSetting = void 0;
const __api_1 = __importDefault(require("__api"));
const Path = __importStar(require("path"));
// import * as log4js from 'log4js';
// const log = log4js.getLogger(api.packageName);
const devMode = __api_1.default.config().devMode;
const cssAutoPrefixSetting = {
    browsers: [
        'ie >= 8',
        'ff >= 30',
        'chrome >= 34',
        'safari >= 7',
        'ios >= 7',
        'android >= 4.0'
    ]
};
exports.cssAutoPrefixSetting = cssAutoPrefixSetting;
const styleLoaders = {
    css: getStyleLoaders('css'),
    less: getStyleLoaders('less'),
    scss: getStyleLoaders('scss')
};
exports.styleLoaders = styleLoaders;
function getStyleLoaders(type) {
    const loaders = [
        { loader: 'css-loader', options: {
                minimize: !devMode,
                sourceMap: __api_1.default.config().enableSourceMaps
            } },
        {
            loader: 'autoprefixer-loader',
            options: cssAutoPrefixSetting
        },
        { loader: 'lib/css-scope-loader' },
        { loader: 'lib/css-url-assets-loader' }
    ];
    switch (type) {
        case 'less':
            loaders.push({ loader: 'less-loader', options: {
                    sourceMap: __api_1.default.config().enableSourceMaps
                } });
            break;
        case 'scss':
            loaders.push({ loader: 'sass-loader', options: {
                    sourceMap: __api_1.default.config().enableSourceMaps
                } });
            break;
        default:
            break;
    }
    loaders.push({ loader: 'require-injector/css-loader', options: {
            injector: __api_1.default.browserInjector
        } });
    return loaders;
}
function isIssuerAngular(file) {
    const component = __api_1.default.findPackageByFile(file);
    if (!(component && component.dr && component.dr.angularCompiler))
        return false;
    const relPath = Path.relative(component.realPackagePath, file);
    return !/^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
}
exports.isIssuerAngular = isIssuerAngular;
function isIssuerNotAngular(file) {
    const component = __api_1.default.findPackageByFile(file);
    if ((component && component.dr && component.dr.angularCompiler)) {
        const relPath = Path.relative(component.realPackagePath, file);
        return /^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
    }
    else
        return true;
}
exports.isIssuerNotAngular = isIssuerNotAngular;

//# sourceMappingURL=webpack-options-helper.js.map
