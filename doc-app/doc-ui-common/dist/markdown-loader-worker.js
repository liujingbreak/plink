"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseToHtml = void 0;
const tslib_1 = require("tslib");
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const highlight = tslib_1.__importStar(require("highlight.js"));
const plink_1 = require("@wfh/plink");
(0, plink_1.initAsChildProcess)();
const log = (0, plink_1.log4File)(__filename);
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, attrs) {
        if (lang && lang !== 'mermaid') {
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
//# sourceMappingURL=markdown-loader-worker.js.map