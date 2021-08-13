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
plink_1.initAsChildProcess();
const log = plink_1.log4File(__filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLWxvYWRlci13b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhEQUFxQztBQUNyQyx3REFBMEM7QUFDMUMsc0NBQXdEO0FBRXhELDBCQUFrQixFQUFFLENBQUM7QUFDckIsTUFBTSxHQUFHLEdBQUcsZ0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxNQUFNLEVBQUUsR0FBRyxJQUFJLHFCQUFVLENBQUM7SUFDeEIsSUFBSSxFQUFFLElBQUk7SUFDVixTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLO1FBQ3hCLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUN0QixJQUFJO2dCQUNGLE9BQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQzthQUNuRDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2REFBNkQ7YUFDNUU7U0FDRjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUVILFNBQWdCLFdBQVcsQ0FBQyxNQUFjO0lBQ3hDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUUsQ0FBQztBQUM1QixDQUFDO0FBRkQsa0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTWFya2Rvd25JdCBmcm9tICdtYXJrZG93bi1pdCc7XG5pbXBvcnQgKiBhcyBoaWdobGlnaHQgZnJvbSAnaGlnaGxpZ2h0LmpzJztcbmltcG9ydCB7bG9nNEZpbGUsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluayc7XG5cbmluaXRBc0NoaWxkUHJvY2VzcygpO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmNvbnN0IG1kID0gbmV3IE1hcmtkb3duSXQoe1xuICBodG1sOiB0cnVlLFxuICBoaWdobGlnaHQoc3RyLCBsYW5nLCBhdHRycykge1xuICAgIGlmIChsYW5nICE9PSAnbWVybWFpZCcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBoaWdobGlnaHQuaGlnaGxpZ2h0KGxhbmcsIHN0ciwgdHJ1ZSkudmFsdWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhlKTsgLy8gc2tpcCBub24taW1wb3J0YW50IGVycm9yIGxpa2U6IFVua25vd24gbGFuZ3VhZ2U6IFwibWVybWFpZFwiXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUb0h0bWwoc291cmNlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG1kLnJlbmRlcihzb3VyY2UgKTtcbn1cbiJdfQ==