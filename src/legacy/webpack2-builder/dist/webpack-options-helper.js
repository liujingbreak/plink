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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2xlZ2FjeS93ZWJwYWNrMi1idWlsZGVyL3RzL3dlYnBhY2stb3B0aW9ucy1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUF3QjtBQUN4QiwyQ0FBNkI7QUFDN0Isb0NBQW9DO0FBQ3BDLGlEQUFpRDtBQUVqRCxNQUFNLE9BQU8sR0FBWSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDO0FBRTlDLE1BQU0sb0JBQW9CLEdBQUc7SUFDM0IsUUFBUSxFQUFFO1FBQ1IsU0FBUztRQUNULFVBQVU7UUFDVixjQUFjO1FBQ2QsYUFBYTtRQUNiLFVBQVU7UUFDVixnQkFBZ0I7S0FDakI7Q0FDRixDQUFDO0FBT00sb0RBQW9CO0FBTDVCLE1BQU0sWUFBWSxHQUFHO0lBQ25CLEdBQUcsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDO0lBQzNCLElBQUksRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDO0lBQzdCLElBQUksRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDO0NBQzlCLENBQUM7QUFDNEIsb0NBQVk7QUFFMUMsU0FBUyxlQUFlLENBQUMsSUFBWTtJQUNuQyxNQUFNLE9BQU8sR0FBVTtRQUNyQixFQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFO2dCQUM5QixRQUFRLEVBQUUsQ0FBQyxPQUFPO2dCQUNsQixTQUFTLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGdCQUFnQjthQUN6QyxFQUFDO1FBQ0Y7WUFDRSxNQUFNLEVBQUUscUJBQXFCO1lBQzdCLE9BQU8sRUFBRSxvQkFBb0I7U0FDOUI7UUFDRCxFQUFDLE1BQU0sRUFBRSxzQkFBc0IsRUFBQztRQUNoQyxFQUFDLE1BQU0sRUFBRSwyQkFBMkIsRUFBQztLQUN0QyxDQUFDO0lBRUYsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLE1BQU07WUFDVCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUU7b0JBQzVDLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2lCQUN6QyxFQUFDLENBQUMsQ0FBQztZQUNKLE1BQU07UUFDUixLQUFLLE1BQU07WUFDVCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUU7b0JBQzVDLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2lCQUN6QyxFQUFDLENBQUMsQ0FBQztZQUNKLE1BQU07UUFDUjtZQUNFLE1BQU07S0FDVDtJQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFO1lBQzVELFFBQVEsRUFBRSxlQUFHLENBQUMsZUFBZTtTQUM5QixFQUFDLENBQUMsQ0FBQztJQUNKLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBWTtJQUMxQyxNQUFNLFNBQVMsR0FBRyxlQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUMsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDOUQsT0FBTyxLQUFLLENBQUM7SUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0QsT0FBTyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBTkQsMENBTUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxJQUFZO0lBQzdDLE1BQU0sU0FBUyxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRTtRQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0QsT0FBTyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDL0M7O1FBQ0MsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQVBELGdEQU9DIiwiZmlsZSI6ImxlZ2FjeS93ZWJwYWNrMi1idWlsZGVyL2Rpc3Qvd2VicGFjay1vcHRpb25zLWhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
