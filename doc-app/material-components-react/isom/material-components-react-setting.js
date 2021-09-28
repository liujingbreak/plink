"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
/**
 * This file is generated by @wfh/tool-misc
 */
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
const defaultSetting = function (cliOptions) {
    const defaultValue = {
        materialTheme: 'default'
    };
    return defaultValue;
};
exports.defaultSetting = defaultSetting;
/** For Node.js runtime, replace module in "require()" or import syntax */
exports.defaultSetting.setupNodeInjector = function (factory, allSetting) {
    // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
};
/** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
exports.defaultSetting.setupWebInjector = function (factory, allSetting) {
    // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
};
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
function getSetting() {
    /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
    return (0, plink_1.config)()['@wfh/material-components-react'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtY29tcG9uZW50cy1yZWFjdC1zZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWF0ZXJpYWwtY29tcG9uZW50cy1yZWFjdC1zZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOztHQUVHO0FBQ0gsc0NBQXdEO0FBVXhEOzs7R0FHRztBQUNJLE1BQU0sY0FBYyxHQUF5RCxVQUFTLFVBQVU7SUFDckcsTUFBTSxZQUFZLEdBQW1DO1FBQ25ELGFBQWEsRUFBRSxTQUFTO0tBQ3pCLENBQUM7SUFFRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDLENBQUM7QUFOVyxRQUFBLGNBQWMsa0JBTXpCO0FBRUYsMEVBQTBFO0FBQzFFLHNCQUFjLENBQUMsaUJBQWlCLEdBQUcsVUFBUyxPQUFPLEVBQUUsVUFBVTtJQUM3RCxrRUFBa0U7QUFDcEUsQ0FBQyxDQUFDO0FBQ0YsdUdBQXVHO0FBQ3ZHLHNCQUFjLENBQUMsZ0JBQWdCLEdBQUcsVUFBUyxPQUFPLEVBQUUsVUFBVTtJQUM1RCxrRUFBa0U7QUFDcEUsQ0FBQyxDQUFDO0FBR0Y7OztHQUdHO0FBQ0gsU0FBZ0IsVUFBVTtJQUN4QixpRUFBaUU7SUFDakUsT0FBTyxJQUFBLGNBQU0sR0FBRSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUhELGdDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IEB3ZmgvdG9vbC1taXNjXG4gKi9cbmltcG9ydCB7Y29uZmlnLCBQYWNrYWdlU2V0dGluZ0ludGVyZn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8qKlxuICogUGFja2FnZSBzZXR0aW5nIHR5cGVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRlcmlhbENvbXBvbmVudHNSZWFjdFNldHRpbmcge1xuICAvKiogVGhlbWUgb2YgTWF0ZXJpYWwgZGVzaWduICovXG4gIG1hdGVyaWFsVGhlbWU6ICdkZWZhdWx0JyB8ICd1Z2x5Jztcbn1cblxuLyoqXG4gKiBQbGluayBydW5zIHRoaXMgZnVudGlvbiB0byBnZXQgcGFja2FnZSBsZXZlbCBzZXR0aW5nIHZhbHVlLFxuICogZnVuY3Rpb24gbmFtZSBcImRlZmF1bHRTZXR0aW5nXCIgbXVzdCBiZSBhbHNvIGNvbmZpZ3VyZWQgaW4gcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGNvbnN0IGRlZmF1bHRTZXR0aW5nOiBQYWNrYWdlU2V0dGluZ0ludGVyZjxNYXRlcmlhbENvbXBvbmVudHNSZWFjdFNldHRpbmc+ID0gZnVuY3Rpb24oY2xpT3B0aW9ucykge1xuICBjb25zdCBkZWZhdWx0VmFsdWU6IE1hdGVyaWFsQ29tcG9uZW50c1JlYWN0U2V0dGluZyA9IHtcbiAgICBtYXRlcmlhbFRoZW1lOiAnZGVmYXVsdCdcbiAgfTtcblxuICByZXR1cm4gZGVmYXVsdFZhbHVlO1xufTtcblxuLyoqIEZvciBOb2RlLmpzIHJ1bnRpbWUsIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuZGVmYXVsdFNldHRpbmcuc2V0dXBOb2RlSW5qZWN0b3IgPSBmdW5jdGlvbihmYWN0b3J5LCBhbGxTZXR0aW5nKSB7XG4gIC8vIGZhY3RvcnkuZnJvbVBhY2thZ2UoJ0B3ZmgvZm9vYmFyJykuYWxpYXMoJ21vZHVsZUEnLCAnbW9kdWxlQicpO1xufTtcbi8qKiBGb3IgQ2xpZW50IGZyYW1ld29yayBidWlsZCB0b29sIChSZWFjdCwgQW5ndWxhciksIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuZGVmYXVsdFNldHRpbmcuc2V0dXBXZWJJbmplY3RvciA9IGZ1bmN0aW9uKGZhY3RvcnksIGFsbFNldHRpbmcpIHtcbiAgLy8gZmFjdG9yeS5mcm9tUGFja2FnZSgnQHdmaC9mb29iYXInKS5hbGlhcygnbW9kdWxlQScsICdtb2R1bGVCJyk7XG59O1xuXG5cbi8qKlxuICogVGhlIHJldHVybiBzZXR0aW5nIHZhbHVlIGlzIG1lcmdlZCB3aXRoIGZpbGVzIHNwZWNpZmllZCBieSBjb21tYW5kIGxpbmUgb3B0aW9ucyBcIi0tcHJvcFwiIGFuZCBcIi1jXCJcbiAqIEByZXR1cm4gc2V0dGluZyBvZiBjdXJyZW50IHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNldHRpbmcoKSB7XG4gIC8qIGVzbGludC1kaXNhYmxlIGRvdC1ub3RhdGlvbixAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uICovXG4gIHJldHVybiBjb25maWcoKVsnQHdmaC9tYXRlcmlhbC1jb21wb25lbnRzLXJlYWN0J107XG59XG4iXX0=