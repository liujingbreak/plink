"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = exports.defaultSetting = void 0;
const plink_1 = require("@wfh/plink");
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
function defaultSetting(cliOptions) {
    const defaultValue = {
        materialTheme: 'default'
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
    return plink_1.config()['@wfh/doc-ui-common'];
}
exports.getSetting = getSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLXVpLWNvbW1vbi1zZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZG9jLXVpLWNvbW1vbi1zZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFpRDtBQVVqRDs7O0dBR0c7QUFDSCxTQUFnQixjQUFjLENBQUMsVUFBb0Q7SUFDakYsTUFBTSxZQUFZLEdBQXVCO1FBQ3ZDLGFBQWEsRUFBRSxTQUFTO0tBQ3pCLENBQUM7SUFFRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBTkQsd0NBTUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVO0lBQ3hCLG1DQUFtQztJQUNuQyxPQUFPLGNBQU0sRUFBRSxDQUFDLG9CQUFvQixDQUFFLENBQUM7QUFDekMsQ0FBQztBQUhELGdDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWcsIFBsaW5rU2V0dGluZ3N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG4vKipcbiAqIFBhY2thZ2Ugc2V0dGluZyB0eXBlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9jVWlDb21tb25TZXR0aW5nIHtcbiAgLyoqIFRoZW1lIG9mIE1hdGVyaWFsIGRlc2lnbiAqL1xuICBtYXRlcmlhbFRoZW1lOiAnZGVmYXVsdCcgfCAndWdseSc7XG59XG5cbi8qKlxuICogUGxpbmsgcnVucyB0aGlzIGZ1bnRpb24gdG8gZ2V0IHBhY2thZ2UgbGV2ZWwgc2V0dGluZyB2YWx1ZSxcbiAqIGZ1bmN0aW9uIG5hbWUgXCJkZWZhdWx0U2V0dGluZ1wiIG11c3QgYmUgYWxzbyBjb25maWd1cmVkIGluIHBhY2thZ2UuanNvbiBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0U2V0dGluZyhjbGlPcHRpb25zOiBOb25OdWxsYWJsZTxQbGlua1NldHRpbmdzWydjbGlPcHRpb25zJ10+KTogRG9jVWlDb21tb25TZXR0aW5nIHtcbiAgY29uc3QgZGVmYXVsdFZhbHVlOiBEb2NVaUNvbW1vblNldHRpbmcgPSB7XG4gICAgbWF0ZXJpYWxUaGVtZTogJ2RlZmF1bHQnXG4gIH07XG5cbiAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHNldHRpbmcgdmFsdWUgaXMgbWVyZ2VkIHdpdGggZmlsZXMgc3BlY2lmaWVkIGJ5IGNvbW1hbmQgbGluZSBvcHRpb25zIFwiLS1wcm9wXCIgYW5kIFwiLWNcIlxuICogQHJldHVybiBzZXR0aW5nIG9mIGN1cnJlbnQgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2V0dGluZygpIHtcbiAgLy8gdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWxcbiAgcmV0dXJuIGNvbmZpZygpWydAd2ZoL2RvYy11aS1jb21tb24nXSE7XG59XG4iXX0=