"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log4File = void 0;
const log4js = __importStar(require("log4js"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const path_1 = __importDefault(require("path"));
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 *
 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file
 */
function log4File(file) {
    const pkg = (0, package_info_gathering_1.packageOfFileFactory)().getPkgOfFile(file);
    if (pkg) {
        return log4js.getLogger(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
    else {
        return log4js.getLogger(/^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
}
exports.log4File = log4File;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFDakMsaUZBQTBFO0FBQzFFLGdEQUF3QjtBQUN4Qjs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFZO0lBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUEsNkNBQW9CLEdBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEQsSUFBSSxHQUFHLEVBQUU7UUFDUCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzFGO1NBQU07UUFDTCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pFO0FBQ0gsQ0FBQztBQVBELDRCQU9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge3BhY2thZ2VPZkZpbGVGYWN0b3J5fSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG4vKipcbiAqIEdldCBsb2c0anMgTG9nZ2VyIGZvciBzcGVjaWZpYyBub2RlLmpzIGZpbGUsIHRoZSBvdXRwdXQgbG9nIHdpbGwgaGF2ZVxuICogY2F0ZWdvcnkgaW4gZm9ybSBvZiBcIjxwa2cgbmFtZT4uPGZpbGUgYmFzZSBuYW1lPlwiXG4gKiBcbiAqIFVzYWdlOlxuICogLSBDb21tb24gSlMgbW9kdWxlIChjanMpOiBsb2dnZXJGb3JGaWxlKF9fZmlsZW5hbWUpO1xuICogLSBFSlMgbW9kdWxlIChtanMpOiBsb2dnZXJGb3JGaWxlKG5ldyBVUkwoaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZSlcbiAqIEBwYXJhbSBmaWxlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nNEZpbGUoZmlsZTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZyA9IHBhY2thZ2VPZkZpbGVGYWN0b3J5KCkuZ2V0UGtnT2ZGaWxlKGZpbGUpO1xuICBpZiAocGtnKSB7XG4gICAgcmV0dXJuIGxvZzRqcy5nZXRMb2dnZXIocGtnLm5hbWUgKyAnLicgKyAvXiguKj8pXFwuW14uXSokLy5leGVjKHBhdGguYmFzZW5hbWUoZmlsZSkpIVsxXSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxvZzRqcy5nZXRMb2dnZXIoL14oLio/KVxcLlteLl0qJC8uZXhlYyhwYXRoLmJhc2VuYW1lKGZpbGUpKSFbMV0pO1xuICB9XG59XG4iXX0=