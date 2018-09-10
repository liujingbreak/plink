"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
// import Color = require('color-js/color');
const __api_1 = require("__api");
const _ = require("lodash");
function fillPalettes() {
    const input = __api_1.default.config.get([__api_1.default.packageName, 'fillPalettes']);
    console.log(input);
    for (const colors of input) {
        fillPalette(colors);
    }
}
exports.fillPalettes = fillPalettes;
const colorMapkey = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900',
    'A100', 'A200', 'A400', 'A700'];
function fillPalette(colorMap) {
    const missingKeys = colorMapkey.filter(key => !_.has(colorMap, key));
    console.log(missingKeys);
    // const colors = (input.colors as string[]).map(color => Color(color));
    // console.log(colors.map(col => col.lightenByRatio(0.15).toCSS()));
}

//# sourceMappingURL=color.js.map
