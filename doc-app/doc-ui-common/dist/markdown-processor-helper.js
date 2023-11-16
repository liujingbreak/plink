"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTocTree = exports.lookupTextNodeIn = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const findLastIndex_1 = tslib_1.__importDefault(require("lodash/findLastIndex"));
function lookupTextNodeIn(el) {
    const chr = new rx.BehaviorSubject(el.childNodes || []);
    let text = '';
    chr.pipe(rx.mergeMap(children => rx.from(children))).pipe(rx.map(node => {
        if (node.nodeName === '#text') {
            text += node.value;
        }
        else if (node.childNodes) {
            chr.next(node.childNodes);
        }
    })).subscribe();
    return text;
}
exports.lookupTextNodeIn = lookupTextNodeIn;
function createTocTree(input) {
    const root = { level: -1, tag: 'h0', text: '', id: '', children: [] };
    const byLevel = [root]; // a stack of previous TOC items ordered by level
    let prevHeaderWeight = Number(root.tag.charAt(1));
    for (const item of input) {
        const headerWeight = Number(item.tag.charAt(1));
        // console.log(`${headerWeight} ${prevHeaderWeight}, ${item.text}`);
        if (headerWeight < prevHeaderWeight) {
            const pIdx = (0, findLastIndex_1.default)(byLevel, toc => Number(toc.tag.charAt(1)) < headerWeight);
            byLevel.splice(pIdx + 1);
            addAsChild(byLevel[pIdx], item);
        }
        else if (headerWeight === prevHeaderWeight) {
            byLevel.pop();
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        else {
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        prevHeaderWeight = headerWeight;
    }
    function addAsChild(parent, child) {
        if (parent.children == null)
            parent.children = [child];
        else
            parent.children.push(child);
        child.level = byLevel[byLevel.length - 1] ? byLevel[byLevel.length - 1].level + 1 : 0;
        byLevel.push(child);
    }
    return root.children;
}
exports.createTocTree = createTocTree;
//# sourceMappingURL=markdown-processor-helper.js.map