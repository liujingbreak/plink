"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixColor = exports.colorContrast = exports.colorInfo = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
/* tslint:disable no-console */
const color_1 = tslib_1.__importDefault(require("color"));
const util_1 = tslib_1.__importDefault(require("util"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
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
//# sourceMappingURL=color.js.map