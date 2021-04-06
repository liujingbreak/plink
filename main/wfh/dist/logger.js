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
    const pkg = package_info_gathering_1.packageOfFileFactory().getPkgOfFile(file);
    if (pkg) {
        return log4js.getLogger(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
    else {
        return log4js.getLogger(/^(.*?)\.[^.]*$/.exec(path_1.default.basename(file))[1]);
    }
}
exports.log4File = log4File;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFDakMsaUZBQTBFO0FBQzFFLGdEQUF3QjtBQUN4Qjs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFZO0lBQ25DLE1BQU0sR0FBRyxHQUFHLDZDQUFvQixFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RELElBQUksR0FBRyxFQUFFO1FBQ1AsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxRjtTQUFNO1FBQ0wsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6RTtBQUNILENBQUM7QUFQRCw0QkFPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwYWNrYWdlT2ZGaWxlRmFjdG9yeX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuLyoqXG4gKiBHZXQgbG9nNGpzIExvZ2dlciBmb3Igc3BlY2lmaWMgbm9kZS5qcyBmaWxlLCB0aGUgb3V0cHV0IGxvZyB3aWxsIGhhdmVcbiAqIGNhdGVnb3J5IGluIGZvcm0gb2YgXCI8cGtnIG5hbWU+LjxmaWxlIGJhc2UgbmFtZT5cIlxuICogXG4gKiBVc2FnZTpcbiAqIC0gQ29tbW9uIEpTIG1vZHVsZSAoY2pzKTogbG9nZ2VyRm9yRmlsZShfX2ZpbGVuYW1lKTtcbiAqIC0gRUpTIG1vZHVsZSAobWpzKTogbG9nZ2VyRm9yRmlsZShuZXcgVVJMKGltcG9ydC5tZXRhLnVybCkucGF0aG5hbWUpXG4gKiBAcGFyYW0gZmlsZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZzRGaWxlKGZpbGU6IHN0cmluZykge1xuICBjb25zdCBwa2cgPSBwYWNrYWdlT2ZGaWxlRmFjdG9yeSgpLmdldFBrZ09mRmlsZShmaWxlKTtcbiAgaWYgKHBrZykge1xuICAgIHJldHVybiBsb2c0anMuZ2V0TG9nZ2VyKHBrZy5uYW1lICsgJy4nICsgL14oLio/KVxcLlteLl0qJC8uZXhlYyhwYXRoLmJhc2VuYW1lKGZpbGUpKSFbMV0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsb2c0anMuZ2V0TG9nZ2VyKC9eKC4qPylcXC5bXi5dKiQvLmV4ZWMocGF0aC5iYXNlbmFtZShmaWxlKSkhWzFdKTtcbiAgfVxufVxuIl19