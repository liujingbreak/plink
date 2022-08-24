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
//# sourceMappingURL=markdown-compiler.js.map