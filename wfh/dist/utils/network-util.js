"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const lodash_1 = __importDefault(require("lodash"));
function getLanIPv4() {
    const inters = os_1.default.networkInterfaces();
    if (inters.en0) {
        const found = lodash_1.default.find(inters.en0, ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    for (const key of Object.keys(inters)) {
        const interf = inters[key];
        const found = lodash_1.default.find(interf, ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    return '127.0.0.1';
}
exports.getLanIPv4 = getLanIPv4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbmV0d29yay11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQW9CO0FBQ3BCLG9EQUF1QjtBQUV2QixTQUFnQixVQUFVO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLFlBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ3RDLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sS0FBSyxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3RSxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUN0QjtLQUNGO0lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEtBQUssR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6RSxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUN0QjtLQUNGO0lBQ0QsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQWhCRCxnQ0FnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldExhbklQdjQoKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJzID0gb3MubmV0d29ya0ludGVyZmFjZXMoKTtcbiAgaWYgKGludGVycy5lbjApIHtcbiAgICBjb25zdCBmb3VuZCA9IF8uZmluZChpbnRlcnMuZW4wLCBpcCA9PiBpcC5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaXAuaW50ZXJuYWwpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIGZvdW5kLmFkZHJlc3M7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGludGVycykpIHtcbiAgICBjb25zdCBpbnRlcmYgPSBpbnRlcnNba2V5XTtcbiAgICBjb25zdCBmb3VuZCA9IF8uZmluZChpbnRlcmYsIGlwID0+IGlwLmZhbWlseSA9PT0gJ0lQdjQnICYmICFpcC5pbnRlcm5hbCk7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICByZXR1cm4gZm91bmQuYWRkcmVzcztcbiAgICB9XG4gIH1cbiAgcmV0dXJuICcxMjcuMC4wLjEnO1xufVxuIl19