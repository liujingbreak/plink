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
        prebuildGitRemote: 'deploy',
        prebuildReleaseBranch: 'release-server',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXlEO0FBb0J6RDs7O0dBR0c7QUFDSCxTQUFnQixjQUFjO0lBQzVCLE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxpQkFBaUIsRUFBRSxRQUFRO1FBQzNCLHFCQUFxQixFQUFFLGdCQUFnQjtRQUN2QyxhQUFhLEVBQUUsUUFBUTtRQUN2QixLQUFLLEVBQUU7WUFDTCxLQUFLLEVBQUU7Z0JBQ0wsZUFBZSxFQUFFLHdCQUF3QjtnQkFDekMsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDO2FBQ2I7U0FDRjtLQUNGLENBQUM7SUFDRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBZEQsd0NBY0M7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLG1DQUFtQztJQUNuQyxPQUFPLGNBQU0sRUFBRSxDQUFDLGVBQWUsQ0FBRSxDQUFDO0FBQ3BDLENBQUM7QUFIRCxnQ0FHQztBQUVELE1BQU0sZUFBZSxHQUEwQjtJQUMzQywwRUFBMEU7SUFDMUUsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDaEMsa0VBQWtFO0lBQ3BFLENBQUM7SUFDRCx1R0FBdUc7SUFDdkcsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU87UUFDL0Isa0VBQWtFO0lBQ3BFLENBQUM7Q0FDSixDQUFDO0FBRUYsa0JBQWUsZUFBZSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWcsIEluamVjdG9yQ29uZmlnSGFuZGxlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcmVidWlsZFNldHRpbmcge1xuICAvKiogQnVpbGQgdGFyZ2V0IEdpdCByZW1vdGUgbmFtZSAqL1xuICBwcmVidWlsZEdpdFJlbW90ZTogc3RyaW5nO1xuICAvKiogQnVpbGQgdGFyZ2UgR2l0IGJyYW5jaCBuYW1lICovXG4gIHByZWJ1aWxkUmVsZWFzZUJyYW5jaDogc3RyaW5nO1xuICAvKiogQnVpbGQgdGFyZ2V0IEdpdCByZW1vdGUgbmFtZSBmb3IgdGFnIG9ubHkgKi9cbiAgdGFnUHVzaFJlbW90ZTogc3RyaW5nO1xuXG4gIGJ5RW52OiB7W2Vudjogc3RyaW5nXToge1xuICAgIGluc3RhbGxFbmRwb2ludDogc3RyaW5nO1xuICAgIHNlbmRDb25jdXJyZW5jeTogbnVtYmVyO1xuICAgIHNlbmROb2RlczogbnVtYmVyO1xuICB9fTtcbn1cblxuLyoqXG4gKiBQbGluayBydW5zIHRoaXMgZnVudGlvbiB0byBnZXQgcGFja2FnZSBsZXZlbCBzZXR0aW5nIHZhbHVlLFxuICogZnVuY3Rpb24gbmFtZSBcImRlZmF1bHRTZXR0aW5nXCIgbXVzdCBiZSBhbHNvIGNvbmZpZ3VyZWQgaW4gcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTZXR0aW5nKCk6IFByZWJ1aWxkU2V0dGluZyB7XG4gIGNvbnN0IGRlZmF1bHRWYWx1ZTogUHJlYnVpbGRTZXR0aW5nID0ge1xuICAgIHByZWJ1aWxkR2l0UmVtb3RlOiAnZGVwbG95JyxcbiAgICBwcmVidWlsZFJlbGVhc2VCcmFuY2g6ICdyZWxlYXNlLXNlcnZlcicsXG4gICAgdGFnUHVzaFJlbW90ZTogJ29yaWdpbicsXG4gICAgYnlFbnY6IHtcbiAgICAgIGxvY2FsOiB7XG4gICAgICAgIGluc3RhbGxFbmRwb2ludDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMnLFxuICAgICAgICBzZW5kQ29uY3VycmVuY3k6IDEsXG4gICAgICAgIHNlbmROb2RlczogMVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHNldHRpbmcgdmFsdWUgaXMgbWVyZ2VkIHdpdGggZmlsZXMgc3BlY2lmaWVkIGJ5IGNvbW1hbmQgbGluZSBvcHRpb25zIFwiLS1wcm9wXCIgYW5kIFwiLWNcIlxuICogQHJldHVybiBzZXR0aW5nIG9mIGN1cnJlbnQgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2V0dGluZygpIHtcbiAgLy8gdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWxcbiAgcmV0dXJuIGNvbmZpZygpWydAd2ZoL3ByZWJ1aWxkJ10hO1xufVxuXG5jb25zdCBvdGhlckNvbmZpZ3VyZXM6IEluamVjdG9yQ29uZmlnSGFuZGxlciA9IHtcbiAgICAvKiogRm9yIE5vZGUuanMgcnVudGltZSwgcmVwbGFjZSBtb2R1bGUgaW4gXCJyZXF1aXJlKClcIiBvciBpbXBvcnQgc3ludGF4ICovXG4gICAgc2V0dXBOb2RlSW5qZWN0b3IoZmFjdG9yeSwgc2V0dGluZykge1xuICAgICAgLy8gZmFjdG9yeS5mcm9tUGFja2FnZSgnQHdmaC9mb29iYXInKS5hbGlhcygnbW9kdWxlQScsICdtb2R1bGVCJyk7XG4gICAgfSxcbiAgICAvKiogRm9yIENsaWVudCBmcmFtZXdvcmsgYnVpbGQgdG9vbCAoUmVhY3QsIEFuZ3VsYXIpLCByZXBsYWNlIG1vZHVsZSBpbiBcInJlcXVpcmUoKVwiIG9yIGltcG9ydCBzeW50YXggKi9cbiAgICBzZXR1cFdlYkluamVjdG9yKGZhY3RvcnksIHNldHRpbmcpIHtcbiAgICAgIC8vIGZhY3RvcnkuZnJvbVBhY2thZ2UoJ0B3ZmgvZm9vYmFyJykuYWxpYXMoJ21vZHVsZUEnLCAnbW9kdWxlQicpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG90aGVyQ29uZmlndXJlcztcbiJdfQ==