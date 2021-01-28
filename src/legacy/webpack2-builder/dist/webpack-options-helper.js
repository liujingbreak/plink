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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
    if (component == null)
        return false;
    const relPath = Path.relative(component.realPath, file);
    return !/^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
}
exports.isIssuerAngular = isIssuerAngular;
function isIssuerNotAngular(file) {
    const component = __api_1.default.findPackageByFile(file);
    if (component) {
        const relPath = Path.relative(component.realPath, file);
        return /^[^/\\]+\.(?:ts|js)x?$/.test(relPath);
    }
    else
        return true;
}
exports.isIssuerNotAngular = isIssuerNotAngular;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1vcHRpb25zLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYnBhY2stb3B0aW9ucy1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUF3QjtBQUN4QiwyQ0FBNkI7QUFDN0Isb0NBQW9DO0FBQ3BDLGlEQUFpRDtBQUVqRCxNQUFNLE9BQU8sR0FBWSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDO0FBRTlDLE1BQU0sb0JBQW9CLEdBQUc7SUFDM0IsUUFBUSxFQUFFO1FBQ1IsU0FBUztRQUNULFVBQVU7UUFDVixjQUFjO1FBQ2QsYUFBYTtRQUNiLFVBQVU7UUFDVixnQkFBZ0I7S0FDakI7Q0FDRixDQUFDO0FBT00sb0RBQW9CO0FBTDVCLE1BQU0sWUFBWSxHQUFHO0lBQ25CLEdBQUcsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDO0lBQzNCLElBQUksRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDO0lBQzdCLElBQUksRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDO0NBQzlCLENBQUM7QUFDNEIsb0NBQVk7QUFFMUMsU0FBUyxlQUFlLENBQUMsSUFBWTtJQUNuQyxNQUFNLE9BQU8sR0FBVTtRQUNyQixFQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFO2dCQUM5QixRQUFRLEVBQUUsQ0FBQyxPQUFPO2dCQUNsQixTQUFTLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGdCQUFnQjthQUN6QyxFQUFDO1FBQ0Y7WUFDRSxNQUFNLEVBQUUscUJBQXFCO1lBQzdCLE9BQU8sRUFBRSxvQkFBb0I7U0FDOUI7UUFDRCxFQUFDLE1BQU0sRUFBRSxzQkFBc0IsRUFBQztRQUNoQyxFQUFDLE1BQU0sRUFBRSwyQkFBMkIsRUFBQztLQUN0QyxDQUFDO0lBRUYsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLE1BQU07WUFDVCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUU7b0JBQzVDLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2lCQUN6QyxFQUFDLENBQUMsQ0FBQztZQUNKLE1BQU07UUFDUixLQUFLLE1BQU07WUFDVCxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUU7b0JBQzVDLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2lCQUN6QyxFQUFDLENBQUMsQ0FBQztZQUNKLE1BQU07UUFDUjtZQUNFLE1BQU07S0FDVDtJQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFO1lBQzVELFFBQVEsRUFBRSxlQUFHLENBQUMsZUFBZTtTQUM5QixFQUFDLENBQUMsQ0FBQztJQUNKLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBWTtJQUMxQyxNQUFNLFNBQVMsR0FBRyxlQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUMsSUFBSSxTQUFTLElBQUksSUFBSTtRQUNuQixPQUFPLEtBQUssQ0FBQztJQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4RCxPQUFPLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFORCwwQ0FNQztBQUVELFNBQWdCLGtCQUFrQixDQUFDLElBQVk7SUFDN0MsTUFBTSxTQUFTLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLElBQUksU0FBUyxFQUFFO1FBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE9BQU8sd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQy9DOztRQUNDLE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFQRCxnREFPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5jb25zdCBkZXZNb2RlOiBib29sZWFuID0gYXBpLmNvbmZpZygpLmRldk1vZGU7XG5cbmNvbnN0IGNzc0F1dG9QcmVmaXhTZXR0aW5nID0ge1xuICBicm93c2VyczogW1xuICAgICdpZSA+PSA4JyxcbiAgICAnZmYgPj0gMzAnLFxuICAgICdjaHJvbWUgPj0gMzQnLFxuICAgICdzYWZhcmkgPj0gNycsXG4gICAgJ2lvcyA+PSA3JyxcbiAgICAnYW5kcm9pZCA+PSA0LjAnXG4gIF1cbn07XG5cbmNvbnN0IHN0eWxlTG9hZGVycyA9IHtcbiAgY3NzOiBnZXRTdHlsZUxvYWRlcnMoJ2NzcycpLFxuICBsZXNzOiBnZXRTdHlsZUxvYWRlcnMoJ2xlc3MnKSxcbiAgc2NzczogZ2V0U3R5bGVMb2FkZXJzKCdzY3NzJylcbn07XG5leHBvcnQge2Nzc0F1dG9QcmVmaXhTZXR0aW5nLCBzdHlsZUxvYWRlcnN9O1xuXG5mdW5jdGlvbiBnZXRTdHlsZUxvYWRlcnModHlwZTogc3RyaW5nKTogYW55W10ge1xuICBjb25zdCBsb2FkZXJzOiBhbnlbXSA9IFtcbiAgICB7bG9hZGVyOiAnY3NzLWxvYWRlcicsIG9wdGlvbnM6IHtcbiAgICAgIG1pbmltaXplOiAhZGV2TW9kZSxcbiAgICAgIHNvdXJjZU1hcDogYXBpLmNvbmZpZygpLmVuYWJsZVNvdXJjZU1hcHNcbiAgICB9fSxcbiAgICB7XG4gICAgICBsb2FkZXI6ICdhdXRvcHJlZml4ZXItbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IGNzc0F1dG9QcmVmaXhTZXR0aW5nXG4gICAgfSxcbiAgICB7bG9hZGVyOiAnbGliL2Nzcy1zY29wZS1sb2FkZXInfSxcbiAgICB7bG9hZGVyOiAnbGliL2Nzcy11cmwtYXNzZXRzLWxvYWRlcid9XG4gIF07XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnbGVzcyc6XG4gICAgICBsb2FkZXJzLnB1c2goe2xvYWRlcjogJ2xlc3MtbG9hZGVyJywgb3B0aW9uczoge1xuICAgICAgICBzb3VyY2VNYXA6IGFwaS5jb25maWcoKS5lbmFibGVTb3VyY2VNYXBzXG4gICAgICB9fSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdzY3NzJzpcbiAgICAgIGxvYWRlcnMucHVzaCh7bG9hZGVyOiAnc2Fzcy1sb2FkZXInLCBvcHRpb25zOiB7XG4gICAgICAgIHNvdXJjZU1hcDogYXBpLmNvbmZpZygpLmVuYWJsZVNvdXJjZU1hcHNcbiAgICAgIH19KTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGxvYWRlcnMucHVzaCh7bG9hZGVyOiAncmVxdWlyZS1pbmplY3Rvci9jc3MtbG9hZGVyJywgb3B0aW9uczoge1xuICAgIGluamVjdG9yOiBhcGkuYnJvd3NlckluamVjdG9yXG4gIH19KTtcbiAgcmV0dXJuIGxvYWRlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0lzc3VlckFuZ3VsYXIoZmlsZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGNvbXBvbmVudCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgaWYgKGNvbXBvbmVudCA9PSBudWxsKVxuICAgIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoY29tcG9uZW50LnJlYWxQYXRoLCBmaWxlKTtcbiAgcmV0dXJuICEvXlteL1xcXFxdK1xcLig/OnRzfGpzKXg/JC8udGVzdChyZWxQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSXNzdWVyTm90QW5ndWxhcihmaWxlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgY29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICBpZiAoY29tcG9uZW50KSB7XG4gICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoY29tcG9uZW50LnJlYWxQYXRoLCBmaWxlKTtcbiAgICByZXR1cm4gL15bXi9cXFxcXStcXC4oPzp0c3xqcyl4PyQvLnRlc3QocmVsUGF0aCk7XG4gIH0gZWxzZVxuICAgIHJldHVybiB0cnVlO1xufVxuIl19