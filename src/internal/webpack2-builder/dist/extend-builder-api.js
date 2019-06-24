"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const Webpack = require('webpack');
var newApi = Object.getPrototypeOf(__api_1.default);
newApi.configWebpackLater = function (execFunc) {
    require('..').tapable.plugin('webpackConfig', function (webpackConfig, cb) {
        Promise.resolve(execFunc(webpackConfig, Webpack))
            .then((cfg) => cb(null, cfg))
            .catch((err) => cb(err, null));
    });
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2V4dGVuZC1idWlsZGVyLWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFFeEIsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBZ0JuQyxJQUFJLE1BQU0sR0FBdUIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQUMsQ0FBQztBQUM1RCxNQUFNLENBQUMsa0JBQWtCLEdBQUcsVUFDM0IsUUFBMkI7SUFFM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUMzQyxVQUFTLGFBQTRCLEVBQUUsRUFBOEQ7UUFDcEcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQ2hELElBQUksQ0FBQyxDQUFDLEdBQWtCLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDM0MsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9leHRlbmQtYnVpbGRlci1hcGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBEckNvbXBvbmVudCBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cy9wYWNrYWdlLWluc3RhbmNlJztcbmNvbnN0IFdlYnBhY2sgPSByZXF1aXJlKCd3ZWJwYWNrJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja0NvbmZpZyB7XG5cdFtrZXk6IHN0cmluZ106IGFueTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFjazJCdWlsZGVyQXBpIHtcblx0Y29uZmlnV2VicGFja0xhdGVyKGV4ZWNGdW5jOlxuXHRcdChvcmlnaW5hbENvbmZpZzogV2VicGFja0NvbmZpZywgd2VicGFjazogYW55KSA9PldlYnBhY2tDb25maWcgfCBQcm9taXNlPFdlYnBhY2tDb25maWc+KTogdm9pZDtcblx0aXNEckZpbGUoZmlsZVN1ZmZpeDogc3RyaW5nIHwgc3RyaW5nW10sXG5cdFx0Y29tcGFyZT86IChyZWxQYXRoOiBzdHJpbmcsIGNvbXBvbmVudDogRHJDb21wb25lbnQpID0+IGJvb2xlYW4pOiB2b2lkO1xuXHRpc0lzc3VlckFuZ3VsYXIoZmlsZTogc3RyaW5nKTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgV2VicGFja0NvbmZpZ0Z1bmMgPVxuXHQob3JpZ2luYWxDb25maWc6IFdlYnBhY2tDb25maWcsIHdlYnBhY2s6IGFueSkgPT4gV2VicGFja0NvbmZpZyB8IFByb21pc2U8V2VicGFja0NvbmZpZz47XG5cbnZhciBuZXdBcGk6IFdlYnBhY2syQnVpbGRlckFwaSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpO1xubmV3QXBpLmNvbmZpZ1dlYnBhY2tMYXRlciA9IGZ1bmN0aW9uKHRoaXM6IFdlYnBhY2syQnVpbGRlckFwaSxcblx0ZXhlY0Z1bmM6IFdlYnBhY2tDb25maWdGdW5jKSB7XG5cblx0cmVxdWlyZSgnLi4nKS50YXBhYmxlLnBsdWdpbignd2VicGFja0NvbmZpZycsXG5cdFx0ZnVuY3Rpb24od2VicGFja0NvbmZpZzogV2VicGFja0NvbmZpZywgY2I6IChlcnI6IEVycm9yIHwgbnVsbCwgY29uZmlnPzogV2VicGFja0NvbmZpZyB8IG51bGwpID0+IHZvaWQpIHtcblx0XHRcdFByb21pc2UucmVzb2x2ZShleGVjRnVuYyh3ZWJwYWNrQ29uZmlnLCBXZWJwYWNrKSlcblx0XHRcdC50aGVuKChjZmc6IFdlYnBhY2tDb25maWcpID0+IGNiKG51bGwsIGNmZykpXG5cdFx0XHQuY2F0Y2goKGVycjogRXJyb3IpID0+IGNiKGVyciwgbnVsbCkpO1xuXHR9KTtcbn07XG4iXX0=
