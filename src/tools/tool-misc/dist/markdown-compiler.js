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

//# sourceMappingURL=markdown-compiler.js.map
