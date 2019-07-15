"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
// import Color = require('color-js/color');
const __api_1 = tslib_1.__importDefault(require("__api"));
const _ = tslib_1.__importStar(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvdG9vbC1taXNjL3RzL2NvbG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFDNUMsMERBQXdCO0FBQ3hCLGtEQUE0QjtBQUU1QixTQUFnQixZQUFZO0lBQzFCLE1BQU0sS0FBSyxHQUFtQyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUNoRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25CLEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxFQUFFO1FBQzFCLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNyQjtBQUNILENBQUM7QUFORCxvQ0FNQztBQUVELE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztJQUN0RixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNsQyxTQUFTLFdBQVcsQ0FBQyxRQUFpQztJQUNwRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFekIsd0VBQXdFO0lBQ3hFLG9FQUFvRTtBQUN0RSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvdG9vbC1taXNjL2Rpc3QvY29sb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyBpbXBvcnQgQ29sb3IgPSByZXF1aXJlKCdjb2xvci1qcy9jb2xvcicpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsUGFsZXR0ZXMoKSB7XG4gIGNvbnN0IGlucHV0OiBBcnJheTx7W2h1ZTogc3RyaW5nXTogc3RyaW5nfT4gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnZmlsbFBhbGV0dGVzJ10pO1xuICBjb25zb2xlLmxvZyhpbnB1dCk7XG4gIGZvciAoY29uc3QgY29sb3JzIG9mIGlucHV0KSB7XG4gICAgZmlsbFBhbGV0dGUoY29sb3JzKTtcbiAgfVxufVxuXG5jb25zdCBjb2xvck1hcGtleSA9IFsnNTAnLCAnMTAwJywgJzIwMCcsICczMDAnLCAnNDAwJywgJzUwMCcsICc2MDAnLCAnNzAwJywgJzgwMCcsICc5MDAnLFxuICAnQTEwMCcsICdBMjAwJywgJ0E0MDAnLCAnQTcwMCddO1xuZnVuY3Rpb24gZmlsbFBhbGV0dGUoY29sb3JNYXA6IHtbaHVlOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gIGNvbnN0IG1pc3NpbmdLZXlzID0gY29sb3JNYXBrZXkuZmlsdGVyKGtleSA9PiAhXy5oYXMoY29sb3JNYXAsIGtleSkpO1xuICBjb25zb2xlLmxvZyhtaXNzaW5nS2V5cyk7XG5cbiAgLy8gY29uc3QgY29sb3JzID0gKGlucHV0LmNvbG9ycyBhcyBzdHJpbmdbXSkubWFwKGNvbG9yID0+IENvbG9yKGNvbG9yKSk7XG4gIC8vIGNvbnNvbGUubG9nKGNvbG9ycy5tYXAoY29sID0+IGNvbC5saWdodGVuQnlSYXRpbygwLjE1KS50b0NTUygpKSk7XG59XG4iXX0=
