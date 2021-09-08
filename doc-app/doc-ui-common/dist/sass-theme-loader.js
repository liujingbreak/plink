"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
// import path from 'path';
const log = (0, plink_1.log4File)(__filename);
let themeName;
const theLoader = function (source, sourceMap) {
    const cb = this.async();
    // log.info(source);
    const file = this.resourcePath;
    const pkg = __plink_1.default.findPackageByFile(file);
    if (themeName == null) {
        themeName = (0, plink_1.config)()['@wfh/doc-ui-common'].materialTheme;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fzcy10aGVtZS1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzYXNzLXRoZW1lLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHNDQUE0QztBQUM1QyxzREFBNEI7QUFDNUIsMkJBQTJCO0FBRTNCLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxJQUFJLFNBQWlCLENBQUM7QUFFdEIsTUFBTSxTQUFTLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDekQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO0lBQ3pCLG9CQUFvQjtJQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQy9CLE1BQU0sR0FBRyxHQUFHLGlCQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFO1FBQ3JCLFNBQVMsR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsYUFBYSxDQUFDO1FBQ3pELFNBQVMsR0FBRyxTQUFTLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFDM0QsR0FBRyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsR0FBRyxTQUFTLENBQUMsQ0FBQztLQUM3RDtJQUNELElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssb0JBQW9CLEVBQUU7UUFDNUMsTUFBTSxHQUFJLE1BQWlCLENBQUMsT0FBTyxDQUFDLDZEQUE2RCxFQUFFLGNBQWMsU0FBUyxhQUFhLENBQUMsQ0FBQztLQUMxSTtTQUFNLElBQUksR0FBRyxFQUFFO1FBQ2Qsa0JBQWtCO1FBQ2xCLE1BQU0sR0FBSSxNQUFpQixDQUFDLE9BQU8sQ0FBQyxvRUFBb0UsRUFBRSxpREFBaUQsU0FBUyxhQUFhLENBQUMsQ0FBQztLQUNwTDtJQUNELEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLGtCQUFlLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7bG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZX0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG4vLyBpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmxldCB0aGVtZU5hbWU6IHN0cmluZztcblxuY29uc3QgdGhlTG9hZGVyOiBsb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlLCBzb3VyY2VNYXApIHtcbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCkhO1xuICAvLyBsb2cuaW5mbyhzb3VyY2UpO1xuICBjb25zdCBmaWxlID0gdGhpcy5yZXNvdXJjZVBhdGg7XG4gIGNvbnN0IHBrZyA9IHBsaW5rLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICBpZiAodGhlbWVOYW1lID09IG51bGwpIHtcbiAgICB0aGVtZU5hbWUgPSBjb25maWcoKVsnQHdmaC9kb2MtdWktY29tbW9uJ10ubWF0ZXJpYWxUaGVtZTtcbiAgICB0aGVtZU5hbWUgPSB0aGVtZU5hbWUgPT09ICdkZWZhdWx0JyA/ICcnIDogJy0nICsgdGhlbWVOYW1lO1xuICAgIGxvZy5pbmZvKCdVc2UgTWF0ZXJpYWwgdGhlbWUgc2FzcyBmaWxlOiB0aGVtZScgKyB0aGVtZU5hbWUpO1xuICB9XG4gIGlmIChwa2cgJiYgcGtnLm5hbWUgPT09ICdAd2ZoL2RvYy11aS1jb21tb24nKSB7XG4gICAgc291cmNlID0gKHNvdXJjZSBhcyBzdHJpbmcpLnJlcGxhY2UoL0B1c2VcXHMrWydcIiddKD86W14nXCIvXSo/XFwvKSp0aGVtZVsnXCInXShcXHMrYXNcXHMrXFxTK1xccyopP1xccyo7L20sIGBAdXNlIFwidGhlbWUke3RoZW1lTmFtZX1cIiBhcyB0aGVtZTtgKTtcbiAgfSBlbHNlIGlmIChwa2cpIHtcbiAgICAvLyBsb2cuaW5mbyhmaWxlKTtcbiAgICBzb3VyY2UgPSAoc291cmNlIGFzIHN0cmluZykucmVwbGFjZSgvQHVzZVxccytbJ1wiJ11Ad2ZoXFwvZG9jLXVpLWNvbW1vblxcL2NsaWVudFxcL21hdGVyaWFsXFwvdGhlbWVbJ1wiJ11cXHMqOy9tLCBgQHVzZSBcIkB3ZmgvZG9jLXVpLWNvbW1vbi9jbGllbnQvbWF0ZXJpYWwvdGhlbWUke3RoZW1lTmFtZX1cIiBhcyB0aGVtZTtgKTtcbiAgfVxuICBjYihudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB0aGVMb2FkZXI7XG4iXX0=