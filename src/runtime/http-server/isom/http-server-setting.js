"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value
 */
function defaultSetting() {
    var _a, _b;
    const defaultValue = {
        ssl: {
            enabled: false,
            key: 'key.pem',
            cert: 'cert.pem',
            port: 443,
            httpForward: true
        },
        noHealthCheck: false
    };
    // Return settings based on command line option "dev"
    if ((_a = plink_1.config().cliOptions) === null || _a === void 0 ? void 0 : _a.dev) {
        defaultValue.noHealthCheck = true;
    }
    const env = (_b = plink_1.config().cliOptions) === null || _b === void 0 ? void 0 : _b.env;
    // Return settings based on command line option "env"
    if (env === 'local') {
        defaultValue.noHealthCheck = true;
    }
    return defaultValue;
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    // tslint:disable:no-string-literal
    return plink_1.config()['@wfh/http-server'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zZXJ2ZXItc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHAtc2VydmVyLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBZ0JsQzs7R0FFRztBQUNILFNBQWdCLGNBQWM7O0lBQzVCLE1BQU0sWUFBWSxHQUFzQjtRQUN0QyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsS0FBSztZQUNkLEdBQUcsRUFBRSxTQUFTO1lBQ2QsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxXQUFXLEVBQUUsSUFBSTtTQUNsQjtRQUNELGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUM7SUFDRixxREFBcUQ7SUFDckQsVUFBSSxjQUFNLEVBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsRUFBRTtRQUM1QixZQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztLQUNuQztJQUVELE1BQU0sR0FBRyxTQUFHLGNBQU0sRUFBRSxDQUFDLFVBQVUsMENBQUUsR0FBRyxDQUFDO0lBQ3JDLHFEQUFxRDtJQUNyRCxJQUFJLEdBQUcsS0FBSyxPQUFPLEVBQUU7UUFDbkIsWUFBWSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7S0FDbkM7SUFFRCxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBdkJELHdDQXVCQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLFVBQVU7SUFDeEIsbUNBQW1DO0lBQ25DLE9BQU8sY0FBTSxFQUFFLENBQUMsa0JBQWtCLENBQUUsQ0FBQztBQUN2QyxDQUFDO0FBSEQsZ0NBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwU2VydmVyU2V0dGluZyB7XG4gIG5vSGVhbHRoQ2hlY2s6IGJvb2xlYW47XG4gIHNzbDoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAga2V5OiBzdHJpbmc7XG4gICAgY2VydDogc3RyaW5nO1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgICBodHRwRm9yd2FyZDogYm9vbGVhbjtcbiAgfTtcbn1cblxuLyoqXG4gKiBQbGluayBydW5zIHRoaXMgZnVudGlvbiB0byBnZXQgcGFja2FnZSBsZXZlbCBzZXR0aW5nIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U2V0dGluZygpOiBIdHRwU2VydmVyU2V0dGluZyB7XG4gIGNvbnN0IGRlZmF1bHRWYWx1ZTogSHR0cFNlcnZlclNldHRpbmcgPSB7XG4gICAgc3NsOiB7XG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGtleTogJ2tleS5wZW0nLFxuICAgICAgY2VydDogJ2NlcnQucGVtJyxcbiAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgIGh0dHBGb3J3YXJkOiB0cnVlXG4gICAgfSxcbiAgICBub0hlYWx0aENoZWNrOiBmYWxzZVxuICB9O1xuICAvLyBSZXR1cm4gc2V0dGluZ3MgYmFzZWQgb24gY29tbWFuZCBsaW5lIG9wdGlvbiBcImRldlwiXG4gIGlmIChjb25maWcoKS5jbGlPcHRpb25zPy5kZXYpIHtcbiAgICBkZWZhdWx0VmFsdWUubm9IZWFsdGhDaGVjayA9IHRydWU7XG4gIH1cblxuICBjb25zdCBlbnYgPSBjb25maWcoKS5jbGlPcHRpb25zPy5lbnY7XG4gIC8vIFJldHVybiBzZXR0aW5ncyBiYXNlZCBvbiBjb21tYW5kIGxpbmUgb3B0aW9uIFwiZW52XCJcbiAgaWYgKGVudiA9PT0gJ2xvY2FsJykge1xuICAgIGRlZmF1bHRWYWx1ZS5ub0hlYWx0aENoZWNrID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyBcIi0tcHJvcFwiIGFuZCBcIi1jXCJcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKTogSHR0cFNlcnZlclNldHRpbmcge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1zdHJpbmctbGl0ZXJhbFxuICByZXR1cm4gY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXSE7XG59XG4iXX0=