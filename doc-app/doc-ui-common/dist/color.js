"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixColor = exports.colorContrast = exports.colorInfo = void 0;
/* eslint-disable no-console */
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
function mixColor(color1, color2, weightInterval) {
    const col1 = new color_1.default(color1);
    const col2 = new color_1.default(color2);
    const count = Math.floor(1 / weightInterval);
    const mixed = [col1];
    for (let i = 1; i < count; i++) {
        mixed.push(col1.mix(col2, weightInterval * i));
    }
    mixed.push(col2);
    console.log(mixed.map(col => chalkForColor(col)(`  ${col.hex()}  `)).join('\n'));
}
exports.mixColor = mixColor;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsK0JBQStCO0FBQy9CLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLCtCQUErQjtBQUUvQixRQUFlLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBbUI7SUFDNUMsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7UUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxlQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sT0FBTyxDQUFDLElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUM7WUFDM0QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDNUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRTtZQUM5QixTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRTtZQUMxQixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRTtZQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNwQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUNsQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUNsQixTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRTtZQUNyQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2QsR0FBRyxFQUFFLEdBQUcsQ0FB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LWNvbnNvbGUgKi9cbi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBDb2xvciBmcm9tICdjb2xvcic7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiogY29sb3JJbmZvKGNvbG9yU3Ryczogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBjb2xvclN0ciBvZiBjb2xvclN0cnMpIHtcbiAgICBjb25zdCBjb2wgPSBuZXcgQ29sb3IoY29sb3JTdHIpO1xuICAgIGNvbnN0IGNoYWxrZXIgPSBjaGFsa0ZvckNvbG9yKGNvbCk7XG4gICAgeWllbGQgY2hhbGtlcihgICR7Y29sb3JTdHJ9IGApICsgJzogJyArIGNoYWxrZXIodXRpbC5pbnNwZWN0KHtcbiAgICAgIGx1bWlub3NpdHk6IGNvbC5sdW1pbm9zaXR5KCksXG4gICAgICBodWU6IGNvbC5odWUoKSxcbiAgICAgIHNhdHVyYXRpb25sOiBjb2wuc2F0dXJhdGlvbmwoKSxcbiAgICAgIGxpZ2h0bmVzczogY29sLmxpZ2h0bmVzcygpLFxuICAgICAgaXNMaWdodDogY29sLmlzTGlnaHQoKSxcbiAgICAgIGlzRGFyazogY29sLmlzRGFyaygpLFxuICAgICAgYWxwaGE6IGNvbC5hbHBoYSgpLFxuICAgICAgZ3JheTogY29sLmdyYXkoKSxcbiAgICAgIHdoaXRlOiBjb2wud2hpdGUoKSxcbiAgICAgIGdyYXlzY2FsZTogY29sLmdyYXlzY2FsZSgpLnRvU3RyaW5nKCksXG4gICAgICBoZXg6IGNvbC5oZXgoKSxcbiAgICAgIHJnYjogY29sLnJnYigpLFxuICAgICAgaHNsOiBjb2wuaHNsKCksXG4gICAgICBoc3Y6IGNvbC5oc3YoKSxcbiAgICAgIGFuc2kyNTY6IGNvbC5hbnNpMjU2KCksXG4gICAgICBhbnNpMTY6IGNvbC5hbnNpMTYoKSxcbiAgICAgIGNteWs6IGNvbC5jbXlrKCksXG4gICAgICBhcHBsZTpjb2wuYXBwbGUoKVxuICAgIH0pKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29sb3JDb250cmFzdCguLi5bY29sczEsIGNvbHMyXTogW2NvbDE6IHN0cmluZywgY29sMjogc3RyaW5nXSkge1xuICBjb25zdCBjb2wxID0gbmV3IENvbG9yKGNvbHMxKTtcbiAgY29uc3QgIGNoYWxrZXIxID0gY2hhbGtGb3JDb2xvcihjb2wxKTtcblxuICBjb25zdCBjb2wyID0gbmV3IENvbG9yKGNvbHMyKTtcbiAgY29uc3QgIGNoYWxrZXIyID0gY2hhbGtGb3JDb2xvcihjb2wyKTtcblxuICBmb3IgKGNvbnN0IGluZm8gb2YgY29sb3JJbmZvKFtjb2xzMSwgY29sczJdKSkge1xuICAgIGNvbnNvbGUubG9nKGluZm8pO1xuICB9XG5cbiAgY29uc29sZS5sb2coYENvbnRyYXN0IG9mICR7Y2hhbGtlcjEoY29sczEpfSBhbmQgJHtjaGFsa2VyMihjb2xzMil9OiAke2NvbDEuY29udHJhc3QoY29sMil9YCk7XG59XG5cbmZ1bmN0aW9uIGNoYWxrRm9yQ29sb3IoY29sOiBDb2xvcikge1xuICByZXR1cm4gY2hhbGsuYmdIZXgoY29sLmhleCgpKS5oZXgoY29sLmlzRGFyaygpID8gJyNmZmZmZmYnIDogJyMwMDAwMDAnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1peENvbG9yKGNvbG9yMTogc3RyaW5nLCBjb2xvcjI6IHN0cmluZywgd2VpZ2h0SW50ZXJ2YWw6IG51bWJlcikge1xuICBjb25zdCBjb2wxID0gbmV3IENvbG9yKGNvbG9yMSk7XG4gIGNvbnN0IGNvbDIgPSBuZXcgQ29sb3IoY29sb3IyKTtcblxuICBjb25zdCBjb3VudCA9IE1hdGguZmxvb3IoMSAvIHdlaWdodEludGVydmFsKTtcbiAgY29uc3QgbWl4ZWQgPSBbY29sMV07XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgY291bnQ7IGkrKykge1xuICAgIG1peGVkLnB1c2goY29sMS5taXgoY29sMiwgd2VpZ2h0SW50ZXJ2YWwgKiBpKSk7XG4gIH1cbiAgbWl4ZWQucHVzaChjb2wyKTtcbiAgY29uc29sZS5sb2cobWl4ZWQubWFwKGNvbCA9PiBjaGFsa0ZvckNvbG9yKGNvbCkoYCAgJHtjb2wuaGV4KCl9ICBgKSkuam9pbignXFxuJykpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gZmlsbFBhbGV0dGVzKCkge1xuLy8gICBjb25zdCBpbnB1dDogQXJyYXk8e1todWU6IHN0cmluZ106IHN0cmluZ30+ID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2ZpbGxQYWxldHRlcyddKTtcbi8vICAgY29uc29sZS5sb2coaW5wdXQpO1xuLy8gICBmb3IgKGNvbnN0IGNvbG9ycyBvZiBpbnB1dCkge1xuLy8gICAgIGZpbGxQYWxldHRlKGNvbG9ycyk7XG4vLyAgIH1cbi8vIH1cblxuLy8gY29uc3QgY29sb3JNYXBrZXkgPSBbJzUwJywgJzEwMCcsICcyMDAnLCAnMzAwJywgJzQwMCcsICc1MDAnLCAnNjAwJywgJzcwMCcsICc4MDAnLCAnOTAwJyxcbi8vICAgJ0ExMDAnLCAnQTIwMCcsICdBNDAwJywgJ0E3MDAnXTtcblxuLy8gZnVuY3Rpb24gZmlsbFBhbGV0dGUoY29sb3JNYXA6IHtbaHVlOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4vLyAgIGNvbnN0IG1pc3NpbmdLZXlzID0gY29sb3JNYXBrZXkuZmlsdGVyKGtleSA9PiAhXy5oYXMoY29sb3JNYXAsIGtleSkpO1xuLy8gICBjb25zb2xlLmxvZyhtaXNzaW5nS2V5cyk7XG5cbi8vICAgLy8gY29uc3QgY29sb3JzID0gKGlucHV0LmNvbG9ycyBhcyBzdHJpbmdbXSkubWFwKGNvbG9yID0+IENvbG9yKGNvbG9yKSk7XG4vLyAgIC8vIGNvbnNvbGUubG9nKGNvbG9ycy5tYXAoY29sID0+IGNvbC5saWdodGVuQnlSYXRpbygwLjE1KS50b0NTUygpKSk7XG4vLyB9XG4iXX0=