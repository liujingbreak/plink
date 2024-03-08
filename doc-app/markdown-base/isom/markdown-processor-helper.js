"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementByTagName = exports.createTocTree = exports.lookupTextNodeIn = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
// import {log4File} from '@wfh/plink';
const parse5_1 = require("parse5");
const findLastIndex_1 = tslib_1.__importDefault(require("lodash/findLastIndex"));
// const log = log4File(__filename);
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
function elementByTagName(html, elementTagName) {
    return new rx.Observable(sub => {
        let stop = false;
        const targetTag = elementTagName.trim().toLowerCase();
        const doc = (0, parse5_1.parse)(html, { sourceCodeLocationInfo: true });
        function forNode(node) {
            const nodeName = node.nodeName.trim().toLowerCase();
            if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
                return;
            const el = node;
            if (nodeName === targetTag) {
                sub.next(el);
            }
            else if (el.childNodes) {
                for (const child of el.childNodes) {
                    forNode(child);
                    // Im case consumer unscubscribes, stop synchronus producing
                    if (stop) {
                        break;
                    }
                }
            }
        }
        forNode(doc);
        return () => { stop = true; };
    });
}
exports.elementByTagName = elementByTagName;
//# sourceMappingURL=markdown-processor-helper.js.map