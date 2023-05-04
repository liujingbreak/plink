"use strict";
/// <reference path="./mermaid-types.d.mts" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMermaid = void 0;
let mermaidInited = false;
async function runMermaid(sourceCode) {
    const mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default;
    if (!mermaidInited) {
        mermaidInited = true;
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose'
        });
    }
    return await mermaid.render('test-mermaid', sourceCode);
}
exports.runMermaid = runMermaid;
//# sourceMappingURL=mermaid-vm-script.js.map