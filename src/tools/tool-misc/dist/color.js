"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillPalettes = void 0;
/* tslint:disable no-console */
// import Color = require('color-js/color');
const __api_1 = __importDefault(require("__api"));
const _ = __importStar(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL3Rvb2wtbWlzYy90cy9jb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDRDQUE0QztBQUM1QyxrREFBd0I7QUFDeEIsMENBQTRCO0FBRTVCLFNBQWdCLFlBQVk7SUFDMUIsTUFBTSxLQUFLLEdBQW1DLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkIsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLEVBQUU7UUFDMUIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQztBQU5ELG9DQU1DO0FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RGLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2xDLFNBQVMsV0FBVyxDQUFDLFFBQWlDO0lBQ3BELE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV6Qix3RUFBd0U7SUFDeEUsb0VBQW9FO0FBQ3RFLENBQUMiLCJmaWxlIjoidG9vbHMvdG9vbC1taXNjL2Rpc3QvY29sb3IuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
