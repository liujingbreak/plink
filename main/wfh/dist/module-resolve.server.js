"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLXJlc29sdmUuc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbW9kdWxlLXJlc29sdmUuc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSwwQ0FBNEI7QUFDNUIsc0RBQThCO0FBRTlCLG1CQUF3QixRQUEyQjtJQUVqRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0IsUUFBUSxDQUFDLGlCQUFpQixFQUFFO1NBQzNCLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDaEIsT0FBTyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQzFCLEVBQUMsT0FBTyxFQUFFLGdCQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxPQUFPLEVBQUMsQ0FBQyxDQUFDO0lBQzVHLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVJELDRCQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHtEclBhY2thZ2VJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbmplY3RvcjogRHJQYWNrYWdlSW5qZWN0b3IpIHtcblxuICBjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG4gIGluamVjdG9yLmZyb21BbGxDb21wb25lbnRzKClcbiAgLmZhY3RvcnkoJ2NoYWxrJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBjaGFsay5jb25zdHJ1Y3RvcihcbiAgICAgIHtlbmFibGVkOiBjb25maWcuZ2V0KCdjb2xvcmZ1bENvbnNvbGUnKSAhPT0gZmFsc2UgJiYgXy50b0xvd2VyKHByb2Nlc3MuZW52LkNIQUxLX0VOQUJMRUQpICE9PSAnZmFsc2UnfSk7XG4gIH0pO1xufVxuIl19