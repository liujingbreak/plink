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
        noHealthCheck: false,
        hostnames: []
    };
    // Return settings based on command line option "dev"
    if ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.dev) {
        defaultValue.noHealthCheck = true;
    }
    const env = (_b = (0, plink_1.config)().cliOptions) === null || _b === void 0 ? void 0 : _b.env;
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
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/http-server'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zZXJ2ZXItc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHAtc2VydmVyLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBNkJsQzs7R0FFRztBQUNILFNBQWdCLGNBQWM7O0lBQzVCLE1BQU0sWUFBWSxHQUFzQjtRQUN0QyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsS0FBSztZQUNkLEdBQUcsRUFBRSxTQUFTO1lBQ2QsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxXQUFXLEVBQUUsSUFBSTtTQUNsQjtRQUNELGFBQWEsRUFBRSxLQUFLO1FBQ3BCLFNBQVMsRUFBRSxFQUFFO0tBQ2QsQ0FBQztJQUNGLHFEQUFxRDtJQUNyRCxJQUFJLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsRUFBRTtRQUM1QixZQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztLQUNuQztJQUVELE1BQU0sR0FBRyxHQUFHLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsQ0FBQztJQUNyQyxxREFBcUQ7SUFDckQsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFO1FBQ25CLFlBQVksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0tBQ25DO0lBRUQsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQXhCRCx3Q0F3QkM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLGlFQUFpRTtJQUNqRSxPQUFPLElBQUEsY0FBTSxHQUFFLENBQUMsa0JBQWtCLENBQUUsQ0FBQztBQUN2QyxDQUFDO0FBSEQsZ0NBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwU2VydmVyU2V0dGluZyB7XG4gIC8qKiBEZXByZWNhdGVkICovXG4gIG5vSGVhbHRoQ2hlY2s6IGJvb2xlYW47XG4gIHNzbDoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAga2V5OiBzdHJpbmc7XG4gICAgY2VydDogc3RyaW5nO1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgICBodHRwRm9yd2FyZDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIEFkZGl0aW9uYWwgaG9zdCBuYW1lcyAob3RoZXIgdGhhbiBkZWZhdWx0IGhvc3QpXG4gICogdGhhdCBIVFRQL0hUVFBTIHNlcnZlciBuZWVkcyB0byBsaXN0ZW5lZCAqL1xuICBob3N0bmFtZXM6IHN0cmluZ1tdO1xuICAvKiogc3RhcnRzIHdpdGggbXVsdGlwbGUgc2VydmVyc1xuICAqIGlmIHRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQsIHByb3BlcnR5IFwic3NsXCIgd2lsbCBiZSBpZ25vcmVkICovXG4gIHNlcnZlcnM/OiB7XG4gICAgc3NsPzoge1xuICAgICAga2V5OiBzdHJpbmc7XG4gICAgICBjZXJ0OiBzdHJpbmc7XG4gICAgfTtcbiAgICBwb3J0OiBudW1iZXI7XG4gIH1bXTtcbn1cblxuLyoqXG4gKiBQbGluayBydW5zIHRoaXMgZnVudGlvbiB0byBnZXQgcGFja2FnZSBsZXZlbCBzZXR0aW5nIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U2V0dGluZygpOiBIdHRwU2VydmVyU2V0dGluZyB7XG4gIGNvbnN0IGRlZmF1bHRWYWx1ZTogSHR0cFNlcnZlclNldHRpbmcgPSB7XG4gICAgc3NsOiB7XG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGtleTogJ2tleS5wZW0nLFxuICAgICAgY2VydDogJ2NlcnQucGVtJyxcbiAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgIGh0dHBGb3J3YXJkOiB0cnVlXG4gICAgfSxcbiAgICBub0hlYWx0aENoZWNrOiBmYWxzZSxcbiAgICBob3N0bmFtZXM6IFtdXG4gIH07XG4gIC8vIFJldHVybiBzZXR0aW5ncyBiYXNlZCBvbiBjb21tYW5kIGxpbmUgb3B0aW9uIFwiZGV2XCJcbiAgaWYgKGNvbmZpZygpLmNsaU9wdGlvbnM/LmRldikge1xuICAgIGRlZmF1bHRWYWx1ZS5ub0hlYWx0aENoZWNrID0gdHJ1ZTtcbiAgfVxuXG4gIGNvbnN0IGVudiA9IGNvbmZpZygpLmNsaU9wdGlvbnM/LmVudjtcbiAgLy8gUmV0dXJuIHNldHRpbmdzIGJhc2VkIG9uIGNvbW1hbmQgbGluZSBvcHRpb24gXCJlbnZcIlxuICBpZiAoZW52ID09PSAnbG9jYWwnKSB7XG4gICAgZGVmYXVsdFZhbHVlLm5vSGVhbHRoQ2hlY2sgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHNldHRpbmcgdmFsdWUgaXMgbWVyZ2VkIHdpdGggZmlsZXMgc3BlY2lmaWVkIGJ5IGNvbW1hbmQgbGluZSBvcHRpb25zIFwiLS1wcm9wXCIgYW5kIFwiLWNcIlxuICogQHJldHVybiBzZXR0aW5nIG9mIGN1cnJlbnQgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2V0dGluZygpOiBIdHRwU2VydmVyU2V0dGluZyB7XG4gIC8qIGVzbGludC1kaXNhYmxlIGRvdC1ub3RhdGlvbixAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uICovXG4gIHJldHVybiBjb25maWcoKVsnQHdmaC9odHRwLXNlcnZlciddITtcbn1cbiJdfQ==