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
exports.parseToHtml = void 0;
const markdown_it_1 = __importDefault(require("markdown-it"));
const highlight = __importStar(require("highlight.js"));
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, attrs) {
        if (lang) {
            try {
                return highlight.highlight(lang, str, true).value;
            }
            catch (e) {
                console.error(e);
            }
        }
        return str;
    }
});
function parseToHtml(source) {
    return md.render(source);
}
exports.parseToHtml = parseToHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLWxvYWRlci13b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhEQUFxQztBQUNyQyx3REFBMEM7QUFFMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxxQkFBVSxDQUFDO0lBQ3hCLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSztRQUN4QixJQUFJLElBQUksRUFBRTtZQUNSLElBQUk7Z0JBQ0YsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQ25EO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsQjtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsV0FBVyxDQUFDLE1BQWM7SUFDeEMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBRSxDQUFDO0FBQzVCLENBQUM7QUFGRCxrQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBNYXJrZG93bkl0IGZyb20gJ21hcmtkb3duLWl0JztcbmltcG9ydCAqIGFzIGhpZ2hsaWdodCBmcm9tICdoaWdobGlnaHQuanMnO1xuXG5jb25zdCBtZCA9IG5ldyBNYXJrZG93bkl0KHtcbiAgaHRtbDogdHJ1ZSxcbiAgaGlnaGxpZ2h0KHN0ciwgbGFuZywgYXR0cnMpIHtcbiAgICBpZiAobGFuZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGhpZ2hsaWdodC5oaWdobGlnaHQobGFuZywgc3RyLCB0cnVlKS52YWx1ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRvSHRtbChzb3VyY2U6IHN0cmluZykge1xuICByZXR1cm4gbWQucmVuZGVyKHNvdXJjZSApO1xufVxuIl19