"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorContrast = exports.colorInfo = void 0;
/* tslint:disable no-console */
const color_1 = __importDefault(require("color"));
const util_1 = __importDefault(require("util"));
const chalk_1 = __importDefault(require("chalk"));
// import * as _ from 'lodash';
function* colorInfo(colorStrs) {
    for (const colorStr of colorStrs) {
        const col = new color_1.default(colorStr);
        const chalker = chalkForColor(col);
        yield chalker(` ${colorStr} `) + ': ' + chalker(util_1.default.inspect({
            luminosity: col.luminosity(),
            hue: col.hue(),
            saturationl: col.saturationl(),
            lightness: col.lightness(),
            isLight: col.isLight(),
            isDark: col.isDark(),
            alpha: col.alpha(),
            gray: col.gray(),
            white: col.white(),
            grayscale: col.grayscale().toString(),
            hex: col.hex(),
            rgb: col.rgb(),
            hsl: col.hsl(),
            hsv: col.hsv(),
            ansi256: col.ansi256(),
            ansi16: col.ansi16(),
            cmyk: col.cmyk(),
            apple: col.apple()
        }));
    }
}
exports.colorInfo = colorInfo;
function colorContrast(...[cols1, cols2]) {
    const col1 = new color_1.default(cols1);
    const chalker1 = chalkForColor(col1);
    const col2 = new color_1.default(cols2);
    const chalker2 = chalkForColor(col2);
    for (const info of colorInfo([cols1, cols2])) {
        console.log(info);
    }
    console.log(`Contrast of ${chalker1(cols1)} and ${chalker2(cols2)}: ${col1.contrast(col2)}`);
}
exports.colorContrast = colorContrast;
function chalkForColor(col) {
    return chalk_1.default.bgHex(col.hex()).hex(col.isDark() ? '#ffffff' : '#000000');
}
// export function fillPalettes() {
//   const input: Array<{[hue: string]: string}> = api.config.get([api.packageName, 'fillPalettes']);
//   console.log(input);
//   for (const colors of input) {
//     fillPalette(colors);
//   }
// }
// const colorMapkey = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900',
//   'A100', 'A200', 'A400', 'A700'];
// function fillPalette(colorMap: {[hue: string]: string}) {
//   const missingKeys = colorMapkey.filter(key => !_.has(colorMap, key));
//   console.log(missingKeys);
//   // const colors = (input.colors as string[]).map(color => Color(color));
//   // console.log(colors.map(col => col.lightenByRatio(0.15).toCSS()));
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isa0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsK0JBQStCO0FBRS9CLFFBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFtQjtJQUM1QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtRQUNoQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGVBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLENBQUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQztZQUMzRCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUM1QixHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFO1lBQzlCLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFO1lBQzFCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ3BCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ2xCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ2xCLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ3JDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2QsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDZCxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUU7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDcEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDaEIsS0FBSyxFQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7U0FDbEIsQ0FBQyxDQUFDLENBQUM7S0FDTDtBQUNILENBQUM7QUF6QkQsOEJBeUJDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUErQjtJQUMzRSxNQUFNLElBQUksR0FBRyxJQUFJLGVBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixNQUFPLFFBQVEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxlQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUIsTUFBTyxRQUFRLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXRDLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNuQjtJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9GLENBQUM7QUFaRCxzQ0FZQztBQUVELFNBQVMsYUFBYSxDQUFDLEdBQVU7SUFDL0IsT0FBTyxlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDMUUsQ0FBQztBQUVELG1DQUFtQztBQUNuQyxxR0FBcUc7QUFDckcsd0JBQXdCO0FBQ3hCLGtDQUFrQztBQUNsQywyQkFBMkI7QUFDM0IsTUFBTTtBQUNOLElBQUk7QUFFSiw0RkFBNEY7QUFDNUYscUNBQXFDO0FBRXJDLDREQUE0RDtBQUM1RCwwRUFBMEU7QUFDMUUsOEJBQThCO0FBRTlCLDZFQUE2RTtBQUM3RSx5RUFBeUU7QUFDekUsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBDb2xvciBmcm9tICdjb2xvcic7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiogY29sb3JJbmZvKGNvbG9yU3Ryczogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBjb2xvclN0ciBvZiBjb2xvclN0cnMpIHtcbiAgICBjb25zdCBjb2wgPSBuZXcgQ29sb3IoY29sb3JTdHIpO1xuICAgIGNvbnN0IGNoYWxrZXIgPSBjaGFsa0ZvckNvbG9yKGNvbCk7XG4gICAgeWllbGQgY2hhbGtlcihgICR7Y29sb3JTdHJ9IGApICsgJzogJyArIGNoYWxrZXIodXRpbC5pbnNwZWN0KHtcbiAgICAgIGx1bWlub3NpdHk6IGNvbC5sdW1pbm9zaXR5KCksXG4gICAgICBodWU6IGNvbC5odWUoKSxcbiAgICAgIHNhdHVyYXRpb25sOiBjb2wuc2F0dXJhdGlvbmwoKSxcbiAgICAgIGxpZ2h0bmVzczogY29sLmxpZ2h0bmVzcygpLFxuICAgICAgaXNMaWdodDogY29sLmlzTGlnaHQoKSxcbiAgICAgIGlzRGFyazogY29sLmlzRGFyaygpLFxuICAgICAgYWxwaGE6IGNvbC5hbHBoYSgpLFxuICAgICAgZ3JheTogY29sLmdyYXkoKSxcbiAgICAgIHdoaXRlOiBjb2wud2hpdGUoKSxcbiAgICAgIGdyYXlzY2FsZTogY29sLmdyYXlzY2FsZSgpLnRvU3RyaW5nKCksXG4gICAgICBoZXg6IGNvbC5oZXgoKSxcbiAgICAgIHJnYjogY29sLnJnYigpLFxuICAgICAgaHNsOiBjb2wuaHNsKCksXG4gICAgICBoc3Y6IGNvbC5oc3YoKSxcbiAgICAgIGFuc2kyNTY6IGNvbC5hbnNpMjU2KCksXG4gICAgICBhbnNpMTY6IGNvbC5hbnNpMTYoKSxcbiAgICAgIGNteWs6IGNvbC5jbXlrKCksXG4gICAgICBhcHBsZTpjb2wuYXBwbGUoKVxuICAgIH0pKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29sb3JDb250cmFzdCguLi5bY29sczEsIGNvbHMyXTogW2NvbDE6IHN0cmluZywgY29sMjogc3RyaW5nXSkge1xuICBjb25zdCBjb2wxID0gbmV3IENvbG9yKGNvbHMxKTtcbiAgY29uc3QgIGNoYWxrZXIxID0gY2hhbGtGb3JDb2xvcihjb2wxKTtcblxuICBjb25zdCBjb2wyID0gbmV3IENvbG9yKGNvbHMyKTtcbiAgY29uc3QgIGNoYWxrZXIyID0gY2hhbGtGb3JDb2xvcihjb2wyKTtcblxuICBmb3IgKGNvbnN0IGluZm8gb2YgY29sb3JJbmZvKFtjb2xzMSwgY29sczJdKSkge1xuICAgIGNvbnNvbGUubG9nKGluZm8pO1xuICB9XG5cbiAgY29uc29sZS5sb2coYENvbnRyYXN0IG9mICR7Y2hhbGtlcjEoY29sczEpfSBhbmQgJHtjaGFsa2VyMihjb2xzMil9OiAke2NvbDEuY29udHJhc3QoY29sMil9YCk7XG59XG5cbmZ1bmN0aW9uIGNoYWxrRm9yQ29sb3IoY29sOiBDb2xvcikge1xuICByZXR1cm4gY2hhbGsuYmdIZXgoY29sLmhleCgpKS5oZXgoY29sLmlzRGFyaygpID8gJyNmZmZmZmYnIDogJyMwMDAwMDAnKTtcbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGZpbGxQYWxldHRlcygpIHtcbi8vICAgY29uc3QgaW5wdXQ6IEFycmF5PHtbaHVlOiBzdHJpbmddOiBzdHJpbmd9PiA9IGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdmaWxsUGFsZXR0ZXMnXSk7XG4vLyAgIGNvbnNvbGUubG9nKGlucHV0KTtcbi8vICAgZm9yIChjb25zdCBjb2xvcnMgb2YgaW5wdXQpIHtcbi8vICAgICBmaWxsUGFsZXR0ZShjb2xvcnMpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGNvbnN0IGNvbG9yTWFwa2V5ID0gWyc1MCcsICcxMDAnLCAnMjAwJywgJzMwMCcsICc0MDAnLCAnNTAwJywgJzYwMCcsICc3MDAnLCAnODAwJywgJzkwMCcsXG4vLyAgICdBMTAwJywgJ0EyMDAnLCAnQTQwMCcsICdBNzAwJ107XG5cbi8vIGZ1bmN0aW9uIGZpbGxQYWxldHRlKGNvbG9yTWFwOiB7W2h1ZTogc3RyaW5nXTogc3RyaW5nfSkge1xuLy8gICBjb25zdCBtaXNzaW5nS2V5cyA9IGNvbG9yTWFwa2V5LmZpbHRlcihrZXkgPT4gIV8uaGFzKGNvbG9yTWFwLCBrZXkpKTtcbi8vICAgY29uc29sZS5sb2cobWlzc2luZ0tleXMpO1xuXG4vLyAgIC8vIGNvbnN0IGNvbG9ycyA9IChpbnB1dC5jb2xvcnMgYXMgc3RyaW5nW10pLm1hcChjb2xvciA9PiBDb2xvcihjb2xvcikpO1xuLy8gICAvLyBjb25zb2xlLmxvZyhjb2xvcnMubWFwKGNvbCA9PiBjb2wubGlnaHRlbkJ5UmF0aW8oMC4xNSkudG9DU1MoKSkpO1xuLy8gfVxuIl19