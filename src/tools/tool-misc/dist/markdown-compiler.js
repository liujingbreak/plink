"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const hljs = tslib_1.__importStar(require("highlight.js"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvdG9vbC1taXNjL3RzL21hcmtkb3duLWNvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNFQUFtQztBQUNuQywyREFBcUM7QUFDckMsbUNBQWtDO0FBRWxDLE1BQU0sSUFBSSxHQUFHLG1CQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFbEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxxQkFBUSxDQUFDO0lBQ3RCLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJO1FBQ2pCLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsSUFBSTtnQkFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7YUFDOUM7WUFBQyxPQUFPLEVBQUUsRUFBRSxHQUFFO1NBQ2hCO1FBQ0QsT0FBTyxFQUFFLENBQUMsQ0FBQyxnQ0FBZ0M7SUFDN0MsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUVILFNBQWdCLGFBQWEsQ0FBQyxRQUFnQixFQUFFLE9BQU8sR0FBRyxLQUFLO0lBQzdELE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMsT0FBTztRQUNMLE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7S0FDNUQsQ0FBQztBQUNKLENBQUM7QUFORCxzQ0FNQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL3Rvb2wtbWlzYy9kaXN0L21hcmtkb3duLWNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1hcmtkb3duIGZyb20gJ21hcmtkb3duLWl0JztcbmltcG9ydCAqIGFzIGhsanMgZnJvbSAnaGlnaGxpZ2h0LmpzJztcbmltcG9ydCB7Y3JlYXRlSGFzaH0gZnJvbSAnY3J5cHRvJztcblxuY29uc3QgaGFzaCA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuXG5jb25zdCBtayA9IG5ldyBNYXJrZG93bih7XG4gIGh0bWw6IHRydWUsXG4gIGhpZ2hsaWdodChzdHIsIGxhbmcpIHtcbiAgICBpZiAobGFuZyAmJiBobGpzLmdldExhbmd1YWdlKGxhbmcpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gaGxqcy5oaWdobGlnaHQobGFuZywgc3RyLCB0cnVlKS52YWx1ZTtcbiAgICAgIH0gY2F0Y2ggKF9fKSB7fVxuICAgIH1cbiAgICByZXR1cm4gJyc7IC8vIHVzZSBleHRlcm5hbCBkZWZhdWx0IGVzY2FwaW5nXG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVRvSHRtbChtYXJrZG93bjogc3RyaW5nLCBnZW5IYXNoID0gZmFsc2UpIHtcbiAgY29uc3QgaHRtbCA9IG1rLnJlbmRlcihtYXJrZG93bik7XG4gIHJldHVybiB7XG4gICAgY29udGVudDogaHRtbCxcbiAgICBoYXNoOiBnZW5IYXNoID8gaGFzaC51cGRhdGUoaHRtbCkuZGlnZXN0KCdoZXgnKSA6IHVuZGVmaW5lZFxuICB9O1xufVxuXG4iXX0=
