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
        prebuildDeployRemote: 'deploy',
        prebuildDeployBranch: 'release-server',
        tagPushRemote: 'origin',
        byEnv: {
            local: {
                installEndpoint: 'http://localhost:14333',
                sendConcurrency: 1,
                sendNodes: 1
            }
        }
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
    return plink_1.config()['@wfh/prebuild'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXlEO0FBb0J6RDs7O0dBR0c7QUFDSCxTQUFnQixjQUFjO0lBQzVCLE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxvQkFBb0IsRUFBRSxRQUFRO1FBQzlCLG9CQUFvQixFQUFFLGdCQUFnQjtRQUN0QyxhQUFhLEVBQUUsUUFBUTtRQUN2QixLQUFLLEVBQUU7WUFDTCxLQUFLLEVBQUU7Z0JBQ0wsZUFBZSxFQUFFLHdCQUF3QjtnQkFDekMsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDO2FBQ2I7U0FDRjtLQUNGLENBQUM7SUFDRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBZEQsd0NBY0M7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLG1DQUFtQztJQUNuQyxPQUFPLGNBQU0sRUFBRSxDQUFDLGVBQWUsQ0FBRSxDQUFDO0FBQ3BDLENBQUM7QUFIRCxnQ0FHQztBQUVELE1BQU0sZUFBZSxHQUEwQjtJQUMzQywwRUFBMEU7SUFDMUUsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDaEMsa0VBQWtFO0lBQ3BFLENBQUM7SUFDRCx1R0FBdUc7SUFDdkcsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDL0Isa0VBQWtFO0lBQ3BFLENBQUM7Q0FDSixDQUFDO0FBRUYsa0JBQWUsZUFBZSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWcsIEluamVjdG9yQ29uZmlnSGFuZGxlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcmVidWlsZFNldHRpbmcge1xuICAvKiogQnVpbGQgdGFyZ2V0IEdpdCByZW1vdGUgbmFtZSAqL1xuICBwcmVidWlsZERlcGxveVJlbW90ZTogc3RyaW5nO1xuICAvKiogQnVpbGQgdGFyZ2UgR2l0IGJyYW5jaCBuYW1lICovXG4gIHByZWJ1aWxkRGVwbG95QnJhbmNoOiBzdHJpbmc7XG4gIC8qKiBCdWlsZCB0YXJnZXQgR2l0IHJlbW90ZSBuYW1lIGZvciB0YWcgb25seSAqL1xuICB0YWdQdXNoUmVtb3RlOiBzdHJpbmc7XG5cbiAgYnlFbnY6IHtbZW52OiBzdHJpbmddOiB7XG4gICAgaW5zdGFsbEVuZHBvaW50OiBzdHJpbmc7XG4gICAgc2VuZENvbmN1cnJlbmN5OiBudW1iZXI7XG4gICAgc2VuZE5vZGVzOiBudW1iZXI7XG4gIH19O1xufVxuXG4vKipcbiAqIFBsaW5rIHJ1bnMgdGhpcyBmdW50aW9uIHRvIGdldCBwYWNrYWdlIGxldmVsIHNldHRpbmcgdmFsdWUsXG4gKiBmdW5jdGlvbiBuYW1lIFwiZGVmYXVsdFNldHRpbmdcIiBtdXN0IGJlIGFsc28gY29uZmlndXJlZCBpbiBwYWNrYWdlLmpzb24gZmlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFNldHRpbmcoKTogUHJlYnVpbGRTZXR0aW5nIHtcbiAgY29uc3QgZGVmYXVsdFZhbHVlOiBQcmVidWlsZFNldHRpbmcgPSB7XG4gICAgcHJlYnVpbGREZXBsb3lSZW1vdGU6ICdkZXBsb3knLFxuICAgIHByZWJ1aWxkRGVwbG95QnJhbmNoOiAncmVsZWFzZS1zZXJ2ZXInLFxuICAgIHRhZ1B1c2hSZW1vdGU6ICdvcmlnaW4nLFxuICAgIGJ5RW52OiB7XG4gICAgICBsb2NhbDoge1xuICAgICAgICBpbnN0YWxsRW5kcG9pbnQ6ICdodHRwOi8vbG9jYWxob3N0OjE0MzMzJyxcbiAgICAgICAgc2VuZENvbmN1cnJlbmN5OiAxLFxuICAgICAgICBzZW5kTm9kZXM6IDFcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyBcIi0tcHJvcFwiIGFuZCBcIi1jXCJcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlOm5vLXN0cmluZy1saXRlcmFsXG4gIHJldHVybiBjb25maWcoKVsnQHdmaC9wcmVidWlsZCddITtcbn1cblxuY29uc3Qgb3RoZXJDb25maWd1cmVzOiBJbmplY3RvckNvbmZpZ0hhbmRsZXIgPSB7XG4gICAgLyoqIEZvciBOb2RlLmpzIHJ1bnRpbWUsIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICAgIHNldHVwTm9kZUluamVjdG9yKGZhY3RvcnksIHNldHRpbmcpIHtcbiAgICAgIC8vIGZhY3RvcnkuZnJvbVBhY2thZ2UoJ0B3ZmgvZm9vYmFyJykuYWxpYXMoJ21vZHVsZUEnLCAnbW9kdWxlQicpO1xuICAgIH0sXG4gICAgLyoqIEZvciBDbGllbnQgZnJhbWV3b3JrIGJ1aWxkIHRvb2wgKFJlYWN0LCBBbmd1bGFyKSwgcmVwbGFjZSBtb2R1bGUgaW4gXCJyZXF1aXJlKClcIiBvciBpbXBvcnQgc3ludGF4ICovXG4gICAgc2V0dXBXZWJJbmplY3RvcihmYWN0b3J5LCBzZXR0aW5nKSB7XG4gICAgICAvLyBmYWN0b3J5LmZyb21QYWNrYWdlKCdAd2ZoL2Zvb2JhcicpLmFsaWFzKCdtb2R1bGVBJywgJ21vZHVsZUInKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBvdGhlckNvbmZpZ3VyZXM7XG4iXX0=