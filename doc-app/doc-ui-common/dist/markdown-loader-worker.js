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
const plink_1 = require("@wfh/plink");
(0, plink_1.initAsChildProcess)();
const log = (0, plink_1.log4File)(__filename);
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, attrs) {
        if (lang !== 'mermaid') {
            try {
                return highlight.highlight(lang, str, true).value;
            }
            catch (e) {
                log.debug(e); // skip non-important error like: Unknown language: "mermaid"
            }
        }
        return str;
    }
});
function parseToHtml(source) {
    return md.render(source);
}
exports.parseToHtml = parseToHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLWxvYWRlci13b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhEQUFxQztBQUNyQyx3REFBMEM7QUFDMUMsc0NBQXdEO0FBRXhELElBQUEsMEJBQWtCLEdBQUUsQ0FBQztBQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxFQUFFLEdBQUcsSUFBSSxxQkFBVSxDQUFDO0lBQ3hCLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSztRQUN4QixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDdEIsSUFBSTtnQkFDRixPQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7YUFDbkQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsNkRBQTZEO2FBQzVFO1NBQ0Y7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDLENBQUM7QUFFSCxTQUFnQixXQUFXLENBQUMsTUFBYztJQUN4QyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFFLENBQUM7QUFDNUIsQ0FBQztBQUZELGtDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1hcmtkb3duSXQgZnJvbSAnbWFya2Rvd24taXQnO1xuaW1wb3J0ICogYXMgaGlnaGxpZ2h0IGZyb20gJ2hpZ2hsaWdodC5qcyc7XG5pbXBvcnQge2xvZzRGaWxlLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5jb25zdCBtZCA9IG5ldyBNYXJrZG93bkl0KHtcbiAgaHRtbDogdHJ1ZSxcbiAgaGlnaGxpZ2h0KHN0ciwgbGFuZywgYXR0cnMpIHtcbiAgICBpZiAobGFuZyAhPT0gJ21lcm1haWQnKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gaGlnaGxpZ2h0LmhpZ2hsaWdodChsYW5nLCBzdHIsIHRydWUpLnZhbHVlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZGVidWcoZSk7IC8vIHNraXAgbm9uLWltcG9ydGFudCBlcnJvciBsaWtlOiBVbmtub3duIGxhbmd1YWdlOiBcIm1lcm1haWRcIlxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVG9IdG1sKHNvdXJjZTogc3RyaW5nKSB7XG4gIHJldHVybiBtZC5yZW5kZXIoc291cmNlICk7XG59XG4iXX0=