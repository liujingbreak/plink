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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLDRDQUE0QztBQUM1QyxrREFBd0I7QUFDeEIsMENBQTRCO0FBRTVCLFNBQWdCLFlBQVk7SUFDMUIsTUFBTSxLQUFLLEdBQW1DLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkIsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLEVBQUU7UUFDMUIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQztBQU5ELG9DQU1DO0FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO0lBQ3RGLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2xDLFNBQVMsV0FBVyxDQUFDLFFBQWlDO0lBQ3BELE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV6Qix3RUFBd0U7SUFDeEUsb0VBQW9FO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyBpbXBvcnQgQ29sb3IgPSByZXF1aXJlKCdjb2xvci1qcy9jb2xvcicpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsUGFsZXR0ZXMoKSB7XG4gIGNvbnN0IGlucHV0OiBBcnJheTx7W2h1ZTogc3RyaW5nXTogc3RyaW5nfT4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnZmlsbFBhbGV0dGVzJ10pO1xuICBjb25zb2xlLmxvZyhpbnB1dCk7XG4gIGZvciAoY29uc3QgY29sb3JzIG9mIGlucHV0KSB7XG4gICAgZmlsbFBhbGV0dGUoY29sb3JzKTtcbiAgfVxufVxuXG5jb25zdCBjb2xvck1hcGtleSA9IFsnNTAnLCAnMTAwJywgJzIwMCcsICczMDAnLCAnNDAwJywgJzUwMCcsICc2MDAnLCAnNzAwJywgJzgwMCcsICc5MDAnLFxuICAnQTEwMCcsICdBMjAwJywgJ0E0MDAnLCAnQTcwMCddO1xuZnVuY3Rpb24gZmlsbFBhbGV0dGUoY29sb3JNYXA6IHtbaHVlOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gIGNvbnN0IG1pc3NpbmdLZXlzID0gY29sb3JNYXBrZXkuZmlsdGVyKGtleSA9PiAhXy5oYXMoY29sb3JNYXAsIGtleSkpO1xuICBjb25zb2xlLmxvZyhtaXNzaW5nS2V5cyk7XG5cbiAgLy8gY29uc3QgY29sb3JzID0gKGlucHV0LmNvbG9ycyBhcyBzdHJpbmdbXSkubWFwKGNvbG9yID0+IENvbG9yKGNvbG9yKSk7XG4gIC8vIGNvbnNvbGUubG9nKGNvbG9ycy5tYXAoY29sID0+IGNvbC5saWdodGVuQnlSYXRpbygwLjE1KS50b0NTUygpKSk7XG59XG4iXX0=