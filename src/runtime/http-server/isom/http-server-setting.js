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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zZXJ2ZXItc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHAtc2VydmVyLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBNkJsQzs7R0FFRztBQUNILFNBQWdCLGNBQWM7O0lBQzVCLE1BQU0sWUFBWSxHQUFzQjtRQUN0QyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsS0FBSztZQUNkLEdBQUcsRUFBRSxTQUFTO1lBQ2QsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLEdBQUc7WUFDVCxXQUFXLEVBQUUsSUFBSTtTQUNsQjtRQUNELGFBQWEsRUFBRSxLQUFLO1FBQ3BCLFNBQVMsRUFBRSxFQUFFO0tBQ2QsQ0FBQztJQUNGLHFEQUFxRDtJQUNyRCxJQUFJLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsRUFBRTtRQUM1QixZQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztLQUNuQztJQUVELE1BQU0sR0FBRyxHQUFHLE1BQUEsSUFBQSxjQUFNLEdBQUUsQ0FBQyxVQUFVLDBDQUFFLEdBQUcsQ0FBQztJQUNyQyxxREFBcUQ7SUFDckQsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFO1FBQ25CLFlBQVksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0tBQ25DO0lBRUQsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQXhCRCx3Q0F3QkM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLGlFQUFpRTtJQUNqRSxPQUFPLElBQUEsY0FBTSxHQUFFLENBQUMsa0JBQWtCLENBQUUsQ0FBQztBQUN2QyxDQUFDO0FBSEQsZ0NBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwU2VydmVyU2V0dGluZyB7XG4gIC8qKiBEZXByZWNhdGVkICovXG4gIG5vSGVhbHRoQ2hlY2s6IGJvb2xlYW47XG4gIHNzbDoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAga2V5OiBzdHJpbmc7XG4gICAgY2VydDogc3RyaW5nO1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgICBodHRwRm9yd2FyZDogYm9vbGVhbjtcbiAgfTtcbiAgLyoqIEFkZGl0aW9uYWwgaG9zdCBuYW1lcyAob3RoZXIgdGhhbiBsb2NhbGhvc3Qgb3IgbG9jYWwgSVAgYWRkcmVzcylcbiAgKiB0aGF0IEhUVFAvSFRUUFMgc2VydmVyIG5lZWRzIHRvIGxpc3RlbmVkICovXG4gIGhvc3RuYW1lczogc3RyaW5nW107XG4gIC8qKiBzdGFydHMgd2l0aCBtdWx0aXBsZSBzZXJ2ZXJzXG4gICogaWYgdGhpcyBwcm9wZXJ0eSBpcyBwcm92aWRlZCwgcHJvcGVydHkgXCJzc2xcIiB3aWxsIGJlIGlnbm9yZWQgKi9cbiAgc2VydmVycz86IHtcbiAgICBzc2w/OiB7XG4gICAgICBrZXk6IHN0cmluZztcbiAgICAgIGNlcnQ6IHN0cmluZztcbiAgICB9O1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgfVtdO1xufVxuXG4vKipcbiAqIFBsaW5rIHJ1bnMgdGhpcyBmdW50aW9uIHRvIGdldCBwYWNrYWdlIGxldmVsIHNldHRpbmcgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTZXR0aW5nKCk6IEh0dHBTZXJ2ZXJTZXR0aW5nIHtcbiAgY29uc3QgZGVmYXVsdFZhbHVlOiBIdHRwU2VydmVyU2V0dGluZyA9IHtcbiAgICBzc2w6IHtcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAga2V5OiAna2V5LnBlbScsXG4gICAgICBjZXJ0OiAnY2VydC5wZW0nLFxuICAgICAgcG9ydDogNDQzLFxuICAgICAgaHR0cEZvcndhcmQ6IHRydWVcbiAgICB9LFxuICAgIG5vSGVhbHRoQ2hlY2s6IGZhbHNlLFxuICAgIGhvc3RuYW1lczogW11cbiAgfTtcbiAgLy8gUmV0dXJuIHNldHRpbmdzIGJhc2VkIG9uIGNvbW1hbmQgbGluZSBvcHRpb24gXCJkZXZcIlxuICBpZiAoY29uZmlnKCkuY2xpT3B0aW9ucz8uZGV2KSB7XG4gICAgZGVmYXVsdFZhbHVlLm5vSGVhbHRoQ2hlY2sgPSB0cnVlO1xuICB9XG5cbiAgY29uc3QgZW52ID0gY29uZmlnKCkuY2xpT3B0aW9ucz8uZW52O1xuICAvLyBSZXR1cm4gc2V0dGluZ3MgYmFzZWQgb24gY29tbWFuZCBsaW5lIG9wdGlvbiBcImVudlwiXG4gIGlmIChlbnYgPT09ICdsb2NhbCcpIHtcbiAgICBkZWZhdWx0VmFsdWUubm9IZWFsdGhDaGVjayA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gZGVmYXVsdFZhbHVlO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gc2V0dGluZyB2YWx1ZSBpcyBtZXJnZWQgd2l0aCBmaWxlcyBzcGVjaWZpZWQgYnkgY29tbWFuZCBsaW5lIG9wdGlvbnMgXCItLXByb3BcIiBhbmQgXCItY1wiXG4gKiBAcmV0dXJuIHNldHRpbmcgb2YgY3VycmVudCBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXR0aW5nKCk6IEh0dHBTZXJ2ZXJTZXR0aW5nIHtcbiAgLyogZXNsaW50LWRpc2FibGUgZG90LW5vdGF0aW9uLEB0eXBlc2NyaXB0LWVzbGludC9kb3Qtbm90YXRpb24gKi9cbiAgcmV0dXJuIGNvbmZpZygpWydAd2ZoL2h0dHAtc2VydmVyJ10hO1xufVxuIl19