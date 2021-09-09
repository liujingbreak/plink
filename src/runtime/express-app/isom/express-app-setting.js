"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value
 */
function defaultSetting() {
    return {
        enableCORS: true
    };
}
exports.defaultSetting = defaultSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/express-app'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzcy1hcHAtc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4cHJlc3MtYXBwLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBVWxDOztHQUVHO0FBQ0gsU0FBZ0IsY0FBYztJQUM1QixPQUFPO1FBQ0wsVUFBVSxFQUFFLElBQUk7S0FDakIsQ0FBQztBQUNKLENBQUM7QUFKRCx3Q0FJQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLFVBQVU7SUFDeEIsaUVBQWlFO0lBQ2pFLE9BQU8sSUFBQSxjQUFNLEdBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxDQUFDO0FBQ3ZDLENBQUM7QUFIRCxnQ0FHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuLyoqXG4gKiBQYWNrYWdlIHNldHRpbmcgdHlwZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cHJlc3NBcHBTZXR0aW5nIHtcbiAgLyoqIGFsbG93IENPUlMgKi9cbiAgZW5hYmxlQ09SUzogYm9vbGVhbiB8IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFBsaW5rIHJ1bnMgdGhpcyBmdW50aW9uIHRvIGdldCBwYWNrYWdlIGxldmVsIHNldHRpbmcgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRTZXR0aW5nKCk6IEV4cHJlc3NBcHBTZXR0aW5nIHtcbiAgcmV0dXJuIHtcbiAgICBlbmFibGVDT1JTOiB0cnVlXG4gIH07XG59XG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyBcIi0tcHJvcFwiIGFuZCBcIi1jXCJcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKTogRXhwcmVzc0FwcFNldHRpbmcge1xuICAvKiBlc2xpbnQtZGlzYWJsZSBkb3Qtbm90YXRpb24sQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbiAqL1xuICByZXR1cm4gY29uZmlnKClbJ0B3ZmgvZXhwcmVzcy1hcHAnXSE7XG59XG4iXX0=