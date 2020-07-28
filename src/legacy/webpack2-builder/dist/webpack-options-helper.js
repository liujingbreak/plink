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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL3dlYnBhY2stb3B0aW9ucy1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQXdCO0FBQ3hCLG1EQUE2QjtBQUM3QixvQ0FBb0M7QUFDcEMsaURBQWlEO0FBRWpELE1BQU0sT0FBTyxHQUFZLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUM7QUFFOUMsTUFBTSxvQkFBb0IsR0FBRztJQUMzQixRQUFRLEVBQUU7UUFDUixTQUFTO1FBQ1QsVUFBVTtRQUNWLGNBQWM7UUFDZCxhQUFhO1FBQ2IsVUFBVTtRQUNWLGdCQUFnQjtLQUNqQjtDQUNGLENBQUM7QUFPTSxvREFBb0I7QUFMNUIsTUFBTSxZQUFZLEdBQUc7SUFDbkIsR0FBRyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUM7SUFDM0IsSUFBSSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUM7SUFDN0IsSUFBSSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUM7Q0FDOUIsQ0FBQztBQUM0QixvQ0FBWTtBQUUxQyxTQUFTLGVBQWUsQ0FBQyxJQUFZO0lBQ25DLE1BQU0sT0FBTyxHQUFVO1FBQ3JCLEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUU7Z0JBQzlCLFFBQVEsRUFBRSxDQUFDLE9BQU87Z0JBQ2xCLFNBQVMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZ0JBQWdCO2FBQ3pDLEVBQUM7UUFDRjtZQUNFLE1BQU0sRUFBRSxxQkFBcUI7WUFDN0IsT0FBTyxFQUFFLG9CQUFvQjtTQUM5QjtRQUNELEVBQUMsTUFBTSxFQUFFLHNCQUFzQixFQUFDO1FBQ2hDLEVBQUMsTUFBTSxFQUFFLDJCQUEyQixFQUFDO0tBQ3RDLENBQUM7SUFFRixRQUFRLElBQUksRUFBRTtRQUNaLEtBQUssTUFBTTtZQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRTtvQkFDNUMsU0FBUyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0I7aUJBQ3pDLEVBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTTtRQUNSLEtBQUssTUFBTTtZQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRTtvQkFDNUMsU0FBUyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0I7aUJBQ3pDLEVBQUMsQ0FBQyxDQUFDO1lBQ0osTUFBTTtRQUNSO1lBQ0UsTUFBTTtLQUNUO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSw2QkFBNkIsRUFBRSxPQUFPLEVBQUU7WUFDNUQsUUFBUSxFQUFFLGVBQUcsQ0FBQyxlQUFlO1NBQzlCLEVBQUMsQ0FBQyxDQUFDO0lBQ0osT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQzFDLE1BQU0sU0FBUyxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxJQUFJLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQztRQUM5RCxPQUFPLEtBQUssQ0FBQztJQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvRCxPQUFPLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFORCwwQ0FNQztBQUVELFNBQWdCLGtCQUFrQixDQUFDLElBQVk7SUFDN0MsTUFBTSxTQUFTLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQy9ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRCxPQUFPLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUMvQzs7UUFDQyxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBUEQsZ0RBT0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC93ZWJwYWNrLW9wdGlvbnMtaGVscGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmNvbnN0IGRldk1vZGU6IGJvb2xlYW4gPSBhcGkuY29uZmlnKCkuZGV2TW9kZTtcblxuY29uc3QgY3NzQXV0b1ByZWZpeFNldHRpbmcgPSB7XG4gIGJyb3dzZXJzOiBbXG4gICAgJ2llID49IDgnLFxuICAgICdmZiA+PSAzMCcsXG4gICAgJ2Nocm9tZSA+PSAzNCcsXG4gICAgJ3NhZmFyaSA+PSA3JyxcbiAgICAnaW9zID49IDcnLFxuICAgICdhbmRyb2lkID49IDQuMCdcbiAgXVxufTtcblxuY29uc3Qgc3R5bGVMb2FkZXJzID0ge1xuICBjc3M6IGdldFN0eWxlTG9hZGVycygnY3NzJyksXG4gIGxlc3M6IGdldFN0eWxlTG9hZGVycygnbGVzcycpLFxuICBzY3NzOiBnZXRTdHlsZUxvYWRlcnMoJ3Njc3MnKVxufTtcbmV4cG9ydCB7Y3NzQXV0b1ByZWZpeFNldHRpbmcsIHN0eWxlTG9hZGVyc307XG5cbmZ1bmN0aW9uIGdldFN0eWxlTG9hZGVycyh0eXBlOiBzdHJpbmcpOiBhbnlbXSB7XG4gIGNvbnN0IGxvYWRlcnM6IGFueVtdID0gW1xuICAgIHtsb2FkZXI6ICdjc3MtbG9hZGVyJywgb3B0aW9uczoge1xuICAgICAgbWluaW1pemU6ICFkZXZNb2RlLFxuICAgICAgc291cmNlTWFwOiBhcGkuY29uZmlnKCkuZW5hYmxlU291cmNlTWFwc1xuICAgIH19LFxuICAgIHtcbiAgICAgIGxvYWRlcjogJ2F1dG9wcmVmaXhlci1sb2FkZXInLFxuICAgICAgb3B0aW9uczogY3NzQXV0b1ByZWZpeFNldHRpbmdcbiAgICB9LFxuICAgIHtsb2FkZXI6ICdsaWIvY3NzLXNjb3BlLWxvYWRlcid9LFxuICAgIHtsb2FkZXI6ICdsaWIvY3NzLXVybC1hc3NldHMtbG9hZGVyJ31cbiAgXTtcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdsZXNzJzpcbiAgICAgIGxvYWRlcnMucHVzaCh7bG9hZGVyOiAnbGVzcy1sb2FkZXInLCBvcHRpb25zOiB7XG4gICAgICAgIHNvdXJjZU1hcDogYXBpLmNvbmZpZygpLmVuYWJsZVNvdXJjZU1hcHNcbiAgICAgIH19KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Njc3MnOlxuICAgICAgbG9hZGVycy5wdXNoKHtsb2FkZXI6ICdzYXNzLWxvYWRlcicsIG9wdGlvbnM6IHtcbiAgICAgICAgc291cmNlTWFwOiBhcGkuY29uZmlnKCkuZW5hYmxlU291cmNlTWFwc1xuICAgICAgfX0pO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgbG9hZGVycy5wdXNoKHtsb2FkZXI6ICdyZXF1aXJlLWluamVjdG9yL2Nzcy1sb2FkZXInLCBvcHRpb25zOiB7XG4gICAgaW5qZWN0b3I6IGFwaS5icm93c2VySW5qZWN0b3JcbiAgfX0pO1xuICByZXR1cm4gbG9hZGVycztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSXNzdWVyQW5ndWxhcihmaWxlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgY29tcG9uZW50ID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICBpZiAoIShjb21wb25lbnQgJiYgY29tcG9uZW50LmRyICYmIGNvbXBvbmVudC5kci5hbmd1bGFyQ29tcGlsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoY29tcG9uZW50LnJlYWxQYWNrYWdlUGF0aCwgZmlsZSk7XG4gIHJldHVybiAhL15bXi9cXFxcXStcXC4oPzp0c3xqcyl4PyQvLnRlc3QocmVsUGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0lzc3Vlck5vdEFuZ3VsYXIoZmlsZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGNvbXBvbmVudCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgaWYgKChjb21wb25lbnQgJiYgY29tcG9uZW50LmRyICYmIGNvbXBvbmVudC5kci5hbmd1bGFyQ29tcGlsZXIpKSB7XG4gICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoY29tcG9uZW50LnJlYWxQYWNrYWdlUGF0aCwgZmlsZSk7XG4gICAgcmV0dXJuIC9eW14vXFxcXF0rXFwuKD86dHN8anMpeD8kLy50ZXN0KHJlbFBhdGgpO1xuICB9IGVsc2VcbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==
