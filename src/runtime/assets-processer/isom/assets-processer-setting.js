"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink run this funtion to get package level setting value
 */
function defaultSetting() {
    const defaultValue = {
        fetchUrl: null,
        fetchRetry: 5,
        downloadMode: 'fork',
        fetchLogErrPerTimes: 20,
        fetchIntervalSec: 90,
        cacheControlMaxAge: {
            js: '365 days',
            css: '365 days',
            less: '365 days',
            html: null,
            png: '365 days',
            jpg: '365 days',
            jpeg: '365 days',
            gif: '365 days',
            svg: '365 days',
            eot: '365 days',
            ttf: '365 days',
            woff: '365 days',
            woff2: '365 days'
        },
        fallbackIndexHtml: { '^/[^/?#]+': '<%=match[0]%>/index.html' },
        httpProxy: {},
        fetchMailServer: null,
        serveIndex: false,
        requireToken: false
    };
    if (plink_1.config().devMode || plink_1.config().cliOptions.env === 'local') {
        const devValue = {
            fetchRetry: 0,
            fetchLogErrPerTimes: 1,
            fetchIntervalSec: 60,
            cacheControlMaxAge: {},
            fetchMailServer: null,
            indexHtmlProxy: {
                target: 'http://localhost:4200'
            }
        };
        return Object.assign(defaultValue, devValue);
    }
    return defaultValue;
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options --prop and -c
 * @return setting of current package
 */
function getSetting() {
    // tslint:disable:no-string-literal
    return plink_1.config()['@wfh/assets-processer'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFrQztBQXNDbEM7O0dBRUc7QUFDSCxTQUFnQixjQUFjO0lBQzVCLE1BQU0sWUFBWSxHQUEyQjtRQUMzQyxRQUFRLEVBQUUsSUFBSTtRQUNkLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLE1BQU07UUFDcEIsbUJBQW1CLEVBQUUsRUFBRTtRQUN2QixnQkFBZ0IsRUFBRSxFQUFFO1FBQ3BCLGtCQUFrQixFQUFFO1lBQ2xCLEVBQUUsRUFBRSxVQUFVO1lBQ2QsR0FBRyxFQUFFLFVBQVU7WUFDZixJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsSUFBSTtZQUNWLEdBQUcsRUFBRSxVQUFVO1lBQ2YsR0FBRyxFQUFFLFVBQVU7WUFDZixJQUFJLEVBQUUsVUFBVTtZQUNoQixHQUFHLEVBQUUsVUFBVTtZQUNmLEdBQUcsRUFBRSxVQUFVO1lBQ2YsR0FBRyxFQUFFLFVBQVU7WUFDZixHQUFHLEVBQUUsVUFBVTtZQUNmLElBQUksRUFBRSxVQUFVO1lBQ2hCLEtBQUssRUFBRSxVQUFVO1NBQ2xCO1FBQ0QsaUJBQWlCLEVBQUUsRUFBQyxXQUFXLEVBQUUsMEJBQTBCLEVBQUM7UUFDNUQsU0FBUyxFQUFFLEVBQUU7UUFDYixlQUFlLEVBQUUsSUFBSTtRQUNyQixVQUFVLEVBQUUsS0FBSztRQUNqQixZQUFZLEVBQUUsS0FBSztLQUNwQixDQUFDO0lBRUYsSUFBSSxjQUFNLEVBQUUsQ0FBQyxPQUFPLElBQUksY0FBTSxFQUFFLENBQUMsVUFBVyxDQUFDLEdBQUcsS0FBSyxPQUFPLEVBQUU7UUFDNUQsTUFBTSxRQUFRLEdBQW9DO1lBQ2hELFVBQVUsRUFBRSxDQUFDO1lBQ2IsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QixnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BCLGtCQUFrQixFQUFFLEVBQUU7WUFDdEIsZUFBZSxFQUFFLElBQUk7WUFDckIsY0FBYyxFQUFFO2dCQUNkLE1BQU0sRUFBRSx1QkFBdUI7YUFDaEM7U0FDRixDQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztLQUM5QztJQUNELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUEzQ0Qsd0NBMkNDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixtQ0FBbUM7SUFDbkMsT0FBTyxjQUFNLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBRSxDQUFDO0FBQzVDLENBQUM7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuLyoqXG4gKiBQYWNrYWdlIHNldHRpbmcgdHlwZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFzc2V0c1Byb2Nlc3NlclNldHRpbmcge1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZmV0Y2hVcmw6IHN0cmluZyB8IG51bGw7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBmZXRjaFJldHJ5OiBudW1iZXI7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBkb3dubG9hZE1vZGU6ICdmb3JrJztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcbiAgLyoqIFJlc3BvbnNlIG1heEFnZSBoZWFkZXIgdmFsdWUgYWdhaW5zdCBkaWZmZXJlbnQgbWVkaWEgdHlwZSBmaWxlICovXG4gIGNhY2hlQ29udHJvbE1heEFnZToge1trZXk6IHN0cmluZ106IHN0cmluZyB8IG51bGx9O1xuICBmYWxsYmFja0luZGV4SHRtbDoge1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gIGh0dHBQcm94eToge1twcm94eVBhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGZldGNoTWFpbFNlcnZlcjoge1xuICAgIGltYXA6IHN0cmluZztcbiAgICBzbXRwOiBzdHJpbmc7XG4gICAgdXNlcjogc3RyaW5nO1xuICAgIGxvZ2luU2VjcmV0OiBzdHJpbmc7XG4gIH0gfCBudWxsO1xuICAvKiogU2V0dGluZyB0aGlzIHZhbHVlIHRvIHRydWUgd2lsbCBlbmFibGUgc2VydmluZyBJbmRleCBIVE1MIHBhZ2UgZm9yIHN0YXRpYyByZXNvdXJjZSB1bmRlcjpcbiAgICogIDxyb290IGRpcj4vZGlzdC9zdGF0aWMuXG4gICAqIFxuICAgKiBZb3UgbWF5IGFsc28gYXNzaWduIGEgZGlmZmVyZW50IHZhbHVlIHRvIFBsaW5rIHByb3BlcnR5IFwic3RhdGljRGlyXCIgdG8gY2hhbmdlIHN0YXRpYyByZXNvdXJjZSBkaXJlY3RvcnksXG4gICAqIGUuZy4gQnkgY29tbWFuZCBsaW5lIG9wdGlvbiBgLS1wcm9wIHN0YXRpY0Rpcj08ZGlyPmBcbiAgICovXG4gIHNlcnZlSW5kZXg6IGJvb2xlYW47XG4gIHJlcXVpcmVUb2tlbjogYm9vbGVhbjtcbiAgLyoqIEZhbGxiYWNrIGluZGV4IGh0bWwgcHJveHkgc2V0dGluZyAqL1xuICBpbmRleEh0bWxQcm94eT86IHtbdGFyZ2V0OiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG4vKipcbiAqIFBsaW5rIHJ1biB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFNldHRpbmcoKTogQXNzZXRzUHJvY2Vzc2VyU2V0dGluZyB7XG4gIGNvbnN0IGRlZmF1bHRWYWx1ZTogQXNzZXRzUHJvY2Vzc2VyU2V0dGluZyA9IHtcbiAgICBmZXRjaFVybDogbnVsbCxcbiAgICBmZXRjaFJldHJ5OiA1LFxuICAgIGRvd25sb2FkTW9kZTogJ2ZvcmsnLFxuICAgIGZldGNoTG9nRXJyUGVyVGltZXM6IDIwLFxuICAgIGZldGNoSW50ZXJ2YWxTZWM6IDkwLFxuICAgIGNhY2hlQ29udHJvbE1heEFnZToge1xuICAgICAganM6ICczNjUgZGF5cycsXG4gICAgICBjc3M6ICczNjUgZGF5cycsXG4gICAgICBsZXNzOiAnMzY1IGRheXMnLFxuICAgICAgaHRtbDogbnVsbCxcbiAgICAgIHBuZzogJzM2NSBkYXlzJyxcbiAgICAgIGpwZzogJzM2NSBkYXlzJyxcbiAgICAgIGpwZWc6ICczNjUgZGF5cycsXG4gICAgICBnaWY6ICczNjUgZGF5cycsXG4gICAgICBzdmc6ICczNjUgZGF5cycsXG4gICAgICBlb3Q6ICczNjUgZGF5cycsXG4gICAgICB0dGY6ICczNjUgZGF5cycsXG4gICAgICB3b2ZmOiAnMzY1IGRheXMnLFxuICAgICAgd29mZjI6ICczNjUgZGF5cydcbiAgICB9LFxuICAgIGZhbGxiYWNrSW5kZXhIdG1sOiB7J14vW14vPyNdKyc6ICc8JT1tYXRjaFswXSU+L2luZGV4Lmh0bWwnfSxcbiAgICBodHRwUHJveHk6IHt9LFxuICAgIGZldGNoTWFpbFNlcnZlcjogbnVsbCxcbiAgICBzZXJ2ZUluZGV4OiBmYWxzZSxcbiAgICByZXF1aXJlVG9rZW46IGZhbHNlXG4gIH07XG5cbiAgaWYgKGNvbmZpZygpLmRldk1vZGUgfHwgY29uZmlnKCkuY2xpT3B0aW9ucyEuZW52ID09PSAnbG9jYWwnKSB7XG4gICAgY29uc3QgZGV2VmFsdWU6IFBhcnRpYWw8QXNzZXRzUHJvY2Vzc2VyU2V0dGluZz4gPSB7XG4gICAgICBmZXRjaFJldHJ5OiAwLFxuICAgICAgZmV0Y2hMb2dFcnJQZXJUaW1lczogMSxcbiAgICAgIGZldGNoSW50ZXJ2YWxTZWM6IDYwLFxuICAgICAgY2FjaGVDb250cm9sTWF4QWdlOiB7fSxcbiAgICAgIGZldGNoTWFpbFNlcnZlcjogbnVsbCxcbiAgICAgIGluZGV4SHRtbFByb3h5OiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NDIwMCdcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRlZmF1bHRWYWx1ZSwgZGV2VmFsdWUpO1xuICB9XG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyAtLXByb3AgYW5kIC1jXG4gKiBAcmV0dXJuIHNldHRpbmcgb2YgY3VycmVudCBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXR0aW5nKCk6IEFzc2V0c1Byb2Nlc3NlclNldHRpbmcge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1zdHJpbmctbGl0ZXJhbFxuICByZXR1cm4gY29uZmlnKClbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddITtcbn1cbiJdfQ==