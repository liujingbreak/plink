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
        timeout: 60000,
        npmRegistry: 'https://registry.npmjs.org/'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1yZXF1ZXN0LXByb3h5LXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodHRwLXJlcXVlc3QtcHJveHktc2V0dGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzQ0FBeUQ7QUFjekQ7OztHQUdHO0FBQ0gsU0FBZ0IsY0FBYztJQUM1QixNQUFNLFlBQVksR0FBNEI7UUFDNUMsa0JBQWtCLEVBQUUsS0FBSztRQUN6QixPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sRUFBRSxLQUFLO1FBQ2QsV0FBVyxFQUFFLDZCQUE2QjtLQUMzQyxDQUFDO0lBRUYsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQVRELHdDQVNDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixtQ0FBbUM7SUFDbkMsT0FBTyxjQUFNLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBRSxDQUFDO0FBQzlDLENBQUM7QUFIRCxnQ0FHQztBQUVELE1BQU0sZUFBZSxHQUEwQjtJQUMzQywwRUFBMEU7SUFDMUUsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDaEMsa0VBQWtFO0lBQ3BFLENBQUM7SUFDRCx1R0FBdUc7SUFDdkcsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDL0Isa0VBQWtFO0lBQ3BFLENBQUM7Q0FDSixDQUFDO0FBRUYsa0JBQWUsZUFBZSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWcsIEluamVjdG9yQ29uZmlnSGFuZGxlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwUmVxdWVzdFByb3h5U2V0dGluZyB7XG4gIHRyYWNrUmVxdWVzdFN0cmVhbTogYm9vbGVhbjtcbiAgcHJveGllczoge1twYXRoOiBzdHJpbmddOiBzdHJpbmd9O1xuICB0aW1lb3V0OiBudW1iZXI7XG4gIHByb3h5VG8/IDogc3RyaW5nO1xuXG4gIG5wbVJlZ2lzdHJ5OiBzdHJpbmc7XG59XG5cbi8qKlxuICogUGxpbmsgcnVucyB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZSxcbiAqIGZ1bmN0aW9uIG5hbWUgXCJkZWZhdWx0U2V0dGluZ1wiIG11c3QgYmUgYWxzbyBjb25maWd1cmVkIGluIHBhY2thZ2UuanNvbiBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U2V0dGluZygpOiBIdHRwUmVxdWVzdFByb3h5U2V0dGluZyB7XG4gIGNvbnN0IGRlZmF1bHRWYWx1ZTogSHR0cFJlcXVlc3RQcm94eVNldHRpbmcgPSB7XG4gICAgdHJhY2tSZXF1ZXN0U3RyZWFtOiBmYWxzZSxcbiAgICBwcm94aWVzOiB7fSxcbiAgICB0aW1lb3V0OiA2MDAwMCxcbiAgICBucG1SZWdpc3RyeTogJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnLydcbiAgfTtcblxuICByZXR1cm4gZGVmYXVsdFZhbHVlO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gc2V0dGluZyB2YWx1ZSBpcyBtZXJnZWQgd2l0aCBmaWxlcyBzcGVjaWZpZWQgYnkgY29tbWFuZCBsaW5lIG9wdGlvbnMgXCItLXByb3BcIiBhbmQgXCItY1wiXG4gKiBAcmV0dXJuIHNldHRpbmcgb2YgY3VycmVudCBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXR0aW5nKCkge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1zdHJpbmctbGl0ZXJhbFxuICByZXR1cm4gY29uZmlnKClbJ0B3ZmgvaHR0cC1yZXF1ZXN0LXByb3h5J10hO1xufVxuXG5jb25zdCBvdGhlckNvbmZpZ3VyZXM6IEluamVjdG9yQ29uZmlnSGFuZGxlciA9IHtcbiAgICAvKiogRm9yIE5vZGUuanMgcnVudGltZSwgcmVwbGFjZSBtb2R1bGUgaW4gXCJyZXF1aXJlKClcIiBvciBpbXBvcnQgc3ludGF4ICovXG4gICAgc2V0dXBOb2RlSW5qZWN0b3IoZmFjdG9yeSwgc2V0dGluZykge1xuICAgICAgLy8gZmFjdG9yeS5mcm9tUGFja2FnZSgnQHdmaC9mb29iYXInKS5hbGlhcygnbW9kdWxlQScsICdtb2R1bGVCJyk7XG4gICAgfSxcbiAgICAvKiogRm9yIENsaWVudCBmcmFtZXdvcmsgYnVpbGQgdG9vbCAoUmVhY3QsIEFuZ3VsYXIpLCByZXBsYWNlIG1vZHVsZSBpbiBcInJlcXVpcmUoKVwiIG9yIGltcG9ydCBzeW50YXggKi9cbiAgICBzZXR1cFdlYkluamVjdG9yKGZhY3RvcnksIHNldHRpbmcpIHtcbiAgICAgIC8vIGZhY3RvcnkuZnJvbVBhY2thZ2UoJ0B3ZmgvZm9vYmFyJykuYWxpYXMoJ21vZHVsZUEnLCAnbW9kdWxlQicpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG90aGVyQ29uZmlndXJlcztcbiJdfQ==