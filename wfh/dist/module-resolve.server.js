"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
function default_1(injector) {
    const config = require('./lib/config');
    const chalk = require('chalk');
    injector.fromAllComponents()
        .factory('chalk', function () {
        return new chalk.constructor({ enabled: config.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false' });
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLXJlc29sdmUuc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbW9kdWxlLXJlc29sdmUuc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLDBDQUE0QjtBQUU1QixtQkFBd0IsUUFBMkI7SUFDakQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRXZDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvQixRQUFRLENBQUMsaUJBQWlCLEVBQUU7U0FDM0IsT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUNoQixPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FDMUIsRUFBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssT0FBTyxFQUFDLENBQUMsQ0FBQztJQUM1RyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFURCw0QkFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCB7RHJQYWNrYWdlSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluamVjdG9yOiBEclBhY2thZ2VJbmplY3Rvcikge1xuICBjb25zdCBjb25maWcgPSByZXF1aXJlKCcuL2xpYi9jb25maWcnKTtcblxuICBjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG4gIGluamVjdG9yLmZyb21BbGxDb21wb25lbnRzKClcbiAgLmZhY3RvcnkoJ2NoYWxrJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBjaGFsay5jb25zdHJ1Y3RvcihcbiAgICAgIHtlbmFibGVkOiBjb25maWcuZ2V0KCdjb2xvcmZ1bENvbnNvbGUnKSAhPT0gZmFsc2UgJiYgXy50b0xvd2VyKHByb2Nlc3MuZW52LkNIQUxLX0VOQUJMRUQpICE9PSAnZmFsc2UnfSk7XG4gIH0pO1xufVxuIl19