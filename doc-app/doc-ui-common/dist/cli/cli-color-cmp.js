"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorCmp = void 0;
const plink_1 = require("@wfh/plink");
const log = plink_1.log4File(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
function colorCmp(argument1, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info('Command is executing with options:', opts);
        log.info('Command is executing with configuration:', plink_1.config());
        // TODO: Your command job implementation here
    });
}
exports.colorCmp = colorCmp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNvbG9yLWNtcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1jb2xvci1jbXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQTRDO0FBQzVDLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsMkRBQTJEO0FBQzNELDZCQUE2QjtBQUU3QixTQUFzQixRQUFRLENBQUMsU0FBbUIsRUFBRSxJQUFvQjs7UUFDdEUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxHQUFHLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLGNBQU0sRUFBRSxDQUFDLENBQUM7UUFDL0QsNkNBQTZDO0lBQy9DLENBQUM7Q0FBQTtBQUpELDRCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gQ2hhbGsgaXMgdXNlZnVsIGZvciBwcmludGluZyBjb2xvcmZ1bCB0ZXh0IGluIGEgdGVybWluYWxcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xvckNtcChhcmd1bWVudDE6IHN0cmluZ1tdLCBvcHRzOiB7ZmlsZTogc3RyaW5nfSkge1xuICBsb2cuaW5mbygnQ29tbWFuZCBpcyBleGVjdXRpbmcgd2l0aCBvcHRpb25zOicsIG9wdHMpO1xuICBsb2cuaW5mbygnQ29tbWFuZCBpcyBleGVjdXRpbmcgd2l0aCBjb25maWd1cmF0aW9uOicsIGNvbmZpZygpKTtcbiAgLy8gVE9ETzogWW91ciBjb21tYW5kIGpvYiBpbXBsZW1lbnRhdGlvbiBoZXJlXG59XG4iXX0=