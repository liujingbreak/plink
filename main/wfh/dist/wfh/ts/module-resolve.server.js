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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const config_1 = __importDefault(require("./config"));
function default_1(injector) {
    const chalk = require('chalk');
    injector.fromAllComponents()
        .factory('chalk', function () {
        return new chalk.constructor({ enabled: config_1.default.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false' });
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLXJlc29sdmUuc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdHMvbW9kdWxlLXJlc29sdmUuc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDBDQUE0QjtBQUM1QixzREFBOEI7QUFFOUIsbUJBQXdCLFFBQTJCO0lBRWpELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvQixRQUFRLENBQUMsaUJBQWlCLEVBQUU7U0FDM0IsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUNoQixPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FDMUIsRUFBQyxPQUFPLEVBQUUsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLE9BQU8sRUFBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBUkQsNEJBUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQge0RyUGFja2FnZUluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluamVjdG9yOiBEclBhY2thZ2VJbmplY3Rvcikge1xuXG4gIGNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbiAgaW5qZWN0b3IuZnJvbUFsbENvbXBvbmVudHMoKVxuICAuZmFjdG9yeSgnY2hhbGsnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IGNoYWxrLmNvbnN0cnVjdG9yKFxuICAgICAge2VuYWJsZWQ6IGNvbmZpZy5nZXQoJ2NvbG9yZnVsQ29uc29sZScpICE9PSBmYWxzZSAmJiBfLnRvTG93ZXIocHJvY2Vzcy5lbnYuQ0hBTEtfRU5BQkxFRCkgIT09ICdmYWxzZSd9KTtcbiAgfSk7XG59XG4iXX0=