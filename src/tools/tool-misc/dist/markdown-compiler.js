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
exports.compileToHtml = void 0;
const markdown_it_1 = __importDefault(require("markdown-it"));
const hljs = __importStar(require("highlight.js"));
const crypto_1 = require("crypto");
const hash = crypto_1.createHash('sha256');
const mk = new markdown_it_1.default({
    html: true,
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(lang, str, true).value;
            }
            catch (__) { }
        }
        return ''; // use external default escaping
    }
});
function compileToHtml(markdown, genHash = false) {
    const html = mk.render(markdown);
    return {
        content: html,
        hash: genHash ? hash.update(html).digest('hex') : undefined
    };
}
exports.compileToHtml = compileToHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZG93bi1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOERBQW1DO0FBQ25DLG1EQUFxQztBQUNyQyxtQ0FBa0M7QUFFbEMsTUFBTSxJQUFJLEdBQUcsbUJBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUVsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLHFCQUFRLENBQUM7SUFDdEIsSUFBSSxFQUFFLElBQUk7SUFDVixTQUFTLENBQUMsR0FBRyxFQUFFLElBQUk7UUFDakIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyxJQUFJO2dCQUNGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQzthQUM5QztZQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUU7U0FDaEI7UUFDRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLGdDQUFnQztJQUM3QyxDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsYUFBYSxDQUFDLFFBQWdCLEVBQUUsT0FBTyxHQUFHLEtBQUs7SUFDN0QsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqQyxPQUFPO1FBQ0wsT0FBTyxFQUFFLElBQUk7UUFDYixJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztLQUM1RCxDQUFDO0FBQ0osQ0FBQztBQU5ELHNDQU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1hcmtkb3duIGZyb20gJ21hcmtkb3duLWl0JztcbmltcG9ydCAqIGFzIGhsanMgZnJvbSAnaGlnaGxpZ2h0LmpzJztcbmltcG9ydCB7Y3JlYXRlSGFzaH0gZnJvbSAnY3J5cHRvJztcblxuY29uc3QgaGFzaCA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuXG5jb25zdCBtayA9IG5ldyBNYXJrZG93bih7XG4gIGh0bWw6IHRydWUsXG4gIGhpZ2hsaWdodChzdHIsIGxhbmcpIHtcbiAgICBpZiAobGFuZyAmJiBobGpzLmdldExhbmd1YWdlKGxhbmcpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gaGxqcy5oaWdobGlnaHQobGFuZywgc3RyLCB0cnVlKS52YWx1ZTtcbiAgICAgIH0gY2F0Y2ggKF9fKSB7fVxuICAgIH1cbiAgICByZXR1cm4gJyc7IC8vIHVzZSBleHRlcm5hbCBkZWZhdWx0IGVzY2FwaW5nXG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVRvSHRtbChtYXJrZG93bjogc3RyaW5nLCBnZW5IYXNoID0gZmFsc2UpIHtcbiAgY29uc3QgaHRtbCA9IG1rLnJlbmRlcihtYXJrZG93bik7XG4gIHJldHVybiB7XG4gICAgY29udGVudDogaHRtbCxcbiAgICBoYXNoOiBnZW5IYXNoID8gaGFzaC51cGRhdGUoaHRtbCkuZGlnZXN0KCdoZXgnKSA6IHVuZGVmaW5lZFxuICB9O1xufVxuXG4iXX0=