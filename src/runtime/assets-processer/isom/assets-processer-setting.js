"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink run this funtion to get package level setting value
 */
function default_1() {
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
exports.default = default_1;
/**
 * The return setting value is merged with files specified by command line options --prop and -c
 * @return setting of current package
 */
function getSetting() {
    // tslint:disable:no-string-literal
    return plink_1.config()['@wfh/assets-processer'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFrQztBQXNDbEM7O0dBRUc7QUFDSDtJQUNFLE1BQU0sWUFBWSxHQUEyQjtRQUMzQyxRQUFRLEVBQUUsSUFBSTtRQUNkLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLE1BQU07UUFDcEIsbUJBQW1CLEVBQUUsRUFBRTtRQUN2QixnQkFBZ0IsRUFBRSxFQUFFO1FBQ3BCLGtCQUFrQixFQUFFO1lBQ2xCLEVBQUUsRUFBRSxVQUFVO1lBQ2QsR0FBRyxFQUFFLFVBQVU7WUFDZixJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsSUFBSTtZQUNWLEdBQUcsRUFBRSxVQUFVO1lBQ2YsR0FBRyxFQUFFLFVBQVU7WUFDZixJQUFJLEVBQUUsVUFBVTtZQUNoQixHQUFHLEVBQUUsVUFBVTtZQUNmLEdBQUcsRUFBRSxVQUFVO1lBQ2YsR0FBRyxFQUFFLFVBQVU7WUFDZixHQUFHLEVBQUUsVUFBVTtZQUNmLElBQUksRUFBRSxVQUFVO1lBQ2hCLEtBQUssRUFBRSxVQUFVO1NBQ2xCO1FBQ0QsaUJBQWlCLEVBQUUsRUFBQyxXQUFXLEVBQUUsMEJBQTBCLEVBQUM7UUFDNUQsU0FBUyxFQUFFLEVBQUU7UUFDYixlQUFlLEVBQUUsSUFBSTtRQUNyQixVQUFVLEVBQUUsS0FBSztRQUNqQixZQUFZLEVBQUUsS0FBSztLQUNwQixDQUFDO0lBRUYsSUFBSSxjQUFNLEVBQUUsQ0FBQyxPQUFPLElBQUksY0FBTSxFQUFFLENBQUMsVUFBVyxDQUFDLEdBQUcsS0FBSyxPQUFPLEVBQUU7UUFDNUQsTUFBTSxRQUFRLEdBQW9DO1lBQ2hELFVBQVUsRUFBRSxDQUFDO1lBQ2IsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QixnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BCLGtCQUFrQixFQUFFLEVBQUU7WUFDdEIsZUFBZSxFQUFFLElBQUk7WUFDckIsY0FBYyxFQUFFO2dCQUNkLE1BQU0sRUFBRSx1QkFBdUI7YUFDaEM7U0FDRixDQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztLQUM5QztJQUNELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUEzQ0QsNEJBMkNDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixtQ0FBbUM7SUFDbkMsT0FBTyxjQUFNLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBRSxDQUFDO0FBQzVDLENBQUM7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuLyoqXG4gKiBQYWNrYWdlIHNldHRpbmcgdHlwZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFzc2V0c1Byb2Nlc3NlclNldHRpbmcge1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgZmV0Y2hVcmw6IHN0cmluZyB8IG51bGw7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBmZXRjaFJldHJ5OiBudW1iZXI7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBkb3dubG9hZE1vZGU6ICdmb3JrJztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcbiAgLyoqIFJlc3BvbnNlIG1heEFnZSBoZWFkZXIgdmFsdWUgYWdhaW5zdCBkaWZmZXJlbnQgbWVkaWEgdHlwZSBmaWxlICovXG4gIGNhY2hlQ29udHJvbE1heEFnZToge1trZXk6IHN0cmluZ106IHN0cmluZyB8IG51bGx9O1xuICBmYWxsYmFja0luZGV4SHRtbDoge1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gIGh0dHBQcm94eToge1twcm94eVBhdGg6IHN0cmluZ106IHN0cmluZ307XG4gIGZldGNoTWFpbFNlcnZlcjoge1xuICAgIGltYXA6IHN0cmluZztcbiAgICBzbXRwOiBzdHJpbmc7XG4gICAgdXNlcjogc3RyaW5nO1xuICAgIGxvZ2luU2VjcmV0OiBzdHJpbmc7XG4gIH0gfCBudWxsO1xuICAvKiogU2V0dGluZyB0aGlzIHZhbHVlIHRvIHRydWUgd2lsbCBlbmFibGUgc2VydmluZyBJbmRleCBIVE1MIHBhZ2UgZm9yIHN0YXRpYyByZXNvdXJjZSB1bmRlcjpcbiAgICogIDxyb290IGRpcj4vZGlzdC9zdGF0aWMuXG4gICAqIFxuICAgKiBZb3UgbWF5IGFsc28gYXNzaWduIGEgZGlmZmVyZW50IHZhbHVlIHRvIFBsaW5rIHByb3BlcnR5IFwic3RhdGljRGlyXCIgdG8gY2hhbmdlIHN0YXRpYyByZXNvdXJjZSBkaXJlY3RvcnksXG4gICAqIGUuZy4gQnkgY29tbWFuZCBsaW5lIG9wdGlvbiBgLS1wcm9wIHN0YXRpY0Rpcj08ZGlyPmBcbiAgICovXG4gIHNlcnZlSW5kZXg6IGJvb2xlYW47XG4gIHJlcXVpcmVUb2tlbjogYm9vbGVhbjtcbiAgLyoqIEZhbGxiYWNrIGluZGV4IGh0bWwgcHJveHkgc2V0dGluZyAqL1xuICBpbmRleEh0bWxQcm94eT86IHtbdGFyZ2V0OiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG4vKipcbiAqIFBsaW5rIHJ1biB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpOiBBc3NldHNQcm9jZXNzZXJTZXR0aW5nIHtcbiAgY29uc3QgZGVmYXVsdFZhbHVlOiBBc3NldHNQcm9jZXNzZXJTZXR0aW5nID0ge1xuICAgIGZldGNoVXJsOiBudWxsLFxuICAgIGZldGNoUmV0cnk6IDUsXG4gICAgZG93bmxvYWRNb2RlOiAnZm9yaycsXG4gICAgZmV0Y2hMb2dFcnJQZXJUaW1lczogMjAsXG4gICAgZmV0Y2hJbnRlcnZhbFNlYzogOTAsXG4gICAgY2FjaGVDb250cm9sTWF4QWdlOiB7XG4gICAgICBqczogJzM2NSBkYXlzJyxcbiAgICAgIGNzczogJzM2NSBkYXlzJyxcbiAgICAgIGxlc3M6ICczNjUgZGF5cycsXG4gICAgICBodG1sOiBudWxsLFxuICAgICAgcG5nOiAnMzY1IGRheXMnLFxuICAgICAganBnOiAnMzY1IGRheXMnLFxuICAgICAganBlZzogJzM2NSBkYXlzJyxcbiAgICAgIGdpZjogJzM2NSBkYXlzJyxcbiAgICAgIHN2ZzogJzM2NSBkYXlzJyxcbiAgICAgIGVvdDogJzM2NSBkYXlzJyxcbiAgICAgIHR0ZjogJzM2NSBkYXlzJyxcbiAgICAgIHdvZmY6ICczNjUgZGF5cycsXG4gICAgICB3b2ZmMjogJzM2NSBkYXlzJ1xuICAgIH0sXG4gICAgZmFsbGJhY2tJbmRleEh0bWw6IHsnXi9bXi8/I10rJzogJzwlPW1hdGNoWzBdJT4vaW5kZXguaHRtbCd9LFxuICAgIGh0dHBQcm94eToge30sXG4gICAgZmV0Y2hNYWlsU2VydmVyOiBudWxsLFxuICAgIHNlcnZlSW5kZXg6IGZhbHNlLFxuICAgIHJlcXVpcmVUb2tlbjogZmFsc2VcbiAgfTtcblxuICBpZiAoY29uZmlnKCkuZGV2TW9kZSB8fCBjb25maWcoKS5jbGlPcHRpb25zIS5lbnYgPT09ICdsb2NhbCcpIHtcbiAgICBjb25zdCBkZXZWYWx1ZTogUGFydGlhbDxBc3NldHNQcm9jZXNzZXJTZXR0aW5nPiA9IHtcbiAgICAgIGZldGNoUmV0cnk6IDAsXG4gICAgICBmZXRjaExvZ0VyclBlclRpbWVzOiAxLFxuICAgICAgZmV0Y2hJbnRlcnZhbFNlYzogNjAsXG4gICAgICBjYWNoZUNvbnRyb2xNYXhBZ2U6IHt9LFxuICAgICAgZmV0Y2hNYWlsU2VydmVyOiBudWxsLFxuICAgICAgaW5kZXhIdG1sUHJveHk6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo0MjAwJ1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oZGVmYXVsdFZhbHVlLCBkZXZWYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHNldHRpbmcgdmFsdWUgaXMgbWVyZ2VkIHdpdGggZmlsZXMgc3BlY2lmaWVkIGJ5IGNvbW1hbmQgbGluZSBvcHRpb25zIC0tcHJvcCBhbmQgLWNcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKTogQXNzZXRzUHJvY2Vzc2VyU2V0dGluZyB7XG4gIC8vIHRzbGludDpkaXNhYmxlOm5vLXN0cmluZy1saXRlcmFsXG4gIHJldHVybiBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10hO1xufVxuIl19