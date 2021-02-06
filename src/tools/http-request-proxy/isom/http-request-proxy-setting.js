"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
function defaultSetting() {
    const defaultValue = {
        trackRequestStream: false,
        proxies: {},
        timeout: 60000
    };
    return defaultValue;
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    // tslint:disable:no-string-literal
    return plink_1.config()['@wfh/http-request-proxy'];
}
exports.getSetting = getSetting;
const otherConfigures = {
    /** For Node.js runtime, replace module in "require()" or import syntax */
    setupNodeInjector(factory, setting) {
        // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    },
    /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
    setupWebInjector(factory, setting) {
        // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    }
};
exports.default = otherConfigures;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1yZXF1ZXN0LXByb3h5LXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodHRwLXJlcXVlc3QtcHJveHktc2V0dGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzQ0FBeUQ7QUFZekQ7OztHQUdHO0FBQ0gsU0FBZ0IsY0FBYztJQUM1QixNQUFNLFlBQVksR0FBNEI7UUFDNUMsa0JBQWtCLEVBQUUsS0FBSztRQUN6QixPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sRUFBRSxLQUFLO0tBQ2YsQ0FBQztJQUVGLE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFSRCx3Q0FRQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLFVBQVU7SUFDeEIsbUNBQW1DO0lBQ25DLE9BQU8sY0FBTSxFQUFFLENBQUMseUJBQXlCLENBQUUsQ0FBQztBQUM5QyxDQUFDO0FBSEQsZ0NBR0M7QUFFRCxNQUFNLGVBQWUsR0FBMEI7SUFDM0MsMEVBQTBFO0lBQzFFLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPO1FBQ2hDLGtFQUFrRTtJQUNwRSxDQUFDO0lBQ0QsdUdBQXVHO0lBQ3ZHLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxPQUFPO1FBQy9CLGtFQUFrRTtJQUNwRSxDQUFDO0NBQ0osQ0FBQztBQUVGLGtCQUFlLGVBQWUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y29uZmlnLCBJbmplY3RvckNvbmZpZ0hhbmRsZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG4vKipcbiAqIFBhY2thZ2Ugc2V0dGluZyB0eXBlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cFJlcXVlc3RQcm94eVNldHRpbmcge1xuICB0cmFja1JlcXVlc3RTdHJlYW06IGJvb2xlYW47XG4gIHByb3hpZXM6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgdGltZW91dDogbnVtYmVyO1xuICBwcm94eVRvPyA6IHN0cmluZztcbn1cblxuLyoqXG4gKiBQbGluayBydW5zIHRoaXMgZnVudGlvbiB0byBnZXQgcGFja2FnZSBsZXZlbCBzZXR0aW5nIHZhbHVlLFxuICogZnVuY3Rpb24gbmFtZSBcImRlZmF1bHRTZXR0aW5nXCIgbXVzdCBiZSBhbHNvIGNvbmZpZ3VyZWQgaW4gcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTZXR0aW5nKCk6IEh0dHBSZXF1ZXN0UHJveHlTZXR0aW5nIHtcbiAgY29uc3QgZGVmYXVsdFZhbHVlOiBIdHRwUmVxdWVzdFByb3h5U2V0dGluZyA9IHtcbiAgICB0cmFja1JlcXVlc3RTdHJlYW06IGZhbHNlLFxuICAgIHByb3hpZXM6IHt9LFxuICAgIHRpbWVvdXQ6IDYwMDAwXG4gIH07XG5cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHNldHRpbmcgdmFsdWUgaXMgbWVyZ2VkIHdpdGggZmlsZXMgc3BlY2lmaWVkIGJ5IGNvbW1hbmQgbGluZSBvcHRpb25zIFwiLS1wcm9wXCIgYW5kIFwiLWNcIlxuICogQHJldHVybiBzZXR0aW5nIG9mIGN1cnJlbnQgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2V0dGluZygpIHtcbiAgLy8gdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWxcbiAgcmV0dXJuIGNvbmZpZygpWydAd2ZoL2h0dHAtcmVxdWVzdC1wcm94eSddITtcbn1cblxuY29uc3Qgb3RoZXJDb25maWd1cmVzOiBJbmplY3RvckNvbmZpZ0hhbmRsZXIgPSB7XG4gICAgLyoqIEZvciBOb2RlLmpzIHJ1bnRpbWUsIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICAgIHNldHVwTm9kZUluamVjdG9yKGZhY3RvcnksIHNldHRpbmcpIHtcbiAgICAgIC8vIGZhY3RvcnkuZnJvbVBhY2thZ2UoJ0B3ZmgvZm9vYmFyJykuYWxpYXMoJ21vZHVsZUEnLCAnbW9kdWxlQicpO1xuICAgIH0sXG4gICAgLyoqIEZvciBDbGllbnQgZnJhbWV3b3JrIGJ1aWxkIHRvb2wgKFJlYWN0LCBBbmd1bGFyKSwgcmVwbGFjZSBtb2R1bGUgaW4gXCJyZXF1aXJlKClcIiBvciBpbXBvcnQgc3ludGF4ICovXG4gICAgc2V0dXBXZWJJbmplY3RvcihmYWN0b3J5LCBzZXR0aW5nKSB7XG4gICAgICAvLyBmYWN0b3J5LmZyb21QYWNrYWdlKCdAd2ZoL2Zvb2JhcicpLmFsaWFzKCdtb2R1bGVBJywgJ21vZHVsZUInKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBvdGhlckNvbmZpZ3VyZXM7XG4iXX0=