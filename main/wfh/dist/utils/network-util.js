"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanIPv4 = void 0;
const os_1 = __importDefault(require("os"));
function getLanIPv4() {
    const inters = os_1.default.networkInterfaces();
    if (inters.en0) {
        const found = inters.en0.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    for (const interf of Object.values(inters)) {
        if (interf == null)
            continue;
        const found = interf.find(ip => ip.family === 'IPv4' && !ip.internal);
        if (found) {
            return found.address;
        }
    }
    return '127.0.0.1';
}
exports.getLanIPv4 = getLanIPv4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbmV0d29yay11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDRDQUFvQjtBQUVwQixTQUFnQixVQUFVO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLFlBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ3RDLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUUsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDdEI7S0FDRjtJQUNELEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUMxQyxJQUFJLE1BQU0sSUFBSSxJQUFJO1lBQ2hCLFNBQVM7UUFDWCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEUsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDdEI7S0FDRjtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFqQkQsZ0NBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG9zIGZyb20gJ29zJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldExhbklQdjQoKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJzID0gb3MubmV0d29ya0ludGVyZmFjZXMoKTtcbiAgaWYgKGludGVycy5lbjApIHtcbiAgICBjb25zdCBmb3VuZCA9IGludGVycy5lbjAuZmluZChpcCA9PiBpcC5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaXAuaW50ZXJuYWwpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIGZvdW5kLmFkZHJlc3M7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgaW50ZXJmIG9mIE9iamVjdC52YWx1ZXMoaW50ZXJzKSkge1xuICAgIGlmIChpbnRlcmYgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZvdW5kID0gaW50ZXJmLmZpbmQoaXAgPT4gaXAuZmFtaWx5ID09PSAnSVB2NCcgJiYgIWlwLmludGVybmFsKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIHJldHVybiBmb3VuZC5hZGRyZXNzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzEyNy4wLjAuMSc7XG59XG4iXX0=