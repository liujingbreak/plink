"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const Path = tslib_1.__importStar(require("path"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL3dlYnBhY2stb3B0aW9ucy1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQXdCO0FBQ3hCLG1EQUE2QjtBQUM3QixvQ0FBb0M7QUFDcEMsaURBQWlEO0FBRWpELE1BQU0sT0FBTyxHQUFZLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUM7QUFFOUMsTUFBTSxvQkFBb0IsR0FBRztJQUM1QixRQUFRLEVBQUU7UUFDVCxTQUFTO1FBQ1QsVUFBVTtRQUNWLGNBQWM7UUFDZCxhQUFhO1FBQ2IsVUFBVTtRQUNWLGdCQUFnQjtLQUNoQjtDQUNELENBQUM7QUFPTSxvREFBb0I7QUFMNUIsTUFBTSxZQUFZLEdBQUc7SUFDcEIsR0FBRyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUM7SUFDM0IsSUFBSSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUM7SUFDN0IsSUFBSSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUM7Q0FDN0IsQ0FBQztBQUM0QixvQ0FBWTtBQUUxQyxTQUFTLGVBQWUsQ0FBQyxJQUFZO0lBQ3BDLE1BQU0sT0FBTyxHQUFVO1FBQ3RCLEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUU7Z0JBQy9CLFFBQVEsRUFBRSxDQUFDLE9BQU87Z0JBQ2xCLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2FBQ3hDLEVBQUM7UUFDRjtZQUNDLE1BQU0sRUFBRSxxQkFBcUI7WUFDN0IsT0FBTyxFQUFFLG9CQUFvQjtTQUM3QjtRQUNELEVBQUMsTUFBTSxFQUFFLHNCQUFzQixFQUFDO1FBQ2hDLEVBQUMsTUFBTSxFQUFFLDJCQUEyQixFQUFDO0tBQ3JDLENBQUM7SUFFRixRQUFRLElBQUksRUFBRTtRQUNiLEtBQUssTUFBTTtZQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRTtvQkFDN0MsU0FBUyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0I7aUJBQ3hDLEVBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTTtRQUNQLEtBQUssTUFBTTtZQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRTtvQkFDN0MsU0FBUyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0I7aUJBQ3hDLEVBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTTtRQUNQO1lBQ0MsTUFBTTtLQUNQO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSw2QkFBNkIsRUFBRSxPQUFPLEVBQUU7WUFDN0QsUUFBUSxFQUFFLGVBQUcsQ0FBQyxlQUFlO1NBQzdCLEVBQUMsQ0FBQyxDQUFDO0lBQ0osT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQzNDLE1BQU0sU0FBUyxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxJQUFJLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQztRQUMvRCxPQUFPLEtBQUssQ0FBQztJQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvRCxPQUFPLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hELENBQUM7QUFORCwwQ0FNQztBQUVELFNBQWdCLGtCQUFrQixDQUFDLElBQVk7SUFDOUMsTUFBTSxTQUFTLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ2hFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRCxPQUFPLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUM5Qzs7UUFDQSxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFQRCxnREFPQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L3dlYnBhY2stb3B0aW9ucy1oZWxwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuY29uc3QgZGV2TW9kZTogYm9vbGVhbiA9IGFwaS5jb25maWcoKS5kZXZNb2RlO1xuXG5jb25zdCBjc3NBdXRvUHJlZml4U2V0dGluZyA9IHtcblx0YnJvd3NlcnM6IFtcblx0XHQnaWUgPj0gOCcsXG5cdFx0J2ZmID49IDMwJyxcblx0XHQnY2hyb21lID49IDM0Jyxcblx0XHQnc2FmYXJpID49IDcnLFxuXHRcdCdpb3MgPj0gNycsXG5cdFx0J2FuZHJvaWQgPj0gNC4wJ1xuXHRdXG59O1xuXG5jb25zdCBzdHlsZUxvYWRlcnMgPSB7XG5cdGNzczogZ2V0U3R5bGVMb2FkZXJzKCdjc3MnKSxcblx0bGVzczogZ2V0U3R5bGVMb2FkZXJzKCdsZXNzJyksXG5cdHNjc3M6IGdldFN0eWxlTG9hZGVycygnc2NzcycpXG59O1xuZXhwb3J0IHtjc3NBdXRvUHJlZml4U2V0dGluZywgc3R5bGVMb2FkZXJzfTtcblxuZnVuY3Rpb24gZ2V0U3R5bGVMb2FkZXJzKHR5cGU6IHN0cmluZyk6IGFueVtdIHtcblx0Y29uc3QgbG9hZGVyczogYW55W10gPSBbXG5cdFx0e2xvYWRlcjogJ2Nzcy1sb2FkZXInLCBvcHRpb25zOiB7XG5cdFx0XHRtaW5pbWl6ZTogIWRldk1vZGUsXG5cdFx0XHRzb3VyY2VNYXA6IGFwaS5jb25maWcoKS5lbmFibGVTb3VyY2VNYXBzXG5cdFx0fX0sXG5cdFx0e1xuXHRcdFx0bG9hZGVyOiAnYXV0b3ByZWZpeGVyLWxvYWRlcicsXG5cdFx0XHRvcHRpb25zOiBjc3NBdXRvUHJlZml4U2V0dGluZ1xuXHRcdH0sXG5cdFx0e2xvYWRlcjogJ2xpYi9jc3Mtc2NvcGUtbG9hZGVyJ30sXG5cdFx0e2xvYWRlcjogJ2xpYi9jc3MtdXJsLWFzc2V0cy1sb2FkZXInfVxuXHRdO1xuXG5cdHN3aXRjaCAodHlwZSkge1xuXHRcdGNhc2UgJ2xlc3MnOlxuXHRcdFx0bG9hZGVycy5wdXNoKHtsb2FkZXI6ICdsZXNzLWxvYWRlcicsIG9wdGlvbnM6IHtcblx0XHRcdFx0c291cmNlTWFwOiBhcGkuY29uZmlnKCkuZW5hYmxlU291cmNlTWFwc1xuXHRcdFx0fX0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc2Nzcyc6XG5cdFx0XHRsb2FkZXJzLnB1c2goe2xvYWRlcjogJ3Nhc3MtbG9hZGVyJywgb3B0aW9uczoge1xuXHRcdFx0XHRzb3VyY2VNYXA6IGFwaS5jb25maWcoKS5lbmFibGVTb3VyY2VNYXBzXG5cdFx0XHR9fSk7XG5cdFx0XHRicmVhaztcblx0XHRkZWZhdWx0OlxuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRsb2FkZXJzLnB1c2goe2xvYWRlcjogJ3JlcXVpcmUtaW5qZWN0b3IvY3NzLWxvYWRlcicsIG9wdGlvbnM6IHtcblx0XHRpbmplY3RvcjogYXBpLmJyb3dzZXJJbmplY3RvclxuXHR9fSk7XG5cdHJldHVybiBsb2FkZXJzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJc3N1ZXJBbmd1bGFyKGZpbGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRjb25zdCBjb21wb25lbnQgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG5cdGlmICghKGNvbXBvbmVudCAmJiBjb21wb25lbnQuZHIgJiYgY29tcG9uZW50LmRyLmFuZ3VsYXJDb21waWxlcikpXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHRjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShjb21wb25lbnQucmVhbFBhY2thZ2VQYXRoLCBmaWxlKTtcblx0cmV0dXJuICEvXlteL1xcXFxdK1xcLig/OnRzfGpzKXg/JC8udGVzdChyZWxQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSXNzdWVyTm90QW5ndWxhcihmaWxlOiBzdHJpbmcpOiBib29sZWFuIHtcblx0Y29uc3QgY29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuXHRpZiAoKGNvbXBvbmVudCAmJiBjb21wb25lbnQuZHIgJiYgY29tcG9uZW50LmRyLmFuZ3VsYXJDb21waWxlcikpIHtcblx0XHRjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShjb21wb25lbnQucmVhbFBhY2thZ2VQYXRoLCBmaWxlKTtcblx0XHRyZXR1cm4gL15bXi9cXFxcXStcXC4oPzp0c3xqcyl4PyQvLnRlc3QocmVsUGF0aCk7XG5cdH0gZWxzZVxuXHRcdHJldHVybiB0cnVlO1xufVxuIl19
