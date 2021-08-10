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
const theLoader = function (source, sourceMap) {
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
    }
    cb(null, source, sourceMap);
};
exports.default = theLoader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fzcy10aGVtZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzYXNzLXRoZW1lLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHNDQUE0QztBQUM1QyxzREFBNEI7QUFDNUIsMkJBQTJCO0FBRTNCLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxTQUFpQixDQUFDO0FBRXRCLE1BQU0sU0FBUyxHQUFrQixVQUFTLE1BQU0sRUFBRSxTQUFTO0lBQ3pELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUcsQ0FBQztJQUN6QixvQkFBb0I7SUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMvQixNQUFNLEdBQUcsR0FBRyxpQkFBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLElBQUksU0FBUyxJQUFJLElBQUksRUFBRTtRQUNyQixTQUFTLEdBQUcsY0FBTSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFDekQsU0FBUyxHQUFHLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztRQUMzRCxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0tBQzdEO0lBQ0QsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxvQkFBb0IsRUFBRTtRQUM1QyxNQUFNLEdBQUksTUFBaUIsQ0FBQyxPQUFPLENBQUMsNkRBQTZELEVBQUUsY0FBYyxTQUFTLGFBQWEsQ0FBQyxDQUFDO0tBQzFJO1NBQU0sSUFBSSxHQUFHLEVBQUU7UUFDZCxrQkFBa0I7UUFDbEIsTUFBTSxHQUFJLE1BQWlCLENBQUMsT0FBTyxDQUFDLG9FQUFvRSxFQUFFLGlEQUFpRCxTQUFTLGFBQWEsQ0FBQyxDQUFDO0tBQ3BMO0lBQ0QsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsU0FBUyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtsb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubGV0IHRoZW1lTmFtZTogc3RyaW5nO1xuXG5jb25zdCB0aGVMb2FkZXI6IGxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuICBjb25zdCBjYiA9IHRoaXMuYXN5bmMoKSE7XG4gIC8vIGxvZy5pbmZvKHNvdXJjZSk7XG4gIGNvbnN0IGZpbGUgPSB0aGlzLnJlc291cmNlUGF0aDtcbiAgY29uc3QgcGtnID0gcGxpbmsuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gIGlmICh0aGVtZU5hbWUgPT0gbnVsbCkge1xuICAgIHRoZW1lTmFtZSA9IGNvbmZpZygpWydAd2ZoL2RvYy11aS1jb21tb24nXS5tYXRlcmlhbFRoZW1lO1xuICAgIHRoZW1lTmFtZSA9IHRoZW1lTmFtZSA9PT0gJ2RlZmF1bHQnID8gJycgOiAnLScgKyB0aGVtZU5hbWU7XG4gICAgbG9nLmluZm8oJ1VzZSBNYXRlcmlhbCB0aGVtZSBzYXNzIGZpbGU6IHRoZW1lJyArIHRoZW1lTmFtZSk7XG4gIH1cbiAgaWYgKHBrZyAmJiBwa2cubmFtZSA9PT0gJ0B3ZmgvZG9jLXVpLWNvbW1vbicpIHtcbiAgICBzb3VyY2UgPSAoc291cmNlIGFzIHN0cmluZykucmVwbGFjZSgvQHVzZVxccytbJ1wiJ10oPzpbXidcIi9dKj9cXC8pKnRoZW1lWydcIiddKFxccythc1xccytcXFMrXFxzKik/XFxzKjsvbSwgYEB1c2UgXCJ0aGVtZSR7dGhlbWVOYW1lfVwiIGFzIHRoZW1lO2ApO1xuICB9IGVsc2UgaWYgKHBrZykge1xuICAgIC8vIGxvZy5pbmZvKGZpbGUpO1xuICAgIHNvdXJjZSA9IChzb3VyY2UgYXMgc3RyaW5nKS5yZXBsYWNlKC9AdXNlXFxzK1snXCInXUB3ZmhcXC9kb2MtdWktY29tbW9uXFwvY2xpZW50XFwvbWF0ZXJpYWxcXC90aGVtZVsnXCInXVxccyo7L20sIGBAdXNlIFwiQHdmaC9kb2MtdWktY29tbW9uL2NsaWVudC9tYXRlcmlhbC90aGVtZSR7dGhlbWVOYW1lfVwiIGFzIHRoZW1lO2ApO1xuICB9XG4gIGNiKG51bGwsIHNvdXJjZSwgc291cmNlTWFwKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHRoZUxvYWRlcjtcbiJdfQ==