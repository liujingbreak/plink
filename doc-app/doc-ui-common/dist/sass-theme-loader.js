"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
// import path from 'path';
const log = plink_1.log4File(__filename);
let themeName;
const loader = function (source, sourceMap) {
    const cb = this.async();
    // log.info(source);
    const file = this.resourcePath;
    const pkg = __plink_1.default.findPackageByFile(file);
    if (themeName == null) {
        themeName = plink_1.config()['@wfh/doc-ui-common'].materialTheme;
        themeName = themeName === 'default' ? '' : '-' + themeName;
        log.info('Use Material theme sass file: theme' + themeName);
    }
    if (pkg && pkg.name === '@wfh/doc-ui-common') {
        source = source.replace(/@use\s+['"'](?:[^'"/]*?\/)*theme['"'](\s+as\s+\S+\s*)?\s*;/m, `@use "theme${themeName}" as theme;`);
    }
    else if (pkg) {
        // log.info(file);
        source = source.replace(/@use\s+['"']@wfh\/doc-ui-common\/client\/material\/theme['"']\s*;/m, `@use "@wfh/doc-ui-common/client/material/theme${themeName}" as theme;`);
        if (file.indexOf('Main.module') >= 0) {
            // log.warn(file, source);
        }
    }
    cb(null, source, sourceMap);
};
exports.default = loader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fzcy10aGVtZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzYXNzLXRoZW1lLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHNDQUE0QztBQUM1QyxzREFBNEI7QUFDNUIsMkJBQTJCO0FBRTNCLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxTQUFpQixDQUFDO0FBRXRCLE1BQU0sTUFBTSxHQUFrQixVQUFTLE1BQU0sRUFBRSxTQUFTO0lBQ3RELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUcsQ0FBQztJQUN6QixvQkFBb0I7SUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMvQixNQUFNLEdBQUcsR0FBRyxpQkFBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQUksU0FBUyxJQUFJLElBQUksRUFBRTtRQUNyQixTQUFTLEdBQUcsY0FBTSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFDekQsU0FBUyxHQUFHLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztRQUMzRCxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0tBQzdEO0lBQ0QsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxvQkFBb0IsRUFBRTtRQUM1QyxNQUFNLEdBQUksTUFBaUIsQ0FBQyxPQUFPLENBQUMsNkRBQTZELEVBQUUsY0FBYyxTQUFTLGFBQWEsQ0FBQyxDQUFDO0tBQzFJO1NBQU0sSUFBSSxHQUFHLEVBQUU7UUFDZCxrQkFBa0I7UUFDbEIsTUFBTSxHQUFJLE1BQWlCLENBQUMsT0FBTyxDQUFDLG9FQUFvRSxFQUFFLGlEQUFpRCxTQUFTLGFBQWEsQ0FBQyxDQUFDO1FBQ25MLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBRyxDQUFDLEVBQUc7WUFDcEMsMEJBQTBCO1NBQzNCO0tBQ0Y7SUFDRCxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuLy8gaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5sZXQgdGhlbWVOYW1lOiBzdHJpbmc7XG5cbmNvbnN0IGxvYWRlcjogbG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKHNvdXJjZSwgc291cmNlTWFwKSB7XG4gIGNvbnN0IGNiID0gdGhpcy5hc3luYygpITtcbiAgLy8gbG9nLmluZm8oc291cmNlKTtcbiAgY29uc3QgZmlsZSA9IHRoaXMucmVzb3VyY2VQYXRoO1xuICBjb25zdCBwa2cgPSBwbGluay5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgaWYgKHRoZW1lTmFtZSA9PSBudWxsKSB7XG4gICAgdGhlbWVOYW1lID0gY29uZmlnKClbJ0B3ZmgvZG9jLXVpLWNvbW1vbiddLm1hdGVyaWFsVGhlbWU7XG4gICAgdGhlbWVOYW1lID0gdGhlbWVOYW1lID09PSAnZGVmYXVsdCcgPyAnJyA6ICctJyArIHRoZW1lTmFtZTtcbiAgICBsb2cuaW5mbygnVXNlIE1hdGVyaWFsIHRoZW1lIHNhc3MgZmlsZTogdGhlbWUnICsgdGhlbWVOYW1lKTtcbiAgfVxuICBpZiAocGtnICYmIHBrZy5uYW1lID09PSAnQHdmaC9kb2MtdWktY29tbW9uJykge1xuICAgIHNvdXJjZSA9IChzb3VyY2UgYXMgc3RyaW5nKS5yZXBsYWNlKC9AdXNlXFxzK1snXCInXSg/OlteJ1wiL10qP1xcLykqdGhlbWVbJ1wiJ10oXFxzK2FzXFxzK1xcUytcXHMqKT9cXHMqOy9tLCBgQHVzZSBcInRoZW1lJHt0aGVtZU5hbWV9XCIgYXMgdGhlbWU7YCk7XG4gIH0gZWxzZSBpZiAocGtnKSB7XG4gICAgLy8gbG9nLmluZm8oZmlsZSk7XG4gICAgc291cmNlID0gKHNvdXJjZSBhcyBzdHJpbmcpLnJlcGxhY2UoL0B1c2VcXHMrWydcIiddQHdmaFxcL2RvYy11aS1jb21tb25cXC9jbGllbnRcXC9tYXRlcmlhbFxcL3RoZW1lWydcIiddXFxzKjsvbSwgYEB1c2UgXCJAd2ZoL2RvYy11aS1jb21tb24vY2xpZW50L21hdGVyaWFsL3RoZW1lJHt0aGVtZU5hbWV9XCIgYXMgdGhlbWU7YCk7XG4gICAgaWYgKGZpbGUuaW5kZXhPZignTWFpbi5tb2R1bGUnKSA+PTAgKSB7XG4gICAgICAvLyBsb2cud2FybihmaWxlLCBzb3VyY2UpO1xuICAgIH1cbiAgfVxuICBjYihudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBsb2FkZXI7XG4iXX0=