"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileToHtml = void 0;
const tslib_1 = require("tslib");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const hljs = tslib_1.__importStar(require("highlight.js"));
const crypto_1 = require("crypto");
const hash = (0, crypto_1.createHash)('sha256');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZG93bi1jb21waWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsc0VBQW1DO0FBQ25DLDJEQUFxQztBQUNyQyxtQ0FBa0M7QUFFbEMsTUFBTSxJQUFJLEdBQUcsSUFBQSxtQkFBVSxFQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWxDLE1BQU0sRUFBRSxHQUFHLElBQUkscUJBQVEsQ0FBQztJQUN0QixJQUFJLEVBQUUsSUFBSTtJQUNWLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSTtRQUNqQixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLElBQUk7Z0JBQ0YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQzlDO1lBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRTtTQUNoQjtRQUNELE9BQU8sRUFBRSxDQUFDLENBQUMsZ0NBQWdDO0lBQzdDLENBQUM7Q0FDRixDQUFDLENBQUM7QUFFSCxTQUFnQixhQUFhLENBQUMsUUFBZ0IsRUFBRSxPQUFPLEdBQUcsS0FBSztJQUM3RCxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLE9BQU87UUFDTCxPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQzVELENBQUM7QUFDSixDQUFDO0FBTkQsc0NBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTWFya2Rvd24gZnJvbSAnbWFya2Rvd24taXQnO1xuaW1wb3J0ICogYXMgaGxqcyBmcm9tICdoaWdobGlnaHQuanMnO1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuXG5jb25zdCBoYXNoID0gY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG5cbmNvbnN0IG1rID0gbmV3IE1hcmtkb3duKHtcbiAgaHRtbDogdHJ1ZSxcbiAgaGlnaGxpZ2h0KHN0ciwgbGFuZykge1xuICAgIGlmIChsYW5nICYmIGhsanMuZ2V0TGFuZ3VhZ2UobGFuZykpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBobGpzLmhpZ2hsaWdodChsYW5nLCBzdHIsIHRydWUpLnZhbHVlO1xuICAgICAgfSBjYXRjaCAoX18pIHt9XG4gICAgfVxuICAgIHJldHVybiAnJzsgLy8gdXNlIGV4dGVybmFsIGRlZmF1bHQgZXNjYXBpbmdcbiAgfVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlVG9IdG1sKG1hcmtkb3duOiBzdHJpbmcsIGdlbkhhc2ggPSBmYWxzZSkge1xuICBjb25zdCBodG1sID0gbWsucmVuZGVyKG1hcmtkb3duKTtcbiAgcmV0dXJuIHtcbiAgICBjb250ZW50OiBodG1sLFxuICAgIGhhc2g6IGdlbkhhc2ggPyBoYXNoLnVwZGF0ZShodG1sKS5kaWdlc3QoJ2hleCcpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbiJdfQ==