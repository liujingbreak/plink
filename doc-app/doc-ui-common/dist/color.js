"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixColor = exports.colorContrast = exports.colorInfo = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isa0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsK0JBQStCO0FBRS9CLFFBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFtQjtJQUM1QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtRQUNoQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGVBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLENBQUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQztZQUMzRCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUM1QixHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFO1lBQzlCLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFO1lBQzFCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ3BCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ2xCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ2xCLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ3JDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2QsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDZCxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtZ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aW1wb3J0IENvbG9yIGZyb20gJ2NvbG9yJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBjb2xvckluZm8oY29sb3JTdHJzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IGNvbG9yU3RyIG9mIGNvbG9yU3Rycykge1xuICAgIGNvbnN0IGNvbCA9IG5ldyBDb2xvcihjb2xvclN0cik7XG4gICAgY29uc3QgY2hhbGtlciA9IGNoYWxrRm9yQ29sb3IoY29sKTtcbiAgICB5aWVsZCBjaGFsa2VyKGAgJHtjb2xvclN0cn0gYCkgKyAnOiAnICsgY2hhbGtlcih1dGlsLmluc3BlY3Qoe1xuICAgICAgbHVtaW5vc2l0eTogY29sLmx1bWlub3NpdHkoKSxcbiAgICAgIGh1ZTogY29sLmh1ZSgpLFxuICAgICAgc2F0dXJhdGlvbmw6IGNvbC5zYXR1cmF0aW9ubCgpLFxuICAgICAgbGlnaHRuZXNzOiBjb2wubGlnaHRuZXNzKCksXG4gICAgICBpc0xpZ2h0OiBjb2wuaXNMaWdodCgpLFxuICAgICAgaXNEYXJrOiBjb2wuaXNEYXJrKCksXG4gICAgICBhbHBoYTogY29sLmFscGhhKCksXG4gICAgICBncmF5OiBjb2wuZ3JheSgpLFxuICAgICAgd2hpdGU6IGNvbC53aGl0ZSgpLFxuICAgICAgZ3JheXNjYWxlOiBjb2wuZ3JheXNjYWxlKCkudG9TdHJpbmcoKSxcbiAgICAgIGhleDogY29sLmhleCgpLFxuICAgICAgcmdiOiBjb2wucmdiKCksXG4gICAgICBoc2w6IGNvbC5oc2woKSxcbiAgICAgIGhzdjogY29sLmhzdigpLFxuICAgICAgYW5zaTI1NjogY29sLmFuc2kyNTYoKSxcbiAgICAgIGFuc2kxNjogY29sLmFuc2kxNigpLFxuICAgICAgY215azogY29sLmNteWsoKSxcbiAgICAgIGFwcGxlOmNvbC5hcHBsZSgpXG4gICAgfSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xvckNvbnRyYXN0KC4uLltjb2xzMSwgY29sczJdOiBbY29sMTogc3RyaW5nLCBjb2wyOiBzdHJpbmddKSB7XG4gIGNvbnN0IGNvbDEgPSBuZXcgQ29sb3IoY29sczEpO1xuICBjb25zdCAgY2hhbGtlcjEgPSBjaGFsa0ZvckNvbG9yKGNvbDEpO1xuXG4gIGNvbnN0IGNvbDIgPSBuZXcgQ29sb3IoY29sczIpO1xuICBjb25zdCAgY2hhbGtlcjIgPSBjaGFsa0ZvckNvbG9yKGNvbDIpO1xuXG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb2xvckluZm8oW2NvbHMxLCBjb2xzMl0pKSB7XG4gICAgY29uc29sZS5sb2coaW5mbyk7XG4gIH1cblxuICBjb25zb2xlLmxvZyhgQ29udHJhc3Qgb2YgJHtjaGFsa2VyMShjb2xzMSl9IGFuZCAke2NoYWxrZXIyKGNvbHMyKX06ICR7Y29sMS5jb250cmFzdChjb2wyKX1gKTtcbn1cblxuZnVuY3Rpb24gY2hhbGtGb3JDb2xvcihjb2w6IENvbG9yKSB7XG4gIHJldHVybiBjaGFsay5iZ0hleChjb2wuaGV4KCkpLmhleChjb2wuaXNEYXJrKCkgPyAnI2ZmZmZmZicgOiAnIzAwMDAwMCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWl4Q29sb3IoY29sb3IxOiBzdHJpbmcsIGNvbG9yMjogc3RyaW5nLCB3ZWlnaHRJbnRlcnZhbDogbnVtYmVyKSB7XG4gIGNvbnN0IGNvbDEgPSBuZXcgQ29sb3IoY29sb3IxKTtcbiAgY29uc3QgY29sMiA9IG5ldyBDb2xvcihjb2xvcjIpO1xuXG4gIGNvbnN0IGNvdW50ID0gTWF0aC5mbG9vcigxIC8gd2VpZ2h0SW50ZXJ2YWwpO1xuICBjb25zdCBtaXhlZCA9IFtjb2wxXTtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgbWl4ZWQucHVzaChjb2wxLm1peChjb2wyLCB3ZWlnaHRJbnRlcnZhbCAqIGkpKTtcbiAgfVxuICBtaXhlZC5wdXNoKGNvbDIpO1xuICBjb25zb2xlLmxvZyhtaXhlZC5tYXAoY29sID0+IGNoYWxrRm9yQ29sb3IoY29sKShgICAke2NvbC5oZXgoKX0gIGApKS5qb2luKCdcXG4nKSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBmaWxsUGFsZXR0ZXMoKSB7XG4vLyAgIGNvbnN0IGlucHV0OiBBcnJheTx7W2h1ZTogc3RyaW5nXTogc3RyaW5nfT4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnZmlsbFBhbGV0dGVzJ10pO1xuLy8gICBjb25zb2xlLmxvZyhpbnB1dCk7XG4vLyAgIGZvciAoY29uc3QgY29sb3JzIG9mIGlucHV0KSB7XG4vLyAgICAgZmlsbFBhbGV0dGUoY29sb3JzKTtcbi8vICAgfVxuLy8gfVxuXG4vLyBjb25zdCBjb2xvck1hcGtleSA9IFsnNTAnLCAnMTAwJywgJzIwMCcsICczMDAnLCAnNDAwJywgJzUwMCcsICc2MDAnLCAnNzAwJywgJzgwMCcsICc5MDAnLFxuLy8gICAnQTEwMCcsICdBMjAwJywgJ0E0MDAnLCAnQTcwMCddO1xuXG4vLyBmdW5jdGlvbiBmaWxsUGFsZXR0ZShjb2xvck1hcDoge1todWU6IHN0cmluZ106IHN0cmluZ30pIHtcbi8vICAgY29uc3QgbWlzc2luZ0tleXMgPSBjb2xvck1hcGtleS5maWx0ZXIoa2V5ID0+ICFfLmhhcyhjb2xvck1hcCwga2V5KSk7XG4vLyAgIGNvbnNvbGUubG9nKG1pc3NpbmdLZXlzKTtcblxuLy8gICAvLyBjb25zdCBjb2xvcnMgPSAoaW5wdXQuY29sb3JzIGFzIHN0cmluZ1tdKS5tYXAoY29sb3IgPT4gQ29sb3IoY29sb3IpKTtcbi8vICAgLy8gY29uc29sZS5sb2coY29sb3JzLm1hcChjb2wgPT4gY29sLmxpZ2h0ZW5CeVJhdGlvKDAuMTUpLnRvQ1NTKCkpKTtcbi8vIH1cbiJdfQ==