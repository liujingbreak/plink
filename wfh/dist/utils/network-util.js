"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
function getLanIPv4() {
    const inters = os_1.default.networkInterfaces();
    if (inters.en0) {
        const found = inters.en0.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    for (const key of Object.keys(inters)) {
        const interf = inters[key];
        const found = interf.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    return '127.0.0.1';
}
exports.getLanIPv4 = getLanIPv4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbmV0d29yay11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLFNBQWdCLFVBQVU7SUFDeEIsTUFBTSxNQUFNLEdBQUcsWUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDdEMsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO1FBQ2QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRSxJQUFJLEtBQUssRUFBRTtZQUNULE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUN0QjtLQUNGO0lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEUsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDdEI7S0FDRjtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFoQkQsZ0NBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG9zIGZyb20gJ29zJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldExhbklQdjQoKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJzID0gb3MubmV0d29ya0ludGVyZmFjZXMoKTtcbiAgaWYgKGludGVycy5lbjApIHtcbiAgICBjb25zdCBmb3VuZCA9IGludGVycy5lbjAuZmluZChpcCA9PiBpcC5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaXAuaW50ZXJuYWwpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIGZvdW5kLmFkZHJlc3M7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGludGVycykpIHtcbiAgICBjb25zdCBpbnRlcmYgPSBpbnRlcnNba2V5XTtcbiAgICBjb25zdCBmb3VuZCA9IGludGVyZi5maW5kKGlwID0+IGlwLmZhbWlseSA9PT0gJ0lQdjQnICYmICFpcC5pbnRlcm5hbCk7XG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICByZXR1cm4gZm91bmQuYWRkcmVzcztcbiAgICB9XG4gIH1cbiAgcmV0dXJuICcxMjcuMC4wLjEnO1xufVxuIl19