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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zZXJ2ZXItc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHAtc2VydmVyLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBbUJsQzs7R0FFRztBQUNILFNBQWdCLGNBQWM7O0lBQzVCLE1BQU0sWUFBWSxHQUFzQjtRQUN0QyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsS0FBSztZQUNkLEdBQUcsRUFBRSxTQUFTO1lBQ2QsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxXQUFXLEVBQUUsSUFBSTtTQUNsQjtRQUNELGFBQWEsRUFBRSxLQUFLO1FBQ3BCLFNBQVMsRUFBRSxFQUFFO0tBQ2QsQ0FBQztJQUNGLHFEQUFxRDtJQUNyRCxJQUFJLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsRUFBRTtRQUM1QixZQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztLQUNuQztJQUVELE1BQU0sR0FBRyxHQUFHLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsQ0FBQztJQUNyQyxxREFBcUQ7SUFDckQsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFO1FBQ25CLFlBQVksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0tBQ25DO0lBRUQsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQXhCRCx3Q0F3QkM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLGlFQUFpRTtJQUNqRSxPQUFPLElBQUEsY0FBTSxHQUFFLENBQUMsa0JBQWtCLENBQUUsQ0FBQztBQUN2QyxDQUFDO0FBSEQsZ0NBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwU2VydmVyU2V0dGluZyB7XG4gIG5vSGVhbHRoQ2hlY2s6IGJvb2xlYW47XG4gIHNzbDoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAga2V5OiBzdHJpbmc7XG4gICAgY2VydDogc3RyaW5nO1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgICBodHRwRm9yd2FyZDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIEFkZGl0aW9uYWwgaG9zdCBuYW1lcyAob3RoZXIgdGhhbiBsb2NhbGhvc3Qgb3IgbG9jYWwgSVAgYWRkcmVzcylcbiAgKiB0aGF0IEhUVFAvSFRUUFMgc2VydmVyIG5lZWRzIHRvIGxpc3RlbmVkICovXG4gIGhvc3RuYW1lczogc3RyaW5nW107XG59XG5cbi8qKlxuICogUGxpbmsgcnVucyB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFNldHRpbmcoKTogSHR0cFNlcnZlclNldHRpbmcge1xuICBjb25zdCBkZWZhdWx0VmFsdWU6IEh0dHBTZXJ2ZXJTZXR0aW5nID0ge1xuICAgIHNzbDoge1xuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBrZXk6ICdrZXkucGVtJyxcbiAgICAgIGNlcnQ6ICdjZXJ0LnBlbScsXG4gICAgICBwb3J0OiA0NDMsXG4gICAgICBodHRwRm9yd2FyZDogdHJ1ZVxuICAgIH0sXG4gICAgbm9IZWFsdGhDaGVjazogZmFsc2UsXG4gICAgaG9zdG5hbWVzOiBbXVxuICB9O1xuICAvLyBSZXR1cm4gc2V0dGluZ3MgYmFzZWQgb24gY29tbWFuZCBsaW5lIG9wdGlvbiBcImRldlwiXG4gIGlmIChjb25maWcoKS5jbGlPcHRpb25zPy5kZXYpIHtcbiAgICBkZWZhdWx0VmFsdWUubm9IZWFsdGhDaGVjayA9IHRydWU7XG4gIH1cblxuICBjb25zdCBlbnYgPSBjb25maWcoKS5jbGlPcHRpb25zPy5lbnY7XG4gIC8vIFJldHVybiBzZXR0aW5ncyBiYXNlZCBvbiBjb21tYW5kIGxpbmUgb3B0aW9uIFwiZW52XCJcbiAgaWYgKGVudiA9PT0gJ2xvY2FsJykge1xuICAgIGRlZmF1bHRWYWx1ZS5ub0hlYWx0aENoZWNrID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyBcIi0tcHJvcFwiIGFuZCBcIi1jXCJcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKTogSHR0cFNlcnZlclNldHRpbmcge1xuICAvKiBlc2xpbnQtZGlzYWJsZSBkb3Qtbm90YXRpb24sQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbiAqL1xuICByZXR1cm4gY29uZmlnKClbJ0B3ZmgvaHR0cC1zZXJ2ZXInXSE7XG59XG4iXX0=