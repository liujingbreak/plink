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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zZXJ2ZXItc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHAtc2VydmVyLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBZ0JsQzs7R0FFRztBQUNILFNBQWdCLGNBQWM7O0lBQzVCLE1BQU0sWUFBWSxHQUFzQjtRQUN0QyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsS0FBSztZQUNkLEdBQUcsRUFBRSxTQUFTO1lBQ2QsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxXQUFXLEVBQUUsSUFBSTtTQUNsQjtRQUNELGFBQWEsRUFBRSxLQUFLO0tBQ3JCLENBQUM7SUFDRixxREFBcUQ7SUFDckQsSUFBSSxNQUFBLElBQUEsY0FBTSxHQUFFLENBQUMsVUFBVSwwQ0FBRSxHQUFHLEVBQUU7UUFDNUIsWUFBWSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7S0FDbkM7SUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFBLElBQUEsY0FBTSxHQUFFLENBQUMsVUFBVSwwQ0FBRSxHQUFHLENBQUM7SUFDckMscURBQXFEO0lBQ3JELElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtRQUNuQixZQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztLQUNuQztJQUVELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUF2QkQsd0NBdUJDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixpRUFBaUU7SUFDakUsT0FBTyxJQUFBLGNBQU0sR0FBRSxDQUFDLGtCQUFrQixDQUFFLENBQUM7QUFDdkMsQ0FBQztBQUhELGdDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG4vKipcbiAqIFBhY2thZ2Ugc2V0dGluZyB0eXBlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cFNlcnZlclNldHRpbmcge1xuICBub0hlYWx0aENoZWNrOiBib29sZWFuO1xuICBzc2w6IHtcbiAgICBlbmFibGVkOiBib29sZWFuO1xuICAgIGtleTogc3RyaW5nO1xuICAgIGNlcnQ6IHN0cmluZztcbiAgICBwb3J0OiBudW1iZXI7XG4gICAgaHR0cEZvcndhcmQ6IGJvb2xlYW47XG4gIH07XG59XG5cbi8qKlxuICogUGxpbmsgcnVucyB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFNldHRpbmcoKTogSHR0cFNlcnZlclNldHRpbmcge1xuICBjb25zdCBkZWZhdWx0VmFsdWU6IEh0dHBTZXJ2ZXJTZXR0aW5nID0ge1xuICAgIHNzbDoge1xuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBrZXk6ICdrZXkucGVtJyxcbiAgICAgIGNlcnQ6ICdjZXJ0LnBlbScsXG4gICAgICBwb3J0OiA0NDMsXG4gICAgICBodHRwRm9yd2FyZDogdHJ1ZVxuICAgIH0sXG4gICAgbm9IZWFsdGhDaGVjazogZmFsc2VcbiAgfTtcbiAgLy8gUmV0dXJuIHNldHRpbmdzIGJhc2VkIG9uIGNvbW1hbmQgbGluZSBvcHRpb24gXCJkZXZcIlxuICBpZiAoY29uZmlnKCkuY2xpT3B0aW9ucz8uZGV2KSB7XG4gICAgZGVmYXVsdFZhbHVlLm5vSGVhbHRoQ2hlY2sgPSB0cnVlO1xuICB9XG5cbiAgY29uc3QgZW52ID0gY29uZmlnKCkuY2xpT3B0aW9ucz8uZW52O1xuICAvLyBSZXR1cm4gc2V0dGluZ3MgYmFzZWQgb24gY29tbWFuZCBsaW5lIG9wdGlvbiBcImVudlwiXG4gIGlmIChlbnYgPT09ICdsb2NhbCcpIHtcbiAgICBkZWZhdWx0VmFsdWUubm9IZWFsdGhDaGVjayA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gZGVmYXVsdFZhbHVlO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gc2V0dGluZyB2YWx1ZSBpcyBtZXJnZWQgd2l0aCBmaWxlcyBzcGVjaWZpZWQgYnkgY29tbWFuZCBsaW5lIG9wdGlvbnMgXCItLXByb3BcIiBhbmQgXCItY1wiXG4gKiBAcmV0dXJuIHNldHRpbmcgb2YgY3VycmVudCBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXR0aW5nKCk6IEh0dHBTZXJ2ZXJTZXR0aW5nIHtcbiAgLyogZXNsaW50LWRpc2FibGUgZG90LW5vdGF0aW9uLEB0eXBlc2NyaXB0LWVzbGludC9kb3Qtbm90YXRpb24gKi9cbiAgcmV0dXJuIGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10hO1xufVxuIl19