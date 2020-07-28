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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvbmV0d29yay11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDRDQUFvQjtBQUVwQixTQUFnQixVQUFVO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLFlBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ3RDLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUUsSUFBSSxLQUFLLEVBQUU7WUFDVCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDdEI7S0FDRjtJQUNELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO1NBQ3RCO0tBQ0Y7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBaEJELGdDQWdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMYW5JUHY0KCk6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycyA9IG9zLm5ldHdvcmtJbnRlcmZhY2VzKCk7XG4gIGlmIChpbnRlcnMuZW4wKSB7XG4gICAgY29uc3QgZm91bmQgPSBpbnRlcnMuZW4wLmZpbmQoaXAgPT4gaXAuZmFtaWx5ID09PSAnSVB2NCcgJiYgIWlwLmludGVybmFsKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIHJldHVybiBmb3VuZC5hZGRyZXNzO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhpbnRlcnMpKSB7XG4gICAgY29uc3QgaW50ZXJmID0gaW50ZXJzW2tleV07XG4gICAgY29uc3QgZm91bmQgPSBpbnRlcmYuZmluZChpcCA9PiBpcC5mYW1pbHkgPT09ICdJUHY0JyAmJiAhaXAuaW50ZXJuYWwpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgcmV0dXJuIGZvdW5kLmFkZHJlc3M7XG4gICAgfVxuICB9XG4gIHJldHVybiAnMTI3LjAuMC4xJztcbn1cbiJdfQ==